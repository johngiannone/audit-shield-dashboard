import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, BarChart, Bar } from 'recharts';
import { format, subDays, startOfDay, eachDayOfInterval } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

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

type DatePreset = '7d' | '30d' | '90d' | 'custom';

export function AffiliatePerformanceCharts({ referralVisits, affiliates }: AffiliatePerformanceChartsProps) {
  const [preset, setPreset] = useState<DatePreset>('30d');
  const [startDate, setStartDate] = useState<Date>(subDays(new Date(), 29));
  const [endDate, setEndDate] = useState<Date>(new Date());

  const handlePresetChange = (newPreset: DatePreset) => {
    setPreset(newPreset);
    const now = new Date();
    switch (newPreset) {
      case '7d':
        setStartDate(subDays(now, 6));
        setEndDate(now);
        break;
      case '30d':
        setStartDate(subDays(now, 29));
        setEndDate(now);
        break;
      case '90d':
        setStartDate(subDays(now, 89));
        setEndDate(now);
        break;
    }
  };

  const conversionTrendData = useMemo(() => {
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
  }, [referralVisits, startDate, endDate]);

  const earningsTrendData = useMemo(() => {
    const days = eachDayOfInterval({ start: startDate, end: endDate });
    
    return days.map(day => {
      const dayEnd = new Date(startOfDay(day));
      dayEnd.setHours(23, 59, 59, 999);
      
      const dayVisits = referralVisits.filter(visit => {
        const visitDate = new Date(visit.created_at);
        return visitDate <= dayEnd && visit.converted;
      });
      
      const estimatedEarnings = dayVisits.length * 20;
      
      return {
        date: format(day, 'MMM d'),
        earnings: estimatedEarnings,
      };
    });
  }, [referralVisits, startDate, endDate]);

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

  const dateRangeLabel = `${format(startDate, 'MMM d, yyyy')} - ${format(endDate, 'MMM d, yyyy')}`;

  return (
    <div className="space-y-4">
      {/* Date Range Controls */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex gap-1">
          <Button
            variant={preset === '7d' ? 'default' : 'outline'}
            size="sm"
            onClick={() => handlePresetChange('7d')}
          >
            7 Days
          </Button>
          <Button
            variant={preset === '30d' ? 'default' : 'outline'}
            size="sm"
            onClick={() => handlePresetChange('30d')}
          >
            30 Days
          </Button>
          <Button
            variant={preset === '90d' ? 'default' : 'outline'}
            size="sm"
            onClick={() => handlePresetChange('90d')}
          >
            90 Days
          </Button>
        </div>
        
        <div className="flex items-center gap-2 ml-auto">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <CalendarIcon className="h-4 w-4" />
                {format(startDate, 'MMM d')}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="single"
                selected={startDate}
                onSelect={(date) => {
                  if (date) {
                    setStartDate(date);
                    setPreset('custom');
                  }
                }}
                disabled={(date) => date > endDate || date > new Date()}
                initialFocus
                className={cn("p-3 pointer-events-auto")}
              />
            </PopoverContent>
          </Popover>
          <span className="text-muted-foreground text-sm">to</span>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <CalendarIcon className="h-4 w-4" />
                {format(endDate, 'MMM d')}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="single"
                selected={endDate}
                onSelect={(date) => {
                  if (date) {
                    setEndDate(date);
                    setPreset('custom');
                  }
                }}
                disabled={(date) => date < startDate || date > new Date()}
                initialFocus
                className={cn("p-3 pointer-events-auto")}
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Conversion Trends Chart */}
        <Card className="border-0 shadow-md">
          <CardHeader>
            <CardTitle className="font-display text-lg">Conversion Trends</CardTitle>
            <CardDescription>Clicks and conversions for selected period</CardDescription>
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
            <CardDescription>Estimated affiliate earnings for selected period</CardDescription>
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
    </div>
  );
}
