import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { Archive, Upload, FileText, Image, Trash2, ShieldCheck, Loader2, FolderOpen, Eye, Download } from 'lucide-react';

const EXPENSE_CATEGORIES = [
  'W-2 / Wages',
  '1099-K',
  '1099-NEC',
  '1099-MISC',
  '1099-INT / DIV',
  'Meals & Entertainment',
  'Travel',
  'Vehicle / Mileage',
  'Home Office',
  'Office Supplies',
  'Professional Services',
  'Insurance',
  'Marketing & Advertising',
  'Charitable Contributions',
  'Medical Expenses',
  'Other',
];

const CURRENT_YEAR = new Date().getFullYear();
const TAX_YEARS = [CURRENT_YEAR, CURRENT_YEAR - 1, CURRENT_YEAR - 2, CURRENT_YEAR - 3];

interface VaultDocument {
  id: string;
  profile_id: string;
  tax_year: number;
  expense_category: string;
  file_name: string;
  file_path: string;
  file_type: string | null;
  file_size: number | null;
  created_at: string;
}

export default function AuditVault() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedTaxYear, setSelectedTaxYear] = useState<string>(String(CURRENT_YEAR));
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Fetch profile id
  const { data: profile } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user!.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Fetch vault documents
  const { data: documents = [], isLoading } = useQuery({
    queryKey: ['vault-documents', profile?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vault_documents')
        .select('*')
        .eq('profile_id', profile!.id)
        .order('tax_year', { ascending: false })
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as VaultDocument[];
    },
    enabled: !!profile?.id,
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (doc: VaultDocument) => {
      // Delete from storage
      await supabase.storage.from('audit-vault').remove([doc.file_path]);
      // Delete record
      const { error } = await supabase.from('vault_documents').delete().eq('id', doc.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vault-documents'] });
      toast.success('Document deleted');
    },
    onError: () => toast.error('Failed to delete document'),
  });

  const getSignedUrl = async (filePath: string) => {
    const { data, error } = await supabase.storage
      .from('audit-vault')
      .createSignedUrl(filePath, 3600);
    if (error || !data?.signedUrl) {
      toast.error('Failed to generate file URL');
      return null;
    }
    return data.signedUrl;
  };

  const handlePreview = async (doc: VaultDocument) => {
    const url = await getSignedUrl(doc.file_path);
    if (url) window.open(url, '_blank');
  };

  const handleDownload = async (doc: VaultDocument) => {
    const url = await getSignedUrl(doc.file_path);
    if (url) {
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.file_name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  const uploadFiles = useCallback(async (files: FileList | File[]) => {
    if (!profile?.id || !user?.id) return;
    if (!selectedCategory) {
      toast.error('Please select an expense category before uploading.');
      return;
    }

    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/heic'];
    const fileArray = Array.from(files);
    const invalid = fileArray.filter(f => !allowedTypes.includes(f.type));
    if (invalid.length) {
      toast.error(`Unsupported file type: ${invalid[0].name}. Please upload PDFs or images.`);
      return;
    }

    setIsUploading(true);
    try {
      for (const file of fileArray) {
        const ext = file.name.split('.').pop();
        const storagePath = `${user.id}/${Date.now()}_${crypto.randomUUID()}.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from('audit-vault')
          .upload(storagePath, file);
        if (uploadError) throw uploadError;

        const { error: insertError } = await supabase.from('vault_documents').insert({
          profile_id: profile.id,
          tax_year: Number(selectedTaxYear),
          expense_category: selectedCategory,
          file_name: file.name,
          file_path: storagePath,
          file_type: file.type,
          file_size: file.size,
        });
        if (insertError) throw insertError;
      }

      queryClient.invalidateQueries({ queryKey: ['vault-documents'] });
      toast.success(`${fileArray.length} file(s) uploaded successfully`);
    } catch (err: any) {
      console.error('Upload error:', err);
      toast.error('Upload failed. Please try again.');
    } finally {
      setIsUploading(false);
    }
  }, [profile?.id, user?.id, selectedTaxYear, selectedCategory, queryClient]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files.length) uploadFiles(e.dataTransfer.files);
  }, [uploadFiles]);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) uploadFiles(e.target.files);
    e.target.value = '';
  };

  // Group documents by tax year
  const grouped = documents.reduce<Record<number, VaultDocument[]>>((acc, doc) => {
    (acc[doc.tax_year] ||= []).push(doc);
    return acc;
  }, {});

  const formatSize = (bytes: number | null) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  };

  const isImage = (type: string | null) => type?.startsWith('image/');

  return (
    <DashboardLayout>
      <div className="space-y-8 max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Archive className="h-7 w-7 text-primary" />
          </div>
          <div>
            <h1 className="font-display text-3xl font-bold text-foreground">Audit Vault</h1>
            <p className="text-muted-foreground">Year-round document storage. Organized. Secure. Audit-ready.</p>
          </div>
        </div>

        {/* Upload Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Upload className="h-5 w-5" />
              Upload Documents
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Category selectors */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Tax Year</label>
                <Select value={selectedTaxYear} onValueChange={setSelectedTaxYear}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select year" />
                  </SelectTrigger>
                  <SelectContent>
                    {TAX_YEARS.map(y => (
                      <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Expense Category</label>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {EXPENSE_CATEGORIES.map(c => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Drop zone */}
            <div
              onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              className={`relative border-2 border-dashed rounded-xl p-10 text-center transition-colors cursor-pointer ${
                isDragging
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/50 hover:bg-muted/30'
              }`}
              onClick={() => document.getElementById('vault-file-input')?.click()}
            >
              {isUploading ? (
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">Uploading…</p>
                </div>
              ) : (
                <>
                  <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
                  <p className="font-medium text-foreground">
                    Drag & drop files here, or click to browse
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    PDFs and images accepted (JPEG, PNG, WebP) · 20 MB max
                  </p>
                </>
              )}
              <input
                id="vault-file-input"
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.webp"
                multiple
                className="hidden"
                onChange={handleFileInput}
              />
            </div>
          </CardContent>
        </Card>

        {/* Documents Grid grouped by Tax Year */}
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : documents.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <FolderOpen className="h-12 w-12 mx-auto text-muted-foreground/40 mb-4" />
              <h3 className="font-display text-lg font-semibold text-foreground mb-1">Your vault is empty</h3>
              <p className="text-muted-foreground text-sm">
                Upload receipts, 1099s, and other tax documents to keep them organized and audit-ready.
              </p>
            </CardContent>
          </Card>
        ) : (
          Object.entries(grouped)
            .sort(([a], [b]) => Number(b) - Number(a))
            .map(([year, docs]) => (
              <div key={year} className="space-y-3">
                <div className="flex items-center gap-3">
                  <h2 className="font-display text-xl font-bold text-foreground">{year} Tax Year</h2>
                  <Badge variant="secondary" className="flex items-center gap-1">
                    <ShieldCheck className="h-3 w-3" />
                    {docs.length} document{docs.length !== 1 ? 's' : ''}
                  </Badge>
                </div>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {docs.map(doc => (
                    <Card key={doc.id} className="group relative">
                      <CardContent className="p-4 space-y-3">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                            {isImage(doc.file_type)
                              ? <Image className="h-5 w-5 text-muted-foreground" />
                              : <FileText className="h-5 w-5 text-muted-foreground" />
                            }
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-foreground truncate" title={doc.file_name}>
                              {doc.file_name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {doc.expense_category} · {formatSize(doc.file_size)}
                            </p>
                          </div>
                        </div>
                        <Separator />
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">
                            {new Date(doc.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
                            onClick={() => deleteMutation.mutate(doc)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ))
        )}
      </div>
    </DashboardLayout>
  );
}
