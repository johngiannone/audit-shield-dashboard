import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Save, User, Shield, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import { MaskedText } from '@/components/ui/masked-text';

interface AgentProfile {
  full_name: string;
  email: string;
  phone: string;
  address: string;
  brand_firm_name: string;
  caf_number: string;
  ptin: string;
}

export default function AgentSettings() {
  const navigate = useNavigate();
  const { user, role, loading } = useAuth();
  
  const [dataLoading, setDataLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingCredentials, setEditingCredentials] = useState(false);
  const [profile, setProfile] = useState<AgentProfile>({
    full_name: '',
    email: '',
    phone: '',
    address: '',
    brand_firm_name: '',
    caf_number: '',
    ptin: '',
  });

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
    if (!loading && role !== 'enrolled_agent') {
      navigate('/dashboard');
    }
  }, [user, loading, role, navigate]);

  useEffect(() => {
    if (user && role === 'enrolled_agent') {
      fetchProfile();
    }
  }, [user, role]);

  const fetchProfile = async () => {
    setDataLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('full_name, email, phone, address, brand_firm_name, caf_number, ptin')
        .eq('user_id', user?.id)
        .single();

      if (error) throw error;

      setProfile({
        full_name: data.full_name || '',
        email: data.email || user?.email || '',
        phone: data.phone || '',
        address: data.address || '',
        brand_firm_name: data.brand_firm_name || '',
        caf_number: data.caf_number || '',
        ptin: data.ptin || '',
      });
    } catch (error) {
      console.error('Failed to fetch profile:', error);
      toast.error('Failed to load profile');
    } finally {
      setDataLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: profile.full_name,
          phone: profile.phone,
          address: profile.address,
          brand_firm_name: profile.brand_firm_name,
          caf_number: profile.caf_number,
          ptin: profile.ptin,
        })
        .eq('user_id', user?.id);

      if (error) throw error;

      toast.success('Profile updated successfully');
    } catch (error) {
      console.error('Failed to save profile:', error);
      toast.error('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (field: keyof AgentProfile, value: string) => {
    setProfile((prev) => ({ ...prev, [field]: value }));
  };

  if (loading || dataLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-2xl animate-fade-in">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Agent Settings</h1>
          <p className="text-muted-foreground">Manage your professional profile and credentials</p>
        </div>

        {/* Personal Information */}
        <Card className="border-0 shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              Personal Information
            </CardTitle>
            <CardDescription>
              Your name and contact details used on official correspondence
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="full_name">Full Name</Label>
                <Input
                  id="full_name"
                  value={profile.full_name}
                  onChange={(e) => handleChange('full_name', e.target.value)}
                  placeholder="John Smith, EA"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={profile.email}
                  disabled
                  className="bg-muted"
                />
                <p className="text-xs text-muted-foreground">Email cannot be changed</p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={profile.phone}
                  onChange={(e) => handleChange('phone', e.target.value)}
                  placeholder="(555) 123-4567"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="brand_firm_name">Firm Name</Label>
                <Input
                  id="brand_firm_name"
                  value={profile.brand_firm_name}
                  onChange={(e) => handleChange('brand_firm_name', e.target.value)}
                  placeholder="Smith Tax Services"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Business Address</Label>
              <Textarea
                id="address"
                value={profile.address}
                onChange={(e) => handleChange('address', e.target.value)}
                placeholder="123 Main Street&#10;Suite 100&#10;New York, NY 10001"
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* IRS Credentials */}
        <Card className="border-0 shadow-md">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-primary" />
                  IRS Credentials
                </CardTitle>
                <CardDescription>
                  Your professional identification numbers for IRS representation
                </CardDescription>
              </div>
              {(profile.caf_number || profile.ptin) && !editingCredentials && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditingCredentials(true)}
                >
                  <Pencil className="h-4 w-4 mr-1" />
                  Edit
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Read-only display when credentials exist and not editing */}
            {(profile.caf_number || profile.ptin) && !editingCredentials ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-muted-foreground text-sm">CAF Number</Label>
                  <div className="py-2">
                    <MaskedText
                      value={profile.caf_number}
                      type="caf"
                      visibleChars={4}
                      className="text-base"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Centralized Authorization File number assigned by the IRS
                  </p>
                </div>
                <div className="space-y-2">
                  <Label className="text-muted-foreground text-sm">PTIN</Label>
                  <div className="py-2">
                    <MaskedText
                      value={profile.ptin}
                      type="ptin"
                      visibleChars={4}
                      className="text-base"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Preparer Tax Identification Number
                  </p>
                </div>
              </div>
            ) : (
              /* Editable inputs when no credentials or editing */
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="caf_number">CAF Number</Label>
                  <Input
                    id="caf_number"
                    value={profile.caf_number}
                    onChange={(e) => handleChange('caf_number', e.target.value)}
                    placeholder="0000-00000-X"
                    maxLength={15}
                  />
                  <p className="text-xs text-muted-foreground">
                    Centralized Authorization File number assigned by the IRS
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ptin">PTIN</Label>
                  <Input
                    id="ptin"
                    value={profile.ptin}
                    onChange={(e) => handleChange('ptin', e.target.value)}
                    placeholder="P00000000"
                    maxLength={10}
                  />
                  <p className="text-xs text-muted-foreground">
                    Preparer Tax Identification Number
                  </p>
                </div>
              </div>
            )}

            <div className="p-3 rounded-lg bg-info/10 border border-info/20">
              <p className="text-sm text-info">
                <strong>Note:</strong> Your CAF Number and PTIN will be automatically included when generating Form 2848 (Power of Attorney).
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saving} size="lg">
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Save Changes
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
}
