
-- Allow anon role too (edge function tests run without auth session)
CREATE POLICY "Anon can manage rate limits"
ON public.rate_limits
FOR ALL
TO anon
USING (true)
WITH CHECK (true);
