import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  checkUserFeatureLimit,
  getUserPlanLimits,
} from '@/services/planService';
// import { useAuth } from '@/hooks/useAuth';
import { useAuth } from '@/context/auth-context';

export function useUserPlanLimits() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['user-plan-limits', user?.id],
    queryFn: () => getUserPlanLimits(user!.id),
    enabled: Boolean(user)
  });
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