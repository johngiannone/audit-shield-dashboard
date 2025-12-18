-- Create onboarding_steps table
CREATE TABLE public.onboarding_steps (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    step_name text NOT NULL,
    is_completed boolean NOT NULL DEFAULT false,
    action_url text NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    UNIQUE(profile_id, step_name)
);

-- Enable RLS
ALTER TABLE public.onboarding_steps ENABLE ROW LEVEL SECURITY;

-- RLS: Users can only see their own steps
CREATE POLICY "Users can view their own onboarding steps"
ON public.onboarding_steps
FOR SELECT
USING (profile_id = get_profile_id(auth.uid()));

-- RLS: Users can update their own steps
CREATE POLICY "Users can update their own onboarding steps"
ON public.onboarding_steps
FOR UPDATE
USING (profile_id = get_profile_id(auth.uid()));

-- Trigger for updated_at
CREATE TRIGGER update_onboarding_steps_updated_at
BEFORE UPDATE ON public.onboarding_steps
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Function to insert default onboarding steps for new clients
CREATE OR REPLACE FUNCTION public.create_client_onboarding_steps()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_profile_id uuid;
BEGIN
    -- Only create onboarding steps for clients
    IF NEW.role = 'client' THEN
        -- Get the profile_id for this user
        SELECT id INTO v_profile_id FROM public.profiles WHERE user_id = NEW.user_id;
        
        IF v_profile_id IS NOT NULL THEN
            -- Insert the three default onboarding steps
            INSERT INTO public.onboarding_steps (profile_id, step_name, action_url)
            VALUES 
                (v_profile_id, 'Verify Contact Info', '/settings'),
                (v_profile_id, 'Upload Prior Year Tax Return', '/documents'),
                (v_profile_id, 'Sign Engagement Letter', '/agreements')
            ON CONFLICT (profile_id, step_name) DO NOTHING;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$;

-- Trigger to create onboarding steps when a client role is assigned
CREATE TRIGGER on_client_role_created
AFTER INSERT ON public.user_roles
FOR EACH ROW
EXECUTE FUNCTION public.create_client_onboarding_steps();