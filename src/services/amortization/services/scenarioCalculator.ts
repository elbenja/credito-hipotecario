import { GoalSeekService } from "./goalSeek"
import { FixedPaymentsService } from "./fixedPayments"
import type { Scenarios, ScenarioSummary, PaymentRow } from "../types/common"

interface ExtraInstallment {
  amount: number
  frequency: 'one-time' | 'monthly' | 'yearly'
  start_date: Date
}

interface RateChange {
  new_interest_rate: number
  new_term_years?: number
  effective_date: Date
}

interface CalculateInput {
  loan_amount: number
  interest_rate: number
  term_years: number
  installments_per_year: number
  first_installment_date: Date
  property_insurance: number
  loan_insurance: number
  extra_installments?: ExtraInstallment[]
  rate_changes?: RateChange[]
}

/**
 * ScenarioCalculator Service
 * Coordinates between GoalSeek and FixedPayments services to generate all scenarios
 */
export class ScenarioCalculator {
  /**
   * Calculate all scenarios for given loan parameters
   */
  static calculateScenarios(input: CalculateInput): Scenarios {
    const {
      loan_amount,
      interest_rate,
      term_years,
      installments_per_year,
      first_installment_date,
      property_insurance,
      loan_insurance,
      extra_installments = [],
      rate_changes = []
    } = input

    console.log('\n===== SCENARIO CALCULATOR =====');
    console.log(`Loan amount: ${loan_amount}`);
    console.log(`Interest rate: ${interest_rate}`);
    console.log(`Term years: ${term_years}`);
    console.log(`Installments per year: ${installments_per_year}`);
    console.log(`First installment date: ${first_installment_date.toISOString()}`);
    console.log(`Extra installments count: ${extra_installments.length}`);
    console.log(`Rate changes count: ${rate_changes.length}`);
    
    // Calculate regular scenario first as other scenarios depend on it
    const regularScenario = this.calculateRegularScenario(
      loan_amount,
      interest_rate,
      term_years,
      installments_per_year,
      property_insurance,
      loan_insurance,
      first_installment_date
    )

    // If no extra installments or rate changes, all scenarios should be identical to regular
    if ((extra_installments.length === 0) && (rate_changes.length === 0)) {
      console.log('No extra installments or rate changes - all scenarios will be identical to regular');
      return {
        regular: regularScenario,
        accelerated: regularScenario, // Use identical data
        lower_payment: regularScenario, // Use identical data
        new_rate: regularScenario // Use identical data
      };
    }

    // Calculate other scenarios
    const acceleratedScenario = this.calculateAcceleratedScenario(
      loan_amount,
      regularScenario.summary.monthly_payment,
      interest_rate,
      term_years,
      installments_per_year,
      property_insurance,
      loan_insurance,
      extra_installments,
      first_installment_date
    )

    const lowerPaymentScenario = this.calculateLowerPaymentScenario(
      loan_amount,
      interest_rate,
      term_years,
      installments_per_year,
      property_insurance,
      loan_insurance,
      extra_installments,
      first_installment_date
    )

    const newRateScenario = this.calculateNewRateScenario(
      loan_amount,
      interest_rate,
      term_years,
      installments_per_year,
      property_insurance,
      loan_insurance,
      rate_changes,
      first_installment_date
    )

    return {
      regular: regularScenario,
      accelerated: acceleratedScenario,
      lower_payment: lowerPaymentScenario,
      new_rate: newRateScenario
    }
  }

  /**
   * Calculate regular scenario with fixed payments
   */
  private static calculateRegularScenario(
    amount: number,
    interest: number,
    termYears: number,
    installmentsPerYear: number,
    propertyInsurance: number,
    loanInsurance: number,
    firstInstallmentDate?: Date
  ) {
    console.log(`[ScenarioCalculator] calculateRegularScenario with first_installment_date: ${firstInstallmentDate?.toISOString() || 'not provided'}`);
    
    const result = GoalSeekService.calculate({
      amount,
      months: termYears * 12,
      yearly_interest_rate: interest,
      installments_per_year: installmentsPerYear,
      property_insurance: propertyInsurance,
      loan_protection_insurance: loanInsurance,
      first_installment_date: firstInstallmentDate
    })

    return {
      summary: this.calculateSummary(result.payments),
      payments: result.payments
    }
  }

