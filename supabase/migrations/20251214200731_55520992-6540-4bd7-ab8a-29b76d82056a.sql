-- Add file_url column to document_requests
ALTER TABLE public.document_requests 
ADD COLUMN IF NOT EXISTS file_url TEXT;

-- Update status check (allowing 'pending', 'uploaded', 'approved')
-- Note: We're just documenting the valid statuses, not adding a constraint