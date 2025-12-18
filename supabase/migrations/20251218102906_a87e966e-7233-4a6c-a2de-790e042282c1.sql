-- Function to notify agent when client uploads a document
CREATE OR REPLACE FUNCTION public.notify_document_uploaded()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_case record;
    v_client_name text;
BEGIN
    -- Get the case details
    SELECT * INTO v_case FROM public.cases WHERE id = NEW.case_id;
    
    -- Only notify if there's an assigned agent and the uploader is the client
    IF v_case.assigned_agent_id IS NOT NULL AND NEW.uploaded_by = v_case.client_id THEN
        -- Get client name
        SELECT COALESCE(full_name, email, 'A client') INTO v_client_name 
        FROM public.profiles WHERE id = v_case.client_id;
        
        -- Insert notification for the agent
        INSERT INTO public.notifications (user_id, type, title, message, link_url)
        VALUES (
            v_case.assigned_agent_id,
            'info'::notification_type,
            'Document Uploaded',
            v_client_name || ' uploaded: ' || NEW.file_name,
            '/agent/cases/' || NEW.case_id
        );
    END IF;
    
    RETURN NEW;
END;
$$;

-- Trigger for document uploads
CREATE TRIGGER on_document_uploaded
AFTER INSERT ON public.case_documents
FOR EACH ROW
EXECUTE FUNCTION public.notify_document_uploaded();