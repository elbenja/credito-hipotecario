import { useMemo } from "react";
import { useMortgageBundle, MortgageBundle } from "../useMortgageBundle";
import { ScenarioCalculator } from "@/utils/calculations/mortgage/scenarioCalculator";
import { ScenarioResult, Scenarios, RateChange } from "@/types/common";
import { ExtraInstallment } from "@/types/mortgage";

interface CalculateInput {
  loan_amount: number;
  interest_rate: number;
  term_years: number;
  term_months?: number | null;
  installments_per_year: number;
  first_installment_date: Date;
  property_insurance: number;
  loan_insurance: number;
  extra_installments?: ExtraInstallment[];
  rate_changes?: RateChange[];
}

/**
 * Enhanced version of calculateSavedScenarioPayments with term_months support
 */
const calculateSavedScenarioPayments = (bundle: MortgageBundle): Scenarios => {
  if (!bundle?.mortgage) {
    throw new Error('No mortgage data available');
  }

  // Enhanced: Use term_months from mortgage data with fallback to term_years
  const input: CalculateInput = {
    loan_amount: bundle.mortgage.loan_amount,
    interest_rate: bundle.mortgage.interest_rate,
    term_years: bundle.mortgage.term_years,
    term_months: bundle.mortgage.term_months,
    installments_per_year: bundle.mortgage.installments_per_year,
    first_installment_date: new Date(bundle.mortgage.first_installment_date + 'T12:00:00Z'),
    property_insurance: bundle.mortgage.property?.property_insurance || 0,
    loan_insurance: bundle.mortgage.loan_protection_insurance,
    extra_installments: bundle.extraInstallments?.map(ei => ({
      id: ei.id,
      amortization_id: ei.mortgage_id,
      amount: ei.amount,
      frequency: ei.frequency as 'monthly' | 'one-time',
      start_date: ei.start_date,
      created_at: '',
      updated_at: ''
    })) || [],
    rate_changes: bundle.newRates?.map(nr => ({
      id: nr.id,
      mortgage_id: nr.mortgage_id,
      amortization_id: nr.mortgage_id,
      new_interest_rate: nr.new_interest_rate,
      effective_date: new Date(nr.effective_date),
      new_term_years: nr.new_term_years,
      created_at: '',
      updated_at: '',
      new_balance: undefined
    })) || []
  };

  const scenarios = ScenarioCalculator.calculateScenarios(input);
  return scenarios;
};

/**
 * Hook to get calculated scenario payments for a saved mortgage
 * Enhanced with term_months precision support
 */
export const useSavedScenarioPayments = (mortgageId: string | null): any => {
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

    try {
      const scenarios = calculateSavedScenarioPayments(bundle);
      const savedScenarioType = bundle.mortgage.saved_scenario;
      const hasSavedScenario = !!savedScenarioType;

      // Get the specific saved scenario
      const scenarioResult = savedScenarioType && savedScenarioType in scenarios 
        ? scenarios[savedScenarioType as keyof Scenarios]
        : scenarios.regular; // Default to regular if no saved scenario

      return {
        scenarioResult,
        payments: scenarioResult?.payments || null,
        summary: scenarioResult?.summary || null,
        savedScenarioType,
        hasSavedScenario,
      };
    } catch (error) {
      console.error('Error calculating scenarios:', error);
      return {
        scenarioResult: null,
        payments: null,
        summary: null,
        savedScenarioType: null,
        hasSavedScenario: false,
      };
    }
  }, [bundle]);

  return {
    ...result,
    isLoading,
    error,
  };
};

export default useSavedScenarioPayments; 