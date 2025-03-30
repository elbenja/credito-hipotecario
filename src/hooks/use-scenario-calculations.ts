import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useEffect } from "react"
import { supabase } from "@/integrations/supabase/client"
import { useDebounce } from "./use-debounce"
import { ScenarioCalculator } from "@/services/amortization/services/scenarioCalculator"
import type { Database } from "@/types/supabase"
import { addMonths, startOfMonth } from "date-fns"

type ScenarioType = Database["public"]["Enums"]["scenario_type"]

interface PaymentRow {
  payment_date: Date
  capital: number
  interest: number
  property_insurance: number
  loan_insurance: number
  monthly_payment: number
  is_different_from_base: boolean
}

interface ExtraInstallment {
  id: string
  amount: number
  frequency: "monthly" | "one-time"
  start_date: string
}

interface RateChange {
  id: string
  new_interest_rate: number
  new_term_years: number
  effective_date: string
}

interface AmortizationInput {
  loan_amount: number
  interest_rate: number
  term_years: number
  installments_per_year: number
  first_installment_date: Date
  property_insurance: number
  loan_insurance: number
}

interface ScenarioSummaryResult {
  total_interest_and_insurance: number
  total_months: number
  monthly_payment: number
}

interface ScenarioResult {
  summary: ScenarioSummaryResult
  payments: PaymentRow[]
}

export interface UseScenarioCalculationsProps {
  amortizationId: string
  loanAmount: number
  interestRate: number
  termYears: number
  installmentsPerYear: number
  firstInstallmentDate?: Date
  propertyInsurance: number
  loanInsurance: number
}

