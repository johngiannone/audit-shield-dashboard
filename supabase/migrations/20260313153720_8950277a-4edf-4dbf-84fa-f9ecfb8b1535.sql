
-- Create expense_transactions table
CREATE TABLE public.expense_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  date date NOT NULL,
  description text NOT NULL,
  amount numeric NOT NULL,
  category text NOT NULL,
  is_deductible boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.expense_transactions ENABLE ROW LEVEL SECURITY;

-- Users can select their own rows
CREATE POLICY "Users can view own expense transactions"
  ON public.expense_transactions FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own rows
CREATE POLICY "Users can insert own expense transactions"
  ON public.expense_transactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own rows
CREATE POLICY "Users can update own expense transactions"
  ON public.expense_transactions FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own rows
CREATE POLICY "Users can delete own expense transactions"
  ON public.expense_transactions FOR DELETE
  USING (auth.uid() = user_id);
