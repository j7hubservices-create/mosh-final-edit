-- ====================================================
-- 🧩 STORAGE SETUP (PRODUCT IMAGES)
-- ====================================================

-- Create storage bucket for product images (if not exists)
INSERT INTO storage.buckets (id, name, public)
VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO NOTHING;

-- Public can view product images
CREATE POLICY IF NOT EXISTS "Product images are publicly accessible"
ON storage.objects
FOR SELECT
USING (bucket_id = 'product-images');

-- Admins can upload product images
CREATE POLICY IF NOT EXISTS "Admins can upload product images"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'product-images'
  AND is_admin(auth.uid())
);

-- Admins can update product images
CREATE POLICY IF NOT EXISTS "Admins can update product images"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'product-images'
  AND is_admin(auth.uid())
);

-- Admins can delete product images
CREATE POLICY IF NOT EXISTS "Admins can delete product images"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'product-images'
  AND is_admin(auth.uid())
);

-- ====================================================
-- 🚚 ORDERS TABLE SETUP (DELIVERY METHODS)
-- ====================================================

-- 1️⃣ Add delivery_method column if it doesn’t exist
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS delivery_method text NOT NULL DEFAULT 'pickup';

-- 2️⃣ Drop any old invalid constraint
ALTER TABLE public.orders
DROP CONSTRAINT IF EXISTS valid_delivery_method;

-- 3️⃣ Add correct valid delivery methods
ALTER TABLE public.orders
ADD CONSTRAINT valid_delivery_method
CHECK (delivery_method IN ('pickup', 'doorstep', 'park'));

-- 4️⃣ Ensure default makes sense (pickup)
ALTER TABLE public.orders
ALTER COLUMN delivery_method SET DEFAULT 'pickup';

-- ====================================================
-- 🔐 INSERT POLICY FOR ORDERS
-- ====================================================

-- Drop existing insert policies (clean slate)
DROP POLICY IF EXISTS "Guests can create guest orders" ON public.orders;
DROP POLICY IF EXISTS "Users can create their own orders" ON public.orders;
DROP POLICY IF EXISTS "Anyone can create orders with proper user_id" ON public.orders;

-- Create one clear, flexible policy
CREATE POLICY "Anyone can create orders with proper user_id"
ON public.orders
FOR INSERT
WITH CHECK (
  -- Allow guest orders (no user_id)
  user_id IS NULL
  OR
  -- Allow logged-in users to create their own orders
  auth.uid() = user_id
);

-- ====================================================
-- ✅ DONE
-- ====================================================
-- After running this:
-- - All 3 delivery methods (pickup, doorstep, park) will work.
-- - Guests and users can create orders normally.
-- - Admins can manage product images.
