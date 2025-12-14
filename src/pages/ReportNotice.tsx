import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, CheckCircle, Upload, FileText, X, Sparkles, Image, FileType, AlertCircle, RotateCcw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface AnalysisResult {
  agency: string | null;
  notice_type: string | null;
  tax_year: number | null;
  client_name_on_notice: string | null;
  summary: string | null;
}

export default function ReportNotice() {
  const navigate = useNavigate();
  const { user, role, loading } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [taxYear, setTaxYear] = useState<string>('2024');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadedFilePath, setUploadedFilePath] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
    if (!loading && role === 'agent') {
      navigate('/dashboard');
    }
  }, [user, loading, role, navigate]);

  const uploadFile = useCallback(async (file: File) => {
    if (!user) return;

    setIsUploading(true);
    setUploadProgress(0);
    setUploadError(null);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}_${file.name}`;
      
      // Simulate progress for better UX (actual upload doesn't provide progress)
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return prev;
          }
          return prev + 10;
        });
      }, 100);

      const { error: uploadError } = await supabase.storage
        .from('audit-notices')
        .upload(fileName, file);

      clearInterval(progressInterval);

      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw new Error('Failed to upload file');
      }

      setUploadProgress(100);
      setUploadedFilePath(fileName);
      
      toast({
        title: 'Upload Complete',
        description: 'Your file is ready for analysis.',
      });
    } catch (error: any) {
      console.error('Upload error:', error);
      setUploadProgress(0);
      setUploadError(error.message || 'Failed to upload file. Please try again.');
      toast({
        title: 'Upload Failed',
        description: error.message || 'Failed to upload file. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
    }
  }, [user, toast]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await processFile(file);
    }
  };

  const processFile = async (file: File) => {
    const validTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'];
    if (!validTypes.includes(file.type)) {
      toast({
        title: 'Invalid file type',
        description: 'Please upload a PDF or image file (PNG, JPG)',
        variant: 'destructive',
      });
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: 'File too large',
        description: 'Please upload a file smaller than 10MB',
        variant: 'destructive',
      });
      return;
    }
    setSelectedFile(file);
    setAnalysisResult(null);
    setUploadedFilePath(null);
    await uploadFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      await processFile(file);
    }
  };

  const removeFile = async () => {
    // Try to delete from storage if uploaded
    if (uploadedFilePath) {
      await supabase.storage.from('audit-notices').remove([uploadedFilePath]);
    }
    setSelectedFile(null);
    setUploadedFilePath(null);
    setUploadProgress(0);
    setAnalysisResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const analyzeNotice = async () => {
    if (!selectedFile) return;

    setIsAnalyzing(true);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;

      if (!accessToken) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze-notice`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
          body: formData,
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to analyze notice');
      }

      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }

      setAnalysisResult(data.analysis);
      setShowReviewModal(true);
      
      toast({
        title: 'Analysis Complete',
        description: 'Please review the extracted information.',
      });
    } catch (error: any) {
      console.error('Analysis error:', error);
      toast({
        title: 'Analysis Failed',
        description: error.message || 'Failed to analyze the notice. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const saveCase = async () => {
    if (!analysisResult || !uploadedFilePath || !user) return;

    setIsSaving(true);
    try {
      // Get user's profile ID
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (profileError || !profile) {
        throw new Error('Could not find your profile');
      }

      // Determine agency value
      const agency = analysisResult.agency?.toUpperCase() === 'IRS' ? 'IRS' : 'State';

      // Create case record
      const { error: insertError } = await supabase
        .from('cases')
        .insert({
          client_id: profile.id,
          notice_agency: agency,
          notice_type: analysisResult.notice_type || 'Unknown',
          tax_year: analysisResult.tax_year || parseInt(taxYear),
          summary: analysisResult.summary || null,
          file_path: uploadedFilePath,
          status: 'new',
        });

      if (insertError) {
        console.error('Insert error:', insertError);
        throw new Error('Failed to save case');
      }

      setShowReviewModal(false);
      setSubmitted(true);
      
      toast({
        title: 'Case Created',
        description: 'Your notice has been submitted successfully.',
      });
    } catch (error: any) {
      console.error('Save error:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to save case',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const taxYears = ['2024', '2023', '2022', '2021'];

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (submitted) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Card className="max-w-md w-full border-0 shadow-xl">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <div className="w-20 h-20 rounded-full bg-success/10 flex items-center justify-center mb-6">
                <CheckCircle className="h-10 w-10 text-success" />
              </div>
              <h2 className="font-display text-2xl font-bold text-foreground mb-2">
                Notice Submitted
              </h2>
              <p className="text-muted-foreground text-center max-w-sm mb-6">
                Your audit notice has been analyzed and submitted. Our team will review it and assign an agent to your case.
              </p>
              <div className="flex gap-4">
                <Button variant="outline" onClick={() => {
                  setSubmitted(false);
                  setSelectedFile(null);
                  setUploadedFilePath(null);
                  setUploadProgress(0);
                  setAnalysisResult(null);
                }}>
                  Report Another
                </Button>
                <Button onClick={() => navigate('/dashboard')}>
                  Go to Dashboard
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="max-w-xl w-full border-0 shadow-xl">
          <CardHeader className="text-center pb-2">
            <CardTitle className="font-display text-2xl">Analyze Your Tax Notice</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 pt-4">
            {/* Tax Year Selection */}
            <div className="space-y-2">
              <Label htmlFor="tax_year">Tax Year</Label>
              <Select value={taxYear} onValueChange={setTaxYear}>
                <SelectTrigger id="tax_year">
                  <SelectValue placeholder="Select tax year" />
                </SelectTrigger>
                <SelectContent>
                  {taxYears.map((year) => (
                    <SelectItem key={year} value={year}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* File Upload Drop Zone */}
            <div className="space-y-2">
              <Label>Upload a photo or scan of the first page of your IRS/State letter</Label>
              <div 
                className={`relative border-2 border-dashed rounded-xl p-12 text-center transition-all cursor-pointer ${
                  isDragging 
                    ? 'border-primary bg-primary/10' 
                    : selectedFile 
                      ? 'border-primary bg-primary/5' 
                      : 'border-border hover:border-primary/50 hover:bg-secondary/50'
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => !selectedFile && fileInputRef.current?.click()}
              >
                {selectedFile ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-center gap-4">
                      <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center">
                        {selectedFile.type === 'application/pdf' ? (
                          <FileType className="h-7 w-7 text-primary" />
                        ) : (
                          <Image className="h-7 w-7 text-primary" />
                        )}
                      </div>
                      <div className="text-left flex-1">
                        <p className="font-medium text-foreground truncate max-w-[200px]">
                          {selectedFile.name}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeFile();
                        }}
                        className="text-muted-foreground hover:text-destructive"
                        disabled={isUploading}
                      >
                        <X className="h-5 w-5" />
                      </Button>
                    </div>
                    
                    {/* Upload Error State */}
                    {uploadError && (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 text-destructive">
                          <AlertCircle className="h-4 w-4" />
                          <p className="text-sm font-medium">{uploadError}</p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (selectedFile) {
                              uploadFile(selectedFile);
                            }
                          }}
                          className="w-full"
                        >
                          <RotateCcw className="mr-2 h-4 w-4" />
                          Retry Upload
                        </Button>
                      </div>
                    )}

                    {/* Progress Bar */}
                    {!uploadError && (isUploading || uploadProgress > 0) && (
                      <div className="space-y-2">
                        <Progress value={uploadProgress} className="h-2" />
                        <p className="text-sm text-muted-foreground">
                          {uploadProgress < 100 ? 'Uploading...' : 'Upload complete'}
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div>
                    <div className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center mx-auto mb-4">
                      <Upload className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <p className="font-medium text-foreground mb-1">
                      Drag and drop your file here
                    </p>
                    <p className="text-sm text-muted-foreground mb-3">
                      or click to browse
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Accepts PDF, PNG, JPG (max 10MB)
                    </p>
                  </div>
                )}
                <Input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>
            </div>

            {/* Analyze Button */}
            <Button 
              onClick={analyzeNotice}
              disabled={!uploadedFilePath || isAnalyzing || isUploading}
              className="w-full"
              size="lg"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Analyzing Notice...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-5 w-5" />
                  Analyze with AI
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Review Modal */}
      <Dialog open={showReviewModal} onOpenChange={setShowReviewModal}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">Review Analysis</DialogTitle>
            <DialogDescription>
              Please verify the AI-extracted information is correct before submitting.
            </DialogDescription>
          </DialogHeader>

          {analysisResult && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-muted-foreground text-xs uppercase">Agency</Label>
                  <p className="font-medium text-foreground">
                    {analysisResult.agency || 'Not detected'}
                  </p>
                </div>
                <div className="space-y-1">
                  <Label className="text-muted-foreground text-xs uppercase">Notice Type</Label>
                  <p className="font-medium text-foreground">
                    {analysisResult.notice_type || 'Not detected'}
                  </p>
                </div>
                <div className="space-y-1">
                  <Label className="text-muted-foreground text-xs uppercase">Tax Year</Label>
                  <p className="font-medium text-foreground">
                    {analysisResult.tax_year || taxYear}
                  </p>
                </div>
                <div className="space-y-1">
                  <Label className="text-muted-foreground text-xs uppercase">Name on Notice</Label>
                  <p className="font-medium text-foreground">
                    {analysisResult.client_name_on_notice || 'Not detected'}
                  </p>
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-muted-foreground text-xs uppercase">Summary</Label>
                <p className="text-sm text-foreground bg-secondary/50 rounded-lg p-3">
                  {analysisResult.summary || 'No summary available'}
                </p>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setShowReviewModal(false)}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button onClick={saveCase} disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Confirm & Submit
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}