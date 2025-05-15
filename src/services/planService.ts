import { supabase } from '@/integrations/supabase/client';

/** Returns true if the user is under their limit for that feature. */
export async function checkUserFeatureLimit(
  userId: string,
  featureName: 'properties' | 'mortgages' | 'rentals'
): Promise<boolean> {
  const { data, error } = await supabase
    .rpc('check_user_feature_limit', {
      p_user_id: userId,
      p_feature_name: featureName,
    });

  if (error) throw error;
  return Boolean(data);
}

/** Returns the plan name, period end, and a `{ [featureName]: limit }` map. */
export async function getUserPlanLimits(
  userId: string
): Promise<{
  plan_name: string;
  current_period_end: string;
  limits: Record<string, number>;
}> {
  const { data, error } = await supabase
    .rpc('get_user_plan_limits', { p_user_id: userId });

  if (error || !data) throw error || new Error('Failed to load plan limits');
  return data;
}