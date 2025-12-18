-- Function to notify client when an agent is assigned to their case
CREATE OR REPLACE FUNCTION public.notify_agent_assigned()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_agent_name text;
BEGIN
    -- Only trigger if assigned_agent_id changed from NULL or to a different agent
    IF (OLD.assigned_agent_id IS NULL AND NEW.assigned_agent_id IS NOT NULL) 
       OR (OLD.assigned_agent_id IS DISTINCT FROM NEW.assigned_agent_id AND NEW.assigned_agent_id IS NOT NULL) THEN
        
        -- Get agent name
        SELECT COALESCE(full_name, email, 'An agent') INTO v_agent_name 
        FROM public.profiles WHERE id = NEW.assigned_agent_id;
        
        -- Insert notification for the client
        INSERT INTO public.notifications (user_id, type, title, message, link_url)
        VALUES (
            NEW.client_id,
            'success'::notification_type,
            'Agent Assigned',
            v_agent_name || ' is now working on your case',
            '/cases/' || NEW.id
        );
    END IF;
    
    RETURN NEW;
END;
$$;

-- Trigger for agent assignment
CREATE TRIGGER on_agent_assigned
AFTER UPDATE ON public.cases
FOR EACH ROW
EXECUTE FUNCTION public.notify_agent_assigned();