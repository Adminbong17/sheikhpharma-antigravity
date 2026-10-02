
-- Fix infinite recursion: vendor orders policy queries order_items which queries orders back

-- Drop the problematic vendor policy
DROP POLICY IF EXISTS "Vendors can view orders with their products" ON public.orders;

-- Create a security definer function to check if an order belongs to a vendor
CREATE OR REPLACE FUNCTION public.order_belongs_to_vendor(_order_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM order_items oi
    JOIN products p ON p.id = oi.product_id
    JOIN vendors v ON v.id = p.vendor_id
    WHERE oi.order_id = _order_id
      AND v.user_id = _user_id
  )
$$;

-- Recreate vendor policy using the function
CREATE POLICY "Vendors can view orders with their products"
ON public.orders
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'vendor'::app_role)
  AND order_belongs_to_vendor(id, auth.uid())
);
