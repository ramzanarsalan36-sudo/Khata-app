-- Migration 003: Row Level Security (RLS) Policies and Helper Functions

-- 1. Helper Function to check if user belongs to a shop (SECURITY DEFINER prevents recursion)
CREATE OR REPLACE FUNCTION public.is_shop_member(check_shop_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 
        FROM public.shop_members 
        WHERE shop_id = check_shop_id 
          AND user_id = auth.uid()
    );
$$;

-- 2. Helper Function to get user role in a shop
CREATE OR REPLACE FUNCTION public.get_user_shop_role(check_shop_id UUID)
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
    SELECT role 
    FROM public.shop_members 
    WHERE shop_id = check_shop_id 
      AND user_id = auth.uid()
    LIMIT 1;
$$;

-- Enable RLS on all tables
ALTER TABLE public.shops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shop_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- -------------------------------------------------------------
-- SHOPS POLICIES
-- -------------------------------------------------------------
CREATE POLICY "Users can view shops they belong to"
    ON public.shops FOR SELECT
    TO authenticated
    USING (public.is_shop_member(id));

CREATE POLICY "Authenticated users can insert new shops"
    ON public.shops FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Owners and Managers can update their shop"
    ON public.shops FOR UPDATE
    TO authenticated
    USING (public.is_shop_member(id) AND public.get_user_shop_role(id) IN ('owner', 'manager'))
    WITH CHECK (public.is_shop_member(id) AND public.get_user_shop_role(id) IN ('owner', 'manager'));

-- -------------------------------------------------------------
-- SHOP MEMBERS POLICIES
-- -------------------------------------------------------------
CREATE POLICY "Users can view members of their shops"
    ON public.shop_members FOR SELECT
    TO authenticated
    USING (user_id = auth.uid() OR public.is_shop_member(shop_id));

CREATE POLICY "Owners can add members to their shop"
    ON public.shop_members FOR INSERT
    TO authenticated
    WITH CHECK (public.is_shop_member(shop_id) AND public.get_user_shop_role(shop_id) = 'owner');

CREATE POLICY "Owners can update members in their shop"
    ON public.shop_members FOR UPDATE
    TO authenticated
    USING (public.is_shop_member(shop_id) AND public.get_user_shop_role(shop_id) = 'owner')
    WITH CHECK (public.is_shop_member(shop_id) AND public.get_user_shop_role(shop_id) = 'owner');

CREATE POLICY "Owners can remove members from their shop"
    ON public.shop_members FOR DELETE
    TO authenticated
    USING (public.is_shop_member(shop_id) AND public.get_user_shop_role(shop_id) = 'owner');

-- -------------------------------------------------------------
-- CUSTOMERS POLICIES
-- -------------------------------------------------------------
CREATE POLICY "Shop members can view customers"
    ON public.customers FOR SELECT
    TO authenticated
    USING (public.is_shop_member(shop_id));

CREATE POLICY "Shop members can insert customers"
    ON public.customers FOR INSERT
    TO authenticated
    WITH CHECK (public.is_shop_member(shop_id));

CREATE POLICY "Shop members can update customers"
    ON public.customers FOR UPDATE
    TO authenticated
    USING (public.is_shop_member(shop_id))
    WITH CHECK (public.is_shop_member(shop_id));

CREATE POLICY "Owners and Managers can delete/archive customers"
    ON public.customers FOR DELETE
    TO authenticated
    USING (public.is_shop_member(shop_id) AND public.get_user_shop_role(shop_id) IN ('owner', 'manager'));

-- -------------------------------------------------------------
-- TRANSACTIONS POLICIES
-- -------------------------------------------------------------
CREATE POLICY "Shop members can view transactions"
    ON public.transactions FOR SELECT
    TO authenticated
    USING (public.is_shop_member(shop_id));

CREATE POLICY "Shop members can insert transactions"
    ON public.transactions FOR INSERT
    TO authenticated
    WITH CHECK (public.is_shop_member(shop_id));

CREATE POLICY "Owners and Managers can update transactions"
    ON public.transactions FOR UPDATE
    TO authenticated
    USING (public.is_shop_member(shop_id) AND public.get_user_shop_role(shop_id) IN ('owner', 'manager'))
    WITH CHECK (public.is_shop_member(shop_id) AND public.get_user_shop_role(shop_id) IN ('owner', 'manager'));

-- -------------------------------------------------------------
-- AUDIT LOGS POLICIES
-- -------------------------------------------------------------
CREATE POLICY "Owners and Managers can view audit logs"
    ON public.audit_logs FOR SELECT
    TO authenticated
    USING (public.is_shop_member(shop_id) AND public.get_user_shop_role(shop_id) IN ('owner', 'manager'));

CREATE POLICY "Shop members can insert audit logs"
    ON public.audit_logs FOR INSERT
    TO authenticated
    WITH CHECK (public.is_shop_member(shop_id));
