import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, StickyNote, Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Note {
  id: string;
  note: string;
  created_at: string;
}

interface CaseNotesProps {
  caseId: string;
  agentId: string;
}

export function CaseNotes({ caseId, agentId }: CaseNotesProps) {
  const { toast } = useToast();
  const [notes, setNotes] = useState<Note[]>([]);
  const [newNote, setNewNote] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchNotes();

    const channel = supabase
      .channel(`notes-${caseId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'case_notes', filter: `case_id=eq.${caseId}` },
        (payload) => {
          setNotes((prev) => [payload.new as Note, ...prev]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [caseId]);

  const fetchNotes = async () => {
    try {
      const { data, error } = await supabase
        .from('case_notes')
        .select('id, note, created_at')
        .eq('case_id', caseId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setNotes(data || []);
    } catch (error) {
      console.error('Failed to fetch notes:', error);
    } finally {
      setLoading(false);
    }
  };

  const addNote = async () => {
    if (!newNote.trim()) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('case_notes')
        .insert({
          case_id: caseId,
          agent_id: agentId,
          note: newNote.trim(),
        });

      if (error) throw error;

      setNewNote('');
      toast({
        title: 'Note Added',
        description: 'Your internal note has been saved.',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to add note',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="border-0 shadow-md">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <StickyNote className="h-4 w-4 text-primary" />
          Internal Notes
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Textarea
            placeholder="Add a private note (e.g., 'Called IRS, hold time 2 hours')"
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            className="min-h-[80px] resize-none"
          />
          <Button
            onClick={addNote}
            disabled={saving || !newNote.trim()}
            size="sm"
            className="w-full"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Plus className="h-4 w-4 mr-2" />
            )}
            Add Note
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : notes.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No notes yet
          </p>
        ) : (
          <div className="space-y-3 max-h-[200px] overflow-y-auto">
            {notes.map((note) => (
              <div
                key={note.id}
                className="p-3 rounded-lg bg-muted/50 border border-border/50"
              >
                <p className="text-sm text-foreground whitespace-pre-wrap">
                  {note.note}
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  {new Date(note.created_at).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
