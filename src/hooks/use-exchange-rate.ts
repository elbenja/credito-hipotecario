
import { useQuery } from "@tanstack/react-query"
import { supabase } from "@/integrations/supabase/client"
import { Currency } from "@/services/amortization/types/common"

export const useExchangeRate = () => {
  return useQuery({
    queryKey: ['exchange-rate', 'USD', 'PEN'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('exchange_rates')
        .select('*')
        .eq('from_currency', 'USD')
        .eq('to_currency', 'PEN')
        .order('last_updated', { ascending: false })
        .limit(1)
        .single()

      if (error) throw error
      return data.rate
    },
    // Fallback to a reasonable default if we can't fetch the rate
    placeholderData: 3.7167
  })
}
