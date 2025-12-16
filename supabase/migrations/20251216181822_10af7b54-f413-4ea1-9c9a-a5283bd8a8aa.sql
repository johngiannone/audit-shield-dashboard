-- Allow tax preparers to insert audit_plans for their managed clients
CREATE POLICY "Tax preparers can comp their managed clients"
ON public.audit_plans
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'tax_preparer'::app_role) 
  AND EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = audit_plans.profile_id 
    AND profiles.managed_by = get_profile_id(auth.uid())
  )
);