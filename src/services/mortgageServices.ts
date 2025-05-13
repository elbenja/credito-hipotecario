// src/services/mortgageService.ts
import { useQuery } from '@tanstack/react-query';
import { supabase }   from '@/integrations/supabase/client';
import type { Mortgage } from '@/types/mortgage';


/**
 * Fetches all mortgages for a given property.
 * @param propertyId - UUID of the property
 */
export async function fetchMortgagesByProperty(propertyId: string): Promise<Mortgage[]> {
  const { data, error } = await supabase
    .from('mortgages')
    .select(
      [

        'id',
        'name',
        'loan_amount',
        'down_payment',
        'interest_rate',
        'term_years',
        'installments_per_year',
        'loan_protection_type',
        'loan_protection_insurance',
        'first_installment_date',
        'saved_scenario',
        'saved_scenario_total_interest_and_insurance',
        'saved_scenario_total_months',
        'saved_scenario_monthly_payment',
        'saved_scenario_breakeven_point',
        'property_id'
      ].join(', ')
    )
    .eq('property_id', propertyId);

  if (error) throw error;
  return data as unknown as Mortgage[];
}

/**
 * React Query hook to load mortgages by property.
 */
export function useMortgagesByProperty(propertyId?: string | null) {
  return useQuery<Mortgage[], Error>({
    queryKey: ['mortgages', propertyId],
    queryFn: async () => {
      if (!propertyId) {
        return [];
      }
      return fetchMortgagesByProperty(propertyId);
    },
    enabled: Boolean(propertyId),
    staleTime: 5 * 60 * 1000,      // 5 minutes
    gcTime: 30 * 60 * 1000,     // 30 minutes
    refetchOnWindowFocus: false,
  });
}