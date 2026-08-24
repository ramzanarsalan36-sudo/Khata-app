-- Migration 004: Atomic Stored Procedures & Business Logic

-- 1. Create Shop with Owner Membership Atomically
CREATE OR REPLACE FUNCTION public.create_shop_with_owner(
    p_shop_name TEXT,
    p_owner_name TEXT,
    p_phone TEXT DEFAULT NULL,
    p_address TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
    v_shop_id UUID;
    v_shop_record public.shops%ROWTYPE;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: User must be authenticated to create a shop.';
    END IF;

    IF trim(p_shop_name) = '' THEN
        RAISE EXCEPTION 'Shop name cannot be empty.';
    END IF;

    IF trim(p_owner_name) = '' THEN
        RAISE EXCEPTION 'Owner name cannot be empty.';
    END IF;

    -- Insert new shop
    INSERT INTO public.shops (shop_name, owner_name, phone, address)
    VALUES (trim(p_shop_name), trim(p_owner_name), trim(p_phone), trim(p_address))
    RETURNING * INTO v_shop_record;

    v_shop_id := v_shop_record.id;

    -- Assign creator as owner in shop_members
    INSERT INTO public.shop_members (shop_id, user_id, role)
    VALUES (v_shop_id, v_user_id, 'owner');

    -- Insert audit log
    INSERT INTO public.audit_logs (shop_id, user_id, action, entity_type, entity_id, metadata)
    VALUES (
        v_shop_id, 
        v_user_id, 
        'shop_created', 
        'shop', 
        v_shop_id, 
        jsonb_build_object('shop_name', p_shop_name, 'owner_name', p_owner_name)
    );

    RETURN jsonb_build_object(
        'success', true,
        'shop', row_to_json(v_shop_record),
        'role', 'owner'
    );
END;
$$;


-- 2. Create Transaction Atomically with Idempotency & Strict Balance Update
CREATE OR REPLACE FUNCTION public.create_transaction(
    p_shop_id UUID,
    p_customer_id UUID,
    p_amount NUMERIC,
    p_type TEXT,
    p_note TEXT DEFAULT NULL,
    p_bill_path TEXT DEFAULT NULL,
    p_client_transaction_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
    v_member_role TEXT;
    v_customer public.customers%ROWTYPE;
    v_existing_tx public.transactions%ROWTYPE;
    v_new_tx public.transactions%ROWTYPE;
    v_balance_delta NUMERIC(14,2);
    v_updated_balance NUMERIC(14,2);
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: User is not authenticated.';
    END IF;

    -- 1. Check shop membership
    SELECT role INTO v_member_role
    FROM public.shop_members
    WHERE shop_id = p_shop_id AND user_id = v_user_id;

    IF v_member_role IS NULL THEN
        RAISE EXCEPTION 'Permission Denied: User is not a member of this shop.';
    END IF;

    -- 2. Validate amount and transaction type
    IF p_amount IS NULL OR p_amount <= 0 THEN
        RAISE EXCEPTION 'Invalid Amount: Amount must be greater than zero.';
    END IF;

    IF p_type NOT IN ('GAVE', 'GOT') THEN
        RAISE EXCEPTION 'Invalid Type: Transaction type must be GAVE or GOT.';
    END IF;

    IF p_client_transaction_id IS NULL THEN
        RAISE EXCEPTION 'Missing client_transaction_id for idempotency protection.';
    END IF;

    -- 3. Check for existing transaction with client_transaction_id (Idempotency)
    SELECT * INTO v_existing_tx
    FROM public.transactions
    WHERE client_transaction_id = p_client_transaction_id;

    IF v_existing_tx.id IS NOT NULL THEN
        SELECT balance INTO v_updated_balance FROM public.customers WHERE id = p_customer_id;
        RETURN jsonb_build_object(
            'success', true,
            'is_duplicate', true,
            'transaction', row_to_json(v_existing_tx),
            'customer_balance', v_updated_balance
        );
    END IF;

    -- 4. Validate customer belongs to this shop and lock row for update
    SELECT * INTO v_customer
    FROM public.customers
    WHERE id = p_customer_id AND shop_id = p_shop_id AND deleted_at IS NULL
    FOR UPDATE;

    IF v_customer.id IS NULL THEN
        RAISE EXCEPTION 'Customer not found or has been deleted.';
    END IF;

    -- 5. Calculate Balance Delta:
    -- GAVE increases customer debt (+), GOT decreases customer debt (-)
    IF p_type = 'GAVE' THEN
        v_balance_delta := p_amount;
    ELSE
        v_balance_delta := -p_amount;
    END IF;

    v_updated_balance := v_customer.balance + v_balance_delta;

    -- 6. Insert transaction
    INSERT INTO public.transactions (
        shop_id,
        customer_id,
        amount,
        type,
        note,
        bill_path,
        client_transaction_id,
        created_by
    ) VALUES (
        p_shop_id,
        p_customer_id,
        p_amount,
        p_type,
        trim(p_note),
        p_bill_path,
        p_client_transaction_id,
        v_user_id
    ) RETURNING * INTO v_new_tx;

    -- 7. Atomically update customer balance
    UPDATE public.customers
    SET balance = v_updated_balance,
        updated_at = now()
    WHERE id = p_customer_id;

    -- 8. Record audit log
    INSERT INTO public.audit_logs (shop_id, user_id, action, entity_type, entity_id, metadata)
    VALUES (
        p_shop_id,
        v_user_id,
        'transaction_created',
        'transaction',
        v_new_tx.id,
        jsonb_build_object(
            'customer_id', p_customer_id,
            'amount', p_amount,
            'type', p_type,
            'previous_balance', v_customer.balance,
            'new_balance', v_updated_balance
        )
    );

    RETURN jsonb_build_object(
        'success', true,
        'is_duplicate', false,
        'transaction', row_to_json(v_new_tx),
        'customer_balance', v_updated_balance
    );
END;
$$;


-- 3. Soft Delete Transaction & Revert Balance Atomically
CREATE OR REPLACE FUNCTION public.soft_delete_transaction(
    p_transaction_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
    v_tx public.transactions%ROWTYPE;
    v_member_role TEXT;
    v_customer public.customers%ROWTYPE;
    v_revert_delta NUMERIC(14,2);
    v_updated_balance NUMERIC(14,2);
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: User is not authenticated.';
    END IF;

    -- 1. Fetch transaction
    SELECT * INTO v_tx
    FROM public.transactions
    WHERE id = p_transaction_id;

    IF v_tx.id IS NULL THEN
        RAISE EXCEPTION 'Transaction not found.';
    END IF;

    IF v_tx.deleted_at IS NOT NULL THEN
        RAISE EXCEPTION 'Transaction is already deleted.';
    END IF;

    -- 2. Verify user has owner or manager role in the shop
    SELECT role INTO v_member_role
    FROM public.shop_members
    WHERE shop_id = v_tx.shop_id AND user_id = v_user_id;

    IF v_member_role NOT IN ('owner', 'manager') THEN
        RAISE EXCEPTION 'Permission Denied: Only shop owners and managers can delete transactions.';
    END IF;

    -- 3. Lock and fetch customer record
    SELECT * INTO v_customer
    FROM public.customers
    WHERE id = v_tx.customer_id
    FOR UPDATE;

    IF v_customer.id IS NULL THEN
        RAISE EXCEPTION 'Associated customer record not found.';
    END IF;

    -- 4. Calculate reverse delta
    -- If deleted tx was GAVE (+debt), we must subtract it (-).
    -- If deleted tx was GOT (-debt), we must add it back (+).
    IF v_tx.type = 'GAVE' THEN
        v_revert_delta := -v_tx.amount;
    ELSE
        v_revert_delta := v_tx.amount;
    END IF;

    v_updated_balance := v_customer.balance + v_revert_delta;

    -- 5. Mark transaction as soft-deleted
    UPDATE public.transactions
    SET deleted_at = now(),
        deleted_by = v_user_id,
        updated_at = now()
    WHERE id = p_transaction_id;

    -- 6. Update customer balance
    UPDATE public.customers
    SET balance = v_updated_balance,
        updated_at = now()
    WHERE id = v_tx.customer_id;

    -- 7. Audit log
    INSERT INTO public.audit_logs (shop_id, user_id, action, entity_type, entity_id, metadata)
    VALUES (
        v_tx.shop_id,
        v_user_id,
        'transaction_deleted',
        'transaction',
        p_transaction_id,
        jsonb_build_object(
            'customer_id', v_tx.customer_id,
            'amount', v_tx.amount,
            'type', v_tx.type,
            'previous_balance', v_customer.balance,
            'new_balance', v_updated_balance
        )
    );

    RETURN jsonb_build_object(
        'success', true,
        'transaction_id', p_transaction_id,
        'customer_id', v_tx.customer_id,
        'customer_balance', v_updated_balance
    );
END;
$$;
