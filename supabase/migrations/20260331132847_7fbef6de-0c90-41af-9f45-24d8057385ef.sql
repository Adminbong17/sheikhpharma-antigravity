
-- 1. Fix sms_settings: Remove public SELECT, restrict to admin-only
DROP POLICY IF EXISTS "Anyone can read sms_settings" ON public.sms_settings;
DROP POLICY IF EXISTS "Public can read sms_settings" ON public.sms_settings;

-- Drop any existing permissive SELECT policies on sms_settings
DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies 
    WHERE tablename = 'sms_settings' AND schemaname = 'public' AND cmd = 'SELECT'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.sms_settings', pol.policyname);
  END LOOP;
END $$;

-- Create admin-only SELECT policy
CREATE POLICY "Admins can read sms_settings"
ON public.sms_settings FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- 2. Fix notifications: Restrict INSERT to authenticated users only
DROP POLICY IF EXISTS "Anyone can insert notifications" ON public.notifications;

CREATE POLICY "Authenticated can insert notifications"
ON public.notifications FOR INSERT
TO authenticated
WITH CHECK (true);

-- 3. Fix user_roles: Restrict SELECT to own user or admin
DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies 
    WHERE tablename = 'user_roles' AND schemaname = 'public' AND cmd = 'SELECT'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.user_roles', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY "Users can read own roles or admins"
ON public.user_roles FOR SELECT
TO authenticated
USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));
