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
// May 22  soon to deprecate
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

/**
 * Fetches all active plans with their limits and indicates the current plan for the user.
 * Returns an array of plans with their details and limits.
 */
// export async function getActivePlansWithLimits(userId: string): Promise<any[]> {
//   const { data, error } = await supabase
//     .rpc('get_active_plans_with_limits', { p_user_id: userId });

//   if (error) throw error;
//   // The function returns null if no plans, otherwise an array
//   return data ?? [];
// }


export type PlanFeatureLimits = Record<string, string>

export interface Plan {
  id: string
  name: string
  price_yearly: number
  price_monthly: number
  price_id: string
  is_current_plan: boolean
  current_period_end: string | null
  limits: PlanFeatureLimits
}

export async function getActivePlansWithLimits(userId: string): Promise<Plan[] | null> {
  console.log('🚀 getActivePlansWithLimits called for user:', userId)
  
  try {
    // Query tables directly (RPC function doesn't exist)
    console.log('📊 Using direct table queries method')

    // Get all subscription plans
    const { data: allPlans, error: plansError } = await supabase
      .from('subscription_plans')
      .select(`
        id,
        name,
        price_yearly,
        price_monthly,
        plan_features!inner (
          feature_name,
          feature_limit
        )
      `)
      .eq('is_active', true)

    if (plansError) {
      console.error('❌ Error fetching subscription plans:', plansError)
      return null
    }

    // Get user's current subscription
    const { data: userSubscription, error: subError } = await supabase
      .from('user_subscriptions')
      .select('plan_id, current_period_end')
      .eq('user_id', userId)
      .eq('status', 'active')
      .single()

    console.log('👤 User subscription:', userSubscription)

    // Transform the data to match expected format
    const plans: Plan[] = (allPlans || []).map(plan => {
      // Create limits object from plan_features
      const limits: Record<string, string> = {}
      if (plan.plan_features) {
        plan.plan_features.forEach((feature: any) => {
          limits[feature.feature_name] = feature.feature_limit === -1 ? 'Unlimited' : feature.feature_limit.toString()
        })
      }

      return {
        id: plan.id,
        name: plan.name,
        price_yearly: plan.price_yearly,
        price_monthly: 0, // Default, as it's not required for our current use
        price_id: '', // Default, as it's not required for our current use
        is_current_plan: userSubscription?.plan_id === plan.id,
        current_period_end: userSubscription?.plan_id === plan.id ? (userSubscription?.current_period_end || null) : null,
        limits
      }
    })

    console.log('📊 Direct table query result:', plans)
    
    // If no plans found or no current plan, add a default Personal plan
    if (!plans || plans.length === 0 || !plans.find(p => p.is_current_plan)) {
      console.log('🔄 Adding default Personal plan fallback')
      const defaultPlan: Plan = {
        id: 'default-personal',
        name: 'Personal',
        price_yearly: 14.90,
        price_monthly: 1.24,
        price_id: '',
        is_current_plan: true,
        current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
        limits: {
          properties: '3',
          mortgages: '10',
          rentals: '1'
        }
      }
      
      if (plans && plans.length > 0) {
        // Mark all existing plans as not current and add default
        plans.forEach(p => p.is_current_plan = false)
        plans.push(defaultPlan)
      } else {
        // Create new array with just the default plan
        return [defaultPlan]
      }
    }
    
    return plans

  } catch (error) {
    console.error('❌ Exception in getActivePlansWithLimits:', error)
    return null
  }
}


export async function checkUserSubscriptionStatus(userId: string): Promise<boolean> {
  //   console.log('🔐 checkUserSubscriptionStatus called for user:', userId)
  
  try {
    const plans = await getActivePlansWithLimits(userId)
    //   console.log('📋 Retrieved plans:', plans)
    
    if (!plans) {
      //   console.log('❌ No plans found, returning false')
      return false
    }

    const currentPlan = plans.find(p => p.is_current_plan)
    //   console.log('🎯 Current plan:', currentPlan)
    
    if (!currentPlan) {
      //   console.log('❌ No current plan found, returning false')
      return false
    }

    const now = new Date()
    const endDate = new Date(currentPlan.current_period_end ?? '')
    const hasAccess = endDate > now
    
    //   console.log('📅 Subscription status check:')
    //   console.log('  - Now:', now.toISOString())
    //   console.log('  - End Date:', endDate.toISOString())
    //   console.log('  - Has Access:', hasAccess)
    
    return hasAccess
  } catch (error) {
    //   console.error('❌ Exception in checkUserSubscriptionStatus:', error)
    return false
  }
}