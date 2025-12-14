-- Create case messages table
CREATE TABLE public.case_messages (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES public.profiles(id),
    message TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.case_messages ENABLE ROW LEVEL SECURITY;

-- Clients can view messages for their own cases
CREATE POLICY "Clients can view their case messages"
ON public.case_messages
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.cases 
        WHERE cases.id = case_messages.case_id 
        AND cases.client_id = get_profile_id(auth.uid())
    )
);

-- Clients can send messages to their own cases
CREATE POLICY "Clients can send messages to their cases"
ON public.case_messages
FOR INSERT
WITH CHECK (
    sender_id = get_profile_id(auth.uid()) AND
    EXISTS (
        SELECT 1 FROM public.cases 
        WHERE cases.id = case_messages.case_id 
        AND cases.client_id = get_profile_id(auth.uid())
    )
);

-- Agents can view messages for cases they are assigned to
CREATE POLICY "Agents can view assigned case messages"
ON public.case_messages
FOR SELECT
USING (
    has_role(auth.uid(), 'agent') AND
    EXISTS (
        SELECT 1 FROM public.cases 
        WHERE cases.id = case_messages.case_id 
        AND cases.assigned_agent_id = get_profile_id(auth.uid())
    )
);

-- Agents can send messages to cases they are assigned to
CREATE POLICY "Agents can send messages to assigned cases"
ON public.case_messages
FOR INSERT
WITH CHECK (
    has_role(auth.uid(), 'agent') AND
    sender_id = get_profile_id(auth.uid()) AND
    EXISTS (
        SELECT 1 FROM public.cases 
        WHERE cases.id = case_messages.case_id 
        AND cases.assigned_agent_id = get_profile_id(auth.uid())
    )
);

-- Enable realtime for case_messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.case_messages;