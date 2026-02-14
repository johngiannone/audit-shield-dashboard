
-- Create vault_documents table for year-round document storage
CREATE TABLE public.vault_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id UUID NOT NULL REFERENCES public.profiles(id),
  tax_year INTEGER NOT NULL,
  expense_category TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_type TEXT,
  file_size INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.vault_documents ENABLE ROW LEVEL SECURITY;

-- Users can view their own vault documents
CREATE POLICY "Users can view their own vault documents"
ON public.vault_documents FOR SELECT
USING (profile_id = get_profile_id(auth.uid()));

-- Users can insert their own vault documents
CREATE POLICY "Users can insert their own vault documents"
ON public.vault_documents FOR INSERT
WITH CHECK (profile_id = get_profile_id(auth.uid()));

-- Users can delete their own vault documents
CREATE POLICY "Users can delete their own vault documents"
ON public.vault_documents FOR DELETE
USING (profile_id = get_profile_id(auth.uid()));

-- Enrolled agents can view all vault documents
CREATE POLICY "Enrolled agents can view all vault documents"
ON public.vault_documents FOR SELECT
USING (has_role(auth.uid(), 'enrolled_agent'::app_role));

-- Create updated_at trigger
CREATE TRIGGER update_vault_documents_updated_at
BEFORE UPDATE ON public.vault_documents
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for performance
CREATE INDEX idx_vault_documents_profile_year ON public.vault_documents(profile_id, tax_year);

-- Create storage bucket for vault files
INSERT INTO storage.buckets (id, name, public) VALUES ('audit-vault', 'audit-vault', false);

-- Storage policies for audit-vault bucket
CREATE POLICY "Users can upload to their vault folder"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'audit-vault' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their vault files"
ON storage.objects FOR SELECT
USING (bucket_id = 'audit-vault' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their vault files"
ON storage.objects FOR DELETE
USING (bucket_id = 'audit-vault' AND auth.uid()::text = (storage.foldername(name))[1]);
