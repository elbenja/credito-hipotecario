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

  // Query to fetch extra installments
  const { data: extraInstallments = [] } = useQuery<ExtraInstallment[]>({
    queryKey: ["extra-installments", amortizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("extra_installments")
        .select("*")
        .eq("amortization_id", amortizationId)
        .order("start_date", { ascending: true })

      if (error) {
        console.error("Error fetching extra installments:", error)
        return []
      }

      return data
    },
    enabled: !!amortizationId
  })

  // Query to fetch rate changes
  const { data: rateChanges = [] } = useQuery<RateChange[]>({
    queryKey: ["rate-changes", amortizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rate_changes")
        .select("*")
        .eq("amortization_id", amortizationId)
        .order("effective_date", { ascending: true })

      if (error) {
        console.error("Error fetching rate changes:", error)
        return []
      }

      return data
    },
    enabled: !!amortizationId
  })

  // Query to fetch scenario calculations
  const { data: scenarios = {}, isLoading } = useQuery<Scenarios>({
    queryKey: ["scenarios", amortizationId, extraInstallments, rateChanges],
    queryFn: async () => {
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

      const calculator = new ScenarioCalculator()

      // Calculate all scenarios
      const [regularScenario, acceleratedScenario, lowerPaymentScenario, newRateScenario] = await Promise.all([
        calculator.calculateScenario(amortizationInput, [], [], 'regular'),
        calculator.calculateScenario(amortizationInput, extraInstallments as ExtraInstallment[], [], 'accelerated'),
        calculator.calculateScenario(amortizationInput, extraInstallments as ExtraInstallment[], [], 'lower_payment'),
        calculator.calculateScenario(amortizationInput, [], rateChanges as RateChange[], 'new_rate')
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
    },
    enabled: !!amortizationId
  })

  return {
    scenarios,
    isLoading,
    extraInstallments,
    rateChanges
  }
} 