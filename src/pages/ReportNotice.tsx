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
import { Loader2, CheckCircle, Upload, FileText, X, Sparkles, Image, FileType, AlertCircle, RotateCcw, ArrowRight, SkipForward } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface AnalysisResult {
  agency: string | null;
  notice_type: string | null;
  tax_year: number | null;
  client_name_on_notice: string | null;
  response_due_date: string | null;
  summary: string | null;
}

export default function ReportNotice() {
  const navigate = useNavigate();
  const { user, role, loading } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const taxReturnInputRef = useRef<HTMLInputElement>(null);
  
  // Wizard step state
  const [currentStep, setCurrentStep] = useState<1 | 2>(1);
  
  // Step 1: Notice upload state
  const [taxYear, setTaxYear] = useState<string>('2024');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadedFilePath, setUploadedFilePath] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  
  // Step 2: Tax return upload state
  const [taxReturnFile, setTaxReturnFile] = useState<File | null>(null);
  const [taxReturnFilePath, setTaxReturnFilePath] = useState<string | null>(null);
  const [taxReturnUploadProgress, setTaxReturnUploadProgress] = useState(0);
  const [isTaxReturnUploading, setIsTaxReturnUploading] = useState(false);
  const [isTaxReturnDragging, setIsTaxReturnDragging] = useState(false);
  const [taxReturnUploadError, setTaxReturnUploadError] = useState<string | null>(null);
  
  // Submission state
  const [isSaving, setIsSaving] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
    if (!loading && role === 'enrolled_agent') {
      navigate('/dashboard');
    }
  }, [user, loading, role, navigate]);

  const uploadFile = useCallback(async (file: File) => {
    if (!user) return;

    setIsUploading(true);
    setUploadProgress(0);
    setUploadError(null);

    try {
      const fileName = `${user.id}/${Date.now()}_${file.name}`;
      
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

  const uploadTaxReturn = useCallback(async (file: File) => {
    if (!user) return;

    setIsTaxReturnUploading(true);
    setTaxReturnUploadProgress(0);
    setTaxReturnUploadError(null);

    try {
      const fileName = `${user.id}/tax-returns/${Date.now()}_${file.name}`;
      
      const progressInterval = setInterval(() => {
        setTaxReturnUploadProgress(prev => {
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
        console.error('Tax return upload error:', uploadError);
        throw new Error('Failed to upload tax return');
      }

      setTaxReturnUploadProgress(100);
      setTaxReturnFilePath(fileName);
      
      toast({
        title: 'Tax Return Uploaded',
        description: 'Your tax return is ready.',
      });
    } catch (error: any) {
      console.error('Tax return upload error:', error);
      setTaxReturnUploadProgress(0);
      setTaxReturnUploadError(error.message || 'Failed to upload tax return. Please try again.');
      toast({
        title: 'Upload Failed',
        description: error.message || 'Failed to upload tax return. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsTaxReturnUploading(false);
    }
  }, [user, toast]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await processFile(file);
    }
  };

  const handleTaxReturnSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await processTaxReturnFile(file);
    }
  };

  const processFile = async (file: File) => {
    const validTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      toast({
        title: 'Invalid file type',
        description: 'Please upload a PDF or image file (PNG, JPG, GIF, WebP)',
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

  const processTaxReturnFile = async (file: File) => {
    const validTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      toast({
        title: 'Invalid file type',
        description: 'Please upload a PDF or image file (PNG, JPG, GIF, WebP)',
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
    setTaxReturnFile(file);
    setTaxReturnFilePath(null);
    await uploadTaxReturn(file);
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

  const handleTaxReturnDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsTaxReturnDragging(true);
  };

  const handleTaxReturnDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsTaxReturnDragging(false);
  };

  const handleTaxReturnDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsTaxReturnDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      await processTaxReturnFile(file);
    }
  };

  const removeFile = async () => {
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

  const removeTaxReturnFile = async () => {
    if (taxReturnFilePath) {
      await supabase.storage.from('audit-notices').remove([taxReturnFilePath]);
    }
    setTaxReturnFile(null);
    setTaxReturnFilePath(null);
    setTaxReturnUploadProgress(0);
    if (taxReturnInputRef.current) {
      taxReturnInputRef.current.value = '';
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

  const proceedToStep2 = () => {
    setShowReviewModal(false);
    setCurrentStep(2);
  };

  const saveCase = async (skipTaxReturn: boolean = false) => {
    if (!analysisResult || !uploadedFilePath || !user) return;

    setIsSaving(true);
    try {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (profileError || !profile) {
        throw new Error('Could not find your profile');
      }

      const agency = analysisResult.agency?.toUpperCase() === 'IRS' ? 'IRS' : 'State';
      const effectiveTaxYear = analysisResult.tax_year || parseInt(taxYear);

      // Create case record
      const { data: caseData, error: insertError } = await supabase
        .from('cases')
        .insert({
          client_id: profile.id,
          notice_agency: agency,
          notice_type: analysisResult.notice_type || 'Unknown',
          tax_year: effectiveTaxYear,
          summary: analysisResult.summary || null,
          response_due_date: analysisResult.response_due_date || null,
          file_path: uploadedFilePath,
          tax_return_path: skipTaxReturn ? null : taxReturnFilePath,
          status: 'triage',
        })
        .select('id')
        .single();

      if (insertError) {
        console.error('Insert error:', insertError);
        throw new Error('Failed to save case');
      }

      // If user skipped tax return, create a document request
      if (skipTaxReturn && caseData) {
        const { error: docRequestError } = await supabase
          .from('document_requests')
          .insert({
            case_id: caseData.id,
            document_name: `Tax Return ${effectiveTaxYear}`,
            description: `Please upload your 1040 Tax Return for ${effectiveTaxYear}`,
            status: 'pending',
            requested_by: profile.id,
          });

        if (docRequestError) {
          console.error('Document request error:', docRequestError);
          // Don't throw - case was created successfully
        }
      }

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
                  setCurrentStep(1);
                  setSelectedFile(null);
                  setUploadedFilePath(null);
                  setUploadProgress(0);
                  setAnalysisResult(null);
                  setTaxReturnFile(null);
                  setTaxReturnFilePath(null);
                  setTaxReturnUploadProgress(0);
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
            {/* Step Indicator */}
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
                currentStep === 1 ? 'bg-primary text-primary-foreground' : 'bg-primary/20 text-primary'
              }`}>
                1
              </div>
              <div className="w-12 h-0.5 bg-border" />
              <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
                currentStep === 2 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
              }`}>
                2
              </div>
            </div>
            <CardTitle className="font-display text-2xl">
              {currentStep === 1 ? 'Analyze Your Tax Notice' : 'Upload Tax Return'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 pt-4">
            {currentStep === 1 ? (
              <>
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
                      accept=".pdf,.png,.jpg,.jpeg,.gif,.webp"
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
              </>
            ) : (
              /* Step 2: Tax Return Upload */
              <>
                <div className="space-y-2">
                  <Label>Upload your 1040 Tax Return for the year in question (Optional)</Label>
                  <p className="text-sm text-muted-foreground">
                    Providing this now allows your agent to start your defense immediately.
                  </p>
                  <div 
                    className={`relative border-2 border-dashed rounded-xl p-12 text-center transition-all cursor-pointer ${
                      isTaxReturnDragging 
                        ? 'border-primary bg-primary/10' 
                        : taxReturnFile 
                          ? 'border-primary bg-primary/5' 
                          : 'border-border hover:border-primary/50 hover:bg-secondary/50'
                    }`}
                    onDragOver={handleTaxReturnDragOver}
                    onDragLeave={handleTaxReturnDragLeave}
                    onDrop={handleTaxReturnDrop}
                    onClick={() => !taxReturnFile && taxReturnInputRef.current?.click()}
                  >
                    {taxReturnFile ? (
                      <div className="space-y-4">
                        <div className="flex items-center justify-center gap-4">
                          <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center">
                            {taxReturnFile.type === 'application/pdf' ? (
                              <FileType className="h-7 w-7 text-primary" />
                            ) : (
                              <Image className="h-7 w-7 text-primary" />
                            )}
                          </div>
                          <div className="text-left flex-1">
                            <p className="font-medium text-foreground truncate max-w-[200px]">
                              {taxReturnFile.name}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {(taxReturnFile.size / 1024 / 1024).toFixed(2)} MB
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeTaxReturnFile();
                            }}
                            className="text-muted-foreground hover:text-destructive"
                            disabled={isTaxReturnUploading}
                          >
                            <X className="h-5 w-5" />
                          </Button>
                        </div>
                        
                        {taxReturnUploadError && (
                          <div className="space-y-3">
                            <div className="flex items-center gap-2 text-destructive">
                              <AlertCircle className="h-4 w-4" />
                              <p className="text-sm font-medium">{taxReturnUploadError}</p>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (taxReturnFile) {
                                  uploadTaxReturn(taxReturnFile);
                                }
                              }}
                              className="w-full"
                            >
                              <RotateCcw className="mr-2 h-4 w-4" />
                              Retry Upload
                            </Button>
                          </div>
                        )}

                        {!taxReturnUploadError && (isTaxReturnUploading || taxReturnUploadProgress > 0) && (
                          <div className="space-y-2">
                            <Progress value={taxReturnUploadProgress} className="h-2" />
                            <p className="text-sm text-muted-foreground">
                              {taxReturnUploadProgress < 100 ? 'Uploading...' : 'Upload complete'}
                            </p>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div>
                        <div className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center mx-auto mb-4">
                          <FileText className="h-8 w-8 text-muted-foreground" />
                        </div>
                        <p className="font-medium text-foreground mb-1">
                          Drag and drop your tax return here
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
                      ref={taxReturnInputRef}
                      type="file"
                      accept=".pdf,.png,.jpg,.jpeg,.gif,.webp"
                      onChange={handleTaxReturnSelect}
                      className="hidden"
                    />
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button 
                    variant="outline"
                    onClick={() => saveCase(true)}
                    disabled={isSaving || isTaxReturnUploading}
                    className="flex-1"
                    size="lg"
                  >
                    {isSaving ? (
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    ) : (
                      <SkipForward className="mr-2 h-5 w-5" />
                    )}
                    Skip for now
                  </Button>
                  <Button 
                    onClick={() => saveCase(false)}
                    disabled={!taxReturnFilePath || isSaving || isTaxReturnUploading}
                    className="flex-1"
                    size="lg"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="mr-2 h-5 w-5" />
                        Submit Case
                      </>
                    )}
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Review Modal */}
      <Dialog open={showReviewModal} onOpenChange={setShowReviewModal}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">Review Analysis</DialogTitle>
            <DialogDescription>
              Please verify the AI-extracted information is correct before continuing.
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

              {analysisResult.response_due_date && (
                <div className="space-y-1 p-3 rounded-lg bg-warning/10 border border-warning/20">
                  <Label className="text-warning text-xs uppercase font-semibold">Response Deadline</Label>
                  <p className="font-medium text-foreground">
                    {new Date(analysisResult.response_due_date).toLocaleDateString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                </div>
              )}

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
            >
              Cancel
            </Button>
            <Button onClick={proceedToStep2}>
              <ArrowRight className="mr-2 h-4 w-4" />
              Continue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
