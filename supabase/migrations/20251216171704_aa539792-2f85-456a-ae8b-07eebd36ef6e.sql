-- Update existing 'agent' roles to 'enrolled_agent'
UPDATE public.user_roles SET role = 'enrolled_agent' WHERE role = 'agent';

-- Create invite_codes table for Tax Preparer signups
CREATE TABLE public.invite_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  created_by uuid NOT NULL,
  target_role app_role NOT NULL DEFAULT 'tax_preparer',
  used_by uuid,
  used_at timestamp with time zone,
  expires_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.invite_codes ENABLE ROW LEVEL SECURITY;

-- Enrolled Agents and Tax Preparers can create invite codes
CREATE POLICY "Enrolled Agents can create invite codes"
ON public.invite_codes
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'enrolled_agent'::app_role) 
  AND target_role = 'tax_preparer'::app_role
);

CREATE POLICY "Tax Preparers can create invite codes"
ON public.invite_codes
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'tax_preparer'::app_role) 
  AND target_role = 'tax_preparer'::app_role
);

-- Users can view their own invite codes
CREATE POLICY "Users can view their own invite codes"
ON public.invite_codes
FOR SELECT
USING (created_by = auth.uid());

-- Anyone can check if a code is valid (for signup validation)
CREATE POLICY "Anyone can validate invite codes"
ON public.invite_codes
FOR SELECT
USING (used_by IS NULL AND (expires_at IS NULL OR expires_at > now()));

-- Allow marking codes as used
CREATE POLICY "System can mark codes as used"
ON public.invite_codes
FOR UPDATE
USING (used_by IS NULL)
WITH CHECK (used_by IS NOT NULL);

-- Update RLS policy for user_roles
DROP POLICY IF EXISTS "Users can insert their own client role" ON public.user_roles;

CREATE POLICY "Users can insert their own role"
ON public.user_roles
FOR INSERT
WITH CHECK (
  auth.uid() = user_id 
  AND (
    role = 'client'::app_role
    OR role = 'tax_preparer'::app_role
  )
);

-- Function to generate unique invite code
CREATE OR REPLACE FUNCTION public.generate_invite_code()
RETURNS text
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result text := '';
  i integer;
BEGIN
  FOR i IN 1..8 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
  END LOOP;
  RETURN result;
END;
$$;