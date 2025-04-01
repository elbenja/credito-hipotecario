import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useEffect, useMemo } from "react"
import { supabase } from "@/integrations/supabase/client"
import { useDebounce } from "./use-debounce"
import { ScenarioCalculator } from "@/services/amortization/services/scenarioCalculator"
import type { Database } from "@/types/supabase"
import { addMonths, startOfMonth } from "date-fns"
import { PaymentRow, ScenarioResult, ScenarioSummaryResult, Scenarios } from "@/services/amortization/types/common"

type ScenarioType = Database["public"]["Enums"]["scenario_type"]

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
  
  // Batch all inputs into a single object for debouncing
  // This reduces the number of re-renders and recalculations
  const inputs = useMemo(() => ({
    loanAmount,
    interestRate,
    termYears,
    installmentsPerYear,
    firstInstallmentDate,
    propertyInsurance,
    loanInsurance
  }), [
    loanAmount,
    interestRate,
    termYears,
    installmentsPerYear,
    firstInstallmentDate,
    propertyInsurance,
    loanInsurance
  ]);
  
  // Debounce the entire inputs object at once
  const debouncedInputs = useDebounce(inputs, 500);
  
  // Extract values from debounced inputs for easier use
  const {
    loanAmount: debouncedLoanAmount,
    interestRate: debouncedInterestRate,
    termYears: debouncedTermYears,
    installmentsPerYear: debouncedInstallmentsPerYear,
    firstInstallmentDate: debouncedFirstInstallmentDate,
    propertyInsurance: debouncedPropertyInsurance,
    loanInsurance: debouncedLoanInsurance
  } = debouncedInputs;

  // Ensure we have a valid date before calling toISOString
  const firstInstallmentDateString = useMemo(() => {
    if (!(debouncedFirstInstallmentDate instanceof Date)) {
      return new Date().toISOString();
    }
    return debouncedFirstInstallmentDate.toISOString();
  }, [debouncedFirstInstallmentDate]);

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

      const result = {
        regular: scenarios.regular,
        accelerated: scenarios.accelerated,
        lower_payment: scenarios.lower_payment,
        new_rate: newRateScenario
      };


      return result;
    },
    staleTime: 30000, // Add a reasonable staleTime to prevent frequent refetches
    gcTime: 300000, // Increase gcTime to keep data in cache longer
    refetchOnMount: true,
    refetchOnWindowFocus: false, // Disable refetch on window focus to reduce unnecessary calls
    enabled: !!amortizationId
  })
} 