-- Add branding columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS brand_logo_url text,
ADD COLUMN IF NOT EXISTS brand_primary_color text;