import { useQuery } from "@tanstack/react-query"
import { supabase } from "@/integrations/supabase/client"
import { ScenarioCalculator, type ScenarioType } from "@/services/amortization/calculations/scenario-calculator"
import type { Database } from "@/types/supabase"

type ExtraInstallment = Database['public']['Tables']['extra_installments']['Row']
type RateChange = Database['public']['Tables']['rate_changes']['Row']

interface UseScenarioCalculationsProps {
  amortizationId: string
  loan_amount: number
  interest_rate: number
  term_years: number
  installments_per_year: number
  first_installment_date: string
  property_insurance: number
  loan_insurance: number
}

interface PaymentRow {
  payment_date: string | Date
  capital: number
  interest: number
  property_insurance: number
  loan_insurance: number
  monthly_payment: number
  is_different_from_base: boolean
}

interface ScenarioSummary {
  total_interest_and_insurance: number
  total_months: number
  monthly_payment: number
}

interface Scenario {
  summary: ScenarioSummary
  payments: PaymentRow[]
}

interface Scenarios {
  regular?: Scenario
  accelerated?: Scenario
  lower_payment?: Scenario
  new_rate?: Scenario
}

export function useScenarioCalculations({
  amortizationId,
  loan_amount,
  interest_rate,
  term_years,
  installments_per_year,
  first_installment_date,
  property_insurance,
  loan_insurance
}: UseScenarioCalculationsProps) {
  const calculator = new ScenarioCalculator()

  const { data: scenarios = {}, isLoading, error } = useQuery<Scenarios>({
    queryKey: ["scenarios", amortizationId],
    queryFn: async () => {
      // Fetch extra installments
      const { data: extraInstallments, error: extraInstallmentsError } = await supabase
        .from("extra_installments")
        .select("*")
        .eq("amortization_id", amortizationId)
        .order("payment_date", { ascending: true })

      if (extraInstallmentsError) {
        console.error("Error fetching extra installments:", extraInstallmentsError)
        throw extraInstallmentsError
      }

      // Fetch rate changes
      const { data: rateChanges, error: rateChangesError } = await supabase
        .from("refinancing_options")
        .select("*")
        .eq("amortization_id", amortizationId)
        .order("change_date", { ascending: true })

      if (rateChangesError) {
        console.error("Error fetching rate changes:", rateChangesError)
        throw rateChangesError
      }

      const amortizationInput = {
        id: amortizationId,
        loan_amount,
        interest_rate,
        term_years,
        installments_per_year,
        first_installment_date,
        property_insurance,
        loan_insurance
      }

      try {
        // Calculate all scenarios
        const [regularScenario, acceleratedScenario, lowerPaymentScenario, newRateScenario] = await Promise.all([
          calculator.calculateScenario(amortizationInput, [], [], 'regular'),
          calculator.calculateScenario(amortizationInput, extraInstallments || [], [], 'accelerated'),
          calculator.calculateScenario(amortizationInput, extraInstallments || [], [], 'lower_payment'),
          calculator.calculateScenario(amortizationInput, [], rateChanges || [], 'new_rate')
        ])

        const allScenarios = {
          regular: regularScenario,
          accelerated: acceleratedScenario,
          lower_payment: lowerPaymentScenario,
          new_rate: newRateScenario
        }

        // Store all scenarios in one transaction
        await calculator.storeScenarios(amortizationInput, allScenarios)

        return allScenarios
      } catch (error) {
        console.error("Error calculating scenarios:", error)
        throw error
      }
    },
    enabled: !!amortizationId
  })

  return {
    scenarios,
    isLoading,
    error
  }
} 