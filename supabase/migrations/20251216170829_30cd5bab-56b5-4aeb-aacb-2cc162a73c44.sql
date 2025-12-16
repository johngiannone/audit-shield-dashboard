-- Allow users to insert their own role during signup (only client role)
CREATE POLICY "Users can insert their own client role"
ON public.user_roles
FOR INSERT
WITH CHECK (
  auth.uid() = user_id 
  AND role = 'client'::app_role
);