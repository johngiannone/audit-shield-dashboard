import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

type AppRole = 'client' | 'agent' | null;

interface AuthContextType {
  user: User | null;
  session: Session | null;
  role: AppRole;
  profileId: string | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, fullName: string, role: AppRole, referralCode?: string | null) => Promise<{ error: Error | null }>;
  signInWithLinkedIn: () => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<AppRole>(null);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUserRole = async (userId: string) => {
    const { data, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .maybeSingle();

    if (!error && data) {
      setRole(data.role as AppRole);
    } else {
      setRole(null);
    }
  };

  const fetchProfileId = async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();

    if (!error && data) {
      setProfileId(data.id);
    } else {
      setProfileId(null);
    }
  };

  const handleOAuthUserSetup = async (session: Session) => {
    const userId = session.user.id;
    const provider = session.user.app_metadata?.provider;
    
    if (provider === 'linkedin_oidc') {
      const fullName = session.user.user_metadata?.full_name || 
                       session.user.user_metadata?.name || '';
      const avatarUrl = session.user.user_metadata?.avatar_url || 
                        session.user.user_metadata?.picture || '';

      // Update profile with LinkedIn data
      await supabase
        .from('profiles')
        .update({ 
          full_name: fullName,
          avatar_url: avatarUrl 
        })
        .eq('user_id', userId);

      // Handle referral code preserved before OAuth redirect
      const refCode = localStorage.getItem('linkedin_referral_code');
      if (refCode) {
        const { data: referrerProfile } = await supabase
          .from('profiles')
          .select('id')
          .eq('referral_code', refCode.toUpperCase())
          .maybeSingle();

        if (referrerProfile) {
          await supabase
            .from('profiles')
            .update({ referred_by: referrerProfile.id })
            .eq('user_id', userId);
        }
        localStorage.removeItem('linkedin_referral_code');
      }

      // Ensure user has a role (default to 'client' for OAuth signups)
      const { data: existingRole } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .maybeSingle();

      if (!existingRole) {
        await supabase.from('user_roles').insert({
          user_id: userId,
          role: 'client',
        });
      }
    }
  };

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // Defer the role and profile fetch to avoid deadlock
          setTimeout(() => {
            fetchUserRole(session.user.id);
            fetchProfileId(session.user.id);
            
            // Handle OAuth user setup if this is a sign-in event
            if (event === 'SIGNED_IN') {
              handleOAuthUserSetup(session);
            }
          }, 0);
        } else {
          setRole(null);
          setProfileId(null);
        }
        setLoading(false);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        fetchUserRole(session.user.id);
        fetchProfileId(session.user.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signInWithLinkedIn = async () => {
    // Preserve referral code before OAuth redirect
    const refCode = sessionStorage.getItem('referral_code') || 
                    localStorage.getItem('audit_referrer');
    if (refCode) {
      localStorage.setItem('linkedin_referral_code', refCode);
    }

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'linkedin_oidc',
      options: {
        redirectTo: `${window.location.origin}/auth`,
      },
    });
    return { error };
  };

  const signUp = async (email: string, password: string, fullName: string, selectedRole: AppRole, referralCode?: string | null) => {
    const redirectUrl = `${window.location.origin}/`;

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: fullName,
        },
      },
    });

    if (error) return { error };

    // Assign role after signup
    if (data.user && selectedRole) {
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({
          user_id: data.user.id,
          role: selectedRole,
        });

      if (roleError) {
        return { error: new Error('Failed to assign role. Please contact support.') };
      }
    }

    // Link referrer if referral code provided
    if (data.user && referralCode) {
      // Find the profile that owns this referral code
      const { data: referrerProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('referral_code', referralCode.toUpperCase())
        .maybeSingle();

      if (referrerProfile) {
        // Update the new user's profile with the referrer's ID
        // Small delay to ensure the profile trigger has created the profile
        setTimeout(async () => {
          await supabase
            .from('profiles')
            .update({ referred_by: referrerProfile.id })
            .eq('user_id', data.user!.id);
        }, 500);
      }
    }

    return { error: null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setRole(null);
    setProfileId(null);
  };

  return (
    <AuthContext.Provider value={{ user, session, role, profileId, loading, signIn, signUp, signInWithLinkedIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
