-- Add rejection_reason column to document_requests
ALTER TABLE public.document_requests 
ADD COLUMN IF NOT EXISTS rejection_reason TEXT;