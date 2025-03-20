import { useQuery } from "@tanstack/react-query"
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

interface UseScenarioCalculationsProps {
  amortizationId: string
  loanAmount: number
  interestRate: number
  termYears: number
  installmentsPerYear: number
  firstInstallmentDate: Date
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
  // Debounce all input values with a 500ms delay
  const debouncedLoanAmount = useDebounce(loanAmount, 500)
  const debouncedInterestRate = useDebounce(interestRate, 500)
  const debouncedTermYears = useDebounce(termYears, 500)
  const debouncedInstallmentsPerYear = useDebounce(installmentsPerYear, 500)
  const debouncedFirstInstallmentDate = useDebounce(firstInstallmentDate, 500)
  const debouncedPropertyInsurance = useDebounce(propertyInsurance, 500)
  const debouncedLoanInsurance = useDebounce(loanInsurance, 500)

  return useQuery({
    queryKey: [
      "scenarios",
      amortizationId,
      debouncedLoanAmount,
      debouncedInterestRate,
      debouncedTermYears,
      debouncedInstallmentsPerYear,
      debouncedFirstInstallmentDate.toISOString(),
      debouncedPropertyInsurance,
      debouncedLoanInsurance
    ],
    queryFn: async () => {
      // Fetch extra installments and rate changes from Supabase
      const [extraInstallmentsResult, rateChangesResult] = await Promise.all([
        supabase
          .from("extra_installments")
          .select("*")
          .eq("amortization_id", amortizationId)
          .order("start_date", { ascending: true }),
        supabase
          .from("rate_changes")
          .select("*")
          .eq("amortization_id", amortizationId)
          .order("effective_date", { ascending: true })
      ])

      if (extraInstallmentsResult.error) throw extraInstallmentsResult.error
      if (rateChangesResult.error) throw rateChangesResult.error

      const extraInstallments = extraInstallmentsResult.data.map(ei => ({
        amount: ei.amount,
        frequency: ei.frequency,
        start_date: new Date(ei.start_date)
      }))

      const rateChanges = rateChangesResult.data.map(rc => ({
        new_interest_rate: rc.new_interest_rate,
        new_term_years: rc.new_term_years,
        effective_date: new Date(rc.effective_date)
      }))

      // Calculate all scenarios using the static method
      const scenarios = ScenarioCalculator.calculateScenarios({
        loan_amount: debouncedLoanAmount,
        interest_rate: debouncedInterestRate,
        term_years: debouncedTermYears,
        installments_per_year: debouncedInstallmentsPerYear,
        first_installment_date: debouncedFirstInstallmentDate,
        property_insurance: debouncedPropertyInsurance,
        loan_insurance: debouncedLoanInsurance,
        extra_installments: extraInstallments,
        rate_changes: rateChanges
      })

      return {
        regular: scenarios.regular,
        accelerated: scenarios.accelerated,
        lower_payment: scenarios.lower_payment,
        new_rate: scenarios.new_rate
      }
    },
    gcTime: 1000 * 60 * 30, // Cache for 30 minutes
    staleTime: 0, // Always calculate fresh scenarios
    refetchOnWindowFocus: false // Don't refetch when window regains focus
  })
} 