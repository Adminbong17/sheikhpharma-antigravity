
-- Allow authenticated users to upload to vendor-logos and vendor-nids folders
CREATE POLICY "Users can upload vendor files"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars' AND (
    (storage.foldername(name))[1] IN ('vendor-logos', 'vendor-nids')
  )
);

-- Allow anyone (including anon) to upload career application files
CREATE POLICY "Anyone can upload career files"
ON storage.objects
FOR INSERT
TO anon, authenticated
WITH CHECK (
  bucket_id = 'avatars' AND (
    (storage.foldername(name))[1] IN ('career-photos', 'career-nids')
  )
);
