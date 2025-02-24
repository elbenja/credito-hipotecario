import { useQuery } from "@tanstack/react-query"
import { supabase } from "@/integrations/supabase/client"

export type InsuranceRate = {
  id: number
  type: "individual" | "joint" | "custom"
  percentage: number
  effective_year: number
}

// Define the database schema type
type Database = {
  public: {
    Tables: {
      insurance_rates: {
        Row: InsuranceRate
      }
    }
  }
}

export function useInsuranceRates() {
  return useQuery({
    queryKey: ["insurance-rates"],
    queryFn: async () => {
      const currentYear = new Date().getFullYear()
      
      const { data, error } = await supabase
        .from('insurance_rates')
        .select("*")
        .eq('effective_year', currentYear)
        .order('type', { ascending: true })

      if (error) {
        console.error('Error fetching insurance rates:', error)
        throw error
      }

      // If no rates found for current year, return default rates
      if (!data || data.length === 0) {
        return [
          { id: 1, type: "individual", percentage: 0.028, effective_year: currentYear },
          { id: 2, type: "joint", percentage: 0.052, effective_year: currentYear }
        ] as InsuranceRate[]
      }

      // Cast to unknown first to avoid type mismatch error
      return data as unknown as InsuranceRate[]
    }
  })
}