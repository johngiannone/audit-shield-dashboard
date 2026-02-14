import { useEffect, useState } from 'react';
import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

export interface Case {
  id: string;
  assigned_agent_id: string | null;
  client_id: string;
  notice_type: string;
  notice_agency: string;
  status: string;
  response_due_date: string | null;
  created_at: string;
  updated_at: string;
  tax_year: number;
  summary: string | null;
  file_path: string | null;
  tax_return_path: string | null;
  [key: string]: any;
}

interface UseRealtimeCasesReturn {
  cases: Case[];
  loading: boolean;
  error: Error | null;
}

export const useRealtimeCases = (profileId: string): UseRealtimeCasesReturn => {
  const [cases, setCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  let channel: RealtimeChannel | null = null;

  useEffect(() => {
    if (!profileId) {
      setLoading(false);
      return;
    }

    const initializeSubscription = async () => {
      try {
        setError(null);

        // Fetch initial cases data
        const { data, error: fetchError } = await supabase
          .from('cases')
          .select('*')
          .or(
            `assigned_agent_id.eq.${profileId},client_id.eq.${profileId}`
          );

        if (fetchError) {
          throw fetchError;
        }

        setCases(data as Case[]);
        setLoading(false);

        // Subscribe to realtime changes
        channel = supabase
          .channel(`cases-${profileId}`)
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'cases',
              filter: `assigned_agent_id=eq.${profileId}`,
            },
            (payload) => {
              const newCase = payload.new as Case;
              setCases((prev) => {
                const exists = prev.some((c) => c.id === newCase.id);
                return exists ? prev : [...prev, newCase];
              });
            }
          )
          .on(
            'postgres_changes',
            {
              event: 'UPDATE',
              schema: 'public',
              table: 'cases',
              filter: `assigned_agent_id=eq.${profileId}`,
            },
            (payload) => {
              const updatedCase = payload.new as Case;
              setCases((prev) =>
                prev.map((c) => (c.id === updatedCase.id ? updatedCase : c))
              );
            }
          )
          .on(
            'postgres_changes',
            {
              event: 'DELETE',
              schema: 'public',
              table: 'cases',
              filter: `assigned_agent_id=eq.${profileId}`,
            },
            (payload) => {
              const deletedId = (payload.old as Case).id;
              setCases((prev) => prev.filter((c) => c.id !== deletedId));
            }
          )
          .subscribe((status) => {
            if (status === 'CLOSED') {
              setError(
                new Error('Realtime connection closed unexpectedly')
              );
            }
          });
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);
        setLoading(false);
      }
    };

    initializeSubscription();

    // Cleanup on unmount
    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [profileId]);

  return {
    cases,
    loading,
    error,
  };
};
