-- Create storage bucket for notice files
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('notices', 'notices', false, 10485760); -- 10MB limit

-- Allow authenticated users to upload to their own folder
CREATE POLICY "Users can upload their own notices"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'notices' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to view their own notices
CREATE POLICY "Users can view their own notices"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'notices' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow agents to view all notices
CREATE POLICY "Agents can view all notices"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'notices' 
  AND public.has_role(auth.uid(), 'agent')
);