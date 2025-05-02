import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { 
  FeatureName, 
  PlanWithFeatures, 
  UserSubscriptionWithPlan, 
  hasFeatureAccess as checkFeatureAccess,
  getFeatureLimit as checkFeatureLimit
} from '@/types/subscription';

export function useSubscription() {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<UserSubscriptionWithPlan | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!user) {
      setSubscription(null);
      setIsLoading(false);
      return;
    }

    const fetchSubscription = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // Get the user's subscription with plan and features
        const { data: subscriptionData, error: subscriptionError } = await supabase
          .from('user_subscriptions')
          .select('*, plan:plan_id(*, features:plan_features(*))')
          .eq('user_id', user.id)
          .eq('status', 'active')
          .single();

        if (subscriptionError) {
          throw subscriptionError;
        }

        if (subscriptionData) {
          setSubscription(subscriptionData as UserSubscriptionWithPlan);
        } else {
          // If no subscription found, get the default "Personal" plan
          const { data: personalPlan, error: planError } = await supabase
            .from('subscription_plans')
            .select('*, features:plan_features(*)')
            .eq('name', 'Personal')
            .single();

          if (planError) {
            throw planError;
          }

          // Create a default subscription object with the personal plan
          const defaultSubscription: UserSubscriptionWithPlan = {
            id: 'default',
            user_id: user.id,
            plan_id: personalPlan.id,
            status: 'active',
            current_period_start: new Date().toISOString(),
            current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            cancel_at_period_end: false,
            payment_provider: null,
            payment_provider_subscription_id: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            plan: personalPlan as PlanWithFeatures
          };

          setSubscription(defaultSubscription);
        }
      } catch (err) {
        console.error('Error fetching subscription:', err);
        setError(err instanceof Error ? err : new Error('Failed to fetch subscription'));
      } finally {
        setIsLoading(false);
      }
    };

    fetchSubscription();
  }, [user]);

  // Function to check if user has access to a feature
  const hasFeatureAccess = (featureName: FeatureName, currentCount: number = 0) => {
    return checkFeatureAccess(subscription, featureName, currentCount);
  };

  // Function to get the limit for a feature
  const getFeatureLimit = (featureName: FeatureName) => {
    return checkFeatureLimit(subscription, featureName);
  };

  return {
    subscription,
    isLoading,
    error,
    hasFeatureAccess,
    getFeatureLimit
  };
} 