-- Create AI model configuration table
CREATE TABLE public.ai_model_config (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_name text NOT NULL UNIQUE,
  provider text NOT NULL DEFAULT 'openrouter',
  model_id text NOT NULL,
  fallback_model_id text,
  temperature numeric DEFAULT 0.0,
  max_tokens integer DEFAULT 4096,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ai_model_config ENABLE ROW LEVEL SECURITY;

-- Super admins can manage all configs
CREATE POLICY "Super admins can manage ai model config"
  ON public.ai_model_config
  FOR ALL
  USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Tax preparers can view configs (for transparency)
CREATE POLICY "Tax preparers can view ai model config"
  ON public.ai_model_config
  FOR SELECT
  USING (has_role(auth.uid(), 'tax_preparer'::app_role));

-- Enrolled agents can view configs
CREATE POLICY "Enrolled agents can view ai model config"
  ON public.ai_model_config
  FOR SELECT
  USING (has_role(auth.uid(), 'enrolled_agent'::app_role));

-- Insert default configurations
INSERT INTO public.ai_model_config (task_name, provider, model_id, fallback_model_id, temperature, max_tokens, description) VALUES
  ('ocr_extraction', 'openrouter', 'google/gemini-flash-1.5', 'anthropic/claude-3.5-sonnet', 0.0, 4096, 'Extract data from uploaded tax notices and documents'),
  ('batch_scan', 'openrouter', 'google/gemini-flash-1.5', 'anthropic/claude-3.5-sonnet', 0.0, 4096, 'Batch processing of tax returns for risk analysis'),
  ('response_drafting', 'openrouter', 'anthropic/claude-3.5-sonnet', 'google/gemini-flash-1.5', 0.3, 8192, 'Draft formal IRS response letters'),
  ('audit_risk_analysis', 'openrouter', 'google/gemini-flash-1.5', 'anthropic/claude-3.5-sonnet', 0.0, 4096, 'Analyze audit risk factors from Form 1040');

-- Add trigger for updated_at
CREATE TRIGGER update_ai_model_config_updated_at
  BEFORE UPDATE ON public.ai_model_config
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();