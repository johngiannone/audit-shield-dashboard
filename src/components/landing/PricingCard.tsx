import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Briefcase, CheckCircle, ArrowRight, Info, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface PricingCardProps {
  type: 'individual' | 'business';
}

const ADDON_PRICE = 29;
const RETROACTIVE_YEARS = [
  { year: 2023, label: '2023 Return' },
  { year: 2022, label: '2022 Return' },
  { year: 2021, label: '2021 Return' },
];

export function PricingCard({ type }: PricingCardProps) {
  const [selectedYears, setSelectedYears] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  const isIndividual = type === 'individual';
  const basePrice = isIndividual ? 49 : 199;
  const addonTotal = selectedYears.length * ADDON_PRICE;
  const totalPrice = basePrice + addonTotal;

  const toggleYear = (year: number) => {
    setSelectedYears(prev => 
      prev.includes(year) 
        ? prev.filter(y => y !== year)
        : [...prev, year]
    );
  };

  const handleCheckout = async () => {
    if (!user) {
      // Redirect to auth with return URL
      navigate('/auth?redirect=pricing');
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: {
          planType: type,
          retroactiveYears: selectedYears,
        },
      });

      if (error) throw error;
      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error('Checkout error:', error);
      toast.error('Failed to start checkout. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const config = isIndividual ? {
    icon: Shield,
    iconBg: 'bg-slate-100 dark:bg-slate-800',
    iconColor: 'text-slate-500',
    title: 'Individual Shield',
    subtitle: 'W-2 & Investment Income',
    features: [
      '2024 Tax Year Coverage',
      'Federal & State Defense',
      'Identity Theft Restoration',
      'Dedicated Enrolled Agent',
    ],
    buttonText: 'Protect My Return',
  } : {
    icon: Briefcase,
    iconBg: 'bg-violet-100 dark:bg-violet-900/30',
    iconColor: 'text-violet-600 dark:text-violet-400',
    title: 'Business Shield',
    subtitle: 'Schedule C & 1099 Income',
    features: [
      '2024 Tax Year Coverage',
      'Self-Employment Defense',
      'Business Expense Verification',
      'Payroll Tax Inquiry Defense',
    ],
    buttonText: 'Protect My Business',
  };

  const IconComponent = config.icon;

  return (
    <Card className="relative bg-card border border-border shadow-lg hover:shadow-xl transition-all duration-300 animate-fade-in flex flex-col">
      <CardHeader className="pb-4 pt-8 px-8">
        <div className={`w-14 h-14 rounded-2xl ${config.iconBg} flex items-center justify-center mb-4`}>
          <IconComponent className={`h-7 w-7 ${config.iconColor}`} />
        </div>
        <h3 className="font-display text-xl font-semibold text-foreground">{config.title}</h3>
        <p className="text-muted-foreground text-sm mt-1">{config.subtitle}</p>
      </CardHeader>
      <CardContent className="px-8 pb-8 flex flex-col flex-1">
        <div className="mb-6">
          <span className="font-display text-4xl font-bold text-foreground">${basePrice}</span>
          <span className="text-muted-foreground">/year</span>
        </div>
        
        <ul className="space-y-3 mb-6">
          {config.features.map((feature, i) => (
            <li key={i} className="flex items-center gap-2 text-sm text-foreground">
              <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
              {feature}
            </li>
          ))}
        </ul>

        <Separator className="my-6" />

        {/* Retroactive Coverage Add-on */}
        <div className="space-y-4 flex-1">
          <div className="flex items-center gap-2">
            <h4 className="font-display text-base font-semibold text-foreground">Add Retroactive Coverage</h4>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p className="text-sm">
                    Did you know? The IRS typically examines returns filed within the last three years. 
                    <span className="text-muted-foreground ml-1">(Source: IRS.gov)</span>
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          
          <div className="space-y-3">
            {RETROACTIVE_YEARS.map(({ year, label }) => (
              <label 
                key={year}
                className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/30 hover:bg-muted/50 cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Checkbox 
                    checked={selectedYears.includes(year)}
                    onCheckedChange={() => toggleYear(year)}
                  />
                  <span className="text-sm text-foreground">{label}</span>
                </div>
                <span className="text-sm font-medium text-muted-foreground">+${ADDON_PRICE}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Dynamic Total Button */}
        <div className="mt-6 pt-4 border-t border-border">
          <Button 
            className="w-full" 
            size="lg" 
            onClick={handleCheckout}
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <span className="flex items-center gap-2">
                Total Due: ${totalPrice}
                <ArrowRight className="h-4 w-4" />
              </span>
            )}
          </Button>
          {addonTotal > 0 && (
            <p className="text-xs text-muted-foreground text-center mt-2">
              Base ${basePrice} + ${addonTotal} retroactive coverage
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
