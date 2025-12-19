-- Create temp-audit-files bucket (private)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'temp-audit-files', 
  'temp-audit-files', 
  false,
  52428800, -- 50MB limit
  ARRAY['application/pdf', 'image/png', 'image/jpeg']
);

-- Allow authenticated users to upload to their own folder
CREATE POLICY "Users can upload to their own folder"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'temp-audit-files' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow authenticated users to read from their own folder
CREATE POLICY "Users can read their own files"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'temp-audit-files' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow authenticated users to delete their own files
CREATE POLICY "Users can delete their own files"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'temp-audit-files' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Create a function to clean up old temp files (older than 24 hours)
CREATE OR REPLACE FUNCTION public.cleanup_temp_audit_files()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, storage
AS $$
BEGIN
  DELETE FROM storage.objects 
  WHERE bucket_id = 'temp-audit-files' 
  AND created_at < NOW() - INTERVAL '24 hours';
END;
$$;