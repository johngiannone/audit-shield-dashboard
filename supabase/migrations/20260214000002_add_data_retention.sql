-- Create data retention policies table
CREATE TABLE IF NOT EXISTS data_retention_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  data_type TEXT NOT NULL UNIQUE,
  retention_days INTEGER NOT NULL CHECK (retention_days > 0),
  auto_purge BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default retention policies
INSERT INTO data_retention_policies (data_type, retention_days, auto_purge)
VALUES
  ('temp_files', 7, true),
  ('security_logs', 365, true),
  ('ai_usage_logs', 180, true),
  ('completed_cases', 2555, false)
ON CONFLICT (data_type) DO UPDATE
SET updated_at = NOW();

-- Create function to purge expired data
CREATE OR REPLACE FUNCTION purge_expired_data()
RETURNS TABLE(table_name TEXT, deleted_count INTEGER) AS $$
DECLARE
  v_retention_days INTEGER;
  v_temp_count INTEGER := 0;
  v_logs_count INTEGER := 0;
  v_ai_count INTEGER := 0;
  v_cutoff_date TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Get retention days for temp files
  SELECT retention_days INTO v_retention_days
  FROM data_retention_policies
  WHERE data_type = 'temp_files';

  IF v_retention_days IS NOT NULL THEN
    v_cutoff_date := NOW() - (v_retention_days || ' days')::INTERVAL;
    DELETE FROM rate_limits
    WHERE created_at < v_cutoff_date;
    GET DIAGNOSTICS v_temp_count = ROW_COUNT;
  END IF;

  -- Get retention days for security logs
  SELECT retention_days INTO v_retention_days
  FROM data_retention_policies
  WHERE data_type = 'security_logs';

  IF v_retention_days IS NOT NULL THEN
    v_cutoff_date := NOW() - (v_retention_days || ' days')::INTERVAL;
    DELETE FROM security_logs
    WHERE created_at < v_cutoff_date;
    GET DIAGNOSTICS v_logs_count = ROW_COUNT;
  END IF;

  -- Get retention days for AI usage logs
  SELECT retention_days INTO v_retention_days
  FROM data_retention_policies
  WHERE data_type = 'ai_usage_logs';

  IF v_retention_days IS NOT NULL THEN
    v_cutoff_date := NOW() - (v_retention_days || ' days')::INTERVAL;
    DELETE FROM ai_usage_logs
    WHERE created_at < v_cutoff_date;
    GET DIAGNOSTICS v_ai_count = ROW_COUNT;
  END IF;

  -- Return summary
  RETURN QUERY
  SELECT 'rate_limits'::TEXT, v_temp_count::INTEGER
  UNION ALL
  SELECT 'security_logs'::TEXT, v_logs_count::INTEGER
  UNION ALL
  SELECT 'ai_usage_logs'::TEXT, v_ai_count::INTEGER;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create or update trigger for updated_at timestamp
CREATE OR REPLACE TRIGGER update_data_retention_policies_timestamp
BEFORE UPDATE ON data_retention_policies
FOR EACH ROW
EXECUTE FUNCTION update_timestamp();

-- Enable RLS on data_retention_policies
ALTER TABLE data_retention_policies ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for admin access only
CREATE POLICY data_retention_admin_policy ON data_retention_policies
  FOR ALL
  USING (
    auth.uid() IN (
      SELECT id FROM auth.users WHERE raw_user_meta_data->>'role' = 'admin'
    )
  )
  WITH CHECK (
    auth.uid() IN (
      SELECT id FROM auth.users WHERE raw_user_meta_data->>'role' = 'admin'
    )
  );

-- Create RLS policy for service role (Supabase admin)
CREATE POLICY data_retention_service_role ON data_retention_policies
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Commented out: pg_cron job requires pg_cron extension to be enabled
-- To enable this, run: CREATE EXTENSION pg_cron;
-- Then uncomment the following:
-- SELECT cron.schedule('purge_expired_data_daily', '0 2 * * *', 'SELECT purge_expired_data()');

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION purge_expired_data TO authenticated, service_role;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_rate_limits_created_at ON rate_limits(created_at);
CREATE INDEX IF NOT EXISTS idx_security_logs_created_at ON security_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_created_at ON ai_usage_logs(created_at);
