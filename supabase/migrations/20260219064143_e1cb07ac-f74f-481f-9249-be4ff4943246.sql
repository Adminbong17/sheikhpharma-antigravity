
-- Fix 1: Allow anyone to count followers for a vendor (for public store pages)
-- Currently RLS only lets users see their OWN follows, so follower count is broken for logged-out users
CREATE POLICY "Anyone can count vendor followers"
  ON public.vendor_follows
  FOR SELECT
  USING (true);

-- Drop the old restrictive policy first
DROP POLICY IF EXISTS "Users can view own follows" ON public.vendor_follows;

-- Re-create with correct logic: users see own follows OR vendor sees their followers OR admin sees all
CREATE POLICY "Users can view follows"
  ON public.vendor_follows
  FOR SELECT
  USING (
    (auth.uid() = user_id) 
    OR has_role(auth.uid(), 'admin'::app_role) 
    OR (vendor_id IN (SELECT vendors.id FROM vendors WHERE vendors.user_id = auth.uid()))
    OR true -- allow anyone to count (public follower count)
  );
