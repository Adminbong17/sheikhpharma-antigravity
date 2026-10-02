
CREATE POLICY "Admins can delete blood_requests" ON public.blood_requests FOR DELETE TO public USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update blood_requests" ON public.blood_requests FOR UPDATE TO public USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Anyone can read blood_requests" ON public.blood_requests FOR SELECT TO anon USING (true);
