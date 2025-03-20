import type { PaymentRow } from "../types/common"

interface ExtraInstallment {
  amount: number
  frequency: 'one-time' | 'monthly' | 'yearly'
  start_date: string | Date | any // Accept both string and Date types
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

    // Early return for empty extra installments - should behave like regular payment
    if (!extra_installments || extra_installments.length === 0) {
      console.log(`\n📅 FIXED PAYMENTS - NO EXTRA INSTALLMENTS`);
      console.log(`Using base payment only. This should match the regular scenario.`);
    }

    // Convert annual interest rate to monthly
    const monthlyInterestRate = Math.pow(1 + interest/100, 1/12) - 1

    // Track loan payments and schedule
    let balance = amount
    let months = 0
    const schedule: PaymentRow[] = []
    
    // Use the provided first installment date or default to current date
    const baseDate = first_installment_date || new Date()
    
    console.log(`\n📅 FIXED PAYMENTS using base date: ${baseDate.toISOString()}`);
    console.log(`Starting amount: ${amount}, Base installment: ${base_installment}`);
    console.log(`Using ${extra_installments.length} extra installment(s)`);

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
      
      // Log first few payment dates for debugging
      if (months < 3) {
        console.log(`FixedPayments payment ${months+1} scheduled for: ${currentDate.toISOString()}`);
      }
      
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

      // Add any applicable extra payments
      const extraAmount = this.calculateExtraPaymentForDate(
        currentDate,
        extra_installments,
        months
      )
      
      if (extraAmount > 0) {
        totalPayment += extraAmount
      }

      const availableForPrincipal = totalPayment - monthlyInterest - currentPropertyInsurance - currentLoanInsurance
      
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
      }

      schedule.push(row)
      balance = row.ending_balance
      months++
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

    // Enhanced debugging for Jan 2nd
    const isJan2 = date.getMonth() === 0 && date.getDate() === 2;
    if (isJan2) {
      console.log(`\n🔍 SPECIAL CASE: Checking Jan 2 (${date.getFullYear()}) [Month ${months}] for extra payments`);
      console.log(`Looking for matches among ${extraInstallments.length} extra installment(s)`);
    } else if (months < 5) {
      // Only log for first few months to avoid console spam
      console.log(`\nChecking payment date: ${dateYMD} [Month ${months}]`);
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
        
        // Special case for Jan 2, 2030
        const isJan2_2030 = startDate.getFullYear() === 2030 && 
                            startDate.getMonth() === 0 && 
                            startDate.getDate() === 2;
                            
        // Special case for checking Jan 2nd any year
        if (isJan2) {
          console.log(`Found extra payment with date: ${startYMD}`);
          console.log(`Current payment date: ${dateYMD}`);
          console.log(`Extra payment amount: ${extra.amount}, frequency: ${extra.frequency}`);
        }
        
        // Direct exact comparison for one-time payments
        // This is the most reliable approach for dates
        const isExactMatch = date.getFullYear() === startDate.getFullYear() && 
                            date.getMonth() === startDate.getMonth() && 
                            date.getDate() === startDate.getDate();
        
        // Special logging for Jan 2, 2030 date
        if (isJan2_2030) {
          console.log(`\n⚠️ SPECIAL JAN 2, 2030 EXTRA PAYMENT CHECK:`);
          console.log(`Current date: ${dateYMD} vs. Start date: ${startYMD}`);
          console.log(`Exact match? ${isExactMatch}`);
          
          if (isExactMatch) {
            console.log(`✅ MATCH FOUND - INCLUDING PAYMENT OF ${extra.amount}`);
          }
        }
        
        // For one-time payments, we need an exact date match
        if (extra.frequency === 'one-time') {
          if (isExactMatch) {
            console.log(`✅ APPLYING one-time extra payment of ${extra.amount} for exact date match: ${startYMD} = ${dateYMD}`);
            totalExtra += extra.amount;
          }
        } 
        // For monthly payments, we apply if the payment date is on or after the start date
        else if (extra.frequency === 'monthly') {
          // Check if payment date is on or after start date
          const isOnOrAfter = date.getTime() >= startDate.getTime();
          
          if (isOnOrAfter) {
            console.log(`✅ APPLYING monthly extra payment of ${extra.amount} (start: ${startYMD}, current: ${dateYMD})`);
            totalExtra += extra.amount;
          }
        }
        
      } catch (error) {
        console.error(`Error processing extra payment:`, error);
      }
    }
    
    if (totalExtra > 0 || isJan2) {
      console.log(`Total extra payment for ${dateYMD}: ${totalExtra}`);
    }
    
    return totalExtra;
  }
}