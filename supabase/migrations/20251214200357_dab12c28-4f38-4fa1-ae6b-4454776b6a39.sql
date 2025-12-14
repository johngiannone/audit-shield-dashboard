-- Create document_requests table for tracking requested documents
CREATE TABLE public.document_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  requested_by UUID NOT NULL REFERENCES public.profiles(id),
  document_name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  fulfilled_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.document_requests ENABLE ROW LEVEL SECURITY;

-- Agents can view requests on their assigned cases
CREATE POLICY "Agents can view requests on assigned cases"
ON public.document_requests
FOR SELECT
USING (
  has_role(auth.uid(), 'agent'::app_role) AND
  EXISTS (
    SELECT 1 FROM cases
    WHERE cases.id = document_requests.case_id
    AND cases.assigned_agent_id = get_profile_id(auth.uid())
  )
);

-- Agents can insert requests on their assigned cases
CREATE POLICY "Agents can insert requests on assigned cases"
ON public.document_requests
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'agent'::app_role) AND
  requested_by = get_profile_id(auth.uid()) AND
  EXISTS (
    SELECT 1 FROM cases
    WHERE cases.id = document_requests.case_id
    AND cases.assigned_agent_id = get_profile_id(auth.uid())
  )
);

-- Agents can update requests on their assigned cases
CREATE POLICY "Agents can update requests on assigned cases"
ON public.document_requests
FOR UPDATE
USING (
  has_role(auth.uid(), 'agent'::app_role) AND
  EXISTS (
    SELECT 1 FROM cases
    WHERE cases.id = document_requests.case_id
    AND cases.assigned_agent_id = get_profile_id(auth.uid())
  )
);

-- Clients can view requests on their cases
CREATE POLICY "Clients can view requests on their cases"
ON public.document_requests
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM cases
    WHERE cases.id = document_requests.case_id
    AND cases.client_id = get_profile_id(auth.uid())
  )
);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.document_requests;