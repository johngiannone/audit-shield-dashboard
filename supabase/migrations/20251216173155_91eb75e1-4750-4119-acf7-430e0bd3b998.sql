-- Update RLS policies to use enrolled_agent instead of agent

-- ============================================
-- AFFILIATES TABLE
-- ============================================
DROP POLICY IF EXISTS "Agents can view all affiliates" ON public.affiliates;
CREATE POLICY "Enrolled agents can view all affiliates" ON public.affiliates
  FOR SELECT USING (has_role(auth.uid(), 'enrolled_agent'::app_role));

-- ============================================
-- AUDIT_PLANS TABLE
-- ============================================
DROP POLICY IF EXISTS "Agents can view all plans" ON public.audit_plans;
CREATE POLICY "Enrolled agents can view all plans" ON public.audit_plans
  FOR SELECT USING (has_role(auth.uid(), 'enrolled_agent'::app_role));

-- ============================================
-- CASE_DOCUMENTS TABLE
-- ============================================
DROP POLICY IF EXISTS "Agents can view all case documents" ON public.case_documents;
CREATE POLICY "Enrolled agents can view all case documents" ON public.case_documents
  FOR SELECT USING (has_role(auth.uid(), 'enrolled_agent'::app_role));

DROP POLICY IF EXISTS "Agents can upload to assigned cases" ON public.case_documents;
CREATE POLICY "Enrolled agents can upload to assigned cases" ON public.case_documents
  FOR INSERT WITH CHECK (
    has_role(auth.uid(), 'enrolled_agent'::app_role) AND 
    EXISTS (
      SELECT 1 FROM cases 
      WHERE cases.id = case_documents.case_id 
      AND cases.assigned_agent_id = get_profile_id(auth.uid())
    )
  );

-- ============================================
-- CASE_MESSAGES TABLE
-- ============================================
DROP POLICY IF EXISTS "Agents can view assigned case messages" ON public.case_messages;
CREATE POLICY "Enrolled agents can view assigned case messages" ON public.case_messages
  FOR SELECT USING (
    has_role(auth.uid(), 'enrolled_agent'::app_role) AND 
    EXISTS (
      SELECT 1 FROM cases 
      WHERE cases.id = case_messages.case_id 
      AND cases.assigned_agent_id = get_profile_id(auth.uid())
    )
  );

DROP POLICY IF EXISTS "Agents can send messages to assigned cases" ON public.case_messages;
CREATE POLICY "Enrolled agents can send messages to assigned cases" ON public.case_messages
  FOR INSERT WITH CHECK (
    has_role(auth.uid(), 'enrolled_agent'::app_role) AND 
    sender_id = get_profile_id(auth.uid()) AND 
    EXISTS (
      SELECT 1 FROM cases 
      WHERE cases.id = case_messages.case_id 
      AND cases.assigned_agent_id = get_profile_id(auth.uid())
    )
  );

-- ============================================
-- CASE_NOTES TABLE
-- ============================================
DROP POLICY IF EXISTS "Agents can view notes on assigned cases" ON public.case_notes;
CREATE POLICY "Enrolled agents can view notes on assigned cases" ON public.case_notes
  FOR SELECT USING (
    has_role(auth.uid(), 'enrolled_agent'::app_role) AND 
    EXISTS (
      SELECT 1 FROM cases 
      WHERE cases.id = case_notes.case_id 
      AND cases.assigned_agent_id = get_profile_id(auth.uid())
    )
  );

DROP POLICY IF EXISTS "Agents can add notes to assigned cases" ON public.case_notes;
CREATE POLICY "Enrolled agents can add notes to assigned cases" ON public.case_notes
  FOR INSERT WITH CHECK (
    has_role(auth.uid(), 'enrolled_agent'::app_role) AND 
    agent_id = get_profile_id(auth.uid()) AND 
    EXISTS (
      SELECT 1 FROM cases 
      WHERE cases.id = case_notes.case_id 
      AND cases.assigned_agent_id = get_profile_id(auth.uid())
    )
  );

-- ============================================
-- CASE_STATUS_HISTORY TABLE
-- ============================================
DROP POLICY IF EXISTS "Agents can view all case history" ON public.case_status_history;
CREATE POLICY "Enrolled agents can view all case history" ON public.case_status_history
  FOR SELECT USING (has_role(auth.uid(), 'enrolled_agent'::app_role));

DROP POLICY IF EXISTS "Agents can insert status history" ON public.case_status_history;
CREATE POLICY "Enrolled agents can insert status history" ON public.case_status_history
  FOR INSERT WITH CHECK (has_role(auth.uid(), 'enrolled_agent'::app_role));

