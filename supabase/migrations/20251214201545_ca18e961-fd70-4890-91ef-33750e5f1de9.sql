-- Add tax_return_path column to cases table for storing uploaded tax returns
ALTER TABLE public.cases ADD COLUMN tax_return_path text;