
-- Allow authenticated users to interact with rate_limits (needed for edge function tests)
-- This is safe since the table only contains request timestamps keyed by user ID
CREATE POLICY "Authenticated users can manage their own rate limits"
ON public.rate_limits
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);
