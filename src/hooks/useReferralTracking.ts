import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

const REFERRAL_STORAGE_KEY = 'audit_referrer';

// Simple hash function for IP privacy
const hashString = async (str: string): Promise<string> => {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

export const useReferralTracking = () => {
  useEffect(() => {
    const trackReferral = async () => {
      // Check URL for ref parameter
      const urlParams = new URLSearchParams(window.location.search);
      const refCode = urlParams.get('ref');

      if (!refCode) return;

      // Check if we already have this referral code stored
      const existingRef = localStorage.getItem(REFERRAL_STORAGE_KEY);
      if (existingRef === refCode) return; // Already tracked this code

      // Save to localStorage
      localStorage.setItem(REFERRAL_STORAGE_KEY, refCode);
      console.log('[REFERRAL] Saved referral code:', refCode);

      // Log to referral_visits table
      try {
        // Get a pseudo-IP hash (using a combination of user agent and timestamp for privacy)
        const visitorIdentifier = `${navigator.userAgent}-${new Date().toDateString()}`;
        const visitorIpHash = await hashString(visitorIdentifier);

        const { error } = await supabase
          .from('referral_visits')
          .insert({
            referral_code: refCode,
            visitor_ip_hash: visitorIpHash,
            converted: false,
          });

        if (error) {
          console.error('[REFERRAL] Error logging visit:', error);
        } else {
          console.log('[REFERRAL] Visit logged successfully');
        }
      } catch (err) {
        console.error('[REFERRAL] Error tracking referral:', err);
      }

      // Clean up URL (remove ref param without reload)
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.delete('ref');
      window.history.replaceState({}, '', newUrl.toString());
    };

    trackReferral();
  }, []);
};

// Helper to get stored referral code
export const getStoredReferralCode = (): string | null => {
  return localStorage.getItem(REFERRAL_STORAGE_KEY);
};

// Helper to clear referral code after conversion
export const clearStoredReferralCode = (): void => {
  localStorage.removeItem(REFERRAL_STORAGE_KEY);
};
