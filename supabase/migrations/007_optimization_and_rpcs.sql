-- Migration 007: Performance Optimization, Database Aggregates, and Keyset/Offset Pagination RPCs

-- =============================================================
-- 1. HIGH PERFORMANCE TARGETED INDEXES
-- =============================================================

-- Fast sorting and filtering for Top Debtors & Udhaar/Advance balances
CREATE INDEX IF NOT EXISTS idx_customers_shop_balance 
ON public.customers (shop_id, balance DESC) 
WHERE deleted_at IS NULL;

-- Fast default customer listing & updated_at pagination
CREATE INDEX IF NOT EXISTS idx_customers_shop_updated 
ON public.customers (shop_id, updated_at DESC) 
WHERE deleted_at IS NULL;

-- Fast customer transaction timeline pagination & type filtering
CREATE INDEX IF NOT EXISTS idx_transactions_cust_type_created 
ON public.transactions (customer_id, type, created_at DESC) 
WHERE deleted_at IS NULL;

-- Fast shop-wide date range aggregations & filtered exports
CREATE INDEX IF NOT EXISTS idx_transactions_shop_date 
ON public.transactions (shop_id, created_at DESC) 
WHERE deleted_at IS NULL;


-- =============================================================
-- 2. STORAGE SECURITY HARDENING FOR CUSTOMER PHOTOS
-- =============================================================
-- Enforce that photos can only be uploaded and managed by members of the matching shop ID

DROP POLICY IF EXISTS "Authenticated users can upload customer photos" ON storage.objects;
CREATE POLICY "Shop members can upload customer photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'customer-photos' 
    AND public.is_shop_member((storage.foldername(name))[1]::uuid)
);

DROP POLICY IF EXISTS "Authenticated users can update customer photos" ON storage.objects;
CREATE POLICY "Shop members can update customer photos"
ON storage.objects FOR UPDATE
TO authenticated
USING (
    bucket_id = 'customer-photos' 
    AND public.is_shop_member((storage.foldername(name))[1]::uuid)
);

DROP POLICY IF EXISTS "Authenticated users can delete customer photos" ON storage.objects;
CREATE POLICY "Shop members can delete customer photos"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'customer-photos' 
    AND public.is_shop_member((storage.foldername(name))[1]::uuid)
);


