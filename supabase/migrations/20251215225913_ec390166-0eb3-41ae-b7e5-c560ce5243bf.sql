-- Add managed_by column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN managed_by uuid REFERENCES public.profiles(id);

-- Create index for better query performance
CREATE INDEX idx_profiles_managed_by ON public.profiles(managed_by);

-- RLS Policy: Agents can view profiles they manage
CREATE POLICY "Agents can view profiles they manage"
ON public.profiles
FOR SELECT
USING (
  has_role(auth.uid(), 'agent'::app_role) 
  AND managed_by = get_profile_id(auth.uid())
);

-- RLS Policy: Agents can insert profiles they manage
CREATE POLICY "Agents can insert managed profiles"
ON public.profiles
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'agent'::app_role) 
  AND managed_by = get_profile_id(auth.uid())
);

-- RLS Policy: Agents can update profiles they manage
CREATE POLICY "Agents can update managed profiles"
ON public.profiles
FOR UPDATE
USING (
  has_role(auth.uid(), 'agent'::app_role) 
  AND managed_by = get_profile_id(auth.uid())
);