  /**
   * Calculate accelerated scenario with extra payments
   */
  private static calculateAcceleratedScenario(
    amount: number,
    baseInstallment: number,
    interest: number,
    termYears: number,
    installmentsPerYear: number,
    propertyInsurance: number,
    loanInsurance: number,
    extraInstallments: ExtraInstallment[],
    firstInstallmentDate: Date
  ) {
    console.log('\n===== ACCELERATED SCENARIO CALCULATION =====');
    console.log(`Loan amount: ${amount}`);
    console.log(`Base installment: ${baseInstallment}`);
    console.log(`Extra installments: ${extraInstallments.length}`);
    
    // If no extra installments, return same as regular scenario
    if (!extraInstallments || extraInstallments.length === 0) {
      console.log('[ScenarioCalculator] No extra installments for accelerated scenario, using regular calculation');
      return this.calculateRegularScenario(
        amount,
        interest,
        termYears,
        installmentsPerYear,
        propertyInsurance,
        loanInsurance,
        firstInstallmentDate
      );
    }
    
    // Use the provided first installment date
    console.log(`Using first installment date: ${firstInstallmentDate.toISOString()}`);
    
    // Log each extra installment for debugging
    extraInstallments.forEach((installment, i) => {
      const date = new Date(installment.start_date);
      const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      console.log(`Extra installment #${i+1}: ${installment.amount} (${installment.frequency}) on ${dateStr}`);
      console.log(`Is first of month? ${date.getDate() === 1 ? 'YES' : 'NO'}`);
    });
    
    // Make sure we're not modifying original dates
    const processedInstallments = extraInstallments.map(inst => {
      // Log original state
      console.log(`Processing installment: Original frequency "${inst.frequency}", date ${new Date(inst.start_date).toISOString()}`);
      
      // Create processed version
      const result = {
        ...inst,
        // Ensure we have actual Date objects
        start_date: inst.start_date instanceof Date ? 
          new Date(inst.start_date.getTime()) : 
          new Date(inst.start_date)
      };
      
      // Log mapped state
      console.log(`  -> Mapped to: frequency "${result.frequency}", date ${result.start_date.toISOString()}`);
      
      return result;
    });
    
    console.log(`Sending ${processedInstallments.length} installments to FixedPaymentsService`);
    processedInstallments.forEach((inst, i) => {
      console.log(`Installment #${i+1}: ${inst.amount} (${inst.frequency}) on ${inst.start_date.toISOString()}`);
    });
    
    const result = FixedPaymentsService.calculate({
      amount,
      base_installment: baseInstallment,
      interest,
      installments_per_year: installmentsPerYear,
      property_insurance: propertyInsurance,
      loan_protection_insurance: loanInsurance,
      extra_installments: processedInstallments,
      first_installment_date: firstInstallmentDate // Pass the first installment date
    });
    
    console.log(`Result: ${result.new_remaining_months} months (down from ${result.total_months})`);
    
    return {
      summary: this.calculateSummary(result.payments),
      payments: result.payments
    }
  }

