import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, AlertCircle, Upload, ChevronRight } from 'lucide-react';

interface PendingRequest {
  id: string;
  document_name: string;
  description: string | null;
  created_at: string;
  case_id: string;
  notice_type: string;
  notice_agency: string;
}

interface ActionRequiredCardProps {
  profileId: string;
}

export function ActionRequiredCard({ profileId }: ActionRequiredCardProps) {
  const navigate = useNavigate();
  const [requests, setRequests] = useState<PendingRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPendingRequests();

    const channel = supabase
      .channel('action-required')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'document_requests' },
        () => {
          fetchPendingRequests();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profileId]);

  const fetchPendingRequests = async () => {
    try {
      // Get all pending document requests for the client's cases
      const { data, error } = await supabase
        .from('document_requests')
        .select(`
          id,
          document_name,
          description,
          created_at,
          case_id,
          cases!inner (
            notice_type,
            notice_agency,
            client_id
          )
        `)
        .eq('status', 'pending');

      if (error) throw error;

      // Filter to only show requests for this client's cases
      const clientRequests = (data || [])
        .filter((r: any) => r.cases?.client_id === profileId)
        .map((r: any) => ({
          id: r.id,
          document_name: r.document_name,
          description: r.description,
          created_at: r.created_at,
          case_id: r.case_id,
          notice_type: r.cases?.notice_type || '',
          notice_agency: r.cases?.notice_agency || '',
        }));

      setRequests(clientRequests);
    } catch (error) {
      console.error('Failed to fetch pending requests:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return null;
  }

  if (requests.length === 0) {
    return null;
  }

  return (
    <Card className="border-0 shadow-md bg-warning/5 border-warning/20">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-warning" />
          Action Required
          <Badge variant="outline" className="ml-2 bg-warning/10 text-warning border-warning/30">
            {requests.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {requests.map((request) => (
          <div
            key={request.id}
            className="flex items-center justify-between p-3 rounded-lg bg-background border border-border hover:border-warning/40 transition-colors cursor-pointer group"
            onClick={() => navigate(`/my-cases/${request.case_id}`)}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-warning/10 flex items-center justify-center">
                <Upload className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="font-medium text-foreground text-sm">{request.document_name}</p>
                <p className="text-xs text-muted-foreground">
                  {request.notice_agency} • {request.notice_type}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-warning/10 text-warning border-warning/30 text-xs">
                Pending
              </Badge>
              <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
