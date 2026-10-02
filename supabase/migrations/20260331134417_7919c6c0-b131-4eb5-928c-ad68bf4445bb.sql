
-- 1. Fix profiles: Restrict SELECT to own user or admin
DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies 
    WHERE tablename = 'profiles' AND schemaname = 'public' AND cmd = 'SELECT'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.profiles', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY "Users can read own profile"
ON public.profiles FOR SELECT
TO authenticated
USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));

-- 2. Fix coupons: Restrict public SELECT to active non-user-specific coupons
DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies 
    WHERE tablename = 'coupons' AND schemaname = 'public' AND cmd = 'SELECT'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.coupons', pol.policyname);
  END LOOP;
END $$;

-- Public can only see active, non-user-specific coupons
CREATE POLICY "Anyone can read active public coupons"
ON public.coupons FOR SELECT
USING (is_active = true AND is_user_specific = false);

-- Users can see their own assigned coupons
CREATE POLICY "Users can read own assigned coupons"
ON public.coupons FOR SELECT
TO authenticated
USING (
  id IN (SELECT coupon_id FROM public.coupon_assignments WHERE user_id = auth.uid())
  OR has_role(auth.uid(), 'admin'::app_role)
);
