import { GoalSeekService } from "./goalSeek"
import { FixedPaymentsService } from "./fixedPayments"
import type { Scenarios, ScenarioSummary, PaymentRow } from "../types/common"
import { normalizeDate } from "@/lib/utils"

interface ExtraInstallment {
  amount: number
  frequency: 'one-time' | 'monthly' | 'yearly'
  start_date: string | Date | any // Accept both string and Date types to match database format
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

    // Normalize the first installment date
    const normalizedFirstInstallmentDate = first_installment_date ? normalizeDate(first_installment_date) : normalizeDate(new Date());

    console.log('\n===== SCENARIO CALCULATOR =====');
    console.log(`Loan amount: ${loan_amount}`);
    console.log(`Interest rate: ${interest_rate}`);
    console.log(`Term years: ${term_years}`);
    console.log(`Installments per year: ${installments_per_year}`);
    console.log(`First installment date: ${normalizedFirstInstallmentDate.toISOString()}`);
    console.log(`Extra installments count: ${extra_installments.length}`);
    console.log(`Rate changes count: ${rate_changes.length}`);

    // Normalize dates in extra installments
    const normalizedExtraInstallments = extra_installments.map(installment => {
      console.log(`Normalizing extra installment date:`, installment.start_date);
      
      let normalizedDate: Date;
      
      // Handle different input formats
      if (typeof installment.start_date === 'string') {
        // Try direct YYYY-MM-DD parsing first
        const match = installment.start_date.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
        if (match) {
          const year = parseInt(match[1]);
          const month = parseInt(match[2]) - 1; // Convert to 0-based
          const day = parseInt(match[3]);
          normalizedDate = new Date(year, month, day, 12, 0, 0, 0);
          console.log(`  Parsed YYYY-MM-DD string to:`, normalizedDate.toISOString());
        } else {
          // Standard date parsing
          normalizedDate = normalizeDate(new Date(installment.start_date));
          console.log(`  Parsed date string to:`, normalizedDate.toISOString());
        }
      } else if (installment.start_date instanceof Date) {
        normalizedDate = normalizeDate(installment.start_date);
        console.log(`  Normalized Date object to:`, normalizedDate.toISOString());
      } else {
        // Try to handle as generic value
        normalizedDate = normalizeDate(new Date(String(installment.start_date)));
        console.log(`  Normalized unknown type to:`, normalizedDate.toISOString());
      }
      
      // Only if Jan 2, 2030
      if (normalizedDate.getFullYear() === 2030 && 
          normalizedDate.getMonth() === 0 && 
          normalizedDate.getDate() === 2) {
        console.log(`⚠️ SPECIAL CASE DETECTED: Jan 2, 2030 date`);
      }
      
      return {
        ...installment,
        start_date: normalizedDate
      };
    });

    // Normalize dates in rate changes
    const normalizedRateChanges = rate_changes.map(change => ({
      ...change,
      effective_date: normalizeDate(change.effective_date)
    }));
    
    // Calculate regular scenario first as other scenarios depend on it
    const regularScenario = this.calculateRegularScenario(
      loan_amount,
      interest_rate,
      term_years,
      installments_per_year,
      property_insurance,
      loan_insurance,
      normalizedFirstInstallmentDate
    )

    // If no extra installments or rate changes, all scenarios should be identical to regular
    if ((normalizedExtraInstallments.length === 0) && (normalizedRateChanges.length === 0)) {
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
      normalizedExtraInstallments,
      normalizedFirstInstallmentDate
    )

    const lowerPaymentScenario = this.calculateLowerPaymentScenario(
      loan_amount,
      interest_rate,
      term_years,
      installments_per_year,
      property_insurance,
      loan_insurance,
      normalizedExtraInstallments,
      normalizedFirstInstallmentDate
    )

