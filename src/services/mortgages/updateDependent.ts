import { supabase } from '@/integrations/supabase/client';
import { fetchMortgagesByProperty } from '@/services/mortgageServices';
import { fetchPropertyWithBonus } from '@/services/propertyService';
import { calculateLoanAmountSync } from '@/utils/calculations/mortgage/loan';
import { fetchExtraInstallments, fetchNewRates } from '@/services/mortgageServices';
import { ScenarioCalculator } from '@/utils/calculations/mortgage/scenarioCalculator';
import { RateChange } from '@/types/common';


export async function updateDependentMortgages(
  userId: string,
  propertyId: string
): Promise<void> {
  // 1) Fetch all child mortgages
  const mortgages = await fetchMortgagesByProperty(propertyId);
  if (mortgages.length === 0) return;

  // 2) Fetch the property (with bonus)
  const propertyWithBonus = await fetchPropertyWithBonus(userId, propertyId);

  // 3) Loop and recalc each mortgage
  await Promise.all(
    mortgages.map(async (m) => {
      // 3a) Calculate new loan amount
      const newLoanAmount = calculateLoanAmountSync(
        propertyWithBonus,
        m.down_payment,
        propertyWithBonus.bonus ?? 0
      );

      // 3b) Fetch extras & rates
      const [extraInstallments, newRates] = await Promise.all([
        fetchExtraInstallments(m.id),
        fetchNewRates(m.id),
      ]);

      // 3c) Convert NewRate[] to RateChange[] by handling null values and converting effective_date to Date
      const rateChanges: RateChange[] = newRates.map(rate => ({
        ...rate,
        // Transform null to undefined to satisfy RateChange type
        new_term_years: rate.new_term_years === null ? undefined : rate.new_term_years,
        // Convert effective_date string to Date object
        effective_date: new Date(rate.effective_date)
      }));

      // 3c) Compute scenarios
      const scenarios = ScenarioCalculator.calculateScenarios({
        loan_amount: newLoanAmount,
        interest_rate: m.interest_rate,
        term_years: m.term_years,
        installments_per_year: m.installments_per_year,
        first_installment_date: new Date(m.first_installment_date),
        property_insurance: propertyWithBonus.property_insurance || 0,
        loan_insurance: m.loan_protection_insurance,
        extra_installments: extraInstallments,
        rate_changes: rateChanges,
      });

      // 3d) Grab the saved scenario summary
      const key = m.saved_scenario as keyof typeof scenarios;
      const scenario = scenarios[key];

    // ←── ADD YOUR LOG HERE ──→
    // console.log(
    //   `Mortgage ${m.id}: newLoanAmount=${newLoanAmount.toFixed(2)}, ` +
    //   `totalInterestAndInsurance=${scenario.summary.total_interest_and_insurance.toFixed(2)}`
    // );

      // 4) Persist updates back to DB
      await supabase
        .from('mortgages')
        .update({
          loan_amount: newLoanAmount,
          saved_scenario_monthly_payment: scenario.summary.monthly_payment,
          saved_scenario_total_interest_and_insurance: scenario.summary.total_interest_and_insurance,
          saved_scenario_total_months: scenario.summary.total_months,
          saved_scenario_breakeven_point: scenario.summary.breakeven_point,
        })
        .eq('id', m.id);
    })
  );
}