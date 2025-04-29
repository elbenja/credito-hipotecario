import { useQuery } from "@tanstack/react-query"
import { supabase } from "@/integrations/supabase/client"
import { useState, useEffect } from "react"

export const useExchangeRate = () => {
  const [localRate, setLocalRate] = useState<number | null>(null)

  const query = useQuery({
    queryKey: ["exchange-rate"],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from("exchange_rates")
          .select("rate")
          .eq("from_currency", "USD")
          .eq("to_currency", "PEN")
          .single()
        
        if (error) throw error
        
        return data?.rate || 3.71
      } catch (error) {
        console.error("Error fetching exchange rate:", error)
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
      const storedRate = localStorage.getItem("exchange_rate")
      if (storedRate) {
        setLocalRate(parseFloat(storedRate))
      }
    }

    // Update localStorage when we have a fresh rate
    if (query.data) {
      localStorage.setItem("exchange_rate", query.data.toString())
      
      // Also update our local state
      if (localRate !== query.data) {
        setLocalRate(query.data)
      }
    }
  }, [query.data, localRate])

  // Return either the query data or our local fallback
  return {
    ...query,
    data: query.data || localRate || 3.71
  }
} 