
-- Clean up: remove the redundant "Anyone can count vendor followers" policy 
-- since "Users can view follows" already has OR true
DROP POLICY IF EXISTS "Anyone can count vendor followers" ON public.vendor_follows;
