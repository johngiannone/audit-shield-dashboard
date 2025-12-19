-- Create IRS transaction codes reference table
CREATE TABLE public.irs_transaction_codes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code text NOT NULL UNIQUE,
  description text NOT NULL,
  severity text NOT NULL DEFAULT 'routine',
  category text,
  explanation text,
  recommended_action text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.irs_transaction_codes ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read codes
CREATE POLICY "Authenticated users can view transaction codes"
ON public.irs_transaction_codes
FOR SELECT
USING (true);

-- Super admins can manage codes
CREATE POLICY "Super admins can manage transaction codes"
ON public.irs_transaction_codes
FOR ALL
USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Seed common IRS transaction codes
INSERT INTO public.irs_transaction_codes (code, description, severity, category, explanation, recommended_action) VALUES
-- Critical codes (audit/examination related)
('420', 'Examination Indicator', 'critical', 'audit', 'Your return has been selected for examination (audit). This is the most important code to watch for.', 'Gather all documentation for the tax year. Consider consulting a tax professional immediately.'),
('421', 'Reversed Examination Indicator', 'high', 'audit', 'The examination indicator has been reversed, but this could still indicate IRS scrutiny.', 'Monitor for any follow-up notices.'),
('424', 'Examination Request Indicator', 'critical', 'audit', 'An examination has been requested for your account.', 'Prepare for potential audit. Gather all supporting documents.'),
('914', 'Examination Activity', 'critical', 'audit', 'Active examination or audit activity on your account.', 'Respond promptly to any IRS correspondence.'),

-- High severity codes
('570', 'Additional Liability Pending/or Credit Hold', 'high', 'hold', 'There is a hold on your account preventing refund or credit release.', 'Check for pending notices. May need to verify information with IRS.'),
('571', 'Resolved Additional Liability Pending', 'medium', 'hold', 'A previous hold (570) has been resolved.', 'Your account issue has been addressed.'),
('810', 'Refund Freeze', 'high', 'freeze', 'Your refund has been frozen pending review.', 'Wait for IRS notice explaining the freeze. Respond if documentation is requested.'),
('811', 'Reversed Refund Freeze', 'medium', 'freeze', 'A previous refund freeze has been lifted.', 'Your refund should process normally now.'),
('971', 'Notice Issued', 'high', 'notice', 'The IRS has issued a notice to you. Check your mail.', 'Watch for IRS correspondence and respond by any deadlines.'),
('976', 'Duplicate Return Filed', 'high', 'identity', 'A duplicate return was filed under your SSN - possible identity theft.', 'Contact IRS Identity Protection unit immediately. File Form 14039.'),

-- Medium severity codes
('290', 'Additional Tax Assessed', 'medium', 'assessment', 'Additional tax has been assessed on your account.', 'Review the assessment and pay or dispute if incorrect.'),
('291', 'Prior Tax Abated', 'medium', 'assessment', 'Previously assessed tax has been reduced or removed.', 'Verify the abatement matches any adjustments you requested.'),
('300', 'Additional Tax Assessed by Examination', 'medium', 'audit', 'Tax was added as a result of an audit.', 'Review the audit findings. Consider appeal if you disagree.'),
('301', 'Tax Decrease after Examination', 'low', 'audit', 'Tax was reduced as a result of examination.', 'Favorable outcome from audit review.'),
('170', 'Penalty for Late Filing', 'medium', 'penalty', 'A failure-to-file penalty has been assessed.', 'If you have reasonable cause, request penalty abatement.'),
('276', 'Failure to Pay Penalty', 'medium', 'penalty', 'A failure-to-pay penalty has been assessed.', 'Pay the balance or set up a payment plan. Consider FTA if eligible.'),
('196', 'Interest Charged', 'medium', 'interest', 'Interest has been charged on unpaid balance.', 'Interest accrues daily. Pay balance to stop additional interest.'),

-- Routine/informational codes
('150', 'Tax Return Filed', 'routine', 'filing', 'Your tax return has been received and processed.', 'Normal processing code. No action needed.'),
('766', 'Credit to Account', 'routine', 'credit', 'A credit has been applied to your account (withholding, estimated payments).', 'Normal credit posting. No action needed.'),
('768', 'Earned Income Credit', 'routine', 'credit', 'Earned Income Tax Credit has been applied.', 'Normal credit posting. No action needed.'),
('806', 'W-2 or 1099 Withholding Credit', 'routine', 'credit', 'Federal tax withholding from your W-2 or 1099 forms.', 'Normal credit posting. No action needed.'),
('826', 'Credit Applied to Outstanding Liability', 'low', 'credit', 'Your refund or credit was applied to a balance you owe.', 'Review if you believe you do not have an outstanding liability.'),
('846', 'Refund Issued', 'routine', 'refund', 'Your refund has been sent.', 'Check your bank account or watch for check in mail.'),
('898', 'Refund Applied to Non-IRS Debt', 'low', 'offset', 'Your refund was offset to pay other government debt (student loans, child support).', 'Contact the agency that received the offset if you believe it is in error.'),
('841', 'Refund Cancelled', 'medium', 'refund', 'A previously scheduled refund was cancelled.', 'Check for notices explaining why. May need to verify information.'),

-- Identity/fraud related
('977', 'Amended Return Filed', 'low', 'filing', 'An amended return (1040-X) has been filed.', 'If you did not file an amended return, contact IRS immediately.'),
('922', 'Criminal Investigation', 'critical', 'investigation', 'Criminal investigation division is involved with your account.', 'Seek legal representation immediately. Do not contact IRS without counsel.')

ON CONFLICT (code) DO NOTHING;