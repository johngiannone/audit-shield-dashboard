-- Create table for IRS service center addresses
CREATE TABLE public.irs_service_centers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  state_code text NOT NULL,
  submission_type text NOT NULL DEFAULT 'penalty_abatement',
  service_center_name text NOT NULL,
  address_line_1 text NOT NULL,
  address_line_2 text NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

-- Create unique constraint for state + submission type
ALTER TABLE public.irs_service_centers 
ADD CONSTRAINT irs_service_centers_state_type_unique 
UNIQUE (state_code, submission_type);

-- Enable RLS
ALTER TABLE public.irs_service_centers ENABLE ROW LEVEL SECURITY;

-- Authenticated users can view (reference data)
CREATE POLICY "Authenticated users can view IRS service centers"
ON public.irs_service_centers FOR SELECT
USING (true);

-- Super admins can manage
CREATE POLICY "Super admins can manage IRS service centers"
ON public.irs_service_centers FOR ALL
USING (has_role(auth.uid(), 'super_admin'::app_role));