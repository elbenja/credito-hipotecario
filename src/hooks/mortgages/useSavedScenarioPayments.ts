import { useMemo } from "react";
import { useMortgageBundle, MortgageBundle } from "../useMortgageBundle";
import { ScenarioCalculator } from "@/utils/calculations/mortgage/scenarioCalculator";
import { ScenarioResult, Scenarios } from "@/types/common";

interface CalculateInput {
  loan_amount: number;
  interest_rate: number;
  term_years: number;
  installments_per_year: number;
  first_installment_date: Date;
  property_insurance: number;
  loan_insurance: number;
  extra_installments?: Array<{
    amount: number;
    frequency: 'one-time' | 'monthly' | 'yearly';
    start_date: string | Date;
  }>;
  rate_changes?: Array<{
    new_interest_rate: number;
    effective_date: Date | string;
    new_term_years?: number;
  }>;
}

/**
 * Transform MortgageBundle data to match ScenarioCalculator input interface
 */
function transformMortgageBundleToCalculateInput(bundle: MortgageBundle): CalculateInput {
 
  return {
    loan_amount: bundle.mortgage.loan_amount,
    interest_rate: bundle.mortgage.interest_rate,
    term_years: bundle.mortgage.term_years,
    installments_per_year: bundle.mortgage.installments_per_year,
    // first_installment_date: new Date(bundle.mortgage.first_installment_date),
    // this is the fix
    first_installment_date: new Date(bundle.mortgage.first_installment_date + 'T12:00:00Z'),
    property_insurance: bundle.mortgage.property.property_insurance || 0,
    loan_insurance: bundle.mortgage.loan_protection_insurance,
    extra_installments: bundle.extraInstallments?.map(ei => ({
      amount: ei.amount,
      frequency: ei.frequency as 'one-time' | 'monthly' | 'yearly',
      start_date: ei.start_date
    })) || [],
    rate_changes: bundle.newRates?.map(nr => ({
      // it works with the syntax errors
      new_interest_rate: nr.new_interest_rate,
      effective_date: nr.effective_date,
      new_term_years: nr.new_term_years ?? undefined
    })) || []
  };
}

/**
 * Calculate saved scenario payments from mortgage bundle
 */
function calculateSavedScenarioPayments(bundle: MortgageBundle): ScenarioResult | null {
  if (!bundle?.mortgage?.saved_scenario) {
    return null;
  }

  try {
    const input = transformMortgageBundleToCalculateInput(bundle);
    const scenarios = ScenarioCalculator.calculateScenarios(input);
    
    // Get the specific saved scenario
    const savedScenarioType = bundle.mortgage.saved_scenario as keyof Scenarios;
    
    // Validate that the scenario type exists
    if (!(savedScenarioType in scenarios)) {
      console.warn(`Invalid saved scenario type: ${savedScenarioType}`);
      return null;
    }

    return scenarios[savedScenarioType];
  } catch (error) {
    console.error('Error calculating saved scenario payments:', error);
    return null;
  }
}

interface UseSavedScenarioPaymentsResult {
  /** The calculated scenario result with payments and summary */
  scenarioResult: ScenarioResult | null;
  /** Just the payments array for convenience */
  payments: Array<any> | null;
  /** Summary data for the scenario */
  summary: {
    total_interest_and_insurance: number;
    total_months: number;
    monthly_payment: number;
    breakeven_point?: number | null;
  } | null;
  /** The saved scenario type (regular, accelerated, etc.) */
  savedScenarioType: string | null;
  /** Loading state from useMortgageBundle */
  isLoading: boolean;
  /** Error state from useMortgageBundle */
  error: Error | null;
  /** Whether the mortgage has a saved scenario */
  hasSavedScenario: boolean;
}

/**
 * Custom hook to get saved scenario payments for a mortgage
 * 
 * @param mortgageId - The ID of the mortgage to get saved scenario for
 * @returns Object containing scenario result, payments, summary, and metadata
 * 
 * @example
 * ```tsx
 * const { payments, summary, isLoading, savedScenarioType } = useSavedScenarioPayments("mortgage-123");
 * 
 * if (isLoading) return <Spinner />;
 * if (!payments) return <div>No saved scenario found</div>;
 * 
 * return (
 *   <div>
 *     <h3>Saved Scenario: {savedScenarioType}</h3>
 *     <p>Monthly Payment: {summary?.monthly_payment}</p>
 *     <PaymentTable payments={payments} />
 *   </div>
 * );
 * ```
 */
export const useSavedScenarioPayments = (mortgageId: string | null): UseSavedScenarioPaymentsResult => {
  const { data: bundle, isLoading, error } = useMortgageBundle(mortgageId);

  const result = useMemo(() => {
    if (!bundle) {
      return {
        scenarioResult: null,
        payments: null,
        summary: null,
        savedScenarioType: null,
        hasSavedScenario: false,
      };
    }

    const scenarioResult = calculateSavedScenarioPayments(bundle);
    const savedScenarioType = bundle.mortgage.saved_scenario;
    const hasSavedScenario = !!savedScenarioType;

    return {
      scenarioResult,
      payments: scenarioResult?.payments || null,
      summary: scenarioResult?.summary || null,
      savedScenarioType,
      hasSavedScenario,
    };
  }, [bundle]);

  return {
    ...result,
    isLoading,
    error,
  };
};

export default useSavedScenarioPayments; 