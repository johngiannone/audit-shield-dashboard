-- Add covered_years array column to audit_plans table
ALTER TABLE public.audit_plans 
ADD COLUMN covered_years integer[] NOT NULL DEFAULT ARRAY[2024];

-- Add stripe_customer_id and stripe_subscription_id for tracking
ALTER TABLE public.audit_plans 
ADD COLUMN stripe_customer_id text,
ADD COLUMN stripe_subscription_id text;