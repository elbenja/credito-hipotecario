// src/hooks/useBonusRules.ts
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
// import type { BonusRule } from '@/types/property'
import { BonusRule } from "@/types/property"
/**
 * Fetches active bonus rules from the database
 */
export function useBonusRules() {
  return useQuery<BonusRule[], Error>({
    queryKey: ['bonus-rules'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_active_bonus_rules')
      if (error) throw error
      return data ?? []
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  })
}