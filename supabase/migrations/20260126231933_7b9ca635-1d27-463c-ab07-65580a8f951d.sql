-- Add CAF Number and PTIN columns to profiles table for enrolled agents
ALTER TABLE public.profiles 
ADD COLUMN caf_number text,
ADD COLUMN ptin text;