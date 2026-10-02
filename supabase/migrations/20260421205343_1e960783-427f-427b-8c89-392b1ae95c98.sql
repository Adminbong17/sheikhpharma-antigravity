
-- Create prescriptions storage bucket (public read for admin viewing)
INSERT INTO storage.buckets (id, name, public)
VALUES ('prescriptions', 'prescriptions', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Allow anyone (including anonymous users) to upload prescriptions
CREATE POLICY "Anyone can upload prescriptions"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'prescriptions');

-- Allow public read access to prescription images
CREATE POLICY "Public can view prescriptions"
ON storage.objects FOR SELECT
USING (bucket_id = 'prescriptions');

-- Allow users to delete their own uploaded prescriptions
CREATE POLICY "Users can delete own prescriptions"
ON storage.objects FOR DELETE
USING (bucket_id = 'prescriptions' AND auth.uid() = owner);
