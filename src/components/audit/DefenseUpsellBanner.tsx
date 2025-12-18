import { Shield, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

interface DefenseUpsellBannerProps {
  riskScore: number;
}

export function DefenseUpsellBanner({ riskScore }: DefenseUpsellBannerProps) {
  const navigate = useNavigate();

  const getRiskLabel = () => {
    if (riskScore > 70) return 'High';
    if (riskScore > 50) return 'Elevated';
    return 'Moderate';
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-gradient-to-r from-destructive to-destructive/90 text-destructive-foreground shadow-lg border-t border-destructive/20">
      <div className="container mx-auto px-4 py-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-full">
              <Shield className="h-6 w-6" />
            </div>
            <div>
              <p className="font-semibold text-lg">
                Your audit risk is <span className="underline decoration-2">{getRiskLabel()}</span>
              </p>
              <p className="text-sm text-destructive-foreground/80">
                Get professional Enrolled Agent representation if audited
              </p>
            </div>
          </div>
          
          <Button 
            onClick={() => navigate('/plans')}
            size="lg"
            className="bg-white text-destructive hover:bg-white/90 font-semibold shadow-md"
          >
            Activate Defense Plan
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
