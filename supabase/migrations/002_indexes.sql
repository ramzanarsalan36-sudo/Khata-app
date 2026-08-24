-- Migration 002: Indexes for Multi-Tenant Query Performance

-- Customers Indexes
CREATE INDEX IF NOT EXISTS idx_customers_shop_id ON public.customers(shop_id);
CREATE INDEX IF NOT EXISTS idx_customers_shop_name ON public.customers(shop_id, name);
CREATE INDEX IF NOT EXISTS idx_customers_shop_phone ON public.customers(shop_id, phone);
CREATE INDEX IF NOT EXISTS idx_customers_active_deleted ON public.customers(shop_id, is_active, deleted_at);

-- Transactions Indexes
CREATE INDEX IF NOT EXISTS idx_transactions_shop_id ON public.transactions(shop_id);
CREATE INDEX IF NOT EXISTS idx_transactions_customer_id ON public.transactions(customer_id);
CREATE INDEX IF NOT EXISTS idx_transactions_customer_created ON public.transactions(customer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_shop_created ON public.transactions(shop_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_client_tx_id ON public.transactions(client_transaction_id);

-- Shop Members Indexes
CREATE INDEX IF NOT EXISTS idx_shop_members_user_id ON public.shop_members(user_id);
CREATE INDEX IF NOT EXISTS idx_shop_members_shop_id ON public.shop_members(shop_id);

-- Audit Logs Indexes
CREATE INDEX IF NOT EXISTS idx_audit_logs_shop_created ON public.audit_logs(shop_id, created_at DESC);
