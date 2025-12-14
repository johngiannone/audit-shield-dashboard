import { useState } from 'react';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, CheckCircle, Building2, User, Mail, BarChart3, Monitor } from 'lucide-react';

const formSchema = z.object({
  firmName: z.string().trim().min(1, "Firm name is required").max(200),
  contactPerson: z.string().trim().min(1, "Contact person is required").max(100),
  email: z.string().trim().email("Invalid email address").max(255),
  annualReturns: z.string().min(1, "Please select annual returns"),
  taxSoftware: z.string().min(1, "Please select tax software"),
});

type FormData = z.infer<typeof formSchema>;

const ANNUAL_RETURNS_OPTIONS = [
  { value: '<500', label: 'Less than 500' },
  { value: '500-2k', label: '500 - 2,000' },
  { value: '2k-10k', label: '2,000 - 10,000' },
  { value: '10k+', label: '10,000+' },
];

const TAX_SOFTWARE_OPTIONS = [
  { value: 'Drake', label: 'Drake' },
  { value: 'ProSeries', label: 'ProSeries' },
  { value: 'UltraTax', label: 'UltraTax' },
  { value: 'Lacerte', label: 'Lacerte' },
  { value: 'TaxAct', label: 'TaxAct Professional' },
  { value: 'Other', label: 'Other' },
];

export function PartnerApplicationForm() {
  const [formData, setFormData] = useState<FormData>({
    firmName: '',
    contactPerson: '',
    email: '',
    annualReturns: '',
    taxSoftware: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    // Validate form
    const result = formSchema.safeParse(formData);
    if (!result.success) {
      const fieldErrors: Partial<Record<keyof FormData, string>> = {};
      result.error.errors.forEach(err => {
        if (err.path[0]) {
          fieldErrors[err.path[0] as keyof FormData] = err.message;
        }
      });
      setErrors(fieldErrors);
      return;
    }

    setIsSubmitting(true);

    try {
      // Save to Supabase
      const { error: dbError } = await supabase
        .from('partner_leads')
        .insert({
          firm_name: formData.firmName,
          contact_person: formData.contactPerson,
          email: formData.email,
          annual_returns: formData.annualReturns,
          tax_software: formData.taxSoftware,
        });

      if (dbError) throw dbError;

      // Send notification emails
      await supabase.functions.invoke('send-partner-lead-notification', {
        body: formData,
      });

      setIsSubmitted(true);
      toast.success('Application submitted successfully!');
    } catch (error) {
      console.error('Error submitting application:', error);
      toast.error('Failed to submit application. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="bg-card rounded-2xl border border-border p-12 text-center animate-fade-in">
        <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
        </div>
        <h3 className="font-display text-2xl font-bold text-foreground mb-3">
          Application Received!
        </h3>
        <p className="text-muted-foreground max-w-md mx-auto">
          Thank you for your interest in partnering with Return Shield. We'll review your application and reach out within 1-2 business days.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="bg-card rounded-2xl border border-border p-8 md:p-10 space-y-6">
      <div className="grid md:grid-cols-2 gap-6">
        {/* Firm Name */}
        <div className="space-y-2">
          <Label htmlFor="firmName" className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            Firm Name
          </Label>
          <Input
            id="firmName"
            placeholder="Smith Tax & Associates"
            value={formData.firmName}
            onChange={(e) => handleInputChange('firmName', e.target.value)}
            className={errors.firmName ? 'border-destructive' : ''}
          />
          {errors.firmName && <p className="text-xs text-destructive">{errors.firmName}</p>}
        </div>

        {/* Contact Person */}
        <div className="space-y-2">
          <Label htmlFor="contactPerson" className="flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            Contact Person
          </Label>
          <Input
            id="contactPerson"
            placeholder="John Smith"
            value={formData.contactPerson}
            onChange={(e) => handleInputChange('contactPerson', e.target.value)}
            className={errors.contactPerson ? 'border-destructive' : ''}
          />
          {errors.contactPerson && <p className="text-xs text-destructive">{errors.contactPerson}</p>}
        </div>

        {/* Email */}
        <div className="space-y-2">
          <Label htmlFor="email" className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-muted-foreground" />
            Email Address
          </Label>
          <Input
            id="email"
            type="email"
            placeholder="john@smithtax.com"
            value={formData.email}
            onChange={(e) => handleInputChange('email', e.target.value)}
            className={errors.email ? 'border-destructive' : ''}
          />
          {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
        </div>

        {/* Annual Returns */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
            Approximate Annual Returns
          </Label>
          <Select value={formData.annualReturns} onValueChange={(v) => handleInputChange('annualReturns', v)}>
            <SelectTrigger className={errors.annualReturns ? 'border-destructive' : ''}>
              <SelectValue placeholder="Select range" />
            </SelectTrigger>
            <SelectContent>
              {ANNUAL_RETURNS_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.annualReturns && <p className="text-xs text-destructive">{errors.annualReturns}</p>}
        </div>

        {/* Tax Software */}
        <div className="space-y-2 md:col-span-2">
          <Label className="flex items-center gap-2">
            <Monitor className="h-4 w-4 text-muted-foreground" />
            Tax Software Used
          </Label>
          <Select value={formData.taxSoftware} onValueChange={(v) => handleInputChange('taxSoftware', v)}>
            <SelectTrigger className={errors.taxSoftware ? 'border-destructive' : ''}>
              <SelectValue placeholder="Select software" />
            </SelectTrigger>
            <SelectContent>
              {TAX_SOFTWARE_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.taxSoftware && <p className="text-xs text-destructive">{errors.taxSoftware}</p>}
        </div>
      </div>

      <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Submitting...
          </>
        ) : (
          'Submit Application'
        )}
      </Button>

      <p className="text-xs text-muted-foreground text-center">
        By submitting, you agree to be contacted about the Return Shield Partner Program.
      </p>
    </form>
  );
}
