import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { format, subDays, startOfDay, eachDayOfInterval } from 'date-fns';

interface ReferralVisit {
  created_at: string;
  converted: boolean;
  referral_code: string;
}

interface Affiliate {
  total_earnings: number;
  created_at: string;
}

interface AffiliatePerformanceChartsProps {
  referralVisits: ReferralVisit[];
  affiliates: Affiliate[];
}

export function AffiliatePerformanceCharts({ referralVisits, affiliates }: AffiliatePerformanceChartsProps) {
  const conversionTrendData = useMemo(() => {
    const endDate = new Date();
    const startDate = subDays(endDate, 29);
    
    const days = eachDayOfInterval({ start: startDate, end: endDate });
    
    return days.map(day => {
      const dayStart = startOfDay(day);
      const dayEnd = new Date(dayStart);
      dayEnd.setHours(23, 59, 59, 999);
      
      const dayVisits = referralVisits.filter(visit => {
        const visitDate = new Date(visit.created_at);
        return visitDate >= dayStart && visitDate <= dayEnd;
      });
      
      const clicks = dayVisits.length;
      const conversions = dayVisits.filter(v => v.converted).length;
      
      return {
        date: format(day, 'MMM d'),
        clicks,
        conversions,
      };
    });
  }, [referralVisits]);

  const earningsTrendData = useMemo(() => {
    const endDate = new Date();
    const startDate = subDays(endDate, 29);
    
    const days = eachDayOfInterval({ start: startDate, end: endDate });
    
    // Calculate cumulative earnings over time based on affiliate join dates
    // This is a simplified view - in production you'd track actual earning events
    let cumulativeEarnings = 0;
    const sortedAffiliates = [...affiliates].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
    
    return days.map(day => {
      const dayEnd = new Date(startOfDay(day));
      dayEnd.setHours(23, 59, 59, 999);
      
      // For this visualization, we'll show conversions as earnings proxy
      const dayVisits = referralVisits.filter(visit => {
        const visitDate = new Date(visit.created_at);
        return visitDate <= dayEnd && visit.converted;
      });
      
      // Estimate earnings at ~$20 per conversion (20% of $99 avg plan)
      const estimatedEarnings = dayVisits.length * 20;
      
      return {
        date: format(day, 'MMM d'),
        earnings: estimatedEarnings,
      };
    });
  }, [referralVisits, affiliates]);

  const chartConfig = {
    clicks: {
      label: 'Clicks',
      color: 'hsl(var(--info))',
    },
    conversions: {
      label: 'Conversions',
      color: 'hsl(var(--success))',
    },
    earnings: {
      label: 'Earnings',
      color: 'hsl(var(--primary))',
    },
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Conversion Trends Chart */}
      <Card className="border-0 shadow-md">
        <CardHeader>
          <CardTitle className="font-display text-lg">Conversion Trends</CardTitle>
          <CardDescription>Clicks and conversions over the last 30 days</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[280px] w-full">
            <AreaChart data={conversionTrendData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="clicksGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--info))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--info))" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="conversionsGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--success))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--success))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 11 }} 
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
                className="text-muted-foreground"
              />
              <YAxis 
                tick={{ fontSize: 11 }} 
                tickLine={false}
                axisLine={false}
                width={30}
                className="text-muted-foreground"
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Area
                type="monotone"
                dataKey="clicks"
                stroke="hsl(var(--info))"
                strokeWidth={2}
                fill="url(#clicksGradient)"
              />
              <Area
                type="monotone"
                dataKey="conversions"
                stroke="hsl(var(--success))"
                strokeWidth={2}
                fill="url(#conversionsGradient)"
              />
            </AreaChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Earnings Trend Chart */}
      <Card className="border-0 shadow-md">
        <CardHeader>
          <CardTitle className="font-display text-lg">Cumulative Earnings</CardTitle>
          <CardDescription>Estimated affiliate earnings over time</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[280px] w-full">
            <BarChart data={earningsTrendData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="earningsGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 11 }} 
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
                className="text-muted-foreground"
              />
              <YAxis 
                tick={{ fontSize: 11 }} 
                tickLine={false}
                axisLine={false}
                width={40}
                tickFormatter={(value) => `$${value}`}
                className="text-muted-foreground"
              />
              <ChartTooltip 
                content={<ChartTooltipContent />}
                formatter={(value) => [`$${value}`, 'Earnings']}
              />
              <Bar
                dataKey="earnings"
                fill="url(#earningsGradient)"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  );
}
