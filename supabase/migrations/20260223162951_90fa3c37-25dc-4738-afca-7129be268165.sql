
-- Add is_user_specific flag to coupons
ALTER TABLE public.coupons ADD COLUMN is_user_specific boolean NOT NULL DEFAULT false;

-- Create coupon_assignments table
CREATE TABLE public.coupon_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id uuid NOT NULL REFERENCES public.coupons(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  reason text,
  assigned_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(coupon_id, user_id)
);

ALTER TABLE public.coupon_assignments ENABLE ROW LEVEL SECURITY;

-- Admins can manage assignments
CREATE POLICY "Admins can manage coupon assignments"
ON public.coupon_assignments
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Users can view their own assignments
CREATE POLICY "Users can view own coupon assignments"
ON public.coupon_assignments
FOR SELECT
USING (auth.uid() = user_id);
