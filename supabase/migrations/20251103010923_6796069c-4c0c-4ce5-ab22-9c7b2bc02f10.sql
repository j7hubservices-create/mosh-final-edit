-- ✅ Step 1: Fix delivery methods (safe to re-run)
ALTER TABLE public.orders
DROP CONSTRAINT IF EXISTS valid_delivery_method;

ALTER TABLE public.orders
ADD CONSTRAINT valid_delivery_method
CHECK (delivery_method IN ('pickup', 'doorstep', 'park'));

ALTER TABLE public.orders
ALTER COLUMN delivery_method SET DEFAULT 'pickup';

-- ✅ Step 2: Enable RLS (if not already)
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- ✅ Step 3: Allow all users and guests to insert orders in Lovable
DROP POLICY IF EXISTS "allow all inserts" ON public.orders;
CREATE POLICY "allow all inserts"
ON public.orders
FOR INSERT
WITH CHECK (true);

-- ✅ Step 4: Allow reading orders (optional but useful for tracking)
DROP POLICY IF EXISTS "allow all select" ON public.orders;
CREATE POLICY "allow all select"
ON public.orders
FOR SELECT
USING (true);