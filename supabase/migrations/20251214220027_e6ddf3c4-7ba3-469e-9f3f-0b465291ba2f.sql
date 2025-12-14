-- Create partner_leads table for partner applications
CREATE TABLE public.partner_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_name text NOT NULL,
  contact_person text NOT NULL,
  email text NOT NULL,
  annual_returns text NOT NULL,
  tax_software text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'new'
);

-- Enable RLS
ALTER TABLE public.partner_leads ENABLE ROW LEVEL SECURITY;

-- Allow public inserts (no auth required for lead capture)
CREATE POLICY "Anyone can submit partner application"
ON public.partner_leads
FOR INSERT
WITH CHECK (true);

-- Only agents/admins can view leads
CREATE POLICY "Agents can view partner leads"
ON public.partner_leads
FOR SELECT
USING (has_role(auth.uid(), 'agent'));