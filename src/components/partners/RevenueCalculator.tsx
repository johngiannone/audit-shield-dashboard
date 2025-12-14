import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Calculator, DollarSign, TrendingUp, Users } from 'lucide-react';

interface RevenueCalculatorProps {
  trigger?: React.ReactNode;
}

const COMMISSION_PER_PLAN = 40;
const ADOPTION_RATE = 0.25; // 25% adoption rate assumption

export function RevenueCalculator({ trigger }: RevenueCalculatorProps) {
  const [clientCount, setClientCount] = useState(500);
  const [adoptionRate, setAdoptionRate] = useState(25);

  const plansProjected = Math.round(clientCount * (adoptionRate / 100));
  const yearOneRevenue = plansProjected * COMMISSION_PER_PLAN;
  const yearThreeRevenue = yearOneRevenue * 3; // Assuming retention

  return (
    <Dialog>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="lg" className="text-base px-8">
            <Calculator className="mr-2 h-5 w-5" />
            Calculate Your Revenue
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">Revenue Calculator</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-8 py-4">
          {/* Client Count Input */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="clients" className="text-base font-medium">
                Number of Tax Clients
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  id="clients"
                  type="number"
                  value={clientCount}
                  onChange={(e) => setClientCount(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-24 text-right font-semibold"
                  min={0}
                  max={10000}
                />
              </div>
            </div>
            <Slider
              value={[clientCount]}
              onValueChange={([value]) => setClientCount(value)}
              max={2000}
              min={50}
              step={50}
              className="py-2"
            />
            <p className="text-xs text-muted-foreground">
              Total individual and business returns you file annually
            </p>
          </div>

          {/* Adoption Rate */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-base font-medium">
                Estimated Adoption Rate
              </Label>
              <span className="font-semibold text-primary">{adoptionRate}%</span>
            </div>
            <Slider
              value={[adoptionRate]}
              onValueChange={([value]) => setAdoptionRate(value)}
              max={50}
              min={10}
              step={5}
              className="py-2"
            />
            <p className="text-xs text-muted-foreground">
              Industry average is 20-30% when presented at filing time
            </p>
          </div>

          {/* Results */}
          <div className="bg-muted/50 rounded-xl p-6 space-y-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-4">
              <TrendingUp className="h-5 w-5" />
              <span className="font-medium">Projected Revenue</span>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-card rounded-lg p-4 border border-border">
                <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                  <Users className="h-4 w-4" />
                  Plans Sold
                </div>
                <div className="font-display text-2xl font-bold text-foreground">
                  {plansProjected.toLocaleString()}
                </div>
              </div>
              
              <div className="bg-card rounded-lg p-4 border border-border">
                <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                  <DollarSign className="h-4 w-4" />
                  Per Plan
                </div>
                <div className="font-display text-2xl font-bold text-foreground">
                  ${COMMISSION_PER_PLAN}
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-border space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Year 1 Revenue</span>
                <span className="font-display text-xl font-bold text-foreground">
                  ${yearOneRevenue.toLocaleString()}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">3-Year Revenue*</span>
                <span className="font-display text-2xl font-bold text-primary">
                  ${yearThreeRevenue.toLocaleString()}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                *Assumes client retention and annual renewals
              </p>
            </div>
          </div>

          <Button className="w-full" size="lg">
            Become a Partner
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
