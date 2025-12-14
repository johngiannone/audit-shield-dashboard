import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { FileText, Loader2, Shield, Calendar } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Plan {
  id: string;
  tax_year: number;
  status: string;
  plan_level: string;
  created_at: string;
}

export default function Plans() {
  const navigate = useNavigate();
  const { user, role, loading } = useAuth();
  const { toast } = useToast();
  
  const [plans, setPlans] = useState<Plan[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
    if (!loading && role === 'agent') {
      navigate('/dashboard');
    }
  }, [user, loading, role, navigate]);

  useEffect(() => {
    if (user && role === 'client') {
      fetchPlans();
    }
  }, [user, role]);

  const fetchPlans = async () => {
    setDataLoading(true);
    try {
      const { data, error } = await supabase
        .from('audit_plans')
        .select('*')
        .order('tax_year', { ascending: false });

      if (error) throw error;
      setPlans(data || []);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load your plans',
        variant: 'destructive',
      });
    } finally {
      setDataLoading(false);
    }
  };

  const getPlanLevelStyle = (level: string) => {
    const styles = {
      basic: 'bg-secondary text-secondary-foreground',
      premium: 'bg-accent text-accent-foreground',
      enterprise: 'bg-primary text-primary-foreground',
    };
    return styles[level as keyof typeof styles] || styles.basic;
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-8 animate-fade-in">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">My Plans</h1>
          <p className="text-muted-foreground mt-1">
            View and manage your audit defense coverage
          </p>
        </div>

        {dataLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : plans.length === 0 ? (
          <Card className="border-0 shadow-md">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Shield className="h-16 w-16 text-muted-foreground/50 mb-4" />
              <h3 className="text-xl font-semibold text-foreground mb-2">No Plans Yet</h3>
              <p className="text-muted-foreground text-center max-w-sm">
                You don't have any audit defense plans. Contact us to get protected.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {plans.map((plan) => (
              <Card key={plan.id} className="border-0 shadow-md hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                      <FileText className="h-6 w-6 text-primary" />
                    </div>
                    <Badge className={getPlanLevelStyle(plan.plan_level)}>
                      {plan.plan_level}
                    </Badge>
                  </div>
                  <CardTitle className="font-display text-xl mt-4">
                    Tax Year {plan.tax_year}
                  </CardTitle>
                  <CardDescription>
                    Audit defense coverage
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span>{new Date(plan.created_at).toLocaleDateString()}</span>
                    </div>
                    <Badge 
                      variant="outline"
                      className={plan.status === 'active' 
                        ? 'bg-success/10 text-success border-success/20' 
                        : 'bg-muted text-muted-foreground'}
                    >
                      {plan.status}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
