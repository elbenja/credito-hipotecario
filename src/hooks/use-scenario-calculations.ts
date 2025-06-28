import { useQuery } from "@tanstack/react-query"
import { fetchExtraInstallments, fetchNewRates } from "@/services/mortgageServices"
import { ScenarioCalculator } from "@/utils/calculations/mortgage/scenarioCalculator"
import { useMortgageDraftStore, MortgageDraft } from "@/store/mortgage/store"
import { PaymentRow, ScenarioResult, ScenarioSummaryResult, Scenarios, RateChange } from "@/types/common"
import { useMemo } from "react"
import { 
  getEffectiveTermMonths, 
  convertTermToMonths 
} from "@/utils/term-conversion";

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
  const mortgageDraft = useMortgageDraftStore((s) => s.mortgageDraft) as MortgageDraft;

  const stableInputs = useMemo(() => {
    if (!mortgageDraft) return null;

    const {
      id,
      loan_amount,
      interest_rate,
      term_years,
      term_months,
      installments_per_year,
      first_installment_date,
      property,
      loan_protection_insurance,
    } = mortgageDraft;

    // Enhanced: Use term_months with fallback to term_years
    const effectiveTermMonths = getEffectiveTermMonths(
      term_months, 
      parseFloat(term_years || "20")
    );

    return {
      id,
      loan_amount,
      interest_rate,
      term_years: parseFloat(term_years || "20"),
      term_months: effectiveTermMonths,
      installments_per_year,
      first_installment_date: first_installment_date?.toISOString(),
      property_insurance: property?.property_insurance,
      loan_insurance: loan_protection_insurance,
    };
  }, [mortgageDraft]);

  return useQuery<Scenarios, Error>({
    enabled: !!stableInputs,
    queryKey: ["scenarios", stableInputs],
    queryFn: async () => {
      if (!mortgageDraft?.id) return getDefaultScenarios();

      const [extraInstallments, newRates] = await Promise.all([
        fetchExtraInstallments(mortgageDraft.id),
        fetchNewRates(mortgageDraft.id),
      ]);

      // Enhanced: Use term_months with fallback to term_years
      const effectiveTermMonths = getEffectiveTermMonths(
        mortgageDraft.term_months,
        parseFloat(mortgageDraft.term_years || "20")
      );

      return ScenarioCalculator.calculateScenarios({
        loan_amount: mortgageDraft.loan_amount || 0,
        interest_rate: parseFloat(mortgageDraft.interest_rate || "0"),
        term_years: parseFloat(mortgageDraft.term_years || "20"),
        term_months: effectiveTermMonths,
        installments_per_year: parseInt(mortgageDraft.installments_per_year || "12"),
        first_installment_date: mortgageDraft.first_installment_date!,
        property_insurance: mortgageDraft.property?.property_insurance || 0,
        loan_insurance: parseFloat(mortgageDraft.loan_protection_insurance || "0"),
        extra_installments: extraInstallments,
        rate_changes: newRates as unknown as RateChange[],
      });
    },
    // enabled: Boolean(mortgageDraft?.id),
    staleTime: 30000,
    gcTime: 300000,
    refetchOnWindowFocus: false,
  });
}