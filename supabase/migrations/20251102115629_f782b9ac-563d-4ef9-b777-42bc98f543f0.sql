-- Add RLS policies to allow admins to delete orders and order_items
CREATE POLICY "Admins can delete orders"
ON public.orders
FOR DELETE
TO authenticated
USING (is_admin(auth.uid()));

CREATE POLICY "Admins can delete order items"
ON public.order_items
FOR DELETE
TO authenticated
USING (is_admin(auth.uid()));

-- Add RLS policies to allow admins to delete products (already has one but let's ensure it exists)
DROP POLICY IF EXISTS "Admins can delete products" ON public.products;
CREATE POLICY "Admins can delete products"
ON public.products
FOR DELETE
TO authenticated
USING (is_admin(auth.uid()));

-- Add tracking_number and tracking_status columns to orders table
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS tracking_number TEXT,
ADD COLUMN IF NOT EXISTS tracking_status TEXT DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS tracking_updated_at TIMESTAMP WITH TIME ZONE;