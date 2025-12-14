-- Create case_notes table for internal agent notes
CREATE TABLE public.case_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES public.profiles(id),
  note TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.case_notes ENABLE ROW LEVEL SECURITY;

-- Only agents can view notes on cases they're assigned to
CREATE POLICY "Agents can view notes on assigned cases"
ON public.case_notes
FOR SELECT
USING (
  has_role(auth.uid(), 'agent'::app_role) AND
  EXISTS (
    SELECT 1 FROM cases
    WHERE cases.id = case_notes.case_id
    AND cases.assigned_agent_id = get_profile_id(auth.uid())
  )
);

-- Only agents can insert notes on their assigned cases
CREATE POLICY "Agents can add notes to assigned cases"
ON public.case_notes
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'agent'::app_role) AND
  agent_id = get_profile_id(auth.uid()) AND
  EXISTS (
    SELECT 1 FROM cases
    WHERE cases.id = case_notes.case_id
    AND cases.assigned_agent_id = get_profile_id(auth.uid())
  )
);

-- Enable realtime for case_notes
ALTER PUBLICATION supabase_realtime ADD TABLE public.case_notes;