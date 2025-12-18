-- Create industry benchmarks table for Schedule C analysis
CREATE TABLE public.industry_benchmarks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  naics_code TEXT NOT NULL UNIQUE,
  industry_name TEXT NOT NULL,
  avg_profit_margin DECIMAL(5,2) NOT NULL,
  avg_cogs_percentage DECIMAL(5,2),
  high_risk_expense_categories TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.industry_benchmarks ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read benchmarks
CREATE POLICY "Authenticated users can view industry benchmarks"
ON public.industry_benchmarks
FOR SELECT
USING (true);

-- Allow super admins to manage benchmarks
CREATE POLICY "Super admins can manage industry benchmarks"
ON public.industry_benchmarks
FOR ALL
USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Insert common industry benchmarks (IRS SOI data approximations)
INSERT INTO public.industry_benchmarks (naics_code, industry_name, avg_profit_margin, avg_cogs_percentage, high_risk_expense_categories) VALUES
('541110', 'Offices of Lawyers', 35.00, 5.00, ARRAY['Travel', 'Entertainment', 'Auto Expenses']),
('541211', 'Offices of CPAs', 32.00, 8.00, ARRAY['Travel', 'Entertainment']),
('541990', 'Other Professional Services', 28.00, 12.00, ARRAY['Travel', 'Meals', 'Home Office']),
('531210', 'Real Estate Agents/Brokers', 18.00, 5.00, ARRAY['Auto Expenses', 'Advertising', 'Travel']),
('621111', 'Offices of Physicians', 40.00, 15.00, ARRAY['Auto Expenses', 'Travel']),
('621210', 'Offices of Dentists', 38.00, 20.00, ARRAY['Auto Expenses', 'Travel']),
('238220', 'Plumbing/HVAC Contractors', 15.00, 45.00, ARRAY['Auto Expenses', 'Tools', 'Supplies']),
('236118', 'Residential Remodelers', 12.00, 50.00, ARRAY['Materials', 'Subcontractors']),
('484110', 'General Freight Trucking', 8.00, 35.00, ARRAY['Fuel', 'Repairs', 'Per Diem']),
('722511', 'Full-Service Restaurants', 6.00, 32.00, ARRAY['Food Costs', 'Labor']),
('812111', 'Barber Shops', 22.00, 10.00, ARRAY['Supplies', 'Rent']),
('812112', 'Beauty Salons', 20.00, 15.00, ARRAY['Supplies', 'Rent']),
('541511', 'Computer Programming', 35.00, 5.00, ARRAY['Equipment', 'Software', 'Home Office']),
('541512', 'Computer Systems Design', 30.00, 10.00, ARRAY['Equipment', 'Subcontractors']),
('453998', 'Misc. Retail Stores', 25.00, 55.00, ARRAY['Inventory', 'Shipping']),
('454110', 'E-commerce/Mail Order', 18.00, 60.00, ARRAY['Inventory', 'Shipping', 'Advertising']);