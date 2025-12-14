-- Create the audit-notices storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('audit-notices', 'audit-notices', false)
ON CONFLICT (id) DO NOTHING;

-- Policy: Users can upload to audit-notices bucket
CREATE POLICY "Users can upload to audit-notices bucket"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'audit-notices' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy: Users can view from audit-notices bucket
CREATE POLICY "Users can view from audit-notices bucket"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'audit-notices' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy: Agents can view audit-notices bucket
CREATE POLICY "Agents can view audit-notices bucket"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'audit-notices' 
  AND public.has_role(auth.uid(), 'agent')
);