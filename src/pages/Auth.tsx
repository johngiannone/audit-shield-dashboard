import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth, AppRole } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Shield, Mail, Lock, User, Loader2, Ticket, CheckCircle, XCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { z } from 'zod';
import { LinkedInIcon } from '@/components/icons/LinkedInIcon';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { securityLog } from '@/hooks/useSecurityLog';

// Validation schemas will use translation function passed at validation time
const createLoginSchema = (t: (key: string) => string) => z.object({
  email: z.string().email(t('auth.invalidEmail')),
  password: z.string().min(6, t('auth.passwordMinLength')),
});

const createSignupSchema = (t: (key: string) => string) => z.object({
  fullName: z.string().min(2, t('auth.nameMinLength')).max(100, t('auth.nameTooLong')),
  email: z.string().email(t('auth.invalidEmail')).max(255, t('auth.emailTooLong')),
  password: z.string().min(6, t('auth.passwordMinLength')),
});

const createTaxPreparerSignupSchema = (t: (key: string) => string) => createSignupSchema(t).extend({
  inviteCode: z.string().min(1, t('auth.inviteCodeRequired')),
});

export default function Auth() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { t } = useTranslation();
  const { signIn, signUp, signInWithLinkedIn, signInWithGoogle, signInWithApple, resetPassword, updatePassword, resendVerificationEmail, validateInviteCode, user, loading } = useAuth();
  const { toast } = useToast();
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isOAuthLoading, setIsOAuthLoading] = useState<'linkedin' | 'google' | 'apple' | null>(null);
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [signupForm, setSignupForm] = useState({ fullName: '', email: '', password: '' });
  const [inviteCode, setInviteCode] = useState('');
  const [inviteCodeValid, setInviteCodeValid] = useState<boolean | null>(null);
  const [validatingCode, setValidatingCode] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [pendingVerificationEmail, setPendingVerificationEmail] = useState<string | null>(null);
  const [isResending, setIsResending] = useState(false);
  const [isTaxPreparerSignup, setIsTaxPreparerSignup] = useState(false);

  // Check if this is a password reset callback
  useEffect(() => {
    if (searchParams.get('reset') === 'true') {
      setShowResetPassword(true);
    }
  }, [searchParams]);

  // Capture referral code from URL and store in sessionStorage
  useEffect(() => {
    const refCode = searchParams.get('ref');
    if (refCode) {
      sessionStorage.setItem('referral_code', refCode);
    }
  }, [searchParams]);

  // Check for invite code in URL
  useEffect(() => {
    const urlInviteCode = searchParams.get('invite');
    if (urlInviteCode) {
      setInviteCode(urlInviteCode);
      setIsTaxPreparerSignup(true);
      // Validate the code
      handleValidateInviteCode(urlInviteCode);
    }
  }, [searchParams]);

  useEffect(() => {
    if (user && !loading) {
      navigate('/dashboard');
    }
  }, [user, loading, navigate]);

  const handleValidateInviteCode = async (code: string) => {
    if (!code.trim()) {
      setInviteCodeValid(null);
      return;
    }

    setValidatingCode(true);
    const { valid } = await validateInviteCode(code);
    setInviteCodeValid(valid);
    setValidatingCode(false);
  };

  const handleInviteCodeChange = (value: string) => {
    setInviteCode(value.toUpperCase());
    setInviteCodeValid(null);
  };

  const handleLinkedInSignIn = async () => {
    setIsOAuthLoading('linkedin');
    const { error } = await signInWithLinkedIn();
    if (error) {
      setIsOAuthLoading(null);
      toast({
        title: t('auth.loginFailed'),
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleGoogleSignIn = async () => {
    setIsOAuthLoading('google');
    const { error } = await signInWithGoogle();
    if (error) {
      setIsOAuthLoading(null);
      toast({
        title: t('auth.loginFailed'),
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleAppleSignIn = async () => {
    setIsOAuthLoading('apple');
    const { error } = await signInWithApple();
    if (error) {
      setIsOAuthLoading(null);
      toast({
        title: t('auth.loginFailed'),
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const loginSchema = createLoginSchema(t);
    const result = loginSchema.safeParse(loginForm);
    if (!result.success) {
      toast({
        title: t('auth.validationError'),
        description: result.error.errors[0].message,
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    const { error } = await signIn(loginForm.email, loginForm.password);
    setIsSubmitting(false);

    if (error) {
      // Log failed login attempt
      securityLog.loginFailed(loginForm.email, error.message);
      toast({
        title: t('auth.loginFailed'),
        description: error.message === 'Invalid login credentials' 
          ? t('auth.invalidCredentials')
          : error.message,
        variant: 'destructive',
      });
    } else {
      // Log successful login
      securityLog.loginSuccess(loginForm.email);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail) {
      toast({
        title: t('auth.emailRequired'),
        description: t('auth.emailRequiredDescription'),
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    const { error } = await resetPassword(forgotEmail);
    setIsSubmitting(false);

    if (error) {
      toast({
        title: t('common.error'),
        description: error.message,
        variant: 'destructive',
      });
    } else {
      toast({
        title: t('auth.checkYourEmail'),
        description: t('auth.resetLinkSent'),
      });
      setShowForgotPassword(false);
      setForgotEmail('');
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      toast({
        title: t('auth.passwordTooShort'),
        description: t('auth.passwordTooShortDescription'),
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    const { error } = await updatePassword(newPassword);
    setIsSubmitting(false);

    if (error) {
      toast({
        title: t('common.error'),
        description: error.message,
        variant: 'destructive',
      });
    } else {
      toast({
        title: t('auth.passwordUpdated'),
        description: t('auth.passwordUpdatedDescription'),
      });
      setShowResetPassword(false);
      setNewPassword('');
      navigate('/dashboard');
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Use appropriate schema based on signup type
    const schema = isTaxPreparerSignup ? createTaxPreparerSignupSchema(t) : createSignupSchema(t);
    const formData = isTaxPreparerSignup 
      ? { ...signupForm, inviteCode } 
      : signupForm;

    const result = schema.safeParse(formData);
    if (!result.success) {
      toast({
        title: t('auth.validationError'),
        description: result.error.errors[0].message,
        variant: 'destructive',
      });
      return;
    }

    // For tax preparer signup, validate invite code first
    if (isTaxPreparerSignup && inviteCodeValid !== true) {
      toast({
        title: t('auth.invalidInviteCode'),
        description: t('auth.invalidInviteCodeDescription'),
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    // Get referral code from sessionStorage
    const referralCode = sessionStorage.getItem('referral_code');
    const role = isTaxPreparerSignup ? 'tax_preparer' : 'client';
    const { error } = await signUp(
      signupForm.email, 
      signupForm.password, 
      signupForm.fullName, 
      role as AppRole,
      referralCode,
      isTaxPreparerSignup ? inviteCode : null
    );
    setIsSubmitting(false);
    
    // Clear referral code after signup attempt
    if (!error) {
      sessionStorage.removeItem('referral_code');
      // Show verification reminder
      setPendingVerificationEmail(signupForm.email);
    }

    if (error) {
      if (error.message.includes('already registered')) {
        toast({
          title: t('auth.accountExists'),
          description: t('auth.accountExistsDescription'),
          variant: 'destructive',
        });
      } else {
        toast({
          title: t('auth.signUpFailed'),
          description: error.message,
          variant: 'destructive',
        });
      }
    } else {
      toast({
        title: t('auth.accountCreated'),
        description: isTaxPreparerSignup 
          ? t('auth.taxPreparerWelcome')
          : t('auth.accountCreatedDescription'),
      });
    }
  };

  const handleResendVerification = async () => {
    if (!pendingVerificationEmail) return;
    
    setIsResending(true);
    const { error } = await resendVerificationEmail(pendingVerificationEmail);
    setIsResending(false);
    
    if (error) {
      toast({
        title: t('auth.resendFailed'),
        description: error.message,
        variant: 'destructive',
      });
    } else {
      toast({
        title: t('auth.emailSent'),
        description: t('auth.verificationResent'),
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const LinkedInButton = ({ disabled }: { disabled?: boolean }) => (
    <Button 
      type="button"
      variant="outline"
      className="w-full bg-[#0A66C2] hover:bg-[#004182] text-white border-0"
      onClick={handleLinkedInSignIn}
      disabled={disabled || isOAuthLoading !== null}
    >
      {isOAuthLoading === 'linkedin' ? (
        <>
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          {t('auth.connecting')}
        </>
      ) : (
        <>
          <LinkedInIcon className="mr-2 h-5 w-5" />
          {t('auth.continueWithLinkedIn')}
        </>
      )}
    </Button>
  );

  const GoogleButton = ({ disabled }: { disabled?: boolean }) => (
    <Button 
      type="button"
      variant="outline"
      className="w-full"
      onClick={handleGoogleSignIn}
      disabled={disabled || isOAuthLoading !== null}
    >
      {isOAuthLoading === 'google' ? (
        <>
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          {t('auth.connecting')}
        </>
      ) : (
        <>
          <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          {t('auth.continueWithGoogle')}
        </>
      )}
    </Button>
  );

  const AppleButton = ({ disabled }: { disabled?: boolean }) => (
    <Button 
      type="button"
      variant="outline"
      className="w-full bg-black hover:bg-black/90 text-white border-0"
      onClick={handleAppleSignIn}
      disabled={disabled || isOAuthLoading !== null}
    >
      {isOAuthLoading === 'apple' ? (
        <>
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          {t('auth.connecting')}
        </>
      ) : (
        <>
          <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
          </svg>
          {t('auth.continueWithApple')}
        </>
      )}
    </Button>
  );

  const Divider = () => (
    <div className="relative my-6">
      <div className="absolute inset-0 flex items-center">
        <span className="w-full border-t" />
      </div>
      <div className="relative flex justify-center text-xs uppercase">
        <span className="bg-card px-2 text-muted-foreground">
          {t('auth.orContinueWithEmail')}
        </span>
      </div>
    </div>
  );

  const EmailVerificationBanner = () => (
    <Alert className="mb-6 border-primary/20 bg-primary/5">
      <Mail className="h-4 w-4" />
      <AlertTitle>{t('auth.verifyEmail')}</AlertTitle>
      <AlertDescription className="mt-2">
        <p className="mb-3">
          {t('auth.verificationSent')} <strong>{pendingVerificationEmail}</strong>. 
          {t('auth.checkInbox')}
        </p>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={handleResendVerification}
            disabled={isResending}
          >
            {isResending ? (
              <>
                <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                {t('auth.sending')}
              </>
            ) : (
              t('auth.resendVerification')
            )}
          </Button>
          <button
            type="button"
            className="text-sm text-muted-foreground hover:text-foreground"
            onClick={() => setPendingVerificationEmail(null)}
          >
            {t('common.dismiss')}
          </button>
        </div>
      </AlertDescription>
    </Alert>
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-secondary via-background to-secondary p-4">
      <div className="w-full max-w-md animate-slide-up">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-xl gradient-primary flex items-center justify-center shadow-xl mb-4">
            <Shield className="h-8 w-8 text-primary-foreground" />
          </div>
          <h1 className="font-display text-3xl font-bold text-foreground">Return Shield</h1>
          <p className="text-muted-foreground mt-1">Tax Defense Portal</p>
        </div>

        {pendingVerificationEmail && <EmailVerificationBanner />}

        <Card className="shadow-xl border-0">
          <Tabs defaultValue="login" className="w-full">
            <CardHeader className="pb-4">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">{t('auth.signIn')}</TabsTrigger>
                <TabsTrigger value="signup">{t('auth.createAccount')}</TabsTrigger>
              </TabsList>
            </CardHeader>

            <CardContent>
              {/* Login Tab */}
              <TabsContent value="login" className="mt-0">
                <CardTitle className="text-xl mb-2">{t('auth.welcomeBack')}</CardTitle>
                <CardDescription className="mb-6">
                  {t('auth.signInDescription')}
                </CardDescription>
                
                <GoogleButton disabled={isSubmitting} />
                <div className="mt-3">
                  <AppleButton disabled={isSubmitting} />
                </div>
                <div className="mt-3">
                  <LinkedInButton disabled={isSubmitting} />
                </div>
                <Divider />
                
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email">{t('auth.email')}</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="login-email"
                        type="email"
                        placeholder="you@example.com"
                        className="pl-10"
                        value={loginForm.email}
                        onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                        required
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="login-password">{t('auth.password')}</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="login-password"
                        type="password"
                        placeholder="••••••••"
                        className="pl-10"
                        value={loginForm.password}
                        onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                        required
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowForgotPassword(true)}
                      className="text-sm text-primary hover:underline"
                    >
                      {t('auth.forgotPassword')}
                    </button>
                  </div>

                  <Button type="submit" className="w-full" disabled={isSubmitting || isOAuthLoading !== null}>
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {t('auth.signingIn')}
                      </>
                    ) : (
                      t('auth.signInButton')
                    )}
                  </Button>
                </form>
              </TabsContent>

              {/* Signup Tab */}
              <TabsContent value="signup" className="mt-0">
                <CardTitle className="text-xl mb-2">
                  {isTaxPreparerSignup ? t('auth.taxPreparerSignup') : t('auth.createNewAccount')}
                </CardTitle>
                <CardDescription className="mb-6">
                  {isTaxPreparerSignup 
                    ? t('auth.taxPreparerDescription')
                    : t('auth.signUpDescription')
                  }
                </CardDescription>

                {/* Toggle for Tax Preparer signup (when no invite code in URL) */}
                {!searchParams.get('invite') && (
                  <div className="mb-6 p-3 rounded-lg border border-border bg-muted/30">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Ticket className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{t('auth.haveInviteCode')}</span>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setIsTaxPreparerSignup(!isTaxPreparerSignup);
                          setInviteCode('');
                          setInviteCodeValid(null);
                        }}
                      >
                        {isTaxPreparerSignup ? t('auth.signUpAsClient') : t('auth.signUpAsTaxPreparer')}
                      </Button>
                    </div>
                  </div>
                )}

                {/* Invite Code Field for Tax Preparer */}
                {isTaxPreparerSignup && (
                  <div className="mb-6 p-4 rounded-lg border border-primary/20 bg-primary/5">
                    <Label htmlFor="invite-code" className="text-sm font-medium">{t('auth.inviteCode')}</Label>
                    <div className="relative mt-2">
                      <Ticket className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="invite-code"
                        type="text"
                        placeholder={t('auth.enterInviteCode')}
                        className="pl-10 pr-10 uppercase font-mono"
                        value={inviteCode}
                        onChange={(e) => handleInviteCodeChange(e.target.value)}
                        onBlur={() => inviteCode && handleValidateInviteCode(inviteCode)}
                        required
                      />
                      {validatingCode && (
                        <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                      )}
                      {!validatingCode && inviteCodeValid === true && (
                        <CheckCircle className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-500" />
                      )}
                      {!validatingCode && inviteCodeValid === false && (
                        <XCircle className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-destructive" />
                      )}
                    </div>
                    {inviteCodeValid === false && (
                      <p className="text-xs text-destructive mt-1">{t('auth.invalidCode')}</p>
                    )}
                    {inviteCodeValid === true && (
                      <p className="text-xs text-emerald-500 mt-1">{t('auth.validCode')}</p>
                    )}
                  </div>
                )}

                {!isTaxPreparerSignup && (
                  <>
                    <GoogleButton disabled={isSubmitting} />
                    <div className="mt-3">
                      <AppleButton disabled={isSubmitting} />
                    </div>
                    <div className="mt-3">
                      <LinkedInButton disabled={isSubmitting} />
                    </div>
                    <Divider />
                  </>
                )}
                
                <form onSubmit={handleSignup} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-name">{t('auth.fullName')}</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="signup-name"
                        type="text"
                        placeholder="John Doe"
                        className="pl-10"
                        value={signupForm.fullName}
                        onChange={(e) => setSignupForm({ ...signupForm, fullName: e.target.value })}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-email">{t('auth.email')}</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="signup-email"
                        type="email"
                        placeholder="you@example.com"
                        className="pl-10"
                        value={signupForm.email}
                        onChange={(e) => setSignupForm({ ...signupForm, email: e.target.value })}
                        required
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">{t('auth.password')}</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="signup-password"
                        type="password"
                        placeholder="••••••••"
                        className="pl-10"
                        value={signupForm.password}
                        onChange={(e) => setSignupForm({ ...signupForm, password: e.target.value })}
                        required
                      />
                    </div>
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full" 
                    disabled={isSubmitting || isOAuthLoading !== null || (isTaxPreparerSignup && inviteCodeValid !== true)}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {t('auth.creatingAccount')}
                      </>
                    ) : (
                      isTaxPreparerSignup ? t('auth.createTaxPreparerAccount') : t('auth.signUpButton')
                    )}
                  </Button>
                </form>
              </TabsContent>
            </CardContent>
          </Tabs>
        </Card>

        {/* Forgot Password Modal */}
        {showForgotPassword && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-md">
              <CardHeader>
                <CardTitle>{t('auth.resetPassword')}</CardTitle>
                <CardDescription>{t('auth.resetPasswordDescription')}</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleForgotPassword} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="forgot-email">{t('auth.email')}</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="forgot-email"
                        type="email"
                        placeholder="you@example.com"
                        className="pl-10"
                        value={forgotEmail}
                        onChange={(e) => setForgotEmail(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button type="button" variant="outline" onClick={() => setShowForgotPassword(false)} className="flex-1">
                      {t('common.cancel')}
                    </Button>
                    <Button type="submit" className="flex-1" disabled={isSubmitting}>
                      {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : t('auth.sendResetLink')}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Update Password Modal */}
        {showResetPassword && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-md">
              <CardHeader>
                <CardTitle>{t('auth.newPassword')}</CardTitle>
                <CardDescription>{t('auth.enterNewPassword')}</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleUpdatePassword} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="new-password">{t('auth.newPassword')}</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="new-password"
                        type="password"
                        placeholder="••••••••"
                        className="pl-10"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        required
                        minLength={6}
                      />
                    </div>
                  </div>
                  <Button type="submit" className="w-full" disabled={isSubmitting}>
                    {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : t('auth.updatePassword')}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
