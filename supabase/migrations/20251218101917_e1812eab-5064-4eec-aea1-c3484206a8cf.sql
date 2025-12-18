-- Create notification type enum
CREATE TYPE public.notification_type AS ENUM ('info', 'warning', 'success');

-- Create notifications table
CREATE TABLE public.notifications (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    type notification_type NOT NULL DEFAULT 'info',
    title text NOT NULL,
    message text NOT NULL,
    link_url text,
    is_read boolean NOT NULL DEFAULT false,
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- RLS: Users can only view their own notifications
CREATE POLICY "Users can view their own notifications"
ON public.notifications
FOR SELECT
USING (user_id = get_profile_id(auth.uid()));

-- RLS: Users can update their own notifications (mark as read)
CREATE POLICY "Users can update their own notifications"
ON public.notifications
FOR UPDATE
USING (user_id = get_profile_id(auth.uid()));

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- Create index for faster queries
CREATE INDEX idx_notifications_user_unread ON public.notifications(user_id, is_read) WHERE is_read = false;

-- Function to notify client when case status changes
CREATE OR REPLACE FUNCTION public.notify_case_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    status_label text;
BEGIN
    -- Only trigger if status actually changed
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        -- Map status to human-readable label
        status_label := CASE NEW.status
            WHEN 'triage' THEN 'Triage'
            WHEN 'agent_action' THEN 'Agent Action Required'
            WHEN 'client_action' THEN 'Awaiting Your Response'
            WHEN 'resolved' THEN 'Resolved'
            ELSE NEW.status
        END;
        
        -- Insert notification for the client
        INSERT INTO public.notifications (user_id, type, title, message, link_url)
        VALUES (
            NEW.client_id,
            CASE NEW.status
                WHEN 'resolved' THEN 'success'::notification_type
                WHEN 'client_action' THEN 'warning'::notification_type
                ELSE 'info'::notification_type
            END,
            'Case Update',
            'Your case is now: ' || status_label,
            '/cases/' || NEW.id
        );
    END IF;
    
    RETURN NEW;
END;
$$;

-- Trigger for case status changes
CREATE TRIGGER on_case_status_change
AFTER UPDATE ON public.cases
FOR EACH ROW
EXECUTE FUNCTION public.notify_case_status_change();

-- Function to notify recipient when a new case message is sent
CREATE OR REPLACE FUNCTION public.notify_new_case_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_case record;
    v_recipient_id uuid;
    v_sender_name text;
BEGIN
    -- Get the case details
    SELECT * INTO v_case FROM public.cases WHERE id = NEW.case_id;
    
    -- Get sender name
    SELECT COALESCE(full_name, email, 'Someone') INTO v_sender_name 
    FROM public.profiles WHERE id = NEW.sender_id;
    
    -- Determine recipient: if sender is client, notify agent; if sender is agent, notify client
    IF NEW.sender_id = v_case.client_id THEN
        v_recipient_id := v_case.assigned_agent_id;
    ELSE
        v_recipient_id := v_case.client_id;
    END IF;
    
    -- Only insert if there's a recipient
    IF v_recipient_id IS NOT NULL THEN
        INSERT INTO public.notifications (user_id, type, title, message, link_url)
        VALUES (
            v_recipient_id,
            'info'::notification_type,
            'New Message',
            v_sender_name || ' sent you a message',
            CASE 
                WHEN NEW.sender_id = v_case.client_id THEN '/agent/cases/' || NEW.case_id
                ELSE '/cases/' || NEW.case_id
            END
        );
    END IF;
    
    RETURN NEW;
END;
$$;

-- Trigger for new case messages
CREATE TRIGGER on_new_case_message
AFTER INSERT ON public.case_messages
FOR EACH ROW
EXECUTE FUNCTION public.notify_new_case_message();