  /**
   * Calculate lower payment scenario with extra lump sum
   */
  private static calculateLowerPaymentScenario(
    amount: number,
    interest: number,
    termYears: number,
    installmentsPerYear: number,
    propertyInsurance: number,
    loanInsurance: number,
    extraInstallments: ExtraInstallment[],
    firstInstallmentDate?: Date
  ) {
    // If no extra installments, return same as regular scenario
    if (!extraInstallments || extraInstallments.length === 0) {
      console.log('[ScenarioCalculator] No extra installments for lower payment scenario, using regular calculation');
      return this.calculateRegularScenario(
        amount,
        interest,
        termYears,
        installmentsPerYear,
        propertyInsurance,
        loanInsurance,
        firstInstallmentDate
      );
    }

    // First, calculate total extra payments
    let totalExtra = 0
    for (const extra of extraInstallments) {
      switch (extra.frequency) {
        case 'once':
          totalExtra += extra.amount
          break
        case 'monthly':
          // Calculate months from start date until end of term
          const startDate = new Date(extra.start_date)
          const monthsRemaining = termYears * 12 - startDate.getMonth()
          totalExtra += extra.amount * monthsRemaining
          break
        case 'yearly':
          // Calculate years from start date until end of term
          const yearsRemaining = termYears - new Date(extra.start_date).getFullYear() + 1
          totalExtra += extra.amount * yearsRemaining
          break
      }
    }

    // Reduce loan amount by total extra payments
    const adjustedAmount = amount - totalExtra

    // Calculate new payment based on adjusted amount
    const result = GoalSeekService.calculate({
      amount: adjustedAmount,
      months: termYears * 12,
      yearly_interest_rate: interest,
      installments_per_year: installmentsPerYear,
      property_insurance: propertyInsurance,
      loan_protection_insurance: loanInsurance,
      first_installment_date: firstInstallmentDate
    })

    return {
      summary: this.calculateSummary(result.payments),
      payments: result.payments
    }
  }

  /**
   * Calculate new rate scenario with rate changes
   */
  private static calculateNewRateScenario(
    amount: number,
    interest: number,
    termYears: number,
    installmentsPerYear: number,
    propertyInsurance: number,
    loanInsurance: number,
    rateChanges: RateChange[],
    firstInstallmentDate?: Date
  ) {
    if (rateChanges.length === 0) {
      return undefined
    }

    // Sort rate changes by effective date
    const sortedChanges = [...rateChanges].sort((a, b) => 
      new Date(a.effective_date).getTime() - new Date(b.effective_date).getTime()
    )

    let currentAmount = amount
    let currentInterest = interest
    let payments: PaymentRow[] = []
    let pastMonths = 0

    // Process each rate change
    for (const change of sortedChanges) {
      const effectiveDate = new Date(change.effective_date)
      const monthsUntilChange = this.monthsDifference(new Date(), effectiveDate)

      // Calculate payments until rate change
      const result = GoalSeekService.calculate({
        amount: currentAmount,
        months: monthsUntilChange,
        yearly_interest_rate: currentInterest,
        installments_per_year: installmentsPerYear,
        property_insurance: propertyInsurance,
        loan_protection_insurance: loanInsurance,
        past_months: pastMonths,
        first_installment_date: firstInstallmentDate
      })

      payments = [...payments, ...result.payments]
      currentAmount = result.payments[result.payments.length - 1].ending_balance
      currentInterest = change.new_interest_rate
      pastMonths += monthsUntilChange

      // If new term is specified, use it, otherwise continue with remaining months
      const remainingMonths = change.new_term_years 
        ? change.new_term_years * 12
        : termYears * 12 - pastMonths

      // Calculate payments after rate change
      const finalResult = GoalSeekService.calculate({
        amount: currentAmount,
        months: remainingMonths,
        yearly_interest_rate: currentInterest,
        installments_per_year: installmentsPerYear,
        property_insurance: propertyInsurance,
        loan_protection_insurance: loanInsurance,
        past_months: pastMonths,
        first_installment_date: firstInstallmentDate
      })

      payments = [...payments, ...finalResult.payments]
    }

    return {
      summary: this.calculateSummary(payments),
      payments
    }
  }

  /**
   * Calculate summary statistics for a payment schedule
   */
  private static calculateSummary(payments: PaymentRow[]): ScenarioSummary {
    const totalInterestAndInsurance = payments.reduce(
      (sum, payment) => 
        sum + payment.monthly_interest + payment.property_insurance + payment.monthly_loan_insurance,
      0
    )

    return {
      total_interest_and_insurance: totalInterestAndInsurance,
      total_months: payments.length,
      monthly_payment: payments[payments.length - 1].monthly_payment
    }
  }

  /**
   * Calculate months between two dates
   */
  private static monthsDifference(startDate: Date, endDate: Date): number {
    return (
      (endDate.getFullYear() - startDate.getFullYear()) * 12 +
      endDate.getMonth() - startDate.getMonth()
    )
  }
} 