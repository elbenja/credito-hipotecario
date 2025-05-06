import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useSubscription } from '@/hooks/-useSubscription';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Check } from 'lucide-react';
import { PlanWithFeatures } from '@/types/subscription';
import { toast } from 'sonner';

export default function SubscriptionsPage() {
  const { subscription, isLoading } = useSubscription();
  const [plans, setPlans] = useState<PlanWithFeatures[]>([]);
  const [isLoadingPlans, setIsLoadingPlans] = useState(true);
  const [isUpgrading, setIsUpgrading] = useState(false);

  // Fetch all available plans on component mount
  React.useEffect(() => {
    const fetchPlans = async () => {
      setIsLoadingPlans(true);
      
      try {
        const { data, error } = await supabase
          .from('subscription_plans')
          .select('*, features:plan_features(*)')
          .eq('is_active', true)
          .order('price_monthly', { ascending: true });
          
        if (error) {
          throw error;
        }
        
        setPlans(data as PlanWithFeatures[]);
      } catch (err) {
        console.error('Error fetching plans:', err);
        toast.error('No se pudieron cargar los planes disponibles');
      } finally {
        setIsLoadingPlans(false);
      }
    };
    
    fetchPlans();
  }, []);

  // Handle plan upgrade
  const handleUpgrade = async (planId: string) => {
    if (!subscription || isUpgrading) return;
    
    setIsUpgrading(true);
    
    try {
      // In a real application, you would integrate with a payment provider here
      // For this example, we'll just update the user's subscription
      
      const today = new Date();
      const nextMonth = new Date();
      nextMonth.setMonth(today.getMonth() + 1);
      
      if (subscription.id === 'default') {
        // Create a new subscription if the user doesn't have one
        const { error } = await supabase
          .from('user_subscriptions')
          .insert({
            user_id: subscription.user_id,
            plan_id: planId,
            status: 'active',
            current_period_start: today.toISOString(),
            current_period_end: nextMonth.toISOString()
          });
          
        if (error) throw error;
      } else {
        // Update existing subscription
        const { error } = await supabase
          .from('user_subscriptions')
          .update({
            plan_id: planId,
            current_period_start: today.toISOString(),
            current_period_end: nextMonth.toISOString(),
            status: 'active',
            cancel_at_period_end: false
          })
          .eq('id', subscription.id);
          
        if (error) throw error;
      }
      
      toast.success('Plan actualizado exitosamente');
      
      // In a real app, we would refresh the subscription data here
      // For simplicity, we'll just reload the page
      setTimeout(() => window.location.reload(), 1500);
    } catch (err) {
      console.error('Error upgrading plan:', err);
      toast.error('No se pudo actualizar el plan');
    } finally {
      setIsUpgrading(false);
    }
  };

  // Helper to determine if a plan is the current one
  const isCurrentPlan = (planId: string) => {
    return subscription?.plan_id === planId;
  };
  
  // Helper to format feature limit display
  const formatLimit = (limit: number) => {
    return limit === -1 ? 'Ilimitado' : limit.toString();
  };

  if (isLoading || isLoadingPlans) {
    return (
      <div className="container max-w-6xl py-10">
        <h1 className="text-3xl font-bold mb-8">Planes y Precios</h1>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-96 animate-pulse bg-muted rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-6xl py-10">
      <h1 className="text-3xl font-bold mb-8">Planes y Precios</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans.map((plan) => {
          const currentPlan = isCurrentPlan(plan.id);
          const properties = plan.features.find(f => f.feature_name === 'properties');
          const mortgages = plan.features.find(f => f.feature_name === 'mortgages');
          const rentals = plan.features.find(f => f.feature_name === 'rentals');
          
          return (
            <Card 
              key={plan.id} 
              className={currentPlan ? 'border-primary' : ''}
            >
              <CardHeader>
                <CardTitle>{plan.name}</CardTitle>
                <CardDescription>{plan.description}</CardDescription>
                <div className="mt-4">
                  <span className="text-4xl font-bold">${plan.price_monthly}</span>
                  <span className="text-muted-foreground">/mensuales</span>
                </div>
                <div>
                  <span className="text-lg">${plan.price_yearly}</span>
                  <span className="text-muted-foreground">/anuales</span>
                </div>
              </CardHeader>
              
              <CardContent>
                <ul className="space-y-2">
                  <li className="flex items-center">
                    <Check className="mr-2 h-4 w-4 text-primary" />
                    <span>{formatLimit(properties?.feature_limit || 0)} Propiedades</span>
                  </li>
                  <li className="flex items-center">
                    <Check className="mr-2 h-4 w-4 text-primary" />
                    <span>{formatLimit(mortgages?.feature_limit || 0)} Hipotecas</span>
                  </li>
                  <li className="flex items-center">
                    <Check className="mr-2 h-4 w-4 text-primary" />
                    <span>{formatLimit(rentals?.feature_limit || 0)} Alquileres</span>
                  </li>
                  <li className="flex items-center">
                    <Check className="mr-2 h-4 w-4 text-primary" />
                    <span>Tutoriales de uso</span>
                  </li>
                </ul>
              </CardContent>
              
              <CardFooter>
                <Button 
                  className="w-full" 
                  onClick={() => handleUpgrade(plan.id)}
                  disabled={currentPlan || isUpgrading}
                  variant={currentPlan ? "outline" : "default"}
                >
                  {currentPlan ? 'Plan actual' : 'Elegir plan'}
                </Button>
              </CardFooter>
            </Card>
          );
        })}
      </div>
    </div>
  );
} 