-- Migration 005: Supabase Storage for Private Bill Receipts

-- 1. Create bill-receipts private bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'bill-receipts', 
    'bill-receipts', 
    false, 
    5242880, -- 5 MB limit
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic']
)
ON CONFLICT (id) DO UPDATE SET 
    public = false,
    file_size_limit = 5242880,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic'];

-- 2. Storage Policies for bill-receipts
-- Objects are stored with path pattern: <shop_id>/<customer_id>/<file_name>

-- Allow authenticated shop members to select/view receipts
CREATE POLICY "Shop members can read their receipts"
ON storage.objects FOR SELECT
TO authenticated
USING (
    bucket_id = 'bill-receipts' 
    AND public.is_shop_member((storage.foldername(name))[1]::uuid)
);

-- Allow authenticated shop members to upload receipts
CREATE POLICY "Shop members can upload receipts"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'bill-receipts' 
    AND public.is_shop_member((storage.foldername(name))[1]::uuid)
);

-- Allow authenticated owners/managers to delete receipts
CREATE POLICY "Shop owners and managers can delete receipts"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'bill-receipts' 
    AND public.is_shop_member((storage.foldername(name))[1]::uuid)
    AND public.get_user_shop_role((storage.foldername(name))[1]::uuid) IN ('owner', 'manager')
);
