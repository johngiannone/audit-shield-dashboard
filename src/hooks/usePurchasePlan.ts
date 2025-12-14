import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export type PlanLevel = 'silver' | 'gold' | 'platinum';

interface PurchasePlanResult {
  success: boolean;
  planId?: string;
  error?: string;
}

export function usePurchasePlan() {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const purchasePlan = async (
    profileId: string,
    planLevel: PlanLevel
  ): Promise<PurchasePlanResult> => {
    setIsLoading(true);
    
    try {
      const currentYear = new Date().getFullYear();
      
      // Create the audit plan record
      const { data: plan, error: planError } = await supabase
        .from('audit_plans')
        .insert({
          profile_id: profileId,
          plan_level: planLevel,
          tax_year: currentYear,
          status: 'active',
        })
        .select()
        .single();

      if (planError) {
        console.error('Error creating plan:', planError);
        throw new Error('Failed to create membership plan');
      }

      console.log('Plan created:', plan);

      // Trigger welcome email
      const { error: emailError } = await supabase.functions.invoke('send-welcome-email', {
        body: {
          profile_id: profileId,
          plan_level: planLevel,
          tax_year: currentYear,
        },
      });

      if (emailError) {
        console.error('Welcome email error (non-blocking):', emailError);
        // Don't fail the purchase if email fails
      }

      toast({
        title: 'Welcome to Return Shield!',
        description: `Your ${planLevel.charAt(0).toUpperCase() + planLevel.slice(1)} Shield membership is now active.`,
      });

      return { success: true, planId: plan.id };
    } catch (error: any) {
      console.error('Purchase error:', error);
      toast({
        title: 'Purchase Failed',
        description: error.message || 'Failed to complete your purchase. Please try again.',
        variant: 'destructive',
      });
      return { success: false, error: error.message };
    } finally {
      setIsLoading(false);
    }
  };

  return { purchasePlan, isLoading };
}
