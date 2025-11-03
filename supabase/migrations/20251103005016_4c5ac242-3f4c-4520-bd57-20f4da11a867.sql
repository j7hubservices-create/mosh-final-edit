-- Drop existing INSERT policies
DROP POLICY IF EXISTS "Guests can create guest orders" ON public.orders;
DROP POLICY IF EXISTS "Users can create their own orders" ON public.orders;

-- Create comprehensive INSERT policy that allows both authenticated and guest orders
CREATE POLICY "Anyone can create orders with proper user_id"
ON public.orders
FOR INSERT
WITH CHECK (
  -- Either it's a guest order (user_id is NULL)
  -- OR it's an authenticated user creating their own order
  (user_id IS NULL) OR (auth.uid() = user_id)
);