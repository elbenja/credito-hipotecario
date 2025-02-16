
import { useQuery } from "@tanstack/react-query"
import { supabase } from "@/integrations/supabase/client"

export function useInterestRateLimits() {
  return useQuery({
    queryKey: ["interest-rate-limits"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("interest_rate_limits")
        .select("*")
        .eq("is_active", true)
        .single()

      if (error) throw error
      return data
    }
  })
}
