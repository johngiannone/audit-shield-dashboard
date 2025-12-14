import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, TrendingUp, Clock, Users, BarChart3, CalendarIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format, subMonths, startOfMonth, endOfMonth, eachMonthOfInterval, isWithinInterval } from 'date-fns';
import { cn } from '@/lib/utils';
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
  triage: number;
  agent_action: number;
  client_action: number;
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
  triage: 'hsl(200, 80%, 50%)',
  agent_action: 'hsl(45, 90%, 50%)',
  client_action: 'hsl(280, 60%, 60%)',
  resolved: 'hsl(140, 70%, 45%)',
};

const PRESET_RANGES = [
  { label: 'Last 30 days', getValue: () => ({ from: subMonths(new Date(), 1), to: new Date() }) },
  { label: 'Last 3 months', getValue: () => ({ from: subMonths(new Date(), 3), to: new Date() }) },
  { label: 'Last 6 months', getValue: () => ({ from: subMonths(new Date(), 6), to: new Date() }) },
  { label: 'Last year', getValue: () => ({ from: subMonths(new Date(), 12), to: new Date() }) },
  { label: 'All time', getValue: () => ({ from: undefined, to: undefined }) },
];

export default function Analytics() {
  const navigate = useNavigate();
  const { user, role, loading } = useAuth();
  const { toast } = useToast();
  
  const [stats, setStats] = useState<CaseStats | null>(null);
  const [monthlyTrends, setMonthlyTrends] = useState<MonthlyTrend[]>([]);
  const [agentWorkload, setAgentWorkload] = useState<AgentWorkload[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState<Date | undefined>(subMonths(new Date(), 6));
  const [dateTo, setDateTo] = useState<Date | undefined>(new Date());

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
  }, [user, role, dateFrom, dateTo]);

  const fetchAnalytics = async () => {
    setDataLoading(true);
    try {
      // Build query with date filters
      let query = supabase
        .from('cases')
        .select('*')
        .order('created_at', { ascending: true });

      if (dateFrom) {
        query = query.gte('created_at', dateFrom.toISOString());
      }
      if (dateTo) {
        query = query.lte('created_at', endOfMonth(dateTo).toISOString());
      }

      const { data: cases, error } = await query;

      if (error) throw error;

      if (!cases || cases.length === 0) {
        setStats({
          total: 0,
          triage: 0,
          agent_action: 0,
          client_action: 0,
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
        triage: cases.filter(c => c.status === 'triage').length,
        agent_action: cases.filter(c => c.status === 'agent_action').length,
        client_action: cases.filter(c => c.status === 'client_action').length,
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

      // Calculate monthly trends based on selected range
      const rangeStart = dateFrom || new Date(Math.min(...cases.map(c => new Date(c.created_at).getTime())));
      const rangeEnd = dateTo || new Date();
      
      const months = eachMonthOfInterval({ start: startOfMonth(rangeStart), end: endOfMonth(rangeEnd) });
      const monthlyData: Record<string, { created: number; resolved: number }> = {};
      
      months.forEach(date => {
        const key = format(date, 'MMM yy');
        monthlyData[key] = { created: 0, resolved: 0 };
      });

      cases.forEach(c => {
        const createdDate = new Date(c.created_at);
        const createdKey = format(createdDate, 'MMM yy');
        
        if (monthlyData[createdKey]) {
          monthlyData[createdKey].created++;
        }

        if (c.status === 'resolved') {
          const resolvedDate = new Date(c.updated_at);
          const resolvedKey = format(resolvedDate, 'MMM yy');
          
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
    { name: 'Triage', value: stats.triage, color: STATUS_COLORS.triage },
    { name: 'Agent Action', value: stats.agent_action, color: STATUS_COLORS.agent_action },
    { name: 'Client Action', value: stats.client_action, color: STATUS_COLORS.client_action },
    { name: 'Resolved', value: stats.resolved, color: STATUS_COLORS.resolved },
  ].filter(d => d.value > 0) : [];

  const handlePresetSelect = (preset: typeof PRESET_RANGES[0]) => {
    const range = preset.getValue();
    setDateFrom(range.from);
    setDateTo(range.to);
  };

  const getDateRangeLabel = () => {
    if (!dateFrom && !dateTo) return 'All time';
    if (dateFrom && dateTo) return `${format(dateFrom, 'MMM d, yyyy')} - ${format(dateTo, 'MMM d, yyyy')}`;
    if (dateFrom) return `From ${format(dateFrom, 'MMM d, yyyy')}`;
    if (dateTo) return `Until ${format(dateTo, 'MMM d, yyyy')}`;
    return 'Select range';
  };

  return (
    <DashboardLayout>
      <div className="space-y-8 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-bold text-foreground">Analytics</h1>
            <p className="text-muted-foreground mt-1">
              Case metrics and performance insights
            </p>
          </div>

          {/* Date Range Filter */}
          <div className="flex flex-wrap items-center gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "justify-start text-left font-normal min-w-[140px]",
                    !dateFrom && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateFrom ? format(dateFrom, 'MMM d, yyyy') : 'Start date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  mode="single"
                  selected={dateFrom}
                  onSelect={setDateFrom}
                  disabled={(date) => dateTo ? date > dateTo : false}
                  initialFocus
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>

            <span className="text-muted-foreground">to</span>

            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "justify-start text-left font-normal min-w-[140px]",
                    !dateTo && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateTo ? format(dateTo, 'MMM d, yyyy') : 'End date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  mode="single"
                  selected={dateTo}
                  onSelect={setDateTo}
                  disabled={(date) => dateFrom ? date < dateFrom : false}
                  initialFocus
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="secondary" size="sm">
                  Presets
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-40 p-1" align="end">
                <div className="flex flex-col">
                  {PRESET_RANGES.map((preset) => (
                    <Button
                      key={preset.label}
                      variant="ghost"
                      size="sm"
                      className="justify-start"
                      onClick={() => handlePresetSelect(preset)}
                    >
                      {preset.label}
                    </Button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          </div>
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
                  <p className="text-xs text-muted-foreground mt-1">{getDateRangeLabel()}</p>
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
                    {(stats?.triage || 0) + (stats?.agent_action || 0) + (stats?.client_action || 0)}
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
