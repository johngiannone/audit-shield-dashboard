import { useEffect, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
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

const CASES_QUERY_KEY = 'realtime-cases';

async function fetchCases(profileId: string): Promise<Case[]> {
  const { data, error } = await supabase
    .from('cases')
    .select('*')
    .or(`assigned_agent_id.eq.${profileId},client_id.eq.${profileId}`);

  if (error) throw error;
  return (data as Case[]) ?? [];
}

export const useRealtimeCases = (profileId: string) => {
  const queryClient = useQueryClient();
  const queryKey = [CASES_QUERY_KEY, profileId];

  const { data: cases = [], isLoading: loading, error } = useQuery({
    queryKey,
    queryFn: () => fetchCases(profileId),
    enabled: !!profileId,
    staleTime: 30_000,        // 30s before background refetch
    refetchOnWindowFocus: true,
  });

  // Realtime subscription that invalidates the query cache on changes
  const handleRealtimeChange = useCallback(() => {
    queryClient.invalidateQueries({ queryKey });
  }, [queryClient, queryKey[1]]);

  useEffect(() => {
    if (!profileId) return;

    const channel = supabase
      .channel(`cases-${profileId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'cases',
          filter: `assigned_agent_id=eq.${profileId}`,
        },
        handleRealtimeChange
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profileId, handleRealtimeChange]);

  return {
    cases,
    loading,
    error: error as Error | null,
  };
};
