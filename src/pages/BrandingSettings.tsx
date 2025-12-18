import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Palette, Upload, Eye, EyeOff, Shield, Loader2, Home, FolderOpen, FileText, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

// Helper function to convert hex to HSL string for CSS variables
function hexToHSL(hex: string): string | null {
  hex = hex.replace(/^#/, '');
  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;

  if (isNaN(r) || isNaN(g) || isNaN(b)) return null;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }

  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

const BrandingSettings = () => {
  const { user, role, profileId, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [logoUrl, setLogoUrl] = useState('');
  const [primaryColor, setPrimaryColor] = useState('#1e3a5f');
  const [firmName, setFirmName] = useState('');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [previewMode, setPreviewMode] = useState(false);

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
        .select('brand_logo_url, brand_primary_color, brand_firm_name')
        .eq('id', profileId)
        .maybeSingle();

      if (!error && data) {
        setLogoUrl(data.brand_logo_url || '');
        setPrimaryColor(data.brand_primary_color || '#1e3a5f');
        setFirmName(data.brand_firm_name || '');
      }
      setLoading(false);
    };

    if (profileId) {
      fetchBranding();
    }
  }, [profileId]);

  // Apply preview mode CSS variables
  useEffect(() => {
    if (previewMode && primaryColor) {
      const hsl = hexToHSL(primaryColor);
      if (hsl) {
        document.documentElement.style.setProperty('--primary', hsl);
        document.documentElement.style.setProperty('--sidebar-background', hsl);
        document.documentElement.style.setProperty('--ring', hsl);
      }
    } else {
      document.documentElement.style.removeProperty('--primary');
      document.documentElement.style.removeProperty('--sidebar-background');
      document.documentElement.style.removeProperty('--ring');
    }

    return () => {
      document.documentElement.style.removeProperty('--primary');
      document.documentElement.style.removeProperty('--sidebar-background');
      document.documentElement.style.removeProperty('--ring');
    };
  }, [previewMode, primaryColor]);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image must be under 2MB');
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/brand-logo.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('brand-logos')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

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
          brand_firm_name: firmName || null,
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

  const navItems = [
    { title: 'Dashboard', icon: Home, active: true },
    { title: 'My Cases', icon: FolderOpen, active: false },
    { title: 'My Plans', icon: FileText, active: false },
    { title: 'Report a Notice', icon: AlertTriangle, active: false },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header with Preview Toggle */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-3">
              <Palette className="h-7 w-7 text-primary" />
              Branding Settings
            </h1>
            <p className="text-muted-foreground mt-1">
              Customize the portal appearance for your clients
            </p>
          </div>
          
          <div className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card">
            <div className="flex items-center gap-2">
              {previewMode ? (
                <Eye className="h-4 w-4 text-primary" />
              ) : (
                <EyeOff className="h-4 w-4 text-muted-foreground" />
              )}
              <Label htmlFor="preview-mode" className="text-sm font-medium cursor-pointer">
                Live Preview
              </Label>
            </div>
            <Switch
              id="preview-mode"
              checked={previewMode}
              onCheckedChange={setPreviewMode}
            />
            {previewMode && (
              <Badge variant="default" className="ml-2">Active</Badge>
            )}
          </div>
        </div>

        {previewMode && (
          <Card className="border-primary/50 bg-primary/5">
            <CardContent className="py-3">
              <p className="text-sm text-primary flex items-center gap-2">
                <Eye className="h-4 w-4" />
                <strong>Preview Mode Active:</strong> The sidebar and buttons are now showing your custom branding. Toggle off to return to normal view.
              </p>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Left Column - Settings */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Logo</CardTitle>
                <CardDescription>
                  Upload your firm's logo to replace the default Return Shield logo
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start gap-6">
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
                <CardTitle>Firm Name</CardTitle>
                <CardDescription>
                  Set a custom name to display in your clients' sidebar
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Label htmlFor="firm-name">Display Name</Label>
                  <Input
                    id="firm-name"
                    value={firmName}
                    onChange={(e) => setFirmName(e.target.value)}
                    placeholder="e.g., Smith Tax Services"
                    maxLength={50}
                  />
                  <p className="text-xs text-muted-foreground">
                    Leave blank to use "Return Shield" as the default
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Primary Color</CardTitle>
                <CardDescription>
                  Choose a color for buttons and sidebar accents
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

                <div className="p-4 rounded-lg border border-border bg-muted/30">
                  <p className="text-sm text-muted-foreground mb-3">Color Preview:</p>
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

          {/* Right Column - Full Preview */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="h-5 w-5" />
                  Client Dashboard Preview
                </CardTitle>
                <CardDescription>
                  This is exactly how your clients will see their portal
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="border rounded-lg overflow-hidden bg-background shadow-lg">
                  {/* Preview Container */}
                  <div className="flex h-[400px]">
                    {/* Sidebar Preview */}
                    <div 
                      className="w-56 flex flex-col"
                      style={{ backgroundColor: primaryColor }}
                    >
                      {/* Logo Section */}
                      <div className="p-4 border-b border-white/10">
                        <div className="flex items-center gap-3">
                          {logoUrl ? (
                            <div className="w-10 h-10 rounded-lg overflow-hidden bg-white/10 flex items-center justify-center">
                              <img 
                                src={logoUrl} 
                                alt="Logo" 
                                className="w-full h-full object-contain"
                              />
                            </div>
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center">
                              <Shield className="h-5 w-5 text-white" />
                            </div>
                          )}
                          <div>
                            <p className="text-sm font-semibold text-white truncate max-w-[120px]">
                              {firmName || 'Your Firm Name'}
                            </p>
                            <p className="text-xs text-white/60">Client Portal</p>
                          </div>
                        </div>
                      </div>

                      {/* Nav Items */}
                      <div className="flex-1 p-3 space-y-1">
                        <p className="text-xs text-white/50 uppercase tracking-wider px-3 mb-2">
                          Navigation
                        </p>
                        {navItems.map((item) => (
                          <div
                            key={item.title}
                            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm ${
                              item.active 
                                ? 'bg-white/20 text-white font-medium' 
                                : 'text-white/70 hover:bg-white/10'
                            }`}
                          >
                            <item.icon className="h-4 w-4" />
                            <span>{item.title}</span>
                          </div>
                        ))}
                      </div>

                      {/* Footer */}
                      <div className="p-4 border-t border-white/10">
                        <p className="text-xs text-white/50 text-center">
                          Powered by Return Shield
                        </p>
                      </div>
                    </div>

                    {/* Main Content Preview */}
                    <div className="flex-1 flex flex-col bg-muted/30">
                      {/* Header */}
                      <div className="h-14 border-b border-border bg-card flex items-center justify-between px-4">
                        <p className="font-medium text-foreground">Client Portal</p>
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-muted" />
                          <div className="h-3 w-20 bg-muted rounded" />
                        </div>
                      </div>

                      {/* Content */}
                      <div className="flex-1 p-4 space-y-4">
                        <div className="h-4 w-32 bg-muted rounded" />
                        
                        {/* Stats Cards */}
                        <div className="grid grid-cols-2 gap-3">
                          <div className="p-3 rounded-lg bg-card border border-border">
                            <div className="h-2 w-16 bg-muted rounded mb-2" />
                            <div className="h-5 w-8 bg-muted rounded" />
                          </div>
                          <div className="p-3 rounded-lg bg-card border border-border">
                            <div className="h-2 w-16 bg-muted rounded mb-2" />
                            <div className="h-5 w-8 bg-muted rounded" />
                          </div>
                        </div>

                        {/* Action Button */}
                        <Button 
                          size="sm"
                          style={{ backgroundColor: primaryColor }}
                          className="text-white"
                        >
                          Report a Notice
                        </Button>

                        {/* Cases List */}
                        <div className="space-y-2">
                          <div className="h-3 w-20 bg-muted rounded" />
                          <div className="p-3 rounded-lg bg-card border border-border">
                            <div className="flex items-center justify-between">
                              <div className="h-3 w-24 bg-muted rounded" />
                              <div 
                                className="h-5 w-16 rounded-full"
                                style={{ backgroundColor: primaryColor + '20' }}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default BrandingSettings;
