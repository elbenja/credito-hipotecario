import type { PaymentRow } from "../types/common"

interface ExtraInstallment {
  amount: number
  frequency: 'one-time' | 'monthly' | 'yearly'
  start_date: Date
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
      const currentDate = new Date(baseDate)
      currentDate.setMonth(baseDate.getMonth() + months)
      
      // Check if this is a double payment month (July or December for 14 installments)
      const currentMonth = currentDate.getMonth();
      const isDoublePayment = installments_per_year === 14 && 
        (currentMonth === 6 || currentMonth === 11);

      // Calculate regular payment components
      const monthlyInterest = balance * monthlyInterestRate
      const monthlyLoanInsurance = balance * (loan_protection_insurance / 100)
      
      // Apply double payment if needed
      let basePayment = isDoublePayment ? base_installment * 2 : base_installment;
      
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
    console.log(`\n==== CHECKING EXTRA PAYMENTS FOR: ${dateYMD} [Month ${months}] ====`);

    // No extra installments check
    if (!extraInstallments || extraInstallments.length === 0) {
      console.log('No extra installments to process');
      return 0;
    }

    console.log(`Processing ${extraInstallments.length} potential extra installment(s)`);

    for (const extra of extraInstallments) {
      try {
        // Ensure we have a proper date object
        const startDate = new Date(extra.start_date);
        
        // Format for consistent date display
        const startYMD = `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}-${String(startDate.getDate()).padStart(2, '0')}`;
        
        // Debug info
        console.log(`\n🔍 Extra payment: ${extra.amount} ${extra.frequency} on ${startYMD}`);
        
        // For direct comparison, precompute date components
        const paymentDay = startDate.getDate();
        const paymentMonth = startDate.getMonth();
        const paymentYear = startDate.getFullYear();
        
        const currentDay = date.getDate();
        const currentMonth = date.getMonth();
        const currentYear = date.getFullYear();
        
        // Check if date is before start date (for all frequency types)
        const isBefore = 
          currentYear < paymentYear || 
          (currentYear === paymentYear && currentMonth < paymentMonth) ||
          (currentYear === paymentYear && currentMonth === paymentMonth && currentDay < paymentDay);
        
        if (isBefore) {
          console.log(`❌ SKIP: Current date ${dateYMD} is BEFORE start date ${startYMD}`);
          continue;
        }

        // Flag for first of month special case
        const isFirstOfMonth = paymentDay === 1;
        
        // Process based on frequency
        switch (extra.frequency) {
          case 'one-time': // Only handle 'one-time' variation
            // For one-time payments, need same month and year
            const sameMonth = currentMonth === paymentMonth;
            const sameYear = currentYear === paymentYear;
            
            // Special case for 1st of month
            if (isFirstOfMonth) {
              if (sameYear && sameMonth) {
                console.log(`✅ APPLYING: First-of-month one-time payment of ${extra.amount}`);
                totalExtra += extra.amount;
              } else {
                console.log(`❌ SKIP: Not in payment month/year (need ${paymentMonth+1}/${paymentYear})`);
              }
            }
            // Normal case - needs exact day match
            else if (sameYear && sameMonth && currentDay === paymentDay) {
              console.log(`✅ APPLYING: Exact date match one-time payment of ${extra.amount}`);
              totalExtra += extra.amount;
            } else {
              console.log(`❌ SKIP: Date mismatch (needs ${paymentMonth+1}/${paymentDay}/${paymentYear})`);
            }
            break;
            
          case 'monthly':
            // Monthly payments for all months after start date
            console.log(`✅ APPLYING: Monthly payment of ${extra.amount}`);
            totalExtra += extra.amount;
            break;
            
          case 'yearly':
            // Yearly payments when month matches
            if (currentMonth === paymentMonth) {
              console.log(`✅ APPLYING: Yearly payment of ${extra.amount}`);
              totalExtra += extra.amount;
            } else {
              console.log(`❌ SKIP: Month mismatch for yearly payment (needs month ${paymentMonth+1})`);
            }
            break;
            
          default:
            console.log(`❌ SKIP: Unknown frequency type: ${extra.frequency}`);
        }
      } catch (err) {
        console.error(`Error processing extra payment: ${err}`);
      }
    }

    if (totalExtra > 0) {
      console.log(`\n💰 TOTAL EXTRA FOR ${dateYMD}: ${totalExtra}`);
    } else {
      console.log(`\n🚫 No extra payments for ${dateYMD}`);
    }
    
    return totalExtra;
  }
} 