import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface BrandingData {
  logoUrl: string | null;
  primaryColor: string | null;
  firmName: string | null;
}

interface BrandingContextType {
  branding: BrandingData;
  loading: boolean;
  isWhiteLabeled: boolean;
}

const defaultBranding: BrandingData = {
  logoUrl: null,
  primaryColor: null,
  firmName: null,
};

const BrandingContext = createContext<BrandingContextType>({
  branding: defaultBranding,
  loading: true,
  isWhiteLabeled: false,
});

export function BrandingProvider({ children }: { children: ReactNode }) {
  const { profileId, role } = useAuth();
  const [branding, setBranding] = useState<BrandingData>(defaultBranding);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBranding = async () => {
      if (!profileId || role !== 'client') {
        setLoading(false);
        return;
      }

      try {
        // First get the client's profile to check managed_by
        const { data: clientProfile, error: clientError } = await supabase
          .from('profiles')
          .select('managed_by')
          .eq('id', profileId)
          .maybeSingle();

        if (clientError || !clientProfile?.managed_by) {
          setLoading(false);
          return;
        }

        // Fetch the manager's branding
        const { data: managerProfile, error: managerError } = await supabase
          .from('profiles')
          .select('brand_logo_url, brand_primary_color, full_name')
          .eq('id', clientProfile.managed_by)
          .maybeSingle();

        if (managerError || !managerProfile) {
          setLoading(false);
          return;
        }

        // Only apply branding if at least logo or color is set
        if (managerProfile.brand_logo_url || managerProfile.brand_primary_color) {
          setBranding({
            logoUrl: managerProfile.brand_logo_url,
            primaryColor: managerProfile.brand_primary_color,
            firmName: managerProfile.full_name,
          });
        }
      } catch (error) {
        console.error('Error fetching branding:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchBranding();
  }, [profileId, role]);

  // Apply CSS variables when branding changes
  useEffect(() => {
    if (branding.primaryColor) {
      // Parse the hex color and convert to HSL for CSS variables
      const hsl = hexToHSL(branding.primaryColor);
      if (hsl) {
        document.documentElement.style.setProperty('--primary', hsl);
        document.documentElement.style.setProperty('--sidebar-background', hsl);
        document.documentElement.style.setProperty('--ring', hsl);
      }
    } else {
      // Reset to defaults
      document.documentElement.style.removeProperty('--primary');
      document.documentElement.style.removeProperty('--sidebar-background');
      document.documentElement.style.removeProperty('--ring');
    }

    return () => {
      // Cleanup on unmount
      document.documentElement.style.removeProperty('--primary');
      document.documentElement.style.removeProperty('--sidebar-background');
      document.documentElement.style.removeProperty('--ring');
    };
  }, [branding.primaryColor]);

  const isWhiteLabeled = !!(branding.logoUrl || branding.primaryColor);

  return (
    <BrandingContext.Provider value={{ branding, loading, isWhiteLabeled }}>
      {children}
    </BrandingContext.Provider>
  );
}

export function useBranding() {
  return useContext(BrandingContext);
}

// Helper function to convert hex to HSL string for CSS variables
function hexToHSL(hex: string): string | null {
  // Remove # if present
  hex = hex.replace(/^#/, '');

  // Parse hex values
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
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }

  // Return HSL without hsl() wrapper for CSS variable format
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}
