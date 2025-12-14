import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { AlertTriangle, Loader2, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { z } from 'zod';

const reportSchema = z.object({
  notice_agency: z.enum(['IRS', 'State'], { required_error: 'Please select an agency' }),
  notice_type: z.string().min(2, 'Notice type is required').max(200, 'Notice type is too long'),
  tax_year: z.number().min(2000, 'Invalid tax year').max(new Date().getFullYear(), 'Tax year cannot be in the future'),
  summary: z.string().max(2000, 'Summary is too long').optional(),
});

export default function ReportNotice() {
  const navigate = useNavigate();
  const { user, role, loading } = useAuth();
  const { toast } = useToast();
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    notice_agency: '' as 'IRS' | 'State' | '',
    notice_type: '',
    tax_year: new Date().getFullYear(),
    summary: '',
  });

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
    if (!loading && role === 'agent') {
      navigate('/dashboard');
    }
  }, [user, loading, role, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const result = reportSchema.safeParse({
      ...form,
      notice_agency: form.notice_agency || undefined,
    });

    if (!result.success) {
      toast({
        title: 'Validation Error',
        description: result.error.errors[0].message,
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    
    try {
      // Get user's profile ID
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user?.id)
        .maybeSingle();

      if (profileError || !profile) {
        throw new Error('Could not find your profile');
      }

      const { error } = await supabase
        .from('cases')
        .insert({
          client_id: profile.id,
          notice_agency: form.notice_agency,
          notice_type: form.notice_type,
          tax_year: form.tax_year,
          summary: form.summary || null,
          status: 'new',
        });

      if (error) throw error;

      setSubmitted(true);
      toast({
        title: 'Notice Reported',
        description: 'Your notice has been submitted. An agent will be assigned shortly.',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to submit notice',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (submitted) {
    return (
      <DashboardLayout>
        <div className="max-w-2xl mx-auto animate-fade-in">
          <Card className="border-0 shadow-xl">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <div className="w-20 h-20 rounded-full bg-success/10 flex items-center justify-center mb-6">
                <CheckCircle className="h-10 w-10 text-success" />
              </div>
              <h2 className="font-display text-2xl font-bold text-foreground mb-2">
                Notice Submitted
              </h2>
              <p className="text-muted-foreground text-center max-w-sm mb-6">
                Your audit notice has been reported. Our team will review it and assign an agent to your case.
              </p>
              <div className="flex gap-4">
                <Button variant="outline" onClick={() => setSubmitted(false)}>
                  Report Another
                </Button>
                <Button onClick={() => navigate('/dashboard')}>
                  Go to Dashboard
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto space-y-8 animate-fade-in">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">Report a Notice</h1>
          <p className="text-muted-foreground mt-1">
            Submit details about the audit notice you received
          </p>
        </div>

        <Card className="border-0 shadow-md">
          <CardHeader>
            <div className="w-12 h-12 rounded-xl bg-warning/10 flex items-center justify-center mb-4">
              <AlertTriangle className="h-6 w-6 text-warning" />
            </div>
            <CardTitle>Notice Details</CardTitle>
            <CardDescription>
              Provide information about the audit notice you received
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="agency">Notice Agency</Label>
                  <Select
                    value={form.notice_agency}
                    onValueChange={(value) => setForm({ ...form, notice_agency: value as 'IRS' | 'State' })}
                  >
                    <SelectTrigger id="agency">
                      <SelectValue placeholder="Select agency" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="IRS">IRS (Federal)</SelectItem>
                      <SelectItem value="State">State Tax Authority</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tax_year">Tax Year</Label>
                  <Input
                    id="tax_year"
                    type="number"
                    min={2000}
                    max={new Date().getFullYear()}
                    value={form.tax_year}
                    onChange={(e) => setForm({ ...form, tax_year: parseInt(e.target.value) })}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notice_type">Notice Type</Label>
                <Input
                  id="notice_type"
                  type="text"
                  placeholder="e.g., CP2000, Audit Letter, Notice of Deficiency"
                  value={form.notice_type}
                  onChange={(e) => setForm({ ...form, notice_type: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="summary">Summary (Optional)</Label>
                <Textarea
                  id="summary"
                  placeholder="Briefly describe the issue or any relevant details..."
                  rows={4}
                  value={form.summary}
                  onChange={(e) => setForm({ ...form, summary: e.target.value })}
                />
              </div>

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  'Submit Notice'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
