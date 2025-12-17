import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Shield, Loader2, CheckCircle2, KeyRound, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

type Step = 'code' | 'password' | 'success';

export default function Activate() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [step, setStep] = useState<Step>('code');
  const [code, setCode] = useState(searchParams.get('code') || '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [isActivating, setIsActivating] = useState(false);

  // Auto-validate if code is in URL
  useEffect(() => {
    const urlCode = searchParams.get('code');
    if (urlCode && urlCode.length === 8) {
      validateCode(urlCode);
    }
  }, [searchParams]);

  const validateCode = async (codeToValidate?: string) => {
    const codeValue = (codeToValidate || code).toUpperCase().trim();
    
    if (codeValue.length !== 8) {
      toast({
        title: 'Invalid code',
        description: 'Activation codes are 8 characters long.',
        variant: 'destructive'
      });
      return;
    }

    setIsValidating(true);
    try {
      // Validate code via edge function
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/activate-client?action=validate`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code: codeValue })
        }
      );

      const result = await response.json();

      if (!response.ok) throw new Error(result.error || 'Validation failed');
      
      if (result.valid) {
        setCode(codeValue);
        setClientName(result.clientName);
        setClientEmail(result.clientEmail);
        setStep('password');
      } else {
        toast({
          title: 'Invalid code',
          description: result.error || 'Please check your code and try again.',
          variant: 'destructive'
        });
      }
    } catch (error: any) {
      console.error('Validation error:', error);
      toast({
        title: 'Validation failed',
        description: error.message || 'Could not validate code.',
        variant: 'destructive'
      });
    } finally {
      setIsValidating(false);
    }
  };

  const handleActivate = async () => {
    if (password.length < 6) {
      toast({
        title: 'Password too short',
        description: 'Password must be at least 6 characters.',
        variant: 'destructive'
      });
      return;
    }

    if (password !== confirmPassword) {
      toast({
        title: 'Passwords do not match',
        description: 'Please make sure your passwords match.',
        variant: 'destructive'
      });
      return;
    }

    setIsActivating(true);
    try {
      const { data, error } = await supabase.functions.invoke('activate-client', {
        body: { code, password }
      });

      if (error) throw error;

      if (data.success) {
        setClientEmail(data.email);
        setStep('success');
        toast({
          title: 'Account activated!',
          description: 'You can now log in with your new password.'
        });
      } else {
        throw new Error(data.error || 'Activation failed');
      }
    } catch (error: any) {
      console.error('Activation error:', error);
      toast({
        title: 'Activation failed',
        description: error.message || 'Could not activate account.',
        variant: 'destructive'
      });
    } finally {
      setIsActivating(false);
    }
  };

  const handleLogin = () => {
    navigate('/auth', { state: { email: clientEmail } });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <Shield className="h-10 w-10 text-primary" />
          <span className="text-2xl font-display font-bold text-foreground">Return Shield</span>
        </div>

        {/* Code Entry Step */}
        {step === 'code' && (
          <Card>
            <CardHeader className="text-center">
              <CardTitle className="flex items-center justify-center gap-2">
                <KeyRound className="h-5 w-5" />
                Activate Your Account
              </CardTitle>
              <CardDescription>
                Enter the 8-character activation code from your tax preparer
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="code">Activation Code</Label>
                <Input
                  id="code"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 8))}
                  placeholder="ABC12345"
                  className="text-center text-2xl font-mono tracking-widest"
                  maxLength={8}
                  autoFocus
                />
              </div>
              <Button 
                onClick={() => validateCode()} 
                disabled={isValidating || code.length !== 8}
                className="w-full"
              >
                {isValidating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Validating...
                  </>
                ) : (
                  'Continue'
                )}
              </Button>
              <p className="text-xs text-center text-muted-foreground">
                Don't have a code? Contact your tax preparer.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Password Setup Step */}
        {step === 'password' && (
          <Card>
            <CardHeader className="text-center">
              <CardTitle>Welcome, {clientName}!</CardTitle>
              <CardDescription>
                Set a password to activate your Return Shield account
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-muted/50 rounded-lg p-3 text-center">
                <p className="text-sm text-muted-foreground">Account email</p>
                <p className="font-medium">{clientEmail}</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Create Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm your password"
                />
              </div>

              <Button 
                onClick={handleActivate} 
                disabled={isActivating || password.length < 6}
                className="w-full"
              >
                {isActivating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Activating...
                  </>
                ) : (
                  'Activate Account'
                )}
              </Button>

              <button
                onClick={() => setStep('code')}
                className="w-full text-sm text-muted-foreground hover:text-foreground"
              >
                ← Use a different code
              </button>
            </CardContent>
          </Card>
        )}

        {/* Success Step */}
        {step === 'success' && (
          <Card>
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle2 className="h-10 w-10 text-green-600" />
              </div>
              <CardTitle>Account Activated!</CardTitle>
              <CardDescription>
                Your Return Shield account is ready to use
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-muted/50 rounded-lg p-4 text-center">
                <p className="text-sm text-muted-foreground mb-1">You can now log in with</p>
                <p className="font-medium">{clientEmail}</p>
                <p className="text-sm text-muted-foreground mt-1">and the password you just created</p>
              </div>

              <Button onClick={handleLogin} className="w-full">
                Go to Login
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
