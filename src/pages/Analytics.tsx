import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, TrendingUp, Clock, Users, BarChart3 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
} from 'recharts';

interface CaseStats {
  total: number;
  new: number;
  in_progress: number;
  pending_info: number;
  resolved: number;
  avgResolutionDays: number | null;
}

interface MonthlyTrend {
  month: string;
  created: number;
  resolved: number;
}

interface AgentWorkload {
  name: string;
  active: number;
  resolved: number;
}

const STATUS_COLORS: Record<string, string> = {
  new: 'hsl(200, 80%, 50%)',
  in_progress: 'hsl(45, 90%, 50%)',
  pending_info: 'hsl(280, 60%, 60%)',
  resolved: 'hsl(140, 70%, 45%)',
};

export default function Analytics() {
  const navigate = useNavigate();
  const { user, role, loading } = useAuth();
  const { toast } = useToast();
  
  const [stats, setStats] = useState<CaseStats | null>(null);
  const [monthlyTrends, setMonthlyTrends] = useState<MonthlyTrend[]>([]);
  const [agentWorkload, setAgentWorkload] = useState<AgentWorkload[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
    if (!loading && role === 'client') {
      navigate('/dashboard');
    }
  }, [user, loading, role, navigate]);

  useEffect(() => {
    if (user && role === 'agent') {
      fetchAnalytics();
    }
  }, [user, role]);

  const fetchAnalytics = async () => {
    setDataLoading(true);
    try {
      // Fetch all cases
      const { data: cases, error } = await supabase
        .from('cases')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) throw error;

      if (!cases || cases.length === 0) {
        setStats({
          total: 0,
          new: 0,
          in_progress: 0,
          pending_info: 0,
          resolved: 0,
          avgResolutionDays: null,
        });
        setMonthlyTrends([]);
        setAgentWorkload([]);
        setDataLoading(false);
        return;
      }

      // Calculate stats
      const statusCounts = {
        new: cases.filter(c => c.status === 'new').length,
        in_progress: cases.filter(c => c.status === 'in_progress').length,
        pending_info: cases.filter(c => c.status === 'pending_info').length,
        resolved: cases.filter(c => c.status === 'resolved').length,
      };

      // Calculate average resolution time for resolved cases
      const resolvedCases = cases.filter(c => c.status === 'resolved');
      let avgResolutionDays: number | null = null;
      
      if (resolvedCases.length > 0) {
        const totalDays = resolvedCases.reduce((sum, c) => {
          const created = new Date(c.created_at);
          const updated = new Date(c.updated_at);
          const days = (updated.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);
          return sum + days;
        }, 0);
        avgResolutionDays = Math.round((totalDays / resolvedCases.length) * 10) / 10;
      }

      setStats({
        total: cases.length,
        ...statusCounts,
        avgResolutionDays,
      });

      // Calculate monthly trends (last 6 months)
      const now = new Date();
      const monthlyData: Record<string, { created: number; resolved: number }> = {};
      
      for (let i = 5; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
        monthlyData[key] = { created: 0, resolved: 0 };
      }

      cases.forEach(c => {
        const createdDate = new Date(c.created_at);
        const createdKey = createdDate.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
        
        if (monthlyData[createdKey]) {
          monthlyData[createdKey].created++;
        }

        if (c.status === 'resolved') {
          const resolvedDate = new Date(c.updated_at);
          const resolvedKey = resolvedDate.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
          
          if (monthlyData[resolvedKey]) {
            monthlyData[resolvedKey].resolved++;
          }
        }
      });

      setMonthlyTrends(
        Object.entries(monthlyData).map(([month, data]) => ({
          month,
          ...data,
        }))
      );

      // Calculate agent workload
      const agentIds = [...new Set(cases.filter(c => c.assigned_agent_id).map(c => c.assigned_agent_id))];
      
      if (agentIds.length > 0) {
        const { data: agents } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', agentIds);

        const agentMap = new Map(agents?.map(a => [a.id, a.full_name || 'Unknown']) || []);

        const workloadData: Record<string, { active: number; resolved: number }> = {};
        
        cases.forEach(c => {
          if (c.assigned_agent_id) {
            const agentName = agentMap.get(c.assigned_agent_id) || 'Unknown';
            if (!workloadData[agentName]) {
              workloadData[agentName] = { active: 0, resolved: 0 };
            }
            if (c.status === 'resolved') {
              workloadData[agentName].resolved++;
            } else {
              workloadData[agentName].active++;
            }
          }
        });

        setAgentWorkload(
          Object.entries(workloadData).map(([name, data]) => ({
            name,
            ...data,
          }))
        );
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load analytics',
        variant: 'destructive',
      });
    } finally {
      setDataLoading(false);
    }
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const pieData = stats ? [
    { name: 'New', value: stats.new, color: STATUS_COLORS.new },
    { name: 'In Progress', value: stats.in_progress, color: STATUS_COLORS.in_progress },
    { name: 'Pending Info', value: stats.pending_info, color: STATUS_COLORS.pending_info },
    { name: 'Resolved', value: stats.resolved, color: STATUS_COLORS.resolved },
  ].filter(d => d.value > 0) : [];

  return (
    <DashboardLayout>
      <div className="space-y-8 animate-fade-in">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">Analytics</h1>
          <p className="text-muted-foreground mt-1">
            Case metrics and performance insights
          </p>
        </div>

        {dataLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="border-0 shadow-md">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Total Cases
                  </CardTitle>
                  <BarChart3 className="h-5 w-5 text-primary" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold font-display">{stats?.total || 0}</div>
                  <p className="text-xs text-muted-foreground mt-1">All time</p>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-md">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Active Cases
                  </CardTitle>
                  <TrendingUp className="h-5 w-5 text-warning" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold font-display">
                    {(stats?.new || 0) + (stats?.in_progress || 0) + (stats?.pending_info || 0)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Requiring attention</p>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-md">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Resolution Rate
                  </CardTitle>
                  <Users className="h-5 w-5 text-success" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold font-display">
                    {stats?.total ? Math.round((stats.resolved / stats.total) * 100) : 0}%
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Cases resolved</p>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-md">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Avg. Resolution Time
                  </CardTitle>
                  <Clock className="h-5 w-5 text-info" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold font-display">
                    {stats?.avgResolutionDays !== null ? `${stats.avgResolutionDays}d` : 'N/A'}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Days to resolve</p>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Monthly Trends */}
              <Card className="border-0 shadow-md">
                <CardHeader>
                  <CardTitle className="text-lg">Monthly Trends</CardTitle>
                  <CardDescription>Cases created vs resolved over time</CardDescription>
                </CardHeader>
                <CardContent>
                  {monthlyTrends.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={monthlyTrends}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis 
                          dataKey="month" 
                          stroke="hsl(var(--muted-foreground))"
                          fontSize={12}
                        />
                        <YAxis 
                          stroke="hsl(var(--muted-foreground))"
                          fontSize={12}
                        />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'hsl(var(--background))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px',
                          }}
                        />
                        <Legend />
                        <Line 
                          type="monotone" 
                          dataKey="created" 
                          stroke="hsl(200, 80%, 50%)" 
                          strokeWidth={2}
                          name="Created"
                        />
                        <Line 
                          type="monotone" 
                          dataKey="resolved" 
                          stroke="hsl(140, 70%, 45%)" 
                          strokeWidth={2}
                          name="Resolved"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                      No data available
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Status Distribution */}
              <Card className="border-0 shadow-md">
                <CardHeader>
                  <CardTitle className="text-lg">Status Distribution</CardTitle>
                  <CardDescription>Current case status breakdown</CardDescription>
                </CardHeader>
                <CardContent>
                  {pieData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={100}
                          paddingAngle={2}
                          dataKey="value"
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        >
                          {pieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'hsl(var(--background))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px',
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                      No data available
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Agent Workload */}
            <Card className="border-0 shadow-md">
              <CardHeader>
                <CardTitle className="text-lg">Agent Workload</CardTitle>
                <CardDescription>Cases per agent (active vs resolved)</CardDescription>
              </CardHeader>
              <CardContent>
                {agentWorkload.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={agentWorkload} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                      <YAxis 
                        dataKey="name" 
                        type="category" 
                        stroke="hsl(var(--muted-foreground))" 
                        fontSize={12}
                        width={100}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--background))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                        }}
                      />
                      <Legend />
                      <Bar dataKey="active" stackId="a" fill="hsl(45, 90%, 50%)" name="Active" />
                      <Bar dataKey="resolved" stackId="a" fill="hsl(140, 70%, 45%)" name="Resolved" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                    No agent data available
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
