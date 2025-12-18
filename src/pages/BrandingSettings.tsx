import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Palette, Upload, Eye, Shield, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const BrandingSettings = () => {
  const { user, role, profileId, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [logoUrl, setLogoUrl] = useState('');
  const [primaryColor, setPrimaryColor] = useState('#1e3a5f');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    } else if (!authLoading && role !== 'tax_preparer') {
      navigate('/dashboard');
    }
  }, [user, role, authLoading, navigate]);

  useEffect(() => {
    const fetchBranding = async () => {
      if (!profileId) return;

      const { data, error } = await supabase
        .from('profiles')
        .select('brand_logo_url, brand_primary_color')
        .eq('id', profileId)
        .maybeSingle();

      if (!error && data) {
        setLogoUrl(data.brand_logo_url || '');
        setPrimaryColor(data.brand_primary_color || '#1e3a5f');
      }
      setLoading(false);
    };

    if (profileId) {
      fetchBranding();
    }
  }, [profileId]);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image must be under 2MB');
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/brand-logo.${fileExt}`;

      // Upload to brand-logos bucket
      const { error: uploadError } = await supabase.storage
        .from('brand-logos')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('brand-logos')
        .getPublicUrl(fileName);

      setLogoUrl(urlData.publicUrl);
      toast.success('Logo uploaded successfully');
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload logo');
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!profileId) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          brand_logo_url: logoUrl || null,
          brand_primary_color: primaryColor || null,
        })
        .eq('id', profileId);

      if (error) throw error;
      toast.success('Branding settings saved');
    } catch (error) {
      console.error('Save error:', error);
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleClearLogo = async () => {
    setLogoUrl('');
  };

  if (authLoading || loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-2xl">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-3">
            <Palette className="h-7 w-7 text-primary" />
            Branding Settings
          </h1>
          <p className="text-muted-foreground mt-1">
            Customize the portal appearance for your clients
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Logo</CardTitle>
            <CardDescription>
              Upload your firm's logo to replace the default Return Shield logo in your clients' portal
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-6">
              {/* Logo Preview */}
              <div className="w-24 h-24 rounded-lg border-2 border-dashed border-border flex items-center justify-center bg-muted/50 overflow-hidden">
                {logoUrl ? (
                  <img 
                    src={logoUrl} 
                    alt="Brand logo" 
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <Shield className="h-10 w-10 text-muted-foreground" />
                )}
              </div>

              <div className="flex-1 space-y-3">
                <div>
                  <Label htmlFor="logo-upload" className="cursor-pointer">
                    <Button variant="outline" asChild disabled={uploading}>
                      <span>
                        {uploading ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Upload className="h-4 w-4 mr-2" />
                        )}
                        Upload Logo
                      </span>
                    </Button>
                  </Label>
                  <Input
                    id="logo-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleLogoUpload}
                    disabled={uploading}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  PNG, JPG, or SVG. Max 2MB. Recommended: 200x200px
                </p>
                {logoUrl && (
                  <Button variant="ghost" size="sm" onClick={handleClearLogo}>
                    Remove logo
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Primary Color</CardTitle>
            <CardDescription>
              Choose a color for buttons and sidebar accents in your clients' portal
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="relative">
                <Input
                  type="color"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="w-16 h-16 p-1 cursor-pointer rounded-lg"
                />
              </div>
              <div className="flex-1">
                <Label htmlFor="color-hex">Hex Color</Label>
                <Input
                  id="color-hex"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  placeholder="#1e3a5f"
                  className="font-mono"
                />
              </div>
            </div>

            {/* Color Preview */}
            <div className="p-4 rounded-lg border border-border bg-muted/30">
              <p className="text-sm text-muted-foreground mb-3">Preview:</p>
              <div className="flex items-center gap-3">
                <Button 
                  style={{ backgroundColor: primaryColor }}
                  className="text-white"
                >
                  Primary Button
                </Button>
                <div 
                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: primaryColor }}
                >
                  <Shield className="h-4 w-4 text-white" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Client View Preview
            </CardTitle>
            <CardDescription>
              This is how your clients will see their dashboard
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg overflow-hidden bg-background">
              {/* Mini sidebar preview */}
              <div className="flex h-32">
                <div 
                  className="w-16 p-3 flex flex-col items-center"
                  style={{ backgroundColor: primaryColor }}
                >
                  {logoUrl ? (
                    <img 
                      src={logoUrl} 
                      alt="Logo" 
                      className="w-8 h-8 rounded object-contain bg-white/20"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded bg-white/20 flex items-center justify-center">
                      <Shield className="h-4 w-4 text-white" />
                    </div>
                  )}
                  <div className="mt-3 space-y-2">
                    <div className="w-6 h-1 bg-white/40 rounded" />
                    <div className="w-6 h-1 bg-white/40 rounded" />
                    <div className="w-6 h-1 bg-white/40 rounded" />
                  </div>
                </div>
                <div className="flex-1 p-4 bg-muted/30">
                  <div className="h-3 w-24 bg-muted rounded mb-3" />
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      style={{ backgroundColor: primaryColor }}
                      className="text-white text-xs"
                    >
                      Action
                    </Button>
                    <div className="h-6 w-16 bg-muted rounded" />
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => navigate('/dashboard')}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Save Changes
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default BrandingSettings;
