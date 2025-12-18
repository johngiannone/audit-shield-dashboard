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
import { cn } from '@/lib/utils';
import { 
  Upload, 
  FileText, 
  CheckCircle, 
  XCircle,
  Loader2,
  Shield,
  Trash2,
  ExternalLink
} from 'lucide-react';

interface FileItem {
  id: string;
  file: File;
  status: 'queued' | 'analyzing' | 'complete' | 'failed';
  result?: {
    score: number;
    flagCount: number;
    extractedData: any;
  };
  error?: string;
}

export default function BatchRiskScan() {
  const { toast } = useToast();
  const { role } = useAuth();
  const navigate = useNavigate();
  const [files, setFiles] = useState<FileItem[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [completedResults, setCompletedResults] = useState<Map<string, any>>(new Map());

  // Redirect non-tax-preparers
  useEffect(() => {
    if (role && role !== 'tax_preparer') {
      navigate('/dashboard');
    }
  }, [role, navigate]);

  const MAX_FILES = 20;

  const addFiles = useCallback((newFiles: File[]) => {
    const pdfFiles = newFiles.filter(f => f.type === 'application/pdf');
    
    if (pdfFiles.length === 0) {
      toast({
        title: 'Invalid Files',
        description: 'Please upload PDF files only.',
        variant: 'destructive',
      });
      return;
    }

    const currentCount = files.length;
    const remainingSlots = MAX_FILES - currentCount;
    
    if (remainingSlots <= 0) {
      toast({
        title: 'Limit Reached',
        description: `Maximum of ${MAX_FILES} files allowed.`,
        variant: 'destructive',
      });
      return;
    }

    const filesToAdd = pdfFiles.slice(0, remainingSlots);
    
    if (pdfFiles.length > remainingSlots) {
      toast({
        title: 'Some Files Skipped',
        description: `Only ${remainingSlots} more file(s) can be added. ${pdfFiles.length - remainingSlots} file(s) were skipped.`,
      });
    }

    const newFileItems: FileItem[] = filesToAdd.map(file => ({
      id: `${file.name}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      file,
      status: 'queued',
    }));

    setFiles(prev => [...prev, ...newFileItems]);
  }, [files.length, toast]);

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
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [addFiles]);

  const removeFile = useCallback((id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
    setCompletedResults(prev => {
      const newMap = new Map(prev);
      newMap.delete(id);
      return newMap;
    });
  }, []);

  const clearAll = useCallback(() => {
    setFiles([]);
    setCompletedResults(new Map());
    setCurrentIndex(0);
    setIsProcessing(false);
  }, []);

  const analyzeFile = async (fileItem: FileItem): Promise<{ success: boolean; result?: any; error?: string }> => {
    try {
      // Convert file to base64
      const base64Promise = new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          const base64 = result.split(',')[1];
          resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(fileItem.file);
      });
      
      const pdfBase64 = await base64Promise;

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze-audit-risk`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ pdfBase64 }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Analysis failed');
      }

      const result = await response.json();
      return { success: true, result };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  };

  const startProcessing = async () => {
    if (files.length === 0) {
      toast({
        title: 'No Files',
        description: 'Please add PDF files to analyze.',
        variant: 'destructive',
      });
      return;
    }

    const queuedFiles = files.filter(f => f.status === 'queued');
    if (queuedFiles.length === 0) {
      toast({
        title: 'No Queued Files',
        description: 'All files have already been processed.',
      });
      return;
    }

    setIsProcessing(true);
    setCurrentIndex(0);

    for (let i = 0; i < files.length; i++) {
      const fileItem = files[i];
      
      if (fileItem.status !== 'queued') {
        continue;
      }

      setCurrentIndex(i + 1);
      
      // Update status to analyzing
      setFiles(prev => prev.map(f => 
        f.id === fileItem.id ? { ...f, status: 'analyzing' as const } : f
      ));

      const { success, result, error } = await analyzeFile(fileItem);

      if (success && result) {
        setFiles(prev => prev.map(f => 
          f.id === fileItem.id ? { 
            ...f, 
            status: 'complete' as const,
            result: {
              score: result.score,
              flagCount: result.flags?.length || 0,
              extractedData: result.extractedData,
            }
          } : f
        ));
        
        // Store full result for viewing
        setCompletedResults(prev => new Map(prev).set(fileItem.id, result));
      } else {
        setFiles(prev => prev.map(f => 
          f.id === fileItem.id ? { 
            ...f, 
            status: 'failed' as const,
            error: error || 'Analysis failed'
          } : f
        ));
      }
    }

    setIsProcessing(false);
    
    const completedCount = files.filter(f => f.status === 'complete' || 
      files.find(fi => fi.id === f.id)?.status === 'complete').length;
    
    toast({
      title: 'Batch Processing Complete',
      description: `Successfully analyzed ${completedCount} of ${files.length} returns.`,
    });
  };

  const getStatusBadge = (status: FileItem['status']) => {
    switch (status) {
      case 'queued':
        return <Badge variant="secondary" className="text-xs">Queued</Badge>;
      case 'analyzing':
        return (
          <Badge variant="outline" className="text-xs text-blue-600 border-blue-300 bg-blue-50">
            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
            Analyzing...
          </Badge>
        );
      case 'complete':
        return (
          <Badge variant="outline" className="text-xs text-green-600 border-green-300 bg-green-50">
            <CheckCircle className="h-3 w-3 mr-1" />
            Complete
          </Badge>
        );
      case 'failed':
        return (
          <Badge variant="destructive" className="text-xs">
            <XCircle className="h-3 w-3 mr-1" />
            Failed
          </Badge>
        );
    }
  };

  const getRiskBadge = (score: number) => {
    if (score >= 65) {
      return <Badge variant="destructive" className="text-xs">High Risk ({score}%)</Badge>;
    } else if (score >= 35) {
      return <Badge variant="outline" className="text-xs text-amber-600 border-amber-300 bg-amber-50">Medium ({score}%)</Badge>;
    }
    return <Badge variant="outline" className="text-xs text-green-600 border-green-300 bg-green-50">Low ({score}%)</Badge>;
  };

  const queuedCount = files.filter(f => f.status === 'queued').length;
  const completedCount = files.filter(f => f.status === 'complete').length;
  const failedCount = files.filter(f => f.status === 'failed').length;
  const processingProgress = files.length > 0 
    ? ((completedCount + failedCount) / files.length) * 100 
    : 0;

  // Store result for modal view
  const [viewingResult, setViewingResult] = useState<any>(null);
  const [viewingFileName, setViewingFileName] = useState<string>('');

  return (
    <DashboardLayout>
      <Helmet>
        <title>Batch Risk Scan | Return Shield</title>
        <meta name="description" content="Analyze multiple tax returns for audit risk factors" />
      </Helmet>

      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold font-display">Batch Risk Scan</h1>
          <p className="text-muted-foreground mt-1">
            Upload multiple Form 1040 PDFs to analyze for audit risk factors
          </p>
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
                files.length >= MAX_FILES && "opacity-50 cursor-not-allowed"
              )}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf"
                multiple
                onChange={handleFileSelect}
                className="hidden"
                disabled={files.length >= MAX_FILES}
              />
              <Upload className={cn(
                "h-12 w-12 mx-auto mb-4 transition-colors",
                isDragging ? "text-primary" : "text-muted-foreground"
              )} />
              <h3 className="text-lg font-semibold mb-2">
                {isDragging ? 'Drop files here' : 'Drag & drop PDF files'}
              </h3>
              <p className="text-muted-foreground text-sm mb-4">
                or click to browse • Maximum {MAX_FILES} files
              </p>
              <p className="text-xs text-muted-foreground">
                {files.length} / {MAX_FILES} files added
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Progress & Controls */}
        {files.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Processing Queue</CardTitle>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={clearAll}
                    disabled={isProcessing}
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Clear All
                  </Button>
                  <Button
                    onClick={startProcessing}
                    disabled={isProcessing || queuedCount === 0}
                    size="sm"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Shield className="h-4 w-4 mr-1" />
                        Start Analysis
                      </>
                    )}
                  </Button>
                </div>
              </div>
              <CardDescription>
                {isProcessing 
                  ? `Processing ${currentIndex} of ${files.length} returns...`
                  : `${completedCount} complete • ${failedCount} failed • ${queuedCount} queued`
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Global Progress Bar */}
              {(isProcessing || completedCount > 0 || failedCount > 0) && (
                <div className="mb-4">
                  <Progress value={processingProgress} className="h-2" />
                </div>
              )}

              {/* File Queue List */}
              <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
                {files.map((fileItem) => (
                  <div
                    key={fileItem.id}
                    className={cn(
                      "flex items-center justify-between p-3 rounded-lg border transition-colors",
                      fileItem.status === 'complete' && "bg-green-50/50 border-green-200",
                      fileItem.status === 'failed' && "bg-red-50/50 border-red-200",
                      fileItem.status === 'analyzing' && "bg-blue-50/50 border-blue-200",
                      fileItem.status === 'queued' && "bg-muted/30"
                    )}
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-sm truncate">{fileItem.file.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {(fileItem.file.size / 1024).toFixed(1)} KB
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {fileItem.status === 'complete' && fileItem.result && (
                        <>
                          {getRiskBadge(fileItem.result.score)}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-primary hover:text-primary"
                            onClick={() => {
                              const fullResult = completedResults.get(fileItem.id);
                              if (fullResult) {
                                setViewingResult(fullResult);
                                setViewingFileName(fileItem.file.name);
                              }
                            }}
                          >
                            <ExternalLink className="h-4 w-4 mr-1" />
                            View Report
                          </Button>
                        </>
                      )}
                      
                      {fileItem.status === 'failed' && (
                        <span className="text-xs text-destructive truncate max-w-[150px]">
                          {fileItem.error}
                        </span>
                      )}
                      
                      {getStatusBadge(fileItem.status)}
                      
                      {!isProcessing && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => removeFile(fileItem.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Result Modal/Panel */}
        {viewingResult && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    Risk Report: {viewingFileName}
                  </CardTitle>
                  <CardDescription>
                    Tax Year: {viewingResult.extractedData?.taxYear || 'N/A'} • 
                    AGI: {viewingResult.extractedData?.agi 
                      ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(viewingResult.extractedData.agi)
                      : 'N/A'
                    }
                  </CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={() => setViewingResult(null)}>
                  Close
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                {/* Score Summary */}
                <div className="p-4 rounded-lg bg-muted/50">
                  <p className="text-sm text-muted-foreground mb-1">Audit Risk Score</p>
                  <div className="flex items-center gap-3">
                    <span className={cn(
                      "text-4xl font-bold",
                      viewingResult.score >= 65 ? "text-destructive" :
                      viewingResult.score >= 35 ? "text-amber-600" : "text-green-600"
                    )}>
                      {viewingResult.score}%
                    </span>
                    {getRiskBadge(viewingResult.score)}
                  </div>
                </div>

                {/* Flags Summary */}
                <div className="p-4 rounded-lg bg-muted/50">
                  <p className="text-sm text-muted-foreground mb-1">Risk Flags Found</p>
                  <p className="text-4xl font-bold">{viewingResult.flags?.length || 0}</p>
                </div>
              </div>

              {/* Risk Flags List */}
              {viewingResult.flags && viewingResult.flags.length > 0 && (
                <div className="mt-4 space-y-2">
                  <p className="font-medium text-sm">Identified Risk Factors:</p>
                  {viewingResult.flags.map((flag: any, index: number) => (
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
