import { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { 
  Shield, 
  Search, 
  AlertTriangle, 
  TrendingUp,
  Loader2,
  ArrowUpDown,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { format } from 'date-fns';

interface RiskFlag {
  flag: string;
  severity: 'high' | 'medium' | 'low';
  details: string;
}

interface RiskAssessmentWithProfile {
  id: string;
  profile_id: string;
  risk_score: number;
  red_flags: RiskFlag[];
  analyzed_at: string;
  profile: {
    full_name: string | null;
    email: string | null;
  } | null;
}

export default function RiskAssessments() {
  const { role, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [assessments, setAssessments] = useState<RiskAssessmentWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && role !== 'enrolled_agent') {
      navigate('/dashboard');
    }
  }, [role, authLoading, navigate]);

  useEffect(() => {
    if (role === 'enrolled_agent') {
      fetchAssessments();
    }
  }, [role]);

  const fetchAssessments = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('risk_assessments')
        .select(`
          id,
          profile_id,
          risk_score,
          red_flags,
          analyzed_at,
          profile:profiles!risk_assessments_profile_id_fkey(full_name, email)
        `)
        .order('risk_score', { ascending: sortOrder === 'asc' });

      if (error) throw error;

      // Transform data to handle the profile relation
      const transformedData = (data || []).map(item => ({
        ...item,
        red_flags: (item.red_flags as unknown as RiskFlag[]) || [],
        profile: Array.isArray(item.profile) ? item.profile[0] : item.profile
      }));

      setAssessments(transformedData);
    } catch (error) {
      console.error('Error fetching risk assessments:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleSortOrder = () => {
    setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
  };

  useEffect(() => {
    if (role === 'enrolled_agent') {
      fetchAssessments();
    }
  }, [sortOrder]);

  const filteredAssessments = assessments.filter(a => {
    const name = a.profile?.full_name?.toLowerCase() || '';
    const email = a.profile?.email?.toLowerCase() || '';
    const search = searchTerm.toLowerCase();
    return name.includes(search) || email.includes(search);
  });

  const getRiskLevel = (score: number) => {
    if (score >= 70) return { label: 'High', variant: 'destructive' as const };
    if (score >= 40) return { label: 'Moderate', variant: 'secondary' as const };
    return { label: 'Low', variant: 'default' as const };
  };

  const getHighFlagCount = (flags: RiskFlag[]) => {
    return flags.filter(f => f.severity === 'high').length;
  };

  const stats = {
    total: assessments.length,
    highRisk: assessments.filter(a => a.risk_score >= 70).length,
    moderateRisk: assessments.filter(a => a.risk_score >= 40 && a.risk_score < 70).length,
    lowRisk: assessments.filter(a => a.risk_score < 40).length,
  };

  if (authLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <Helmet>
        <title>Risk Assessments | Return Shield</title>
        <meta name="description" content="View all client risk assessments" />
      </Helmet>

      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold font-display">Risk Assessments</h1>
          <p className="text-muted-foreground mt-1">
            View and monitor client audit risk assessments
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Assessments</CardDescription>
              <CardTitle className="text-2xl">{stats.total}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>High Risk</CardDescription>
              <CardTitle className="text-2xl text-destructive">{stats.highRisk}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Moderate Risk</CardDescription>
              <CardTitle className="text-2xl text-yellow-600">{stats.moderateRisk}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Low Risk</CardDescription>
              <CardTitle className="text-2xl text-green-600">{stats.lowRisk}</CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Table Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  All Assessments
                </CardTitle>
                <CardDescription>
                  Client tax return risk analysis results
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name or email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 w-64"
                  />
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : filteredAssessments.length === 0 ? (
              <div className="text-center py-12">
                <Shield className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                <h3 className="font-semibold text-lg mb-2">No Assessments Found</h3>
                <p className="text-muted-foreground text-sm">
                  {searchTerm ? 'No results match your search.' : 'No risk assessments have been performed yet.'}
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Client</TableHead>
                    <TableHead>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={toggleSortOrder}
                        className="flex items-center gap-1 -ml-3"
                      >
                        Risk Score
                        <ArrowUpDown className="h-4 w-4" />
                      </Button>
                    </TableHead>
                    <TableHead>Risk Level</TableHead>
                    <TableHead>Flags</TableHead>
                    <TableHead>Analyzed</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAssessments.map((assessment) => {
                    const riskLevel = getRiskLevel(assessment.risk_score);
                    const highFlags = getHighFlagCount(assessment.red_flags);
                    const isExpanded = expandedRow === assessment.id;

                    return (
                      <>
                        <TableRow key={assessment.id} className="cursor-pointer hover:bg-muted/50">
                          <TableCell>
                            <div>
                              <p className="font-medium">
                                {assessment.profile?.full_name || 'Unknown'}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {assessment.profile?.email || 'No email'}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-3 w-32">
                              <Progress value={assessment.risk_score} className="h-2" />
                              <span className="font-semibold text-sm w-8">
                                {assessment.risk_score}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={riskLevel.variant}>
                              {riskLevel.label}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {highFlags > 0 && (
                                <Badge variant="destructive" className="gap-1">
                                  <AlertTriangle className="h-3 w-3" />
                                  {highFlags} High
                                </Badge>
                              )}
                              {assessment.red_flags.length - highFlags > 0 && (
                                <Badge variant="secondary">
                                  {assessment.red_flags.length - highFlags} Other
                                </Badge>
                              )}
                              {assessment.red_flags.length === 0 && (
                                <span className="text-sm text-muted-foreground">None</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {format(new Date(assessment.analyzed_at), 'MMM d, yyyy')}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setExpandedRow(isExpanded ? null : assessment.id)}
                            >
                              {isExpanded ? (
                                <ChevronUp className="h-4 w-4" />
                              ) : (
                                <ChevronDown className="h-4 w-4" />
                              )}
                            </Button>
                          </TableCell>
                        </TableRow>
                        {isExpanded && assessment.red_flags.length > 0 && (
                          <TableRow key={`${assessment.id}-expanded`}>
                            <TableCell colSpan={6} className="bg-muted/30 p-4">
                              <div className="space-y-2">
                                <h4 className="font-semibold text-sm">Risk Flags Details</h4>
                                {assessment.red_flags.map((flag, idx) => (
                                  <div key={idx} className="border rounded-lg p-3 bg-background">
                                    <div className="flex items-center gap-2 mb-1">
                                      <span className="font-medium">{flag.flag}</span>
                                      <Badge 
                                        variant={flag.severity === 'high' ? 'destructive' : 'secondary'}
                                        className="text-xs"
                                      >
                                        {flag.severity}
                                      </Badge>
                                    </div>
                                    <p className="text-sm text-muted-foreground">{flag.details}</p>
                                  </div>
                                ))}
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
