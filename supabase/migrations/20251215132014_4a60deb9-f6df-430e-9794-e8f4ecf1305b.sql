-- Add avatar_url column to profiles table for LinkedIn profile pictures
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS avatar_url text;