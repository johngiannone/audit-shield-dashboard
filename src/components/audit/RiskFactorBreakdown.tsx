import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { 
  Receipt, 
  Building2, 
  TrendingUp, 
  MapPin 
} from 'lucide-react';

interface RiskFactor {
  name: string;
  score: number;
  weight: number;
  icon: React.ReactNode;
  description: string;
}

interface RiskFactorBreakdownProps {
  deductionIntensity: number;
  industryAlignment: number;
  incomeConsistency: number;
  auditEnvironment: number;
}

export function RiskFactorBreakdown({
  deductionIntensity,
  industryAlignment,
  incomeConsistency,
  auditEnvironment,
}: RiskFactorBreakdownProps) {
  const factors: RiskFactor[] = [
    {
      name: 'Deduction Intensity',
      score: deductionIntensity,
      weight: 0.30,
      icon: <Receipt className="h-4 w-4" />,
      description: 'Based on income/expense ratios and charitable giving patterns',
    },
    {
      name: 'Industry Alignment',
      score: industryAlignment,
      weight: 0.25,
      icon: <Building2 className="h-4 w-4" />,
      description: 'Based on NAICS industry profit margin benchmarks',
    },
    {
      name: 'Income Consistency',
      score: incomeConsistency,
      weight: 0.25,
      icon: <TrendingUp className="h-4 w-4" />,
      description: 'Based on BLS occupation wage data comparison',
    },
    {
      name: 'Audit Environment',
      score: auditEnvironment,
      weight: 0.20,
      icon: <MapPin className="h-4 w-4" />,
      description: 'Based on geographic IRS audit activity data',
    },
  ];

  // Calculate weighted total score
  const totalScore = Math.round(
    factors.reduce((sum, factor) => sum + factor.score * factor.weight, 0)
  );

  const getScoreColor = (score: number) => {
    if (score >= 70) return 'text-destructive';
    if (score >= 40) return 'text-amber-500';
    return 'text-green-500';
  };

  const getProgressColor = (score: number) => {
    if (score >= 70) return 'bg-destructive';
    if (score >= 40) return 'bg-amber-500';
    return 'bg-green-500';
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Risk Factor Breakdown</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {factors.map((factor) => (
          <div key={factor.name} className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">{factor.icon}</span>
                <span className="text-sm font-medium">{factor.name}</span>
                <span className="text-xs text-muted-foreground">
                  ({Math.round(factor.weight * 100)}% weight)
                </span>
              </div>
              <span className={cn('text-sm font-bold', getScoreColor(factor.score))}>
                {factor.score}%
              </span>
            </div>
            <div className="relative">
              <Progress 
                value={factor.score} 
                className="h-2.5 bg-muted"
              />
              <div 
                className={cn(
                  'absolute top-0 left-0 h-2.5 rounded-full transition-all duration-500',
                  getProgressColor(factor.score)
                )}
                style={{ width: `${factor.score}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground">{factor.description}</p>
          </div>
        ))}

        {/* Weighted Total Score */}
        <div className="pt-4 mt-4 border-t border-border">
          <div className="flex items-center justify-between mb-2">
            <span className="font-semibold">Total Audit Probability</span>
            <span className={cn('text-xl font-bold', getScoreColor(totalScore))}>
              {totalScore}%
            </span>
          </div>
          <div className="relative">
            <Progress 
              value={totalScore} 
              className="h-4 bg-muted"
            />
            <div 
              className={cn(
                'absolute top-0 left-0 h-4 rounded-full transition-all duration-500',
                getProgressColor(totalScore)
              )}
              style={{ width: `${totalScore}%` }}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
