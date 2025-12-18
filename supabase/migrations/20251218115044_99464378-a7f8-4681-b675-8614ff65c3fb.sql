-- Create audit_scan_jobs table for batch risk scanning
CREATE TABLE public.audit_scan_jobs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    original_filename text NOT NULL,
    file_path text NOT NULL,
    status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'error')),
    risk_score integer,
    extracted_data jsonb,
    detected_issues jsonb DEFAULT '[]'::jsonb,
    error_message text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    processed_at timestamp with time zone
);

-- Enable RLS
ALTER TABLE public.audit_scan_jobs ENABLE ROW LEVEL SECURITY;

-- Tax preparers can view their own scan jobs
CREATE POLICY "Tax preparers can view their own scan jobs"
ON public.audit_scan_jobs
FOR SELECT
USING (profile_id = get_profile_id(auth.uid()) AND has_role(auth.uid(), 'tax_preparer'));

-- Tax preparers can insert their own scan jobs
CREATE POLICY "Tax preparers can insert their own scan jobs"
ON public.audit_scan_jobs
FOR INSERT
WITH CHECK (profile_id = get_profile_id(auth.uid()) AND has_role(auth.uid(), 'tax_preparer'));

-- Tax preparers can update their own scan jobs
CREATE POLICY "Tax preparers can update their own scan jobs"
ON public.audit_scan_jobs
FOR UPDATE
USING (profile_id = get_profile_id(auth.uid()) AND has_role(auth.uid(), 'tax_preparer'));

-- Create index for efficient queries
CREATE INDEX idx_audit_scan_jobs_profile_status ON public.audit_scan_jobs(profile_id, status);
CREATE INDEX idx_audit_scan_jobs_created_at ON public.audit_scan_jobs(created_at DESC);

-- Create storage bucket for scan queue
INSERT INTO storage.buckets (id, name, public) 
VALUES ('scan-queue', 'scan-queue', false);

-- Storage policies for scan-queue bucket
CREATE POLICY "Tax preparers can upload to scan-queue"
ON storage.objects
FOR INSERT
WITH CHECK (
    bucket_id = 'scan-queue' 
    AND has_role(auth.uid(), 'tax_preparer')
    AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Tax preparers can view their scan-queue files"
ON storage.objects
FOR SELECT
USING (
    bucket_id = 'scan-queue' 
    AND has_role(auth.uid(), 'tax_preparer')
    AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Tax preparers can delete their scan-queue files"
ON storage.objects
FOR DELETE
USING (
    bucket_id = 'scan-queue' 
    AND has_role(auth.uid(), 'tax_preparer')
    AND (storage.foldername(name))[1] = auth.uid()::text
);