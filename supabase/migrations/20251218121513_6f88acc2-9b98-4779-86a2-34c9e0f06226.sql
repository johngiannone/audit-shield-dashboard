-- Create AI usage logs table for cost tracking
CREATE TABLE public.ai_usage_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_name TEXT NOT NULL,
  model_id TEXT NOT NULL,
  input_tokens INTEGER,
  output_tokens INTEGER,
  total_tokens INTEGER,
  estimated_cost NUMERIC(10, 6) DEFAULT 0,
  profile_id UUID REFERENCES public.profiles(id),
  resource_type TEXT,
  resource_id TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for querying by date and task
CREATE INDEX idx_ai_usage_logs_created_at ON public.ai_usage_logs(created_at DESC);
CREATE INDEX idx_ai_usage_logs_task_name ON public.ai_usage_logs(task_name);
CREATE INDEX idx_ai_usage_logs_profile_id ON public.ai_usage_logs(profile_id);

-- Enable RLS
ALTER TABLE public.ai_usage_logs ENABLE ROW LEVEL SECURITY;

-- Super admins can view all logs
CREATE POLICY "Super admins can view all usage logs"
  ON public.ai_usage_logs
  FOR SELECT
  USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Tax preparers can view their own usage
CREATE POLICY "Tax preparers can view their own usage"
  ON public.ai_usage_logs
  FOR SELECT
  USING (has_role(auth.uid(), 'tax_preparer'::app_role) AND profile_id = get_profile_id(auth.uid()));

-- Allow edge functions to insert (service role)
CREATE POLICY "Service role can insert usage logs"
  ON public.ai_usage_logs
  FOR INSERT
  WITH CHECK (true);