-- ============================================
-- CASES TABLE
-- ============================================
DROP POLICY IF EXISTS "Agents can view all cases" ON public.cases;
CREATE POLICY "Enrolled agents can view all cases" ON public.cases
  FOR SELECT USING (has_role(auth.uid(), 'enrolled_agent'::app_role));

DROP POLICY IF EXISTS "Agents can update assigned or unassigned cases" ON public.cases;
CREATE POLICY "Enrolled agents can update assigned or unassigned cases" ON public.cases
  FOR UPDATE USING (
    has_role(auth.uid(), 'enrolled_agent'::app_role) AND 
    (assigned_agent_id IS NULL OR assigned_agent_id = get_profile_id(auth.uid()))
  );

-- ============================================
-- DOCUMENT_REQUESTS TABLE
-- ============================================
DROP POLICY IF EXISTS "Agents can view requests on assigned cases" ON public.document_requests;
CREATE POLICY "Enrolled agents can view requests on assigned cases" ON public.document_requests
  FOR SELECT USING (
    has_role(auth.uid(), 'enrolled_agent'::app_role) AND 
    EXISTS (
      SELECT 1 FROM cases 
      WHERE cases.id = document_requests.case_id 
      AND cases.assigned_agent_id = get_profile_id(auth.uid())
    )
  );

DROP POLICY IF EXISTS "Agents can insert requests on assigned cases" ON public.document_requests;
CREATE POLICY "Enrolled agents can insert requests on assigned cases" ON public.document_requests
  FOR INSERT WITH CHECK (
    has_role(auth.uid(), 'enrolled_agent'::app_role) AND 
    requested_by = get_profile_id(auth.uid()) AND 
    EXISTS (
      SELECT 1 FROM cases 
      WHERE cases.id = document_requests.case_id 
      AND cases.assigned_agent_id = get_profile_id(auth.uid())
    )
  );

DROP POLICY IF EXISTS "Agents can update requests on assigned cases" ON public.document_requests;
CREATE POLICY "Enrolled agents can update requests on assigned cases" ON public.document_requests
  FOR UPDATE USING (
    has_role(auth.uid(), 'enrolled_agent'::app_role) AND 
    EXISTS (
      SELECT 1 FROM cases 
      WHERE cases.id = document_requests.case_id 
      AND cases.assigned_agent_id = get_profile_id(auth.uid())
    )
  );

-- ============================================
-- PARTNER_LEADS TABLE
-- ============================================
DROP POLICY IF EXISTS "Agents can view partner leads" ON public.partner_leads;
CREATE POLICY "Enrolled agents can view partner leads" ON public.partner_leads
  FOR SELECT USING (has_role(auth.uid(), 'enrolled_agent'::app_role));

-- ============================================
-- PROFILES TABLE
-- ============================================
DROP POLICY IF EXISTS "Agents can view all profiles" ON public.profiles;
CREATE POLICY "Enrolled agents can view all profiles" ON public.profiles
  FOR SELECT USING (has_role(auth.uid(), 'enrolled_agent'::app_role));

DROP POLICY IF EXISTS "Agents can insert managed profiles" ON public.profiles;
CREATE POLICY "Tax preparers can insert managed profiles" ON public.profiles
  FOR INSERT WITH CHECK (
    has_role(auth.uid(), 'tax_preparer'::app_role) AND 
    managed_by = get_profile_id(auth.uid())
  );

DROP POLICY IF EXISTS "Agents can update managed profiles" ON public.profiles;
CREATE POLICY "Tax preparers can update managed profiles" ON public.profiles
  FOR UPDATE USING (
    has_role(auth.uid(), 'tax_preparer'::app_role) AND 
    managed_by = get_profile_id(auth.uid())
  );

DROP POLICY IF EXISTS "Agents can view profiles they manage" ON public.profiles;
CREATE POLICY "Tax preparers can view profiles they manage" ON public.profiles
  FOR SELECT USING (
    has_role(auth.uid(), 'tax_preparer'::app_role) AND 
    managed_by = get_profile_id(auth.uid())
  );

-- ============================================
-- REFERRAL_VISITS TABLE
-- ============================================
DROP POLICY IF EXISTS "Agents can view all referral visits" ON public.referral_visits;
CREATE POLICY "Tax preparers can view all referral visits" ON public.referral_visits
  FOR SELECT USING (has_role(auth.uid(), 'tax_preparer'::app_role));