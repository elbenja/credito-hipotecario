import type { PaymentRow } from "../types/common"

interface ExtraInstallment {
  amount: number
  frequency: 'one-time' | 'monthly' | 'yearly'
  start_date: string | Date | any // Accept both string and Date types
  applied?: boolean // Track if a one-time payment has been applied
}

interface FixedPaymentsInput {
  amount: number
  base_installment: number
  interest: number
  installments_per_year: number
  property_insurance: number
  loan_protection_insurance: number
  extra_installments?: ExtraInstallment[]
  past_months?: number
  first_installment_date?: Date
}

interface FixedPaymentsResult {
  new_remaining_months: number
  total_months: number
  payments: PaymentRow[]
}

/**
 * FixedPayments Service
 * Calculates how additional payments affect loan duration with fixed payments
 */
export class FixedPaymentsService {
  private static readonly BALANCE_THRESHOLD = 0.01

  /**
   * Calculate the effect of extra payments on loan term with fixed payments
   */
  static calculate(input: FixedPaymentsInput): FixedPaymentsResult {
    const {
      amount,
      base_installment,
      interest,
      installments_per_year = 12,
      property_insurance,
      loan_protection_insurance,
      extra_installments = [],
      past_months = 0,
      first_installment_date
    } = input

    // Convert annual interest rate to monthly
    const monthlyInterestRate = Math.pow(1 + interest/100, 1/12) - 1

    // Track loan payments and schedule
    let balance = amount
    let months = 0
    const schedule: PaymentRow[] = []
    
    // Use the provided first installment date or default to current date
    const baseDate = first_installment_date || new Date()

    // Pre-process extra installments to normalize dates
    const processedExtraInstallments = extra_installments.map(inst => {
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
        ...inst,
        start_date: normalizedDate,
        applied: false // Track if this one-time payment has been applied
      };
    });
    
    // Sort one-time payments by date (earliest first)
    const sortedOneTimePayments = processedExtraInstallments
      .filter(inst => inst.frequency === 'one-time')
      .sort((a, b) => a.start_date.getTime() - b.start_date.getTime());
    
    // Other types of payments
    const monthlyPayments = processedExtraInstallments
      .filter(inst => inst.frequency === 'monthly');

    // Continue until balance is effectively zero
    while (balance > this.BALANCE_THRESHOLD && months < 600) { // 50 years max
      // Create a new date that preserves the exact day of month
      const currentDate = new Date(baseDate);
      // Use full date copying to ensure the exact day is preserved
      currentDate.setFullYear(
        baseDate.getFullYear(),
        baseDate.getMonth() + months,
        baseDate.getDate()
      );
      
      // Check if this is a double payment month (July or December for 14 installments)
      const currentMonth = currentDate.getMonth();
      const isDoublePayment = installments_per_year === 14 && 
        (currentMonth === 6 || currentMonth === 11);

      // Calculate regular payment components
      const monthlyInterest = balance * monthlyInterestRate
      const monthlyLoanInsurance = balance * (loan_protection_insurance / 100)
      
      // Apply double payment if needed
      const basePayment = isDoublePayment ? base_installment * 2 : base_installment;
      
      // Apply double insurance if needed
      const currentPropertyInsurance = isDoublePayment ? property_insurance * 2 : property_insurance;
      const currentLoanInsurance = isDoublePayment ? monthlyLoanInsurance * 2 : monthlyLoanInsurance;
      
      // Set total payment (base + extra)
      let totalPayment = basePayment;
      let extraAmount = 0;
      
      // Add monthly extra payments (if any)
      for (const monthlyExtra of monthlyPayments) {
        if (currentDate.getTime() >= monthlyExtra.start_date.getTime()) {
          extraAmount += monthlyExtra.amount;
        }
      }
      
      // Check for one-time payments that need to be applied
      for (let i = 0; i < sortedOneTimePayments.length; i++) {
        const oneTimeExtra = sortedOneTimePayments[i];
        
        if (oneTimeExtra.applied) continue; // Skip if already applied
        
        const extraDate = oneTimeExtra.start_date;
        
        // Case 1: Exact date match
        const isExactMatch = currentDate.getFullYear() === extraDate.getFullYear() && 
                            currentDate.getMonth() === extraDate.getMonth() && 
                            currentDate.getDate() === extraDate.getDate();
                            
        // Case 2: This payment is after the extra date
        const isPastExtraDate = currentDate.getTime() > extraDate.getTime();
        
        if (isExactMatch || isPastExtraDate) {
          extraAmount += oneTimeExtra.amount;
          oneTimeExtra.applied = true; // Mark as applied so we don't use it again
          break; // Apply only one one-time payment per regular payment
        }
      }
      
      if (extraAmount > 0) {
        totalPayment += extraAmount;
      }

      const availableForPrincipal = totalPayment - monthlyInterest - currentPropertyInsurance - currentLoanInsurance;
      
      const row: PaymentRow = {
        payment_date: currentDate,
        beginning_balance: balance,
        monthly_payment: totalPayment,
        monthly_interest: monthlyInterest,
        property_insurance: currentPropertyInsurance,
        monthly_loan_insurance: currentLoanInsurance,
        principal: availableForPrincipal,
        ending_balance: balance - availableForPrincipal,
        is_different_from_base: extraAmount > 0 || isDoublePayment
      };

      schedule.push(row);
      balance = row.ending_balance;
      months++;
    }

