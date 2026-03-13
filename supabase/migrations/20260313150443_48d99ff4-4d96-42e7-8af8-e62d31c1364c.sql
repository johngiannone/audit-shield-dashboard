
DROP POLICY "Service role full access" ON public.rate_limits;
CREATE POLICY "Service role only" ON public.rate_limits FOR ALL TO service_role USING (true) WITH CHECK (true);
