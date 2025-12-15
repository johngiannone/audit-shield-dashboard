-- Add email column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN email text;

-- Create index for email lookups
CREATE INDEX idx_profiles_email ON public.profiles(email);

-- Create function to check if a user's email is confirmed (activated)
CREATE OR REPLACE FUNCTION public.is_user_activated(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT email_confirmed_at IS NOT NULL 
     FROM auth.users 
     WHERE id = p_user_id),
    false
  )
$$;