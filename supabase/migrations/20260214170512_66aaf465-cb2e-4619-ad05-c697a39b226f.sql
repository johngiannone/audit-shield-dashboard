
CREATE OR REPLACE FUNCTION public.purge_expired_data()
RETURNS TABLE(table_name text, deleted_count bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_count bigint;
BEGIN
  -- Purge expired/used invite codes
  DELETE FROM public.invite_codes
  WHERE (used_at IS NOT NULL)
     OR (expires_at IS NOT NULL AND expires_at < now());
  GET DIAGNOSTICS v_count = ROW_COUNT;
  table_name := 'invite_codes'; deleted_count := v_count;
  RETURN NEXT;

  -- Purge old used activation codes
  DELETE FROM public.client_activation_codes
  WHERE (used_at IS NOT NULL AND used_at < now() - interval '30 days')
     OR (expires_at IS NOT NULL AND expires_at < now());
  GET DIAGNOSTICS v_count = ROW_COUNT;
  table_name := 'client_activation_codes'; deleted_count := v_count;
  RETURN NEXT;

  -- Purge old security logs (90 days)
  DELETE FROM public.security_logs
  WHERE created_at < now() - interval '90 days';
  GET DIAGNOSTICS v_count = ROW_COUNT;
  table_name := 'security_logs'; deleted_count := v_count;
  RETURN NEXT;

  -- Purge old AI usage logs (90 days)
  DELETE FROM public.ai_usage_logs
  WHERE created_at < now() - interval '90 days';
  GET DIAGNOSTICS v_count = ROW_COUNT;
  table_name := 'ai_usage_logs'; deleted_count := v_count;
  RETURN NEXT;

  -- Purge old read notifications (60 days)
  DELETE FROM public.notifications
  WHERE is_read = true AND created_at < now() - interval '60 days';
  GET DIAGNOSTICS v_count = ROW_COUNT;
  table_name := 'notifications'; deleted_count := v_count;
  RETURN NEXT;
END;
$$;