    const newRateScenario = this.calculateNewRateScenario(
      loan_amount,
      interest_rate,
      term_years,
      installments_per_year,
      property_insurance,
      loan_insurance,
      normalizedRateChanges,
      normalizedFirstInstallmentDate
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
    firstInstallmentDate?: Date
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
    
    // Use the provided first installment date or default to today
    const actualFirstInstallmentDate = firstInstallmentDate ? normalizeDate(firstInstallmentDate) : normalizeDate(new Date());
    console.log(`Using first installment date: ${actualFirstInstallmentDate.toISOString()}`);
    
    // Instead of trying to precalculate all extra payments at once, let FixedPaymentsService handle them
    // more accurately through the actual payment schedule
    console.log('Passing extra installments to FixedPaymentsService for accurate handling');
    
    // Make sure the dates are properly normalized
    const processedInstallments = extraInstallments.map(inst => {
      // Log original date
      let dateDisplay = '';
      try {
        if (typeof inst.start_date === 'string') {
          dateDisplay = inst.start_date;
        } else if (inst.start_date instanceof Date) {
          dateDisplay = inst.start_date.toISOString();
        } else {
          dateDisplay = String(inst.start_date);
        }
      } catch (e) {
        dateDisplay = 'INVALID DATE';
      }
      
      console.log(`Original extra installment: ${inst.amount} (${inst.frequency}) on ${dateDisplay}`);
      
      // Process the date for consistency
      let normalizedDate: Date;
      
      if (typeof inst.start_date === 'string') {
        // Handle YYYY-MM-DD format directly
        const match = inst.start_date.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
        if (match) {
          const year = parseInt(match[1], 10);
          const month = parseInt(match[2], 10) - 1; // Convert to 0-based
          const day = parseInt(match[3], 10);
          normalizedDate = new Date(year, month, day, 12, 0, 0, 0);
        } else {
          normalizedDate = new Date(inst.start_date);
        }
      } else if (inst.start_date instanceof Date) {
        normalizedDate = new Date(inst.start_date);
      } else {
        normalizedDate = new Date(String(inst.start_date));
      }
      
      // Special case logging for 2030-01-02
      if (normalizedDate.getFullYear() === 2030 && 
          normalizedDate.getMonth() === 0 && 
          normalizedDate.getDate() === 2) {
        console.log(`⚠️ DETECTED Jan 2, 2030 extra payment (Accelerated scenario)`);
      }
      
      return {
        amount: inst.amount,
        frequency: inst.frequency,
        start_date: normalizedDate
      };
    });
    
    // Log each installment after normalization
    processedInstallments.forEach((inst, i) => {
      console.log(`Installment #${i+1}: ${inst.amount} (${inst.frequency}) on ${inst.start_date.toISOString()}`);
    });
    
    // This follows PROJECT_KNOWLEDGE.md Accelerated scenario:
    // "reduces the total number of months needed while keeping the same payment amount"
    const result = FixedPaymentsService.calculate({
      amount,
      base_installment: baseInstallment,
      interest,
      installments_per_year: installmentsPerYear,
      property_insurance: propertyInsurance,
      loan_protection_insurance: loanInsurance,
      extra_installments: processedInstallments,
      first_installment_date: actualFirstInstallmentDate
    });
    
    console.log(`Accelerated Result: ${result.new_remaining_months} months (down from original ${termYears * 12})`);
    
    // Mark all payments as different from base to indicate accelerated scenario
    const finalPayments = result.payments.map(payment => ({
      ...payment,
      is_different_from_base: true
    }));
    
    return {
      summary: this.calculateSummary(finalPayments),
      payments: finalPayments
    }
  }

