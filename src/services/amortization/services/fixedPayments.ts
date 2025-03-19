import type { PaymentRow } from "../types/common"

interface ExtraInstallment {
  amount: number
  frequency: 'once' | 'monthly' | 'yearly'
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
      past_months = 0
    } = input

    // Convert annual interest rate to monthly
    const monthlyInterestRate = Math.pow(1 + interest/100, 1/12) - 1

    // Track loan payments and schedule
    let balance = amount
    let months = 0
    const schedule: PaymentRow[] = []
    const baseDate = new Date()

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
    let totalExtra = 0

    for (const extra of extraInstallments) {
      const startDate = new Date(extra.start_date)
      const isAfterStartDate = date.getTime() >= startDate.getTime()

      if (!isAfterStartDate) {
        continue
      }

      switch (extra.frequency) {
        case 'once':
          // One-time payment applies only at the exact month
          if (date.getFullYear() === startDate.getFullYear() && 
              date.getMonth() === startDate.getMonth()) {
            totalExtra += extra.amount
          }
          break
        case 'monthly':
          // Monthly applies to every month after start date
          totalExtra += extra.amount
          break
        case 'yearly':
          // Yearly applies to same month each year after start date
          if (date.getMonth() === startDate.getMonth()) {
            totalExtra += extra.amount
          }
          break
      }
    }

    return totalExtra
  }
} 