export function useScenarioCalculations({
  amortizationId,
  loanAmount,
  interestRate,
  termYears,
  installmentsPerYear,
  firstInstallmentDate,
  propertyInsurance,
  loanInsurance
}: UseScenarioCalculationsProps) {
  const queryClient = useQueryClient();
  
  // Set up a subscription to changes in the new_rates table
  useEffect(() => {
    if (!amortizationId) return;
    
    // Create a subscription to the new_rates table
    const channel = supabase
      .channel(`scenario_new_rates_${amortizationId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'new_rates',
          filter: `amortization_id=eq.${amortizationId}`
        },
        (payload) => {
          // When there's a change, invalidate the scenario query
          queryClient.invalidateQueries({
            queryKey: ["scenarios", amortizationId]
          });
        }
      )
      .subscribe();
    
    // Clean up subscription when the component unmounts or amortizationId changes
    return () => {
      channel.unsubscribe();
    };
  }, [amortizationId, queryClient]);
  
  // Debounce all input values with a 500ms delay
  const debouncedLoanAmount = useDebounce(loanAmount, 500)
  const debouncedInterestRate = useDebounce(interestRate, 500)
  const debouncedTermYears = useDebounce(termYears, 500)
  const debouncedInstallmentsPerYear = useDebounce(installmentsPerYear, 500)
  const debouncedFirstInstallmentDate = useDebounce(firstInstallmentDate, 500)
  const debouncedPropertyInsurance = useDebounce(propertyInsurance, 500)
  const debouncedLoanInsurance = useDebounce(loanInsurance, 500)

  // Ensure we have a valid date before calling toISOString
  const firstInstallmentDateString = debouncedFirstInstallmentDate instanceof Date ? 
    debouncedFirstInstallmentDate.toISOString() : 
    new Date().toISOString()

  return useQuery({
    queryKey: [
      "scenarios",
      amortizationId,
      debouncedLoanAmount,
      debouncedInterestRate,
      debouncedTermYears,
      debouncedInstallmentsPerYear,
      firstInstallmentDateString,
      debouncedPropertyInsurance,
      debouncedLoanInsurance
    ],
    queryFn: async () => {
      // Fetch extra installments and rate changes from Supabase
      const [extraInstallmentsResult, newRatesResult] = await Promise.all([
        supabase
          .from("extra_installments")
          .select("*")
          .eq("amortization_id", amortizationId)
          .order("start_date", { ascending: true }),
        supabase
          .from("new_rates")
          .select("*")
          .eq("amortization_id", amortizationId)
          .order("effective_date", { ascending: true })
      ])

      if (extraInstallmentsResult.error) throw extraInstallmentsResult.error
      if (newRatesResult.error) throw newRatesResult.error

      // Improved handling of extra installments to preserve exact dates
      const extraInstallments = extraInstallmentsResult.data.map(ei => {
        // Keep the original string format for YYYY-MM-DD dates
        if (typeof ei.start_date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(ei.start_date)) {
          // Return the date in its original string format to avoid any conversion issues
          return {
            amount: ei.amount,
            frequency: ei.frequency,
            start_date: ei.start_date // Keep as string
          };
        } else {
          // For non-standard formats, create a normalized date string
          const tempDate = new Date(ei.start_date);
          const year = tempDate.getFullYear();
          const month = tempDate.getMonth() + 1; // Convert to 1-based
          const day = tempDate.getDate();
          const dateString = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          
          return {
            amount: ei.amount,
            frequency: ei.frequency,
            start_date: dateString
          };
        }
      });

      // Improved handling of rate changes to preserve exact dates
      const rateChanges = newRatesResult.data.map(rc => {
        let effectiveDate;
        
        // Check if the date is already in ISO format (YYYY-MM-DD or with T)
        if (typeof rc.effective_date === 'string') {
          // Handle different date formats
          if (rc.effective_date.includes('T')) {
            // ISO format with time component - extract just the date part
            effectiveDate = rc.effective_date.split('T')[0];
          } else if (/^\d{4}-\d{2}-\d{2}$/.test(rc.effective_date)) {
            // Already in YYYY-MM-DD format
            effectiveDate = rc.effective_date;
          } else {
            // Other string format - parse and reformat
            const date = new Date(rc.effective_date);
            effectiveDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
          }
        } else if (rc.effective_date instanceof Date) {
          // Direct Date object
          effectiveDate = `${rc.effective_date.getFullYear()}-${String(rc.effective_date.getMonth() + 1).padStart(2, '0')}-${String(rc.effective_date.getDate()).padStart(2, '0')}`;
        } else {
          // Handle unexpected case
          console.error("Invalid date format in rate change:", rc.effective_date);
          // Use current date as fallback
          const today = new Date();
          effectiveDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
        }
        
        return {
          id: rc.id,
          amortization_id: rc.amortization_id,
          new_interest_rate: rc.new_interest_rate,
          new_term_years: rc.new_term_years,
          effective_date: effectiveDate,
          created_at: rc.created_at,
          updated_at: rc.updated_at,
          new_balance: rc.new_balance
        };
      });

      // Calculate all scenarios using the static method
      const scenarios = ScenarioCalculator.calculateScenarios({
        loan_amount: debouncedLoanAmount,
        interest_rate: debouncedInterestRate,
        term_years: debouncedTermYears,
        installments_per_year: debouncedInstallmentsPerYear,
        first_installment_date: debouncedFirstInstallmentDate || new Date(),
        property_insurance: debouncedPropertyInsurance,
        loan_insurance: debouncedLoanInsurance,
        extra_installments: extraInstallments,
        rate_changes: rateChanges
      })

      // If there are no rate changes, the new_rate scenario should be the same as regular
      const hasNewRates = rateChanges && rateChanges.length > 0
      const newRateScenario = hasNewRates && scenarios.new_rate?.summary && 
        typeof scenarios.new_rate.summary.total_months === 'number' && 
        scenarios.new_rate.summary.total_months > 0
          ? scenarios.new_rate
          : scenarios.regular

      return {
        regular: scenarios.regular,
        accelerated: scenarios.accelerated,
        lower_payment: scenarios.lower_payment,
        new_rate: newRateScenario
      }
    },
    staleTime: 0, // Consider data as stale immediately
    gcTime: 0, // Don't cache the data
    refetchOnMount: true, // Refetch when component mounts
    refetchOnWindowFocus: true, // Refetch when window regains focus
    enabled: !!amortizationId // Only run query when we have an amortization ID
  })
} 