// src/hooks/useUserPlanLimits.ts
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/context/auth-context'

export interface PlanLimits {
  plan_name: string
  current_period_end: string
  limits: Record<string, number>
}

export function useUserPlanLimits(userId?: string) {
  const { user } = useAuth()
  const uid = userId ?? user?.id

  return useQuery<PlanLimits>({
    queryKey: ['userPlanLimits', uid],
    queryFn: async () => {
      if (!uid) throw new Error('No user ID provided')
      const { data, error } = await supabase
        .rpc('get_user_plan_limits', { p_user_id: uid })
        .single<PlanLimits>()
      if (error || !data) throw error || new Error('Failed to fetch plan limits')
      return data
    },
    enabled: Boolean(uid),
    staleTime: 60_000 * 5, // cache for 5 minutes
  })
}