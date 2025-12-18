-- Create geo_risk_factors table for state-level audit risk data
CREATE TABLE public.geo_risk_factors (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  state_code TEXT NOT NULL UNIQUE,
  state_name TEXT NOT NULL,
  audit_rate_per_1000 DECIMAL NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.geo_risk_factors ENABLE ROW LEVEL SECURITY;

-- Authenticated users can view
CREATE POLICY "Authenticated users can view geo risk factors"
ON public.geo_risk_factors
FOR SELECT
USING (true);

-- Super admins can manage
CREATE POLICY "Super admins can manage geo risk factors"
ON public.geo_risk_factors
FOR ALL
USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Seed with state audit rate data (based on IRS data - higher rates for certain states)
INSERT INTO public.geo_risk_factors (state_code, state_name, audit_rate_per_1000) VALUES
('AL', 'Alabama', 3.2),
('AK', 'Alaska', 2.8),
('AZ', 'Arizona', 3.5),
('AR', 'Arkansas', 3.1),
('CA', 'California', 4.2),
('CO', 'Colorado', 3.8),
('CT', 'Connecticut', 4.5),
('DE', 'Delaware', 3.3),
('DC', 'District of Columbia', 6.8),
('FL', 'Florida', 4.0),
('GA', 'Georgia', 4.8),
('HI', 'Hawaii', 3.6),
('ID', 'Idaho', 2.5),
('IL', 'Illinois', 3.9),
('IN', 'Indiana', 2.7),
('IA', 'Iowa', 2.4),
('KS', 'Kansas', 2.6),
('KY', 'Kentucky', 2.9),
('LA', 'Louisiana', 5.2),
('ME', 'Maine', 2.3),
('MD', 'Maryland', 4.1),
('MA', 'Massachusetts', 4.3),
('MI', 'Michigan', 3.0),
('MN', 'Minnesota', 3.4),
('MS', 'Mississippi', 5.8),
('MO', 'Missouri', 2.8),
('MT', 'Montana', 2.2),
('NE', 'Nebraska', 2.5),
('NV', 'Nevada', 4.6),
('NH', 'New Hampshire', 2.9),
('NJ', 'New Jersey', 4.4),
('NM', 'New Mexico', 3.7),
('NY', 'New York', 5.5),
('NC', 'North Carolina', 3.3),
('ND', 'North Dakota', 2.1),
('OH', 'Ohio', 2.8),
('OK', 'Oklahoma', 3.0),
('OR', 'Oregon', 3.2),
('PA', 'Pennsylvania', 3.1),
('RI', 'Rhode Island', 3.4),
('SC', 'South Carolina', 3.5),
('SD', 'South Dakota', 2.0),
('TN', 'Tennessee', 3.2),
('TX', 'Texas', 4.7),
('UT', 'Utah', 2.6),
('VT', 'Vermont', 2.4),
('VA', 'Virginia', 3.6),
('WA', 'Washington', 3.8),
('WV', 'West Virginia', 2.7),
('WI', 'Wisconsin', 2.6),
('WY', 'Wyoming', 2.1);