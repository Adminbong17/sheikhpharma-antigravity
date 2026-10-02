
INSERT INTO storage.buckets (id, name, public)
VALUES ('site-assets', 'site-assets', true);

CREATE POLICY "Anyone can view site assets" ON storage.objects
  FOR SELECT USING (bucket_id = 'site-assets');

CREATE POLICY "Admins can upload site assets" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'site-assets' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete site assets" ON storage.objects
  FOR DELETE USING (bucket_id = 'site-assets' AND has_role(auth.uid(), 'admin'::app_role));
