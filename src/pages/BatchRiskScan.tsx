import { useState, useCallback, useEffect, useRef } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { 
  Upload, 
  FileText, 
  CheckCircle, 
  XCircle,
  Loader2,
  Shield,
  Trash2,
  ExternalLink,
  RefreshCw
} from 'lucide-react';

interface ScanJob {
  id: string;
  original_filename: string;
  file_path: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  risk_score: number | null;
  extracted_data: any;
  detected_issues: any[];
  error_message: string | null;
  created_at: string;
  processed_at: string | null;
}

interface FileQueueItem {
  id: string;
  file: File;
  uploadStatus: 'uploading' | 'uploaded' | 'error';
  jobId?: string;
  error?: string;
}

export default function BatchRiskScan() {
  const { toast } = useToast();
  const { role, user, profileId } = useAuth();
  const navigate = useNavigate();
  const [fileQueue, setFileQueue] = useState<FileQueueItem[]>([]);
  const [jobs, setJobs] = useState<ScanJob[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [viewingJob, setViewingJob] = useState<ScanJob | null>(null);

  // Redirect non-tax-preparers
  useEffect(() => {
    if (role && role !== 'tax_preparer') {
      navigate('/dashboard');
    }
  }, [role, navigate]);

  // Load existing jobs
  useEffect(() => {
    if (profileId) {
      loadJobs();
    }
  }, [profileId]);

  const loadJobs = async () => {
    const { data, error } = await supabase
      .from('audit_scan_jobs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    if (!error && data) {
      setJobs(data as ScanJob[]);
    }
  };

  const MAX_FILES = 20;

  const uploadAndCreateJob = async (file: File): Promise<{ success: boolean; jobId?: string; error?: string }> => {
    try {
      if (!user?.id) throw new Error('Not authenticated');

      // Upload to storage
      const filePath = `${user.id}/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from('scan-queue')
        .upload(filePath, file);

      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw new Error(uploadError.message);
      }

      // Create job record
      const { data: job, error: jobError } = await supabase
        .from('audit_scan_jobs')
        .insert({
          profile_id: profileId,
          original_filename: file.name,
          file_path: filePath,
          status: 'pending',
        })
        .select()
        .single();

      if (jobError) {
        console.error('Job creation error:', jobError);
        throw new Error(jobError.message);
      }

      return { success: true, jobId: job.id };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Upload failed' 
      };
    }
  };

  const processJob = async (jobId: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase.functions.invoke('process-scan-job', {
        body: { jobId }
      });

      if (error) {
        console.error('Process error:', error);
        return false;
      }

      return data?.success || false;
    } catch (error) {
      console.error('Process job error:', error);
      return false;
    }
  };

  const addFiles = useCallback(async (newFiles: File[]) => {
    const pdfFiles = newFiles.filter(f => f.type === 'application/pdf');
    
    if (pdfFiles.length === 0) {
      toast({
        title: 'Invalid Files',
        description: 'Please upload PDF files only.',
        variant: 'destructive',
      });
      return;
    }

    const currentCount = fileQueue.length + jobs.filter(j => j.status === 'pending').length;
    const remainingSlots = MAX_FILES - currentCount;
    
    if (remainingSlots <= 0) {
      toast({
        title: 'Limit Reached',
        description: `Maximum of ${MAX_FILES} pending files allowed.`,
        variant: 'destructive',
      });
      return;
    }

    const filesToAdd = pdfFiles.slice(0, remainingSlots);
    
    if (pdfFiles.length > remainingSlots) {
      toast({
        title: 'Some Files Skipped',
        description: `Only ${remainingSlots} more file(s) can be added.`,
      });
    }

    // Add files to queue
    const newQueueItems: FileQueueItem[] = filesToAdd.map(file => ({
      id: `${file.name}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      file,
      uploadStatus: 'uploading' as const,
    }));

    setFileQueue(prev => [...prev, ...newQueueItems]);
    setIsUploading(true);

    // Upload each file
    for (const item of newQueueItems) {
      const result = await uploadAndCreateJob(item.file);
      
      setFileQueue(prev => prev.map(f => 
        f.id === item.id 
          ? { 
              ...f, 
              uploadStatus: result.success ? 'uploaded' : 'error',
              jobId: result.jobId,
              error: result.error 
            } 
          : f
      ));
    }

    setIsUploading(false);
    loadJobs();

    toast({
      title: 'Files Uploaded',
      description: `${filesToAdd.length} file(s) added to the queue.`,
    });
  }, [fileQueue.length, jobs, toast, profileId, user]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFiles = Array.from(e.dataTransfer.files);
    addFiles(droppedFiles);
  }, [addFiles]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files ? Array.from(e.target.files) : [];
    addFiles(selectedFiles);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [addFiles]);

  const startProcessing = async () => {
    const pendingJobs = jobs.filter(j => j.status === 'pending');
    
    if (pendingJobs.length === 0) {
      toast({
        title: 'No Pending Jobs',
        description: 'Upload files first or all jobs are already processed.',
      });
      return;
    }

    setIsProcessing(true);

    for (let i = 0; i < pendingJobs.length; i++) {
      const job = pendingJobs[i];
      
      // Update local state to show processing
      setJobs(prev => prev.map(j => 
        j.id === job.id ? { ...j, status: 'processing' } : j
      ));

      await processJob(job.id);
      
      // Reload jobs to get updated status
      await loadJobs();
    }

    setIsProcessing(false);
    setFileQueue([]);
    
    toast({
      title: 'Batch Processing Complete',
      description: `Processed ${pendingJobs.length} return(s).`,
    });
  };

  const getStatusBadge = (status: ScanJob['status']) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary" className="text-xs">Queued</Badge>;
      case 'processing':
        return (
          <Badge variant="outline" className="text-xs text-blue-600 border-blue-300 bg-blue-50">
            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
            Analyzing...
          </Badge>
        );
      case 'completed':
        return (
          <Badge variant="outline" className="text-xs text-green-600 border-green-300 bg-green-50">
            <CheckCircle className="h-3 w-3 mr-1" />
            Complete
          </Badge>
        );
      case 'error':
        return (
          <Badge variant="destructive" className="text-xs">
            <XCircle className="h-3 w-3 mr-1" />
            Failed
          </Badge>
        );
    }
  };

  const getRiskBadge = (score: number | null) => {
    if (score === null) return null;
    if (score >= 65) {
      return <Badge variant="destructive" className="text-xs">High Risk ({score}%)</Badge>;
    } else if (score >= 35) {
      return <Badge variant="outline" className="text-xs text-amber-600 border-amber-300 bg-amber-50">Medium ({score}%)</Badge>;
    }
    return <Badge variant="outline" className="text-xs text-green-600 border-green-300 bg-green-50">Low ({score}%)</Badge>;
  };

  const pendingCount = jobs.filter(j => j.status === 'pending').length;
  const processingCount = jobs.filter(j => j.status === 'processing').length;
  const completedCount = jobs.filter(j => j.status === 'completed').length;
  const errorCount = jobs.filter(j => j.status === 'error').length;
  
  const totalInProgress = pendingCount + processingCount;
  const processingProgress = totalInProgress > 0 
    ? ((totalInProgress - pendingCount) / totalInProgress) * 100 
    : 0;

  return (
    <DashboardLayout>
      <Helmet>
        <title>Batch Risk Scan | Return Shield</title>
        <meta name="description" content="Analyze multiple tax returns for audit risk factors" />
      </Helmet>

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold font-display">Batch Risk Scan</h1>
            <p className="text-muted-foreground mt-1">
              Upload multiple Form 1040 PDFs to analyze for audit risk factors
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={loadJobs}>
            <RefreshCw className="h-4 w-4 mr-1" />
            Refresh
          </Button>
        </div>

        {/* Drop Zone */}
        <Card>
          <CardContent className="pt-6">
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                "border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all duration-200",
                isDragging 
                  ? "border-primary bg-primary/5 scale-[1.02]" 
                  : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50",
                isUploading && "opacity-50 cursor-not-allowed"
              )}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf"
                multiple
                onChange={handleFileSelect}
                className="hidden"
                disabled={isUploading}
              />
              {isUploading ? (
                <Loader2 className="h-12 w-12 mx-auto mb-4 text-primary animate-spin" />
              ) : (
                <Upload className={cn(
                  "h-12 w-12 mx-auto mb-4 transition-colors",
                  isDragging ? "text-primary" : "text-muted-foreground"
                )} />
              )}
              <h3 className="text-lg font-semibold mb-2">
                {isUploading ? 'Uploading files...' : isDragging ? 'Drop files here' : 'Drag & drop PDF files'}
              </h3>
              <p className="text-muted-foreground text-sm mb-4">
                or click to browse • Maximum {MAX_FILES} files at a time
              </p>
              <p className="text-xs text-muted-foreground">
                Files are stored securely and processed with Claude AI
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Processing Queue */}
        {jobs.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Processing Queue</CardTitle>
                <Button
                  onClick={startProcessing}
                  disabled={isProcessing || pendingCount === 0}
                  size="sm"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                      Processing {processingCount} of {totalInProgress}...
                    </>
                  ) : (
                    <>
                      <Shield className="h-4 w-4 mr-1" />
                      Start Analysis ({pendingCount})
                    </>
                  )}
                </Button>
              </div>
              <CardDescription>
                {completedCount} complete • {errorCount} failed • {pendingCount} queued
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Global Progress Bar */}
              {isProcessing && (
                <div className="mb-4">
                  <Progress value={processingProgress} className="h-2" />
                </div>
              )}

              {/* Jobs List */}
              <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
                {jobs.map((job) => (
                  <div
                    key={job.id}
                    className={cn(
                      "flex items-center justify-between p-3 rounded-lg border transition-colors",
                      job.status === 'completed' && "bg-green-50/50 border-green-200",
                      job.status === 'error' && "bg-red-50/50 border-red-200",
                      job.status === 'processing' && "bg-blue-50/50 border-blue-200",
                      job.status === 'pending' && "bg-muted/30"
                    )}
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-sm truncate">{job.original_filename}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(job.created_at).toLocaleString()}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {job.status === 'completed' && (
                        <>
                          {getRiskBadge(job.risk_score)}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-primary hover:text-primary"
                            onClick={() => setViewingJob(job)}
                          >
                            <ExternalLink className="h-4 w-4 mr-1" />
                            View Report
                          </Button>
                        </>
                      )}
                      
                      {job.status === 'error' && (
                        <span className="text-xs text-destructive truncate max-w-[150px]">
                          {job.error_message || 'Analysis failed'}
                        </span>
                      )}
                      
                      {getStatusBadge(job.status)}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Result Panel */}
        {viewingJob && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    Risk Report: {viewingJob.original_filename}
                  </CardTitle>
                  <CardDescription>
                    {viewingJob.extracted_data?.clientName && `Client: ${viewingJob.extracted_data.clientName} • `}
                    Tax Year: {viewingJob.extracted_data?.taxYear || 'N/A'} • 
                    AGI: {viewingJob.extracted_data?.agi 
                      ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(viewingJob.extracted_data.agi)
                      : 'N/A'
                    }
                  </CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={() => setViewingJob(null)}>
                  Close
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                {/* Score Summary */}
                <div className="p-4 rounded-lg bg-muted/50">
                  <p className="text-sm text-muted-foreground mb-1">Audit Risk Score</p>
                  <div className="flex items-center gap-3">
                    <span className={cn(
                      "text-4xl font-bold",
                      (viewingJob.risk_score || 0) >= 65 ? "text-destructive" :
                      (viewingJob.risk_score || 0) >= 35 ? "text-amber-600" : "text-green-600"
                    )}>
                      {viewingJob.risk_score || 0}%
                    </span>
                    {getRiskBadge(viewingJob.risk_score)}
                  </div>
                </div>

                {/* Flags Summary */}
                <div className="p-4 rounded-lg bg-muted/50">
                  <p className="text-sm text-muted-foreground mb-1">Risk Flags</p>
                  <p className="text-4xl font-bold">{viewingJob.detected_issues?.length || 0}</p>
                </div>

                {/* Extracted Data */}
                <div className="p-4 rounded-lg bg-muted/50">
                  <p className="text-sm text-muted-foreground mb-1">Schedule C Profit</p>
                  <p className="text-2xl font-bold">
                    {viewingJob.extracted_data?.scheduleCNetProfit 
                      ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(viewingJob.extracted_data.scheduleCNetProfit)
                      : 'N/A'
                    }
                  </p>
                </div>
              </div>

              {/* Risk Flags List */}
              {viewingJob.detected_issues && viewingJob.detected_issues.length > 0 && (
                <div className="mt-4 space-y-2">
                  <p className="font-medium text-sm">Identified Risk Factors:</p>
                  {viewingJob.detected_issues.map((flag: any, index: number) => (
                    <div 
                      key={index}
                      className={cn(
                        "p-3 rounded-lg border text-sm",
                        flag.severity === 'high' && "bg-red-50 border-red-200",
                        flag.severity === 'medium' && "bg-amber-50 border-amber-200",
                        flag.severity === 'low' && "bg-blue-50 border-blue-200"
                      )}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant={flag.severity === 'high' ? 'destructive' : 'outline'} className="text-xs">
                          {flag.severity}
                        </Badge>
                        <span className="font-medium">{flag.flag}</span>
                      </div>
                      <p className="text-muted-foreground text-xs">{flag.details}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
