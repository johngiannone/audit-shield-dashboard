-- Create irs_benchmarks table for IRS SOI benchmark data
CREATE TABLE public.irs_benchmarks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  income_range_min integer NOT NULL,
  income_range_max integer,
  avg_charitable_deduction decimal(5,4) NOT NULL,
  avg_medical_expense decimal(5,4),
  avg_mortgage_interest decimal(5,4),
  tax_year integer NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create risk_assessments table for profile risk scores
CREATE TABLE public.risk_assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  risk_score integer NOT NULL CHECK (risk_score >= 0 AND risk_score <= 100),
  red_flags jsonb DEFAULT '[]'::jsonb,
  analyzed_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.irs_benchmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.risk_assessments ENABLE ROW LEVEL SECURITY;

-- RLS for irs_benchmarks: Read-only for authenticated users (reference data)
CREATE POLICY "Authenticated users can view benchmarks"
  ON public.irs_benchmarks
  FOR SELECT
  TO authenticated
  USING (true);

-- RLS for risk_assessments
CREATE POLICY "Users can view their own risk assessments"
  ON public.risk_assessments
  FOR SELECT
  USING (profile_id = get_profile_id(auth.uid()));

CREATE POLICY "Enrolled agents can view all risk assessments"
  ON public.risk_assessments
  FOR SELECT
  USING (has_role(auth.uid(), 'enrolled_agent'));

CREATE POLICY "Enrolled agents can insert risk assessments"
  ON public.risk_assessments
  FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'enrolled_agent'));

CREATE POLICY "Super admins can manage benchmarks"
  ON public.irs_benchmarks
  FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'super_admin'));

-- Seed IRS SOI 2021 benchmark data
INSERT INTO public.irs_benchmarks (income_range_min, income_range_max, avg_charitable_deduction, avg_medical_expense, avg_mortgage_interest, tax_year) VALUES
  (50000, 100000, 0.0300, 0.0500, 0.0800, 2021),
  (100000, 200000, 0.0350, 0.0400, 0.0700, 2021),
  (200000, NULL, 0.0400, 0.0300, 0.0600, 2021),
  (50000, 100000, 0.0300, 0.0500, 0.0800, 2022),
  (100000, 200000, 0.0350, 0.0400, 0.0700, 2022),
  (200000, NULL, 0.0400, 0.0300, 0.0600, 2022),
  (50000, 100000, 0.0300, 0.0500, 0.0800, 2023),
  (100000, 200000, 0.0350, 0.0400, 0.0700, 2023),
  (200000, NULL, 0.0400, 0.0300, 0.0600, 2023),
  (50000, 100000, 0.0300, 0.0500, 0.0800, 2024),
  (100000, 200000, 0.0350, 0.0400, 0.0700, 2024),
  (200000, NULL, 0.0400, 0.0300, 0.0600, 2024);

-- Create index for efficient lookups
CREATE INDEX idx_irs_benchmarks_lookup ON public.irs_benchmarks(tax_year, income_range_min, income_range_max);
CREATE INDEX idx_risk_assessments_profile ON public.risk_assessments(profile_id);