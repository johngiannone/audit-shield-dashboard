-- Add brand_firm_name column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS brand_firm_name text;