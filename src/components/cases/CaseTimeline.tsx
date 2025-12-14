import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Clock, CheckCircle, AlertTriangle, FileText, MessageSquare, StickyNote } from 'lucide-react';

interface TimelineEvent {
  id: string;
  type: 'status' | 'note' | 'message' | 'document';
  title: string;
  description?: string;
  created_at: string;
}

interface CaseTimelineProps {
  caseId: string;
  caseCreatedAt: string;
}

export function CaseTimeline({ caseId, caseCreatedAt }: CaseTimelineProps) {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTimeline();
  }, [caseId]);

  const fetchTimeline = async () => {
    try {
      // Fetch status history
      const { data: statusHistory } = await supabase
        .from('case_status_history')
        .select('id, old_status, new_status, created_at')
        .eq('case_id', caseId)
        .order('created_at', { ascending: false });

      // Fetch notes
      const { data: notes } = await supabase
        .from('case_notes')
        .select('id, created_at')
        .eq('case_id', caseId)
        .order('created_at', { ascending: false });

      // Fetch documents
      const { data: documents } = await supabase
        .from('case_documents')
        .select('id, file_name, created_at')
        .eq('case_id', caseId)
        .order('created_at', { ascending: false });

      // Combine all events
      const allEvents: TimelineEvent[] = [];

      // Add case created event
      allEvents.push({
        id: 'case-created',
        type: 'status',
        title: 'Case Created',
        created_at: caseCreatedAt,
      });

      // Add status changes
      statusHistory?.forEach((status) => {
        allEvents.push({
          id: status.id,
          type: 'status',
          title: `Status changed to ${status.new_status.replace('_', ' ')}`,
          description: status.old_status ? `From: ${status.old_status.replace('_', ' ')}` : undefined,
          created_at: status.created_at,
        });
      });

      // Add notes
      notes?.forEach((note) => {
        allEvents.push({
          id: note.id,
          type: 'note',
          title: 'Note added',
          created_at: note.created_at,
        });
      });

      // Add documents
      documents?.forEach((doc) => {
        allEvents.push({
          id: doc.id,
          type: 'document',
          title: 'Document uploaded',
          description: doc.file_name,
          created_at: doc.created_at,
        });
      });

      // Sort by date descending
      allEvents.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      setEvents(allEvents);
    } catch (error) {
      console.error('Failed to fetch timeline:', error);
    } finally {
      setLoading(false);
    }
  };

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'status':
        return <CheckCircle className="h-4 w-4 text-primary" />;
      case 'note':
        return <StickyNote className="h-4 w-4 text-warning" />;
      case 'message':
        return <MessageSquare className="h-4 w-4 text-info" />;
      case 'document':
        return <FileText className="h-4 w-4 text-success" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <Card className="border-0 shadow-md">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Clock className="h-4 w-4 text-primary" />
          Timeline
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : events.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No activity yet
          </p>
        ) : (
          <div className="relative space-y-0 max-h-[300px] overflow-y-auto">
            {events.map((event, index) => (
              <div key={event.id} className="flex gap-3 pb-4">
                <div className="flex flex-col items-center">
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                    {getEventIcon(event.type)}
                  </div>
                  {index < events.length - 1 && (
                    <div className="w-px h-full bg-border flex-1 mt-2" />
                  )}
                </div>
                <div className="flex-1 min-w-0 pt-1">
                  <p className="text-sm font-medium text-foreground">{event.title}</p>
                  {event.description && (
                    <p className="text-xs text-muted-foreground truncate">{event.description}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatDate(event.created_at)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
