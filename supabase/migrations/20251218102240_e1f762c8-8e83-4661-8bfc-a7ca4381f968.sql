-- Function to notify client when a document is requested
CREATE OR REPLACE FUNCTION public.notify_document_request()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_case record;
BEGIN
    -- Get the case to find the client
    SELECT * INTO v_case FROM public.cases WHERE id = NEW.case_id;
    
    -- Insert notification for the client
    INSERT INTO public.notifications (user_id, type, title, message, link_url)
    VALUES (
        v_case.client_id,
        'warning'::notification_type,
        'Document Requested',
        'Your agent requested: ' || NEW.document_name,
        '/cases/' || NEW.case_id
    );
    
    RETURN NEW;
END;
$$;

-- Trigger for new document requests
CREATE TRIGGER on_document_request_created
AFTER INSERT ON public.document_requests
FOR EACH ROW
EXECUTE FUNCTION public.notify_document_request();