    return {
      new_remaining_months: months,
      total_months: past_months + months,
      payments: schedule
    }
  }

  /**
   * Calculate any extra payment that applies for a given date
   */
  private static calculateExtraPaymentForDate(
    date: Date,
    extraInstallments: ExtraInstallment[],
    months: number
  ): number {
    let totalExtra = 0;
    
    // Format date for better readability
    const dateYMD = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    
    // No extra installments check
    if (!extraInstallments || extraInstallments.length === 0) {
      return 0;
    }

    for (const extra of extraInstallments) {
      try {
        // Ensure we have a proper date object - extra careful with type handling
        let startDate: Date;
        
        if (extra.start_date instanceof Date) {
          startDate = new Date(extra.start_date.getTime()); // Clone to avoid mutations
        } else if (typeof extra.start_date === 'string') {
          // Handle YYYY-MM-DD format directly
          const match = extra.start_date.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
          if (match) {
            const year = parseInt(match[1], 10);
            const month = parseInt(match[2], 10) - 1; // Convert to 0-based month
            const day = parseInt(match[3], 10);
            startDate = new Date(year, month, day, 12, 0, 0, 0); // Noon to avoid timezone issues
          } else {
            // Regular date parsing
            startDate = new Date(extra.start_date);
          }
        } else {
          // Try to handle anything else as a string
          startDate = new Date(String(extra.start_date));
        }
        
        // Verify we have a valid date
        if (isNaN(startDate.getTime())) {
          console.error(`Invalid date for extra payment:`, extra.start_date);
          continue;
        }
        
        // Format for consistent date display
        const startYMD = `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}-${String(startDate.getDate()).padStart(2, '0')}`;
        
        // Direct exact comparison for one-time payments
        // This is the most reliable approach for dates
        const isExactMatch = date.getFullYear() === startDate.getFullYear() && 
                            date.getMonth() === startDate.getMonth() && 
                            date.getDate() === startDate.getDate();
        
        // For one-time payments, we need an exact date match
        if (extra.frequency === 'one-time') {
          if (isExactMatch) {
            totalExtra += extra.amount;
          }
        } 
        // For monthly payments, we apply if the payment date is on or after the start date
        else if (extra.frequency === 'monthly') {
          // Check if payment date is on or after start date
          const isOnOrAfter = date.getTime() >= startDate.getTime();
          
          if (isOnOrAfter) {
            totalExtra += extra.amount;
          }
        }
      } catch (error) {
        console.error(`Error processing extra payment:`, error);
      }
    }
    
    return totalExtra;
  }
}