
-- Fix vendors: add permissive INSERT policy for authenticated users
CREATE POLICY "Authenticated users can apply as vendor"
ON public.vendors
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Fix career_applications: drop restrictive policy and recreate as permissive
DROP POLICY IF EXISTS "Anyone can submit career application" ON public.career_applications;

CREATE POLICY "Anyone can submit career application"
ON public.career_applications
FOR INSERT
TO anon, authenticated
WITH CHECK (true);
