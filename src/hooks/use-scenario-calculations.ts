import { useQuery } from "@tanstack/react-query"
import { fetchExtraInstallments, fetchNewRates } from "@/services/mortgageServices"
import { ScenarioCalculator } from "@/utils/calculations/mortgage/scenarioCalculator"
import { useMortgageDraftStore, MortgageDraft } from "@/store/mortgage/store"
import { PaymentRow, ScenarioResult, ScenarioSummaryResult, Scenarios, RateChange } from "@/types/common"

// Default empty scenarios to prevent UI crashes
function getDefaultScenarios(): Scenarios {
  const defaultSummary: ScenarioSummaryResult = {
    total_interest_and_insurance: 0,
    total_months: 0,
    monthly_payment: 0,
    breakeven_point: 0
  };
  
  const defaultScenario: ScenarioResult = {
    summary: defaultSummary,
    payments: []
  };
  
  return {
    regular: defaultScenario,
    accelerated: defaultScenario,
    lower_payment: defaultScenario,
    new_rate: defaultScenario
  };
}

export function useScenarioCalculations() {
  const {
    id: mortgageId,
    loan_amount,
    interest_rate,
    term_years,
    installments_per_year,
    first_installment_date,
    property: { property_insurance } = {},
    loan_protection_insurance: loan_insurance,
  } = useMortgageDraftStore((s) => s.mortgageDraft || {}) as MortgageDraft;

  return useQuery<Scenarios, Error>({
    queryKey: [
      "scenarios",
      mortgageId,
      loan_amount,
      interest_rate,
      term_years,
      installments_per_year,
      first_installment_date?.toISOString(),
      property_insurance,
      loan_insurance
    ],
    queryFn: async () => {
      if (!mortgageId) return getDefaultScenarios();

      const [extraInstallments, newRates] = await Promise.all([
        fetchExtraInstallments(mortgageId),
        fetchNewRates(mortgageId),
      ]);

      return ScenarioCalculator.calculateScenarios({
        loan_amount: typeof loan_amount === 'string' ? parseFloat(loan_amount) : loan_amount || 0,
        interest_rate: typeof interest_rate === 'string' ? parseFloat(interest_rate) : interest_rate || 0,
        term_years: typeof term_years === 'string' ? parseFloat(term_years) : term_years || 0,
        installments_per_year: typeof installments_per_year === 'string' ? parseFloat(installments_per_year) : installments_per_year || 12,
        first_installment_date: first_installment_date!,
        property_insurance: property_insurance || 0,
        loan_insurance: typeof loan_insurance === 'string' ? parseFloat(loan_insurance) : loan_insurance || 0,
        extra_installments: extraInstallments,
        rate_changes: newRates as unknown as RateChange[],
      });
    },
    enabled: Boolean(mortgageId),
    staleTime: 30000,
    gcTime: 300000,
    refetchOnWindowFocus: false,
  });
}