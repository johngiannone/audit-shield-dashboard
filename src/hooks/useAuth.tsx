import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

export type AppRole = 'client' | 'enrolled_agent' | 'tax_preparer' | null;

interface AuthContextType {
  user: User | null;
  session: Session | null;
  role: AppRole;
  profileId: string | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, fullName: string, role: AppRole, referralCode?: string | null, inviteCode?: string | null) => Promise<{ error: Error | null }>;
  signInWithLinkedIn: () => Promise<{ error: Error | null }>;
  signInWithGoogle: () => Promise<{ error: Error | null }>;
  signInWithApple: () => Promise<{ error: Error | null }>;
  resetPassword: (email: string) => Promise<{ error: Error | null }>;
  updatePassword: (newPassword: string) => Promise<{ error: Error | null }>;
  resendVerificationEmail: (email: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  validateInviteCode: (code: string) => Promise<{ valid: boolean; error: Error | null }>;
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
      .eq('user_id', userId);

    if (!error && data && data.length > 0) {
      // Prioritize roles: enrolled_agent > tax_preparer > client
      const roles = data.map(r => r.role as AppRole);
      if (roles.includes('enrolled_agent')) {
        setRole('enrolled_agent');
      } else if (roles.includes('tax_preparer')) {
        setRole('tax_preparer');
      } else {
        setRole(roles[0]);
      }
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

  const isOAuthProvider = (provider: string | undefined) => {
    return provider === 'linkedin_oidc' || provider === 'google' || provider === 'apple';
  };

  const handleOAuthUserSetup = async (session: Session) => {
    const userId = session.user.id;
    const provider = session.user.app_metadata?.provider;
    
    if (isOAuthProvider(provider)) {
      const fullName = session.user.user_metadata?.full_name || 
                       session.user.user_metadata?.name || '';
      const avatarUrl = session.user.user_metadata?.avatar_url || 
                        session.user.user_metadata?.picture || '';

      // Update profile with OAuth data
      await supabase
        .from('profiles')
        .update({ 
          full_name: fullName,
          avatar_url: avatarUrl 
        })
        .eq('user_id', userId);

      // Handle referral code preserved before OAuth redirect
      const refCode = localStorage.getItem('oauth_referral_code');
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
        localStorage.removeItem('oauth_referral_code');
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

  const signInWithGoogle = async () => {
    preserveReferralCode();

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth`,
      },
    });
    return { error };
  };

  const preserveReferralCode = () => {
    const refCode = sessionStorage.getItem('referral_code') || 
                    localStorage.getItem('audit_referrer');
    if (refCode) {
      localStorage.setItem('oauth_referral_code', refCode);
    }
  };

  const signInWithLinkedIn = async () => {
    preserveReferralCode();

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'linkedin_oidc',
      options: {
        redirectTo: `${window.location.origin}/auth`,
      },
    });
    return { error };
  };

  const signInWithApple = async () => {
    preserveReferralCode();

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'apple',
      options: {
        redirectTo: `${window.location.origin}/auth`,
      },
    });
    return { error };
  };

  const validateInviteCode = async (code: string) => {
    const { data, error } = await supabase
      .from('invite_codes')
      .select('id, target_role')
      .eq('code', code.toUpperCase())
      .is('used_by', null)
      .maybeSingle();

    if (error) {
      return { valid: false, error };
    }
    
    if (!data) {
      return { valid: false, error: new Error('Invalid or expired invite code') };
    }

    return { valid: true, error: null };
  };

  const signUp = async (email: string, password: string, fullName: string, selectedRole: AppRole, referralCode?: string | null, inviteCode?: string | null) => {
    const redirectUrl = `${window.location.origin}/`;

    // If signing up as tax_preparer, validate invite code first
    if (selectedRole === 'tax_preparer') {
      if (!inviteCode) {
        return { error: new Error('Invite code is required for Tax Preparer registration') };
      }
      
      const { valid, error: validateError } = await validateInviteCode(inviteCode);
      if (!valid) {
        return { error: validateError || new Error('Invalid invite code') };
      }
    }

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

      // Mark invite code as used if this was a tax_preparer signup
      if (selectedRole === 'tax_preparer' && inviteCode) {
        await supabase
          .from('invite_codes')
          .update({ 
            used_by: data.user.id, 
            used_at: new Date().toISOString() 
          })
          .eq('code', inviteCode.toUpperCase());
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

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth?reset=true`,
    });
    return { error };
  };

  const updatePassword = async (newPassword: string) => {
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });
    return { error };
  };

  const resendVerificationEmail = async (email: string) => {
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
      },
    });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setRole(null);
    setProfileId(null);
  };

  return (
    <AuthContext.Provider value={{ user, session, role, profileId, loading, signIn, signUp, signInWithLinkedIn, signInWithGoogle, signInWithApple, resetPassword, updatePassword, resendVerificationEmail, signOut, validateInviteCode }}>
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