  /**
   * Calculate lower payment scenario with extra lump sum
   * This follows PROJECT_KNOWLEDGE.md lower payment scenario:
   * "reduces the monthly payment amount for the remaining term while maintaining original term"
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
    console.log('[ScenarioCalculator] calculateLowerPaymentScenario');
    
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

    // First, ensure we have a valid first installment date
    const loanStartDate = firstInstallmentDate ? normalizeDate(firstInstallmentDate) : normalizeDate(new Date());
    console.log(`Loan start date: ${loanStartDate.toISOString()}`);
    
    // Sort extra installments by start date (chronological order)
    // Process and normalize dates for each installment
    const sortedInstallments = [...extraInstallments]
      .map(installment => {
        let normalizedDate: Date;
        
        // Handle different date formats
        if (typeof installment.start_date === 'string') {
          // Try direct YYYY-MM-DD parsing first
          const match = installment.start_date.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
          if (match) {
            const year = parseInt(match[1], 10);
            const month = parseInt(match[2], 10) - 1; // 0-based month
            const day = parseInt(match[3], 10);
            normalizedDate = new Date(year, month, day, 12, 0, 0, 0);
          } else {
            normalizedDate = new Date(installment.start_date);
          }
        } else if (installment.start_date instanceof Date) {
          normalizedDate = new Date(installment.start_date);
        } else {
          normalizedDate = new Date(String(installment.start_date));
        }
        
        // Special case logging for 2030-01-02
        if (normalizedDate.getFullYear() === 2030 && 
            normalizedDate.getMonth() === 0 && 
            normalizedDate.getDate() === 2) {
          console.log(`⚠️ DETECTED Jan 2, 2030 extra payment (Lower payment scenario)`);
        }
        
        return {
          ...installment,
          start_date: normalizedDate
        };
      })
      .sort((a, b) => a.start_date.getTime() - b.start_date.getTime());
    
    console.log(`Sorted ${sortedInstallments.length} extra installments chronologically`);
    sortedInstallments.forEach((inst, i) => {
      console.log(`Sorted Extra Payment #${i+1}: ${inst.amount} (${inst.frequency}) on ${inst.start_date.toISOString()}`);
    });
    
    // Calculate initial amortization (before any extra installments)
    const totalMonths = termYears * 12;
    const initialResult = GoalSeekService.calculate({
      amount,
      months: totalMonths,
      yearly_interest_rate: interest,
      installments_per_year: installmentsPerYear,
      property_insurance: propertyInsurance,
      loan_protection_insurance: loanInsurance,
      first_installment_date: loanStartDate
    });
    
    const originalBaseInstallment = initialResult.base_installment;
    console.log(`Original base installment: ${originalBaseInstallment}`);
    
    // Get all the payment dates from the original schedule
    const paymentDates = initialResult.payments.map(p => p.payment_date);
    
    // Initialize payment array
    let finalPayments: PaymentRow[] = [];
    let currentBalance = amount;
    let currentPayments = [...initialResult.payments];
    
    // Process each breakpoint (extra installment) in chronological order
    for (let i = 0; i < sortedInstallments.length; i++) {
      const currentInstallment = sortedInstallments[i];
      const installmentDate = currentInstallment.start_date;
      console.log(`\nProcessing breakpoint #${i+1}: ${currentInstallment.amount} (${currentInstallment.frequency}) on ${installmentDate.toISOString()}`);
      
      // Find index of payment corresponding to the extra installment date
      const breakpointIndex = currentPayments.findIndex(payment => {
        const paymentDate = payment.payment_date;
        return paymentDate.getFullYear() === installmentDate.getFullYear() &&
               paymentDate.getMonth() === installmentDate.getMonth() &&
               paymentDate.getDate() === installmentDate.getDate();
      });
      
      // If we can't find an exact match, try to find the next payment after this date
      let matchedIndex = breakpointIndex;
      if (matchedIndex === -1) {
        // Find the first payment after this extra installment
        matchedIndex = currentPayments.findIndex(payment => 
          payment.payment_date.getTime() > installmentDate.getTime()
        );
        
        if (matchedIndex === -1) {
          console.log(`Warning: Extra payment is after the last regular payment, can't apply`);
          continue; // Skip this installment
        }
        
        console.log(`No exact match found. Using next payment date: ${currentPayments[matchedIndex].payment_date.toISOString()}`);
      } else {
        console.log(`Found exact match at payment index ${matchedIndex} of ${currentPayments.length}`);
      }
      
      // Add all payments up to the breakpoint to our final payments array
      finalPayments = [...finalPayments, ...currentPayments.slice(0, matchedIndex)];
      
      // Get the actual balance at the breakpoint
      currentBalance = currentPayments[matchedIndex].beginning_balance;
      console.log(`Balance at breakpoint: ${currentBalance}`);
      
      // Apply the extra payment
      let extraAmount = 0;
      
      if (currentInstallment.frequency === 'one-time') {
        extraAmount = currentInstallment.amount;
        console.log(`Applying one-time payment of ${extraAmount}`);
      } else if (currentInstallment.frequency === 'monthly') {
        // For monthly, we only need to reduce by a single month's worth at this breakpoint
        // as each subsequent month will have its own reduction
        extraAmount = currentInstallment.amount;
        console.log(`Applying monthly payment of ${extraAmount} at this breakpoint`);
      }
      
      // Reduce the balance by the extra payment
      currentBalance = Math.max(0, currentBalance - extraAmount);
      console.log(`New balance after extra payment: ${currentBalance}`);
      
      // If balance is zero, loan is fully paid
      if (currentBalance === 0) {
        console.log(`Balance is now zero, loan is fully paid off`);
        // Add a single final payment for the extra amount
        finalPayments.push({
          payment_date: installmentDate,
          beginning_balance: extraAmount,
          ending_balance: 0,
          monthly_payment: extraAmount,
          monthly_interest: 0,
          principal: extraAmount,
          property_insurance: 0,
          monthly_loan_insurance: 0,
          is_different_from_base: true
        });
        break;
      }
      
      // Get the remaining months from this breakpoint to the end of the original term
      const remainingMonths = totalMonths - matchedIndex;
      console.log(`Remaining months: ${remainingMonths}`);
      
      // Get the next payment date after the breakpoint
      const nextPaymentDate = matchedIndex + 1 < currentPayments.length
        ? currentPayments[matchedIndex].payment_date
        : new Date(
            loanStartDate.getFullYear(), 
            loanStartDate.getMonth() + matchedIndex, 
            loanStartDate.getDate(),
            12, 0, 0, 0
          );
      
      console.log(`Next payment date: ${nextPaymentDate.toISOString()}`);
      
      // Recalculate payments with the new lower balance but same term length
      const recalculatedResult = GoalSeekService.calculate({
        amount: currentBalance,
        months: remainingMonths,
        yearly_interest_rate: interest,
        installments_per_year: installmentsPerYear,
        property_insurance: propertyInsurance,
        loan_protection_insurance: loanInsurance,
        first_installment_date: nextPaymentDate
      });
      
      const newBaseInstallment = recalculatedResult.base_installment;
      console.log(`Recalculated base installment: ${newBaseInstallment} (was ${originalBaseInstallment})`);
      console.log(`Payment reduction: ${(originalBaseInstallment - newBaseInstallment).toFixed(2)} (${((originalBaseInstallment - newBaseInstallment) / originalBaseInstallment * 100).toFixed(2)}%)`);
      
      // Set these recalculated payments as the current payments for next iteration
      currentPayments = recalculatedResult.payments;
      
      // Mark all recalculated payments as different from base
      currentPayments = currentPayments.map(payment => ({
        ...payment,
        is_different_from_base: true
      }));
    }
    
    // Add remaining payments after the last breakpoint to our final payments
    finalPayments = [...finalPayments, ...currentPayments];
    
    console.log(`Final payment count: ${finalPayments.length}`);
    
    return {
      summary: this.calculateSummary(finalPayments),
      payments: finalPayments
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