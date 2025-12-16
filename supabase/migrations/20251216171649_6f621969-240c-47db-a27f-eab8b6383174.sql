-- Add new enum values only
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'enrolled_agent';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'tax_preparer';