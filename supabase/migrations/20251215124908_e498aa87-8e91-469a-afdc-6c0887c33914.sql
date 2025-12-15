-- Add referral columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN referral_code text UNIQUE,
ADD COLUMN referred_by uuid REFERENCES public.profiles(id),
ADD COLUMN affiliate_status text DEFAULT 'active';

-- Create function to generate random 8-character alphanumeric code
CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS text
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  chars text := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  result text := '';
  i integer;
BEGIN
  FOR i IN 1..8 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
  END LOOP;
  RETURN result;
END;
$$;

-- Create trigger function to auto-generate referral code on new profile
CREATE OR REPLACE FUNCTION public.set_referral_code()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_code text;
  code_exists boolean;
BEGIN
  -- Generate unique code
  LOOP
    new_code := generate_referral_code();
    SELECT EXISTS(SELECT 1 FROM profiles WHERE referral_code = new_code) INTO code_exists;
    EXIT WHEN NOT code_exists;
  END LOOP;
  
  NEW.referral_code := new_code;
  RETURN NEW;
END;
$$;

-- Create trigger on profiles table
CREATE TRIGGER on_profile_created_set_referral_code
  BEFORE INSERT ON public.profiles
  FOR EACH ROW
  WHEN (NEW.referral_code IS NULL)
  EXECUTE FUNCTION public.set_referral_code();

-- Generate referral codes for existing profiles that don't have one
DO $$
DECLARE
  profile_record RECORD;
  new_code text;
  code_exists boolean;
BEGIN
  FOR profile_record IN SELECT id FROM profiles WHERE referral_code IS NULL LOOP
    LOOP
      new_code := (SELECT generate_referral_code());
      SELECT EXISTS(SELECT 1 FROM profiles WHERE referral_code = new_code) INTO code_exists;
      EXIT WHEN NOT code_exists;
    END LOOP;
    UPDATE profiles SET referral_code = new_code WHERE id = profile_record.id;
  END LOOP;
END;
$$;