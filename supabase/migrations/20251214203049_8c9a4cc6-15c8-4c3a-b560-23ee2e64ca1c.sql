-- Drop existing check constraint
ALTER TABLE public.cases DROP CONSTRAINT IF EXISTS cases_status_check;

-- Update existing statuses to new values
UPDATE public.cases SET status = 'triage' WHERE status = 'new';
UPDATE public.cases SET status = 'agent_action' WHERE status = 'in_progress';
UPDATE public.cases SET status = 'client_action' WHERE status = 'pending_info';

-- Add new check constraint with updated values
ALTER TABLE public.cases ADD CONSTRAINT cases_status_check 
  CHECK (status IN ('triage', 'agent_action', 'client_action', 'resolved'));

-- Update the default value for new cases
ALTER TABLE public.cases ALTER COLUMN status SET DEFAULT 'triage';