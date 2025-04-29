import { useQuery } from "@tanstack/react-query"
import { supabase } from "../integrations/supabase/client"
import { useState, useEffect } from "react"

/**
 * Hook to get the current exchange rate between currencies
 * Uses a database function and localStorage for caching and fallback
 */
export const useExchangeRate = (
  fromCurrency: string = "USD", 
  toCurrency: string = "PEN"
) => {
  const [localRate, setLocalRate] = useState<number | null>(null)
  const storageKey = `exchange_rate_${fromCurrency}_${toCurrency}`

  const query = useQuery({
    queryKey: ["exchange-rate", fromCurrency, toCurrency],
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
    refetchOnWindowFocus: false, // Prevent refetching when tab regains focus
  })

  // Use local storage as a backup
  useEffect(() => {
    // Try to get from localStorage on initial load
    if (localRate === null) {
      const storedRate = localStorage.getItem(storageKey)
      if (storedRate) {
        setLocalRate(parseFloat(storedRate))
      }
    }

    // Update localStorage when we have a fresh rate
    if (query.data) {
      localStorage.setItem(storageKey, query.data.toString())
      
      // Also update our local state
      if (localRate !== query.data) {
        setLocalRate(query.data)
      }
    }
  }, [query.data, localRate, storageKey])

  // Return either the query data or our local fallback
  return {
    ...query,
    data: query.data || localRate || 3.71
  }
} 