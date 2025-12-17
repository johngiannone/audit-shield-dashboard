-- Create function to generate unique 8-character activation codes
CREATE OR REPLACE FUNCTION public.generate_client_activation_code()
RETURNS TEXT
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result TEXT := '';
  i INTEGER;
  code_exists BOOLEAN;
BEGIN
  LOOP
    result := '';
    FOR i IN 1..8 LOOP
      result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
    END LOOP;
    -- Check if code already exists
    SELECT EXISTS(SELECT 1 FROM public.client_activation_codes WHERE code = result) INTO code_exists;
    EXIT WHEN NOT code_exists;
  END LOOP;
  RETURN result;
END;
$$;

-- Create client_activation_codes table
CREATE TABLE public.client_activation_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_by UUID NOT NULL REFERENCES public.profiles(id),
  used_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE public.client_activation_codes ENABLE ROW LEVEL SECURITY;

-- Tax preparers can view codes they created
CREATE POLICY "Tax preparers can view their activation codes"
ON public.client_activation_codes
FOR SELECT
USING (
  has_role(auth.uid(), 'tax_preparer'::app_role) 
  AND created_by = get_profile_id(auth.uid())
);

-- Tax preparers can insert activation codes for their clients
CREATE POLICY "Tax preparers can create activation codes"
ON public.client_activation_codes
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'tax_preparer'::app_role)
  AND created_by = get_profile_id(auth.uid())
);

-- Public can validate codes (for activation page - handled by service role)
CREATE POLICY "Anyone can validate unused codes"
ON public.client_activation_codes
FOR SELECT
USING (
  used_at IS NULL 
  AND (expires_at IS NULL OR expires_at > now())
);

-- Create index for faster lookups
CREATE INDEX idx_activation_codes_code ON public.client_activation_codes(code);
CREATE INDEX idx_activation_codes_profile ON public.client_activation_codes(profile_id);
CREATE INDEX idx_activation_codes_created_by ON public.client_activation_codes(created_by);