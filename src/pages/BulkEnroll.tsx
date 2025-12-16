import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Upload, Download, FileSpreadsheet, Users, AlertCircle, CheckCircle2, Loader2, Shield } from 'lucide-react';
import Papa from 'papaparse';

interface ClientRow {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  taxYear: string;
  isValid: boolean;
  errors: string[];
}

const CSV_TEMPLATE = `First Name,Last Name,Email,Phone,Tax Year
John,Doe,john.doe@example.com,555-123-4567,2024
Jane,Smith,jane.smith@example.com,555-987-6543,2023`;

export default function BulkEnroll() {
  const { user, role, profileId, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [isDragging, setIsDragging] = useState(false);
  const [parsedData, setParsedData] = useState<ClientRow[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [agentName, setAgentName] = useState<string>('Your Tax Professional');
  const [selectedPlanLevel, setSelectedPlanLevel] = useState<string>('gold');
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const PLAN_LABELS: Record<string, string> = {
    silver: 'Silver Shield',
    gold: 'Gold Shield',
    platinum: 'Platinum Business',
  };

  // Fetch agent name
  useEffect(() => {
    const fetchAgentName = async () => {
      if (profileId) {
        const { data } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', profileId)
          .maybeSingle();
        if (data?.full_name) {
          setAgentName(data.full_name);
        }
      }
    };
    fetchAgentName();
  }, [profileId]);

  // Only tax_preparer can access Bulk Enroll
  if (!authLoading && (!user || role !== 'tax_preparer')) {
    navigate('/dashboard');
    return null;
  }

  const validateRow = (row: any): ClientRow => {
    const errors: string[] = [];
    
    const firstName = (row['First Name'] || row['firstName'] || '').trim();
    const lastName = (row['Last Name'] || row['lastName'] || '').trim();
    const email = (row['Email'] || row['email'] || '').trim();
    const phone = (row['Phone'] || row['phone'] || '').trim();
    const taxYear = (row['Tax Year'] || row['taxYear'] || '').toString().trim();

    if (!firstName) errors.push('Missing first name');
    if (!lastName) errors.push('Missing last name');
    if (!email) errors.push('Missing email');
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push('Invalid email format');
    if (taxYear && !/^\d{4}$/.test(taxYear)) errors.push('Invalid tax year');

    return {
      firstName,
      lastName,
      email,
      phone,
      taxYear,
      isValid: errors.length === 0,
      errors
    };
  };

  const handleFile = useCallback((file: File) => {
    if (!file.name.endsWith('.csv')) {
      toast({
        title: 'Invalid file type',
        description: 'Please upload a CSV file.',
        variant: 'destructive'
      });
      return;
    }

    setFileName(file.name);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const validated = results.data.map(validateRow);
        setParsedData(validated);
        
        const validCount = validated.filter(r => r.isValid).length;
        toast({
          title: 'CSV parsed successfully',
          description: `Found ${validated.length} rows (${validCount} valid).`
        });
      },
      error: (error) => {
        toast({
          title: 'Parse error',
          description: error.message,
          variant: 'destructive'
        });
      }
    });
  }, [toast]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const downloadTemplate = () => {
    const blob = new Blob([CSV_TEMPLATE], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'client_enrollment_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleEnrollClients = async () => {
    const validRows = parsedData.filter(r => r.isValid);
    
    if (validRows.length === 0) {
      toast({
        title: 'No valid rows',
        description: 'Please fix the errors before enrolling.',
        variant: 'destructive'
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Call the edge function to process bulk invites
      const { data, error } = await supabase.functions.invoke('process-bulk-invites', {
        body: {
          clients: validRows.map(row => ({
            firstName: row.firstName,
            lastName: row.lastName,
            email: row.email,
            phone: row.phone,
            taxYear: row.taxYear,
          })),
          agentName,
          agentProfileId: profileId,
          planLevel: selectedPlanLevel,
        }
      });

      if (error) {
        throw error;
      }

      const { summary, results } = data;

      toast({
        title: 'Enrollment complete',
        description: `Successfully invited ${summary.successful} clients${summary.failed > 0 ? `. ${summary.failed} failed.` : '. Invite emails have been sent.'}`
      });

      // Show individual errors if any
      const failures = results?.filter((r: any) => !r.success) || [];
      if (failures.length > 0) {
        console.log('Failed invites:', failures);
      }

      if (summary.successful > 0) {
        setParsedData([]);
        setFileName(null);
      }
    } catch (error: any) {
      console.error('Enrollment error:', error);
      toast({
        title: 'Enrollment failed',
        description: error.message || 'An unexpected error occurred.',
        variant: 'destructive'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const validCount = parsedData.filter(r => r.isValid).length;
  const invalidCount = parsedData.length - validCount;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Bulk Enroll Clients</h1>
          <p className="text-muted-foreground mt-1">Upload a CSV file to enroll multiple clients at once.</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Upload Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Upload CSV
              </CardTitle>
              <CardDescription>
                Drag and drop a CSV file or click to browse.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                className={`
                  border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
                  transition-colors duration-200
                  ${isDragging 
                    ? 'border-primary bg-primary/5' 
                    : 'border-border hover:border-primary/50 hover:bg-muted/50'
                  }
                `}
                onClick={() => document.getElementById('csv-input')?.click()}
              >
                <input
                  id="csv-input"
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={handleFileInput}
                />
                <FileSpreadsheet className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                {fileName ? (
                  <p className="text-sm font-medium text-foreground">{fileName}</p>
                ) : (
                  <>
                    <p className="text-sm font-medium text-foreground">Drop your CSV here</p>
                    <p className="text-xs text-muted-foreground mt-1">or click to browse</p>
                  </>
                )}
              </div>

              <Button variant="outline" className="w-full" onClick={downloadTemplate}>
                <Download className="h-4 w-4 mr-2" />
                Download CSV Template
              </Button>
            </CardContent>
          </Card>

          {/* Stats Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Enrollment Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-lg bg-muted/50">
                  <p className="text-2xl font-bold text-foreground">{parsedData.length}</p>
                  <p className="text-sm text-muted-foreground">Total Rows</p>
                </div>
                <div className="p-4 rounded-lg bg-muted/50">
                  <p className="text-2xl font-bold text-green-600">{validCount}</p>
                  <p className="text-sm text-muted-foreground">Valid</p>
                </div>
              </div>
              
              {invalidCount > 0 && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive">
                  <AlertCircle className="h-4 w-4" />
                  <span className="text-sm">{invalidCount} row(s) have errors</span>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="plan-select" className="flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Membership Plan to Assign
                </Label>
                <Select value={selectedPlanLevel} onValueChange={setSelectedPlanLevel}>
                  <SelectTrigger id="plan-select">
                    <SelectValue placeholder="Select plan level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="silver">
                      <div className="flex flex-col">
                        <span className="font-medium">Silver Shield</span>
                        <span className="text-xs text-muted-foreground">Single year coverage ($49 value)</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="gold">
                      <div className="flex flex-col">
                        <span className="font-medium">Gold Shield</span>
                        <span className="text-xs text-muted-foreground">All open years 2021-2024 ($99 value)</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="platinum">
                      <div className="flex flex-col">
                        <span className="font-medium">Platinum Business</span>
                        <span className="text-xs text-muted-foreground">Business/Schedule C coverage ($199 value)</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button 
                className="w-full" 
                disabled={validCount === 0 || isSubmitting}
                onClick={() => setShowConfirmDialog(true)}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Enrolling...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Enroll {validCount} Client{validCount !== 1 ? 's' : ''}
                  </>
                )}
              </Button>

              <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Confirm Bulk Enrollment</AlertDialogTitle>
                    <AlertDialogDescription asChild>
                      <div className="space-y-3">
                        <p>You are about to enroll the following clients:</p>
                        <div className="rounded-lg bg-muted p-3 space-y-1 text-sm">
                          <p><strong>Clients:</strong> {validCount}</p>
                          <p><strong>Plan:</strong> {PLAN_LABELS[selectedPlanLevel]}</p>
                        </div>
                        <p>Each client will receive an invitation email with instructions to activate their account.</p>
                      </div>
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => { setShowConfirmDialog(false); handleEnrollClients(); }}>
                      Confirm Enrollment
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardContent>
          </Card>
        </div>

        {/* Preview Table */}
        {parsedData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Preview</CardTitle>
              <CardDescription>Review the data before enrolling clients.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Status</TableHead>
                      <TableHead>First Name</TableHead>
                      <TableHead>Last Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Tax Year</TableHead>
                      <TableHead>Issues</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsedData.map((row, index) => (
                      <TableRow key={index} className={!row.isValid ? 'bg-destructive/5' : ''}>
                        <TableCell>
                          {row.isValid ? (
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Valid
                            </Badge>
                          ) : (
                            <Badge variant="destructive">
                              <AlertCircle className="h-3 w-3 mr-1" />
                              Error
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>{row.firstName || '-'}</TableCell>
                        <TableCell>{row.lastName || '-'}</TableCell>
                        <TableCell>{row.email || '-'}</TableCell>
                        <TableCell>{row.phone || '-'}</TableCell>
                        <TableCell>{row.taxYear || '-'}</TableCell>
                        <TableCell>
                          {row.errors.length > 0 && (
                            <span className="text-xs text-destructive">
                              {row.errors.join(', ')}
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
