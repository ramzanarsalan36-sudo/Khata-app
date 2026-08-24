-- Migration 006: Customer Profile Photos Storage & Schema
-- 1. Add photo_url column to customers table
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS photo_url TEXT;

-- 2. Create customer-photos bucket in Supabase storage
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'customer-photos', 
    'customer-photos', 
    true, 
    5242880, -- 5 MB limit
    ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET 
    public = true,
    file_size_limit = 5242880,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp'];

-- 3. Storage Policies for customer-photos
DROP POLICY IF EXISTS "Public can view customer photos" ON storage.objects;
CREATE POLICY "Public can view customer photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'customer-photos');

DROP POLICY IF EXISTS "Authenticated users can upload customer photos" ON storage.objects;
CREATE POLICY "Authenticated users can upload customer photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'customer-photos');

DROP POLICY IF EXISTS "Authenticated users can update customer photos" ON storage.objects;
CREATE POLICY "Authenticated users can update customer photos"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'customer-photos');

DROP POLICY IF EXISTS "Authenticated users can delete customer photos" ON storage.objects;
CREATE POLICY "Authenticated users can delete customer photos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'customer-photos');
