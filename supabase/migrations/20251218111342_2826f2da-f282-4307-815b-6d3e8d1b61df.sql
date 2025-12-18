-- Create occupation wages table for income reasonability checks
CREATE TABLE public.occupation_wages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  job_title_keyword TEXT NOT NULL,
  avg_annual_wage INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.occupation_wages ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read
CREATE POLICY "Authenticated users can view occupation wages"
ON public.occupation_wages
FOR SELECT
USING (true);

-- Allow super admins to manage
CREATE POLICY "Super admins can manage occupation wages"
ON public.occupation_wages
FOR ALL
USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Create index for faster text searching
CREATE INDEX idx_occupation_wages_keyword ON public.occupation_wages USING gin(to_tsvector('english', job_title_keyword));

-- Seed with common occupations (BLS data approximations)
INSERT INTO public.occupation_wages (job_title_keyword, avg_annual_wage) VALUES
-- Tech
('software engineer', 110000),
('software developer', 105000),
('programmer', 95000),
('web developer', 85000),
('data scientist', 120000),
('data analyst', 75000),
('it manager', 140000),
('systems administrator', 85000),
('network engineer', 95000),
('cybersecurity', 110000),
-- Healthcare
('doctor', 200000),
('physician', 200000),
('surgeon', 300000),
('dentist', 175000),
('nurse', 80000),
('registered nurse', 85000),
('nurse practitioner', 115000),
('pharmacist', 130000),
('physical therapist', 90000),
('psychologist', 95000),
-- Education
('teacher', 60000),
('professor', 85000),
('principal', 100000),
('school administrator', 95000),
-- Legal/Finance
('lawyer', 145000),
('attorney', 145000),
('paralegal', 55000),
('accountant', 75000),
('cpa', 85000),
('financial analyst', 90000),
('financial advisor', 95000),
('banker', 70000),
('investment banker', 150000),
-- Trades
('electrician', 60000),
('plumber', 58000),
('carpenter', 52000),
('hvac technician', 55000),
('mechanic', 48000),
('welder', 50000),
('construction worker', 45000),
('contractor', 75000),
-- Service/Retail
('retail manager', 50000),
('sales manager', 85000),
('real estate agent', 65000),
('realtor', 65000),
('restaurant manager', 55000),
('chef', 55000),
('bartender', 35000),
('waiter', 30000),
('server', 30000),
-- Management
('ceo', 200000),
('executive', 150000),
('manager', 70000),
('project manager', 85000),
('operations manager', 75000),
('human resources', 65000),
('hr manager', 75000),
-- Other Professionals
('engineer', 90000),
('architect', 85000),
('marketing manager', 80000),
('graphic designer', 55000),
('writer', 50000),
('journalist', 55000),
('consultant', 95000),
('business analyst', 80000),
('pilot', 130000),
('truck driver', 50000),
('driver', 40000);