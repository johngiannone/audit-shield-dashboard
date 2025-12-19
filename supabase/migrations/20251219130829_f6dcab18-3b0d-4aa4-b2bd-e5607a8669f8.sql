-- Create table for storing FTA letters
CREATE TABLE public.fta_letters (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    tax_year integer NOT NULL,
    penalty_amount numeric NOT NULL,
    notice_number text NOT NULL,
    taxpayer_name text NOT NULL,
    file_path text NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.fta_letters ENABLE ROW LEVEL SECURITY;

-- Users can view their own letters
CREATE POLICY "Users can view their own fta letters"
ON public.fta_letters
FOR SELECT
USING (profile_id = get_profile_id(auth.uid()));

-- Users can insert their own letters
CREATE POLICY "Users can insert their own fta letters"
ON public.fta_letters
FOR INSERT
WITH CHECK (profile_id = get_profile_id(auth.uid()));

-- Create storage bucket for FTA letters
INSERT INTO storage.buckets (id, name, public) VALUES ('fta-letters', 'fta-letters', false);

-- Storage policies for FTA letters bucket
CREATE POLICY "Users can upload their own fta letters"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'fta-letters' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their own fta letters"
ON storage.objects
FOR SELECT
USING (bucket_id = 'fta-letters' AND auth.uid()::text = (storage.foldername(name))[1]);