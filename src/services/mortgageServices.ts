// src/services/mortgageService.ts
import { useQuery } from '@tanstack/react-query';
import { supabase }   from '@/integrations/supabase/client';
import type { Mortgage } from '@/types/mortgage';
import type { ExtraInstallment } from "@/types/mortgage";

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

// src/services/mortgageService.ts

/**
 * Fetch all extra_installments rows for a mortgage.
 * @param mortgageId - UUID of the mortgage
 * @returns an array of ExtraInstallment records
 */
export async function fetchExtraInstallments(
  mortgageId: string
): Promise<ExtraInstallment[]> {
  const { data, error } = await supabase
    .from("extra_installments")
    .select("*")
    .eq("mortgage_id", mortgageId)
    .order("start_date", { ascending: true });

  if (error) {
    console.error("Error fetching extra installments:", error);
    throw error;
  }

  return data ?? [];
}

// src/services/mortgageService.ts

import type { NewRate } from '@/types/mortgage';

/**
 * Fetch all new_rates rows for a given mortgage.
 * @param mortgageId - UUID of the mortgage
 * @returns an array of NewRate records
 */
export async function fetchNewRates(
  mortgageId: string
): Promise<NewRate[]> {
  const { data, error } = await supabase
    .from('new_rates')
    .select('*')
    .eq('mortgage_id', mortgageId)
    .order('effective_date', { ascending: true });

  if (error) {
    console.error('Error fetching new rates:', error);
    throw error;
  }

  return data ?? [];
}