
-- Drop the restrictive policy
DROP POLICY IF EXISTS "Users can view own role" ON public.user_roles;

-- Recreate as permissive
CREATE POLICY "Users can view own role" ON public.user_roles
  FOR SELECT
  TO authenticated
  USING ((auth.uid() = user_id) OR has_role(auth.uid(), 'admin'::app_role));