-- =============================================================
-- 3. ATOMIC DASHBOARD AGGREGATES RPC
-- =============================================================
CREATE OR REPLACE FUNCTION public.get_dashboard_stats(p_shop_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
    v_user_id UUID;
    v_total_customers BIGINT := 0;
    v_total_udhaar NUMERIC(14,2) := 0.00;
    v_total_advance NUMERIC(14,2) := 0.00;
    v_net_balance NUMERIC(14,2) := 0.00;
    v_today_udhaar NUMERIC(14,2) := 0.00;
    v_today_jama NUMERIC(14,2) := 0.00;
    v_this_month_udhaar NUMERIC(14,2) := 0.00;
    v_this_month_jama NUMERIC(14,2) := 0.00;
    v_today_start TIMESTAMPTZ;
    v_month_start TIMESTAMPTZ;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: User is not authenticated.';
    END IF;

    -- Verify user belongs to shop
    IF NOT public.is_shop_member(p_shop_id) THEN
        RAISE EXCEPTION 'Permission Denied: User is not a member of this shop.';
    END IF;

    -- 1. Aggregate customer balances
    SELECT 
        COUNT(*),
        COALESCE(SUM(CASE WHEN balance > 0 THEN balance ELSE 0 END), 0.00),
        COALESCE(SUM(CASE WHEN balance < 0 THEN ABS(balance) ELSE 0 END), 0.00)
    INTO 
        v_total_customers,
        v_total_udhaar,
        v_total_advance
    FROM public.customers
    WHERE shop_id = p_shop_id AND deleted_at IS NULL;

    v_net_balance := v_total_udhaar - v_total_advance;

    -- 2. Aggregate today & this month transaction totals
    v_today_start := date_trunc('day', now());
    v_month_start := date_trunc('month', now());

    SELECT 
        COALESCE(SUM(CASE WHEN type = 'GAVE' AND created_at >= v_today_start THEN amount ELSE 0 END), 0.00),
        COALESCE(SUM(CASE WHEN type = 'GOT' AND created_at >= v_today_start THEN amount ELSE 0 END), 0.00),
        COALESCE(SUM(CASE WHEN type = 'GAVE' AND created_at >= v_month_start THEN amount ELSE 0 END), 0.00),
        COALESCE(SUM(CASE WHEN type = 'GOT' AND created_at >= v_month_start THEN amount ELSE 0 END), 0.00)
    INTO 
        v_today_udhaar,
        v_today_jama,
        v_this_month_udhaar,
        v_this_month_jama
    FROM public.transactions
    WHERE shop_id = p_shop_id 
      AND deleted_at IS NULL
      AND created_at >= v_month_start;

    RETURN jsonb_build_object(
        'total_customers', v_total_customers,
        'total_udhaar', v_total_udhaar,
        'total_advance', v_total_advance,
        'net_balance', v_net_balance,
        'today_udhaar', v_today_udhaar,
        'today_jama', v_today_jama,
        'this_month_udhaar', v_this_month_udhaar,
        'this_month_jama', v_this_month_jama
    );
END;
$$;


-- =============================================================
-- 4. TOP OUTSTANDING DEBTORS RPC
-- =============================================================
CREATE OR REPLACE FUNCTION public.get_top_debtors(
    p_shop_id UUID,
    p_limit INT DEFAULT 5
)
RETURNS TABLE (
    id UUID,
    name TEXT,
    phone TEXT,
    photo_url TEXT,
    balance NUMERIC(14,2)
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: User is not authenticated.';
    END IF;

    IF NOT public.is_shop_member(p_shop_id) THEN
        RAISE EXCEPTION 'Permission Denied: User is not a member of this shop.';
    END IF;

    RETURN QUERY
    SELECT 
        c.id,
        c.name,
        c.phone,
        c.photo_url,
        c.balance
    FROM public.customers c
    WHERE c.shop_id = p_shop_id 
      AND c.deleted_at IS NULL 
      AND c.balance > 0
    ORDER BY c.balance DESC
    LIMIT LEAST(p_limit, 50);
END;
$$;


-- =============================================================
-- 5. PAGINATED, SEARCHED, AND FILTERED CUSTOMERS RPC
-- =============================================================
CREATE OR REPLACE FUNCTION public.get_customers_paginated(
    p_shop_id UUID,
    p_page INT DEFAULT 1,
    p_page_size INT DEFAULT 10,
    p_search TEXT DEFAULT NULL,
    p_filter TEXT DEFAULT 'ALL',
    p_sort TEXT DEFAULT 'updated_desc'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
    v_offset INT;
    v_total_count BIGINT := 0;
    v_filtered_count BIGINT := 0;
    v_customers JSONB := '[]'::jsonb;
    v_has_more BOOLEAN := false;
    v_clean_search TEXT;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: User is not authenticated.';
    END IF;

    IF NOT public.is_shop_member(p_shop_id) THEN
        RAISE EXCEPTION 'Permission Denied: User is not a member of this shop.';
    END IF;

    -- Calculate offset
    v_offset := (GREATEST(p_page, 1) - 1) * GREATEST(p_page_size, 1);
    v_clean_search := trim(coalesce(p_search, ''));

    -- 1. Total active customer count for shop
    SELECT COUNT(*) INTO v_total_count
    FROM public.customers
    WHERE shop_id = p_shop_id AND deleted_at IS NULL;

    -- 2. Count matching search and filter
    SELECT COUNT(*) INTO v_filtered_count
    FROM public.customers c
    WHERE c.shop_id = p_shop_id 
      AND c.deleted_at IS NULL
      AND (
          v_clean_search = '' 
          OR c.name ILIKE '%' || v_clean_search || '%' 
          OR c.phone ILIKE '%' || v_clean_search || '%'
      )
      AND (
          p_filter = 'ALL' 
          OR (p_filter = 'UDHAAR' AND c.balance > 0)
          OR (p_filter = 'ADVANCE' AND c.balance < 0)
          OR (p_filter = 'SETTLED' AND c.balance = 0)
      );

    -- 3. Fetch paginated records with specific columns
    WITH filtered_records AS (
        SELECT 
            c.id,
            c.name,
            c.phone,
            c.photo_url,
            c.notes,
            c.balance,
            c.created_at,
            c.updated_at
        FROM public.customers c
        WHERE c.shop_id = p_shop_id 
          AND c.deleted_at IS NULL
          AND (
              v_clean_search = '' 
              OR c.name ILIKE '%' || v_clean_search || '%' 
              OR c.phone ILIKE '%' || v_clean_search || '%'
          )
          AND (
              p_filter = 'ALL' 
              OR (p_filter = 'UDHAAR' AND c.balance > 0)
              OR (p_filter = 'ADVANCE' AND c.balance < 0)
              OR (p_filter = 'SETTLED' AND c.balance = 0)
          )
        ORDER BY
            CASE WHEN p_sort = 'updated_desc' THEN c.updated_at END DESC NULLS LAST,
            CASE WHEN p_sort = 'created_desc' THEN c.created_at END DESC NULLS LAST,
            CASE WHEN p_sort = 'name_asc' THEN c.name END ASC NULLS LAST,
            CASE WHEN p_sort = 'name_desc' THEN c.name END DESC NULLS LAST,
            CASE WHEN p_sort = 'balance_desc' THEN c.balance END DESC NULLS LAST,
            CASE WHEN p_sort = 'balance_asc' THEN c.balance END ASC NULLS LAST,
            c.id DESC
        LIMIT p_page_size
        OFFSET v_offset
    )
    SELECT coalesce(jsonb_agg(row_to_json(filtered_records)), '[]'::jsonb)
    INTO v_customers
    FROM filtered_records;

    v_has_more := (v_offset + p_page_size) < v_filtered_count;

    RETURN jsonb_build_object(
        'data', v_customers,
        'page', p_page,
        'page_size', p_page_size,
        'total_count', v_total_count,
        'filtered_count', v_filtered_count,
        'has_more', v_has_more
    );
END;
$$;


-- =============================================================
-- 6. PAGINATED CUSTOMER TRANSACTION LEDGER RPC
-- =============================================================
CREATE OR REPLACE FUNCTION public.get_customer_ledger_paginated(
    p_shop_id UUID,
    p_customer_id UUID,
    p_page INT DEFAULT 1,
    p_page_size INT DEFAULT 20,
    p_type TEXT DEFAULT 'ALL',
    p_start_date TIMESTAMPTZ DEFAULT NULL,
    p_end_date TIMESTAMPTZ DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
    v_offset INT;
    v_total_tx_count BIGINT := 0;
    v_filtered_tx_count BIGINT := 0;
    v_transactions JSONB := '[]'::jsonb;
    v_has_more BOOLEAN := false;
    v_total_gave NUMERIC(14,2) := 0.00;
    v_total_got NUMERIC(14,2) := 0.00;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: User is not authenticated.';
    END IF;

    IF NOT public.is_shop_member(p_shop_id) THEN
        RAISE EXCEPTION 'Permission Denied: User is not a member of this shop.';
    END IF;

    v_offset := (GREATEST(p_page, 1) - 1) * GREATEST(p_page_size, 1);

    -- 1. Calculate overall customer totals within filter range
    SELECT 
        COUNT(*),
        COALESCE(SUM(CASE WHEN t.type = 'GAVE' THEN t.amount ELSE 0 END), 0.00),
        COALESCE(SUM(CASE WHEN t.type = 'GOT' THEN t.amount ELSE 0 END), 0.00)
    INTO 
        v_filtered_tx_count,
        v_total_gave,
        v_total_got
    FROM public.transactions t
    WHERE t.shop_id = p_shop_id 
      AND t.customer_id = p_customer_id
      AND t.deleted_at IS NULL
      AND (p_type = 'ALL' OR t.type = p_type)
      AND (p_start_date IS NULL OR t.created_at >= p_start_date)
      AND (p_end_date IS NULL OR t.created_at <= p_end_date);

    -- 2. Fetch paginated transactions
    WITH tx_records AS (
        SELECT 
            t.id,
            t.customer_id,
            t.shop_id,
            t.amount,
            t.type,
            t.note,
            t.bill_path,
            t.client_transaction_id,
            t.created_at
        FROM public.transactions t
        WHERE t.shop_id = p_shop_id 
          AND t.customer_id = p_customer_id
          AND t.deleted_at IS NULL
          AND (p_type = 'ALL' OR t.type = p_type)
          AND (p_start_date IS NULL OR t.created_at >= p_start_date)
          AND (p_end_date IS NULL OR t.created_at <= p_end_date)
        ORDER BY t.created_at DESC, t.id DESC
        LIMIT p_page_size
        OFFSET v_offset
    )
    SELECT coalesce(jsonb_agg(row_to_json(tx_records)), '[]'::jsonb)
    INTO v_transactions
    FROM tx_records;

    v_has_more := (v_offset + p_page_size) < v_filtered_tx_count;

    RETURN jsonb_build_object(
        'data', v_transactions,
        'page', p_page,
        'page_size', p_page_size,
        'filtered_count', v_filtered_tx_count,
        'has_more', v_has_more,
        'total_gave', v_total_gave,
        'total_got', v_total_got
    );
END;
$$;
