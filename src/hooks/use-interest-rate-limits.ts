
import { useQuery } from "@tanstack/react-query"
import { supabase } from "@/integrations/supabase/client"

const DEFAULT_LIMITS = {
  min_rate: 4,
  max_rate: 18,
  is_active: true
}

export function useInterestRateLimits() {
  return useQuery({
    queryKey: ["interest-rate-limits"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("interest_rate_limits")
        .select("*")
        .eq("is_active", true)
        .maybeSingle()

      if (error) throw error
      return data || DEFAULT_LIMITS
    }
  })
}
