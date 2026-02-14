-- Rate limiting table for edge functions
CREATE TABLE IF NOT EXISTS rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Index for fast lookups by key and time window
CREATE INDEX idx_rate_limits_key_created ON rate_limits (key, created_at DESC);

-- Auto-cleanup: delete entries older than 1 hour
CREATE OR REPLACE FUNCTION cleanup_rate_limits()
RETURNS void AS $$
BEGIN
  DELETE FROM rate_limits WHERE created_at < now() - interval '1 hour';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Allow service role full access (edge functions use service role)
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage rate limits"
  ON rate_limits
  FOR ALL
  USING (true)
  WITH CHECK (true);
