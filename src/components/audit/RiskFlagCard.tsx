import { AlertTriangle, AlertCircle, Info } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface RiskFlagCardProps {
  flag: string;
  severity: 'high' | 'medium' | 'low';
  details: string;
  yourValue?: number | null;
  benchmarkValue?: number | null;
}

export function RiskFlagCard({ flag, severity, details, yourValue, benchmarkValue }: RiskFlagCardProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
  };

  const getIcon = () => {
    switch (severity) {
      case 'high':
        return <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0" />;
      case 'medium':
        return <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0" />;
      default:
        return <Info className="h-5 w-5 text-blue-500 flex-shrink-0" />;
    }
  };

  const getBorderColor = () => {
    switch (severity) {
      case 'high':
        return 'border-l-destructive';
      case 'medium':
        return 'border-l-yellow-500';
      default:
        return 'border-l-blue-500';
    }
  };

  const getBadgeVariant = () => {
    switch (severity) {
      case 'high':
        return 'destructive';
      case 'medium':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  // Calculate percentage difference if both values are available
  const percentageDiff = yourValue && benchmarkValue && benchmarkValue > 0
    ? Math.round(((yourValue - benchmarkValue) / benchmarkValue) * 100)
    : null;

  return (
    <Card className={`border-l-4 ${getBorderColor()} bg-card/50`}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          {getIcon()}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="font-semibold text-foreground">{flag}</h4>
              <Badge variant={getBadgeVariant()} className="uppercase text-[10px]">
                {severity} risk
              </Badge>
            </div>
            
            <p className="text-sm text-muted-foreground mt-1">{details}</p>
            
            {/* Comparison visualization */}
            {yourValue !== undefined && yourValue !== null && benchmarkValue !== undefined && benchmarkValue !== null && (
              <div className="mt-3 p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center justify-between text-sm">
                  <div>
                    <span className="text-muted-foreground">Your amount:</span>
                    <span className="ml-2 font-semibold text-foreground">{formatCurrency(yourValue)}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Average:</span>
                    <span className="ml-2 font-medium text-muted-foreground">{formatCurrency(benchmarkValue)}</span>
                  </div>
                </div>
                {percentageDiff !== null && percentageDiff > 0 && (
                  <div className="mt-2 text-xs font-medium text-destructive">
                    ⚠️ {percentageDiff}% higher than average for your income bracket
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
