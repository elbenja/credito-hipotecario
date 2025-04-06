import { Database } from '@/integrations/supabase/types';

export type SubscriptionPlan = Database['public']['Tables']['subscription_plans']['Row'];
export type PlanFeature = Database['public']['Tables']['plan_features']['Row'];
export type UserSubscription = Database['public']['Tables']['user_subscriptions']['Row'];

export type FeatureName = 'properties' | 'mortgages' | 'rentals';

export type PlanWithFeatures = SubscriptionPlan & {
  features: PlanFeature[];
};

export type SubscriptionStatus = 'active' | 'canceled' | 'expired';

export interface UserSubscriptionWithPlan extends UserSubscription {
  plan: PlanWithFeatures;
}

// Helper function to check if user has access to a feature based on their plan
export const hasFeatureAccess = (
  subscription: UserSubscriptionWithPlan | null,
  featureName: FeatureName,
  currentCount: number = 0
): boolean => {
  if (!subscription || subscription.status !== 'active') {
    return false;
  }

  const feature = subscription.plan.features.find((f: PlanFeature) => f.feature_name === featureName);
  if (!feature) {
    return false;
  }

  // -1 means unlimited
  if (feature.feature_limit === -1) {
    return true;
  }

  return currentCount < feature.feature_limit;
};

// Helper function to get feature limit for a user
export const getFeatureLimit = (
  subscription: UserSubscriptionWithPlan | null,
  featureName: FeatureName
): number | 'unlimited' => {
  if (!subscription || subscription.status !== 'active') {
    return 0;
  }

  const feature = subscription.plan.features.find((f: PlanFeature) => f.feature_name === featureName);
  if (!feature) {
    return 0;
  }

  return feature.feature_limit === -1 ? 'unlimited' : feature.feature_limit;
}; 