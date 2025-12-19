import { Card, CardContent } from '@/components/ui/card';
import { CircularGauge } from './CircularGauge';
import { cn } from '@/lib/utils';
import { 
  Receipt, 
  Building2, 
  TrendingUp, 
  MapPin,
  Shield,
  AlertTriangle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

interface RiskFactor {
  id: string;
  name: string;
  score: number;
  weight: number;
  icon: React.ReactNode;
  description: string;
}

interface RiskBentoGridProps {
  deductionIntensity: number;
  industryAlignment: number;
  incomeConsistency: number;
  auditEnvironment: number;
  hasActivePlan?: boolean;
  formType?: string;
}

export function RiskBentoGrid({
  deductionIntensity,
  industryAlignment,
  incomeConsistency,
  auditEnvironment,
  hasActivePlan = false,
  formType = '1040',
}: RiskBentoGridProps) {
  const navigate = useNavigate();

  const factors: RiskFactor[] = [
    {
      id: 'deduction',
      name: 'Deduction Intensity',
      score: deductionIntensity,
      weight: 0.30,
      icon: <Receipt className="h-5 w-5" />,
      description: 'Income/expense ratios & charitable giving',
    },
    {
      id: 'industry',
      name: 'Industry Alignment',
      score: industryAlignment,
      weight: 0.25,
      icon: <Building2 className="h-5 w-5" />,
      description: 'NAICS profit margin benchmarks',
    },
    {
      id: 'income',
      name: 'Income Consistency',
      score: incomeConsistency,
      weight: 0.25,
      icon: <TrendingUp className="h-5 w-5" />,
      description: 'BLS occupation wage comparison',
    },
    {
      id: 'environment',
      name: 'Audit Environment',
      score: auditEnvironment,
      weight: 0.20,
      icon: <MapPin className="h-5 w-5" />,
      description: 'Geographic IRS activity data',
    },
  ];

  // Calculate weighted total score
  const totalScore = Math.round(
    factors.reduce((sum, factor) => sum + factor.score * factor.weight, 0)
  );

  const isHighRisk = totalScore >= 65;
  const isMediumRisk = totalScore >= 40;

  const getHeroBackground = () => {
    if (isHighRisk) return 'bg-gradient-to-br from-destructive/10 via-destructive/5 to-card border-destructive/30';
    if (isMediumRisk) return 'bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-card border-amber-500/30';
    return 'bg-gradient-to-br from-green-500/10 via-green-500/5 to-card border-green-500/30';
  };

  const getScoreColor = () => {
    if (isHighRisk) return 'text-destructive';
    if (isMediumRisk) return 'text-amber-500';
    return 'text-green-500';
  };

  const getRiskLabel = () => {
    if (isHighRisk) return 'High Risk';
    if (isMediumRisk) return 'Moderate Risk';
    return 'Low Risk';
  };

  return (
    <div className="space-y-4">
      {/* Hero Card - Total Audit Probability */}
      <Card className={cn("border-2", getHeroBackground())}>
        <CardContent className="p-6 md:p-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            {/* Left: Score Display */}
            <div className="flex items-center gap-6">
              <div className="relative">
                <CircularGauge 
                  value={totalScore} 
                  size={140}
                  strokeWidth={12}
                />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                  Total Audit Probability
                </p>
                <p className={cn("text-4xl font-bold font-display mt-1", getScoreColor())}>
                  {totalScore}%
                </p>
                <div className={cn(
                  "inline-flex items-center gap-1.5 mt-2 px-3 py-1 rounded-full text-sm font-medium",
                  isHighRisk && "bg-destructive/20 text-destructive",
                  isMediumRisk && !isHighRisk && "bg-amber-500/20 text-amber-600",
                  !isMediumRisk && "bg-green-500/20 text-green-600"
                )}>
                  {isHighRisk ? <AlertTriangle className="h-4 w-4" /> : <Shield className="h-4 w-4" />}
                  {getRiskLabel()}
                </div>
              </div>
            </div>

            {/* Right: CTA for high risk */}
            {isHighRisk && !hasActivePlan && (
              <div className="flex flex-col items-center md:items-end gap-3">
                <p className="text-sm text-muted-foreground text-center md:text-right max-w-[200px]">
                  Your return has elevated audit indicators
                </p>
                <Button 
                  onClick={() => navigate('/plans')}
                  size="lg"
                  className="bg-destructive hover:bg-destructive/90 shadow-lg shadow-destructive/25"
                >
                  <Shield className="mr-2 h-5 w-5" />
                  {(formType === '1120' || formType === '1120-S') 
                    ? 'Schedule Review' 
                    : 'Protect Now'}
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 2x2 Bento Grid - Risk Factors */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {factors.map((factor) => (
          <Card 
            key={factor.id} 
            variant="default"
            className="hover:shadow-lg transition-shadow"
          >
            <CardContent className="p-5">
              <div className="flex items-start justify-between gap-4">
                {/* Left: Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-primary">{factor.icon}</span>
                    <h4 className="font-semibold text-sm truncate">{factor.name}</h4>
                  </div>
                  <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
                    {factor.description}
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">
                      Weight: {Math.round(factor.weight * 100)}%
                    </span>
                  </div>
                </div>

                {/* Right: Circular Gauge */}
                <CircularGauge 
                  value={factor.score} 
                  size={72}
                  strokeWidth={6}
                />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
