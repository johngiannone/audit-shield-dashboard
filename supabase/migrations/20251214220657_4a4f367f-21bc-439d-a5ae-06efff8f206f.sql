-- Create affiliates table
CREATE TABLE public.affiliates (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    referral_code text NOT NULL UNIQUE,
    commission_rate numeric(5,4) NOT NULL DEFAULT 0.20,
    total_earnings numeric(12,2) NOT NULL DEFAULT 0.00,
    stripe_connect_id text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create referral_visits table
CREATE TABLE public.referral_visits (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    referral_code text NOT NULL,
    visitor_ip_hash text NOT NULL,
    converted boolean NOT NULL DEFAULT false,
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create index for referral code lookups
CREATE INDEX idx_referral_visits_code ON public.referral_visits(referral_code);
CREATE INDEX idx_affiliates_referral_code ON public.affiliates(referral_code);

-- Enable RLS
ALTER TABLE public.affiliates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_visits ENABLE ROW LEVEL SECURITY;

-- RLS Policies for affiliates
CREATE POLICY "Users can view their own affiliate record"
ON public.affiliates FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own affiliate record"
ON public.affiliates FOR UPDATE
USING (auth.uid() = user_id);

-- RLS Policies for referral_visits
CREATE POLICY "Affiliates can view their referral visits"
ON public.referral_visits FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.affiliates
        WHERE affiliates.user_id = auth.uid()
        AND affiliates.referral_code = referral_visits.referral_code
    )
);

CREATE POLICY "Anyone can insert referral visits"
ON public.referral_visits FOR INSERT
WITH CHECK (true);

-- Agents can view all affiliate data for admin purposes
CREATE POLICY "Agents can view all affiliates"
ON public.affiliates FOR SELECT
USING (has_role(auth.uid(), 'agent'::app_role));

CREATE POLICY "Agents can view all referral visits"
ON public.referral_visits FOR SELECT
USING (has_role(auth.uid(), 'agent'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_affiliates_updated_at
BEFORE UPDATE ON public.affiliates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();