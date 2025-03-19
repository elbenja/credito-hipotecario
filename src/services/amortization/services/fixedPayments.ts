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
  property_insurance: number
  loan_protection_insurance: number
  past_months?: number
  extra_installments?: ExtraInstallment[]
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
   * Calculate the new loan duration with extra payments while keeping base payment constant
   */
  static calculate(input: FixedPaymentsInput): FixedPaymentsResult {
    const {
      amount,
      base_installment,
      interest,
      property_insurance,
      loan_protection_insurance,
      past_months = 0,
      extra_installments = []
    } = input

    // Convert annual interest rate to monthly using Effective Annual Rate formula
    const monthlyInterestRate = Math.pow(1 + interest/100, 1/12) - 1

    // Generate payment schedule with extra payments
    const schedule: PaymentRow[] = []
    let balance = amount
    let months = 0
    const baseDate = new Date()

    // Continue until balance is effectively zero
    while (balance > this.BALANCE_THRESHOLD && months < 600) { // 50 years max
      const currentDate = new Date(baseDate)
      currentDate.setMonth(baseDate.getMonth() + months)

      // Calculate regular payment components
      const monthlyInterest = balance * monthlyInterestRate
      const monthlyLoanInsurance = balance * (loan_protection_insurance / 100)
      let totalPayment = base_installment

      // Add any applicable extra payments
      const extraAmount = this.calculateExtraPaymentForDate(
        currentDate,
        extra_installments,
        months
      )
      
      if (extraAmount > 0) {
        totalPayment += extraAmount
      }

      const availableForPrincipal = totalPayment - monthlyInterest - property_insurance - monthlyLoanInsurance
      
      const row: PaymentRow = {
        payment_date: currentDate,
        beginning_balance: balance,
        monthly_payment: totalPayment,
        monthly_interest: monthlyInterest,
        property_insurance: property_insurance,
        monthly_loan_insurance: monthlyLoanInsurance,
        principal: availableForPrincipal,
        ending_balance: balance - availableForPrincipal,
        is_different_from_base: extraAmount > 0
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
   * Calculate any extra payments that apply for a given date
   */
  private static calculateExtraPaymentForDate(
    currentDate: Date,
    extraInstallments: ExtraInstallment[],
    monthIndex: number
  ): number {
    let totalExtra = 0

    for (const extra of extraInstallments) {
      const startDate = new Date(extra.start_date)
      
      // Skip if current date is before start date
      if (currentDate < startDate) {
        continue
      }

      switch (extra.frequency) {
        case 'once':
          // Add amount only on the exact month
          if (
            currentDate.getMonth() === startDate.getMonth() &&
            currentDate.getFullYear() === startDate.getFullYear()
          ) {
            totalExtra += extra.amount
          }
          break

        case 'monthly':
          // Add amount every month after start date
          totalExtra += extra.amount
          break

        case 'yearly':
          // Add amount if same month as start date in subsequent years
          if (currentDate.getMonth() === startDate.getMonth()) {
            totalExtra += extra.amount
          }
          break
      }
    }

    return totalExtra
  }
} 