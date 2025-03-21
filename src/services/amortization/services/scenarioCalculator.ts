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
  id?: string
  amortization_id?: string
  new_interest_rate: number
  new_term_years?: number
  effective_date: Date | string
  created_at?: string
  updated_at?: string
  new_balance?: number
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

    // Normalize dates in extra installments
    const normalizedExtraInstallments = extra_installments.map(installment => {
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
        } else {
          // Standard date parsing
          normalizedDate = normalizeDate(new Date(installment.start_date));
        }
      } else if (installment.start_date instanceof Date) {
        normalizedDate = normalizeDate(installment.start_date);
      } else {
        // Try to handle as generic value
        normalizedDate = normalizeDate(new Date(String(installment.start_date)));
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
    const totalMonths = termYears * 12;
    
    const result = GoalSeekService.calculate({
      amount,
      months: totalMonths,
      yearly_interest_rate: interest,
      installments_per_year: installmentsPerYear,
      property_insurance: propertyInsurance,
      loan_protection_insurance: loanInsurance,
      first_installment_date: firstInstallmentDate
    })

    return {
      summary: this.calculateSummary(result.payments, totalMonths),
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
    // If no extra installments, return same as regular scenario
    if (!extraInstallments || extraInstallments.length === 0) {
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
    
    // Make sure the dates are properly normalized
    const processedInstallments = extraInstallments.map(inst => {
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
      
      return {
        amount: inst.amount,
        frequency: inst.frequency,
        start_date: normalizedDate
      };
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
    // If no extra installments, return same as regular scenario
    if (!extraInstallments || extraInstallments.length === 0) {
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
    
    // Calculate the original end date (20 years from the first payment)
    const originalEndDate = new Date(loanStartDate);
    originalEndDate.setFullYear(originalEndDate.getFullYear() + termYears);
    
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
        
        return {
          ...installment,
          start_date: normalizedDate
        };
      })
      .sort((a, b) => a.start_date.getTime() - b.start_date.getTime());
    
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
    
    // Get all the payment dates from the original schedule
    const paymentDates = initialResult.payments.map(p => p.payment_date);
    
    // Initialize payment array
    let finalPayments: PaymentRow[] = [];
    let currentBalance = amount;
    let currentPayments = [...initialResult.payments];
    
    // Track the newest base installment amount
    let latestBaseInstallment = originalBaseInstallment;
    
    // Process each breakpoint (extra installment) in chronological order
    for (let i = 0; i < sortedInstallments.length; i++) {
      const currentInstallment = sortedInstallments[i];
      const installmentDate = currentInstallment.start_date;
      
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
          continue; // Skip this installment
        }
      }
      
      // Add all payments up to the breakpoint to our final payments array
      finalPayments = [...finalPayments, ...currentPayments.slice(0, matchedIndex)];
      
      // Get the actual balance at the breakpoint
      currentBalance = currentPayments[matchedIndex].beginning_balance;
      
      // Apply the extra payment
      let extraAmount = 0;
      
      if (currentInstallment.frequency === 'one-time') {
        extraAmount = currentInstallment.amount;
      } else if (currentInstallment.frequency === 'monthly') {
        // For monthly, we only need to reduce by a single month's worth at this breakpoint
        // as each subsequent month will have its own reduction
        extraAmount = currentInstallment.amount;
      }
      
      // Reduce the balance by the extra payment
      currentBalance = Math.max(0, currentBalance - extraAmount);
      
      // If balance is zero, loan is fully paid
      if (currentBalance === 0) {
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
      
      // Calculate the number of months remaining between the current breakpoint date
      // and the original end date, to ensure we maintain the same end date
      const breakpointDate = currentPayments[matchedIndex].payment_date;
      
      // Calculate months between breakpoint and original end date
      const breakpointYear = breakpointDate.getFullYear();
      const breakpointMonth = breakpointDate.getMonth();
      const originalEndYear = originalEndDate.getFullYear();
      const originalEndMonth = originalEndDate.getMonth();
      
      // Calculate the exact months difference without the day adjustment
      // Simply count full months between the dates
      const remainingMonths = (originalEndYear - breakpointYear) * 12 + 
                             (originalEndMonth - breakpointMonth);
      
      // Get the next payment date after the breakpoint
      const nextPaymentDate = matchedIndex + 1 < currentPayments.length
        ? currentPayments[matchedIndex].payment_date
        : new Date(
            loanStartDate.getFullYear(), 
            loanStartDate.getMonth() + matchedIndex, 
            loanStartDate.getDate(),
            12, 0, 0, 0
          );
      
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
      // Update our latest base installment amount
      latestBaseInstallment = newBaseInstallment;
      
      // Verify the payments end at the original end date
      const lastRecalculatedPayment = recalculatedResult.payments[recalculatedResult.payments.length - 1];
      const lastPaymentDate = lastRecalculatedPayment.payment_date;
      
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
    
    // Create a custom summary that uses the latest calculated base installment
    const summary = this.calculateSummary(finalPayments, totalMonths);
    summary.monthly_payment = latestBaseInstallment;
    
    return {
      summary,
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

    const totalMonths = termYears * 12;
    
    // Sort rate changes by effective date
    const sortedChanges = [...rateChanges].sort((a, b) => 
      new Date(a.effective_date).getTime() - new Date(b.effective_date).getTime()
    )

    console.log("=== NEW RATE SCENARIO DEBUG ===");
    console.log("Initial loan parameters:");
    console.log(`- Initial loan amount: $${amount.toFixed(2)}`);
    console.log(`- Initial interest rate: ${interest}%`);
    console.log(`- Initial term years: ${termYears} (${totalMonths} months)`);
    console.log(`- Number of installments per year: ${installmentsPerYear}`);
    console.log(`- First installment date: ${firstInstallmentDate?.toISOString().split('T')[0] || 'Not specified'}`);
    console.log("Rate changes to apply:", sortedChanges.map(c => ({
      date: typeof c.effective_date === 'string' ? c.effective_date : c.effective_date.toISOString().split('T')[0],
      new_rate: c.new_interest_rate,
      new_term_years: c.new_term_years
    })));

    // Calculate regular payments for the entire term first
    // This will serve as our base, and we'll only replace payments after rate change dates
    const regularResult = GoalSeekService.calculate({
      amount,
      months: totalMonths,
      yearly_interest_rate: interest,
      installments_per_year: installmentsPerYear,
      property_insurance: propertyInsurance,
      loan_protection_insurance: loanInsurance,
      first_installment_date: firstInstallmentDate
    });
    
    // Start with all regular payments
    let payments = [...regularResult.payments];
    
    // Process each rate change
    for (const change of sortedChanges) {
      // Normalize the date to avoid timezone issues
      const effectiveDateStr = typeof change.effective_date === 'string' 
        ? change.effective_date 
        : change.effective_date.toISOString().split('T')[0];
        
      // Parse the date components to create a clean date object
      const [year, month, day] = effectiveDateStr.split('-').map(Number);
      const effectiveDate = new Date(year, month - 1, day); // month is 0-indexed in JS Date
      
      console.log(`\n=== Processing rate change effective ${effectiveDateStr} ===`);
      
      // Find the index of the payment that corresponds to the rate change date using normalized dates
      const rateChangeIndex = payments.findIndex(payment => {
        const paymentDate = payment.payment_date;
        const paymentYear = paymentDate.getFullYear();
        const paymentMonth = paymentDate.getMonth();
        const paymentDay = paymentDate.getDate();
        
        // Compare by year, month, day directly to avoid timezone issues
        return (paymentYear > year) || 
               (paymentYear === year && paymentMonth > month - 1) || 
               (paymentYear === year && paymentMonth === month - 1 && paymentDay >= day);
      });
      
      // If we can't find a matching payment date, skip this rate change
      if (rateChangeIndex === -1) {
        console.log(`- No payment found on or after rate change date ${effectiveDateStr}. Skipping this rate change.`);
        console.log(`- First 3 payment dates available:`, payments.slice(0, 3).map(p => p.payment_date.toISOString().split('T')[0]));
        continue;
      }
      
      console.log(`- Found payment at index ${rateChangeIndex} that corresponds to rate change`);
      console.log(`- Payment date: ${payments[rateChangeIndex].payment_date.toISOString().split('T')[0]}`);
      
      // Get the remaining balance at the rate change date
      // We use the ending balance of the previous payment, or the original amount if this is the first payment
      const remainingBalance = rateChangeIndex > 0 
        ? payments[rateChangeIndex - 1].ending_balance 
        : amount;
      
      console.log(`- Remaining balance at rate change: $${remainingBalance.toFixed(2)}`);
      console.log(`- New interest rate: ${change.new_interest_rate}%`);
      
      // Calculate how many months remain from this point until the end of the original term
      const remainingMonths = totalMonths - rateChangeIndex;
      
      // If new term is specified, use it, otherwise continue with remaining months
      const newTermMonths = change.new_term_years 
        ? change.new_term_years * 12
        : remainingMonths;
        
      console.log(`- Remaining months in original term: ${remainingMonths}`);
      console.log(`- New term months to use: ${newTermMonths}`);
      
      // Get the payment date that corresponds to the rate change
      const newStartDate = payments[rateChangeIndex].payment_date;
      
      // Calculate payments after rate change with the new interest rate
      console.log("Calling GoalSeek to calculate payments AFTER rate change with parameters:");
      console.log({
        amount: remainingBalance,
        months: newTermMonths,
        yearly_interest_rate: change.new_interest_rate,
        installments_per_year: installmentsPerYear,
        property_insurance: propertyInsurance,
        loan_protection_insurance: loanInsurance,
        first_installment_date: newStartDate.toISOString().split('T')[0]
      });
      
      const recalculatedResult = GoalSeekService.calculate({
        amount: remainingBalance,
        months: newTermMonths,
        yearly_interest_rate: change.new_interest_rate,
        installments_per_year: installmentsPerYear,
        property_insurance: propertyInsurance,
        loan_protection_insurance: loanInsurance,
        first_installment_date: newStartDate
      });

      console.log(`- GoalSeek result - new base installment: $${recalculatedResult.base_installment.toFixed(2)}`);
      console.log(`- GoalSeek result - total calculated months: ${recalculatedResult.total_months}`);
      console.log(`- GoalSeek result - payments calculated: ${recalculatedResult.payments.length}`);
      
      // Get first payment after rate change
      if (recalculatedResult.payments.length > 0) {
        const firstPayment = recalculatedResult.payments[0];
        console.log(`- First payment date after rate change: ${firstPayment.payment_date.toISOString().split('T')[0]}`);
        console.log(`- First payment amount after rate change: $${firstPayment.monthly_payment.toFixed(2)}`);
      }

      // Replace the payments after the rate change date with the recalculated payments
      payments = [
        ...payments.slice(0, rateChangeIndex), // Keep payments before rate change
        ...recalculatedResult.payments.map(payment => ({
          ...payment,
          is_different_from_base: true // Mark recalculated payments
        }))
      ];
    }

    console.log(`\n=== SCENARIO SUMMARY ===`);
    console.log(`- Total payments in final schedule: ${payments.length}`);
    console.log(`- First payment: ${payments[0]?.payment_date.toISOString().split('T')[0]} - $${payments[0]?.monthly_payment.toFixed(2)}`);
    console.log(`- Last payment: ${payments[payments.length-1]?.payment_date.toISOString().split('T')[0]} - $${payments[payments.length-1]?.monthly_payment.toFixed(2)}`);
    console.log("=== END NEW RATE SCENARIO DEBUG ===\n");

    return {
      // For new rate scenario, always use actual payment count instead of original months
      summary: this.calculateSummary(payments, payments.length),
      payments
    }
  }

  /**
   * Calculate summary statistics for a payment schedule
   */
  private static calculateSummary(payments: PaymentRow[], originalTotalMonths?: number): ScenarioSummary {
    const totalInterestAndInsurance = payments.reduce(
      (sum, payment) => 
        sum + payment.monthly_interest + payment.property_insurance + payment.monthly_loan_insurance,
      0
    )

    // Find the first non-double payment after rate change (marked as different from base)
    // This ensures we report the payment amount after the rate change
    let representativePayment = payments[0]; // Default to first payment
    
    // First look for payments marked as different from base (indicating rate change)
    const hasRateChange = payments.some(p => p.is_different_from_base);
    
    if (hasRateChange) {
      // Find the first payment marked as different that's not a double payment
      for (let i = 0; i < payments.length; i++) {
        const payment = payments[i];
        if (payment.is_different_from_base) {
          // Skip double payments (July or December)
          const month = payment.payment_date.getMonth();
          const isDoublePayment = month === 6 || month === 11;
          
          if (!isDoublePayment) {
            representativePayment = payment;
            break;
          }
        }
      }
      
      console.log(`Found representative payment after rate change: $${representativePayment.monthly_payment.toFixed(2)}`);
    } else {
      // If no rate change, find the last normal payment (not a double payment)
      for (let i = payments.length - 1; i >= 0; i--) {
        const payment = payments[i];
        // Skip double payments (July or December)
        const month = payment.payment_date.getMonth();
        const isDoublePayment = month === 6 || month === 11;
        
        if (!isDoublePayment) {
          representativePayment = payment;
          break;
        }
      }
    }

    return {
      total_interest_and_insurance: totalInterestAndInsurance,
      total_months: originalTotalMonths || payments.length,
      monthly_payment: payments.length > 0 ? representativePayment.monthly_payment : 0
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