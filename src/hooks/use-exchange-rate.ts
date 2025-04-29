import { useQuery } from "@tanstack/react-query"
import { supabase } from "../integrations/supabase/client"
import { Currency } from "../services/mortgages/types/common"

/**
 * @deprecated Please use the use-exchange-rate.tsx implementation instead
 */
export const useExchangeRate = (
  fromCurrency: string = "USD", 
  toCurrency: string = "PEN"
) => {
  return useQuery({
    queryKey: ['exchange-rate', fromCurrency, toCurrency],
    queryFn: async () => {
      try {
        // Call the database function instead of querying the table directly
        const { data, error } = await supabase
          .rpc('get_exchange_rate', { 
            from_curr: fromCurrency,
            to_curr: toCurrency
          })
        
        if (error) throw error
        
        return data || 3.71
      } catch (error) {
        console.error(`Error fetching exchange rate from ${fromCurrency} to ${toCurrency}:`, error)
        return 3.71 // Default fallback rate
      }
    },
    staleTime: 24 * 60 * 60 * 1000, // 24 hours
    refetchOnWindowFocus: false,
    placeholderData: 3.7167
  })
}
