-- Create case status history table
CREATE TABLE public.case_status_history (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
    old_status TEXT,
    new_status TEXT NOT NULL,
    changed_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.case_status_history ENABLE ROW LEVEL SECURITY;

-- Clients can view history for their own cases
CREATE POLICY "Clients can view their case history"
ON public.case_status_history
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.cases 
        WHERE cases.id = case_status_history.case_id 
        AND cases.client_id = get_profile_id(auth.uid())
    )
);

-- Agents can view all case history
CREATE POLICY "Agents can view all case history"
ON public.case_status_history
FOR SELECT
USING (has_role(auth.uid(), 'agent'));

-- Agents can insert status history
CREATE POLICY "Agents can insert status history"
ON public.case_status_history
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'agent'));

-- Create case documents table for additional uploads
CREATE TABLE public.case_documents (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
    uploaded_by UUID NOT NULL REFERENCES public.profiles(id),
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    document_type TEXT DEFAULT 'supporting',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.case_documents ENABLE ROW LEVEL SECURITY;

-- Clients can view documents for their own cases
CREATE POLICY "Clients can view their case documents"
ON public.case_documents
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.cases 
        WHERE cases.id = case_documents.case_id 
        AND cases.client_id = get_profile_id(auth.uid())
    )
);

-- Clients can upload documents to their own cases
CREATE POLICY "Clients can upload to their cases"
ON public.case_documents
FOR INSERT
WITH CHECK (
    uploaded_by = get_profile_id(auth.uid()) AND
    EXISTS (
        SELECT 1 FROM public.cases 
        WHERE cases.id = case_documents.case_id 
        AND cases.client_id = get_profile_id(auth.uid())
    )
);

-- Agents can view all case documents
CREATE POLICY "Agents can view all case documents"
ON public.case_documents
FOR SELECT
USING (has_role(auth.uid(), 'agent'));

-- Agents can upload documents to assigned cases
CREATE POLICY "Agents can upload to assigned cases"
ON public.case_documents
FOR INSERT
WITH CHECK (
    has_role(auth.uid(), 'agent') AND
    EXISTS (
        SELECT 1 FROM public.cases 
        WHERE cases.id = case_documents.case_id 
        AND cases.assigned_agent_id = get_profile_id(auth.uid())
    )
);