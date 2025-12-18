-- Create security_logs table for audit trail
CREATE TABLE public.security_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL,
  resource_type text,
  resource_id text,
  ip_address text,
  user_agent text,
  metadata jsonb DEFAULT '{}',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create indexes for efficient querying
CREATE INDEX idx_security_logs_user_id ON public.security_logs(user_id);
CREATE INDEX idx_security_logs_action ON public.security_logs(action);
CREATE INDEX idx_security_logs_created_at ON public.security_logs(created_at DESC);
CREATE INDEX idx_security_logs_resource ON public.security_logs(resource_type, resource_id);

-- Enable Row Level Security
ALTER TABLE public.security_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Allow authenticated users to INSERT their own logs
CREATE POLICY "Users can insert their own logs"
ON public.security_logs
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- RLS Policy: Super Admins can view all logs
CREATE POLICY "Super admins can view all logs"
ON public.security_logs
FOR SELECT
USING (public.has_role(auth.uid(), 'super_admin'));

-- NO UPDATE or DELETE policies - logs are immutable (INSERT-only)