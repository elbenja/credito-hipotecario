import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  checkUserFeatureLimit,
  // getUserPlanLimits,
  getActivePlansWithLimits, Plan
} from '@/services/planService';
// import { useAuth } from '@/hooks/useAuth';
import { useAuth } from '@/context/auth-context';

export function useUserPlanLimits() {
  const { user } = useAuth();
  const { data: plans, ...rest } = usePlans(user?.id ?? null);

  // Find the current plan
  const currentPlan = Array.isArray(plans)
    ? plans.find((plan) => plan.is_current_plan)
    : null;

  // Map limits to numbers, except for 'Unlimited'
  const mappedLimits = currentPlan?.limits
    ? Object.fromEntries(
        Object.entries(currentPlan.limits).map(([key, value]) => [
          key,
          value === 'Unlimited' ? 'Unlimited' : Number(value),
        ])
      )
    : null;

  // Compose the return object
  const planLimits = currentPlan
    ? {
        plan_name: currentPlan.name,
        current_period_end: currentPlan.current_period_end,
        limits: mappedLimits,
      }
    : null;

  return {
    data: planLimits,
    ...rest,
  };
}

/**  
 * Hook to check if you can create/Duplicate a given feature.  
 * Returns a function you can `await canCreate('properties')`.  
 */
export function useCanCreateFeature() {
  const qc = useQueryClient();
  const { user } = useAuth();

  const mutation = useMutation<boolean, Error, 'properties' | 'mortgages' | 'rentals'>({
    mutationKey: ['can-create-feature'],
    mutationFn: (featureName) =>
      checkUserFeatureLimit(user!.id, featureName),
    onSuccess: () => {
      // Invalidate plan limits so UI badges update
      qc.invalidateQueries({ queryKey: ['user-plan-limits', user?.id] });
    },
  });

  return {
    canCreate: (feature: 'properties' | 'mortgages' | 'rentals') =>
      mutation.mutateAsync(feature),
    isChecking: mutation.isPending,
  };
}

// import { getActivePlansWithLimits, Plan } from '@/services/planService'

export const usePlans = (userId: string | null) => {
  // return useQuery<Plan[] | null>(
  //   ['activePlansWithLimits', userId],
  //   () => {
  //     if (!userId) return Promise.resolve(null)
  //     return getActivePlansWithLimits(userId)
  //   },
  //   {
  //     enabled: !!userId,                // Only run when userId exists
  //     staleTime: 1000 * 60 * 60 * 12,   // 12 hours
  //     gcTime: 1000 * 60 * 60 * 24,   // 24 hours
  //     refetchOnWindowFocus: false,
  //     retry: 1
  //   }
  // )
  return useQuery<Plan[] | null>({
    queryKey: ['activePlansWithLimits', userId],
    queryFn: () => {
      if (!userId) return Promise.resolve(null)
      return getActivePlansWithLimits(userId)
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 60 * 12,
    gcTime: 1000 * 60 * 60 * 24,
    refetchOnWindowFocus: false,
    retry: 1
  })
}

// May 22 
// export function useUserPlanLimits() {
//   const { user } = useAuth();
//   return useQuery({
//     queryKey: ['user-plan-limits', user?.id],
//     queryFn: () => getUserPlanLimits(user!.id),
//     enabled: Boolean(user)
//   });
// }
