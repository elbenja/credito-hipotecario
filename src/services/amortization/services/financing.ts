import { AmortizationService } from "./amortization"
import { FixedPaymentsService } from "./fixedPayments"
import { GoalSeekService } from "./goalSeek"
import type { ExtraInstallment, PaymentRow } from "../types/common"

interface FinancingParams {
  amount: number
  term_years: number
  interest: number
  installments_per_year: number  // Add installmentsPerYear parameter
  property_insurance: number
  loan_protection_insurance: number
  extra_installments?: ExtraInstallment[]
}

export interface FinancingOptions {
  interest_only?: boolean
  balloon_payment?: number
}

export interface FinancingCalculation {
  monthly_installment: number
  total_months: number
  total_interest: number
  total_to_pay: number
  payments: PaymentRow[]
}

/**
 * Financing Service
 * Calculates loan payments and amortization
 */
export class FinancingService {
  /**
   * Calculate monthly payments and amortization schedule
   */
  static calculate(params: FinancingParams, options: FinancingOptions = {}): FinancingCalculation {
    const {
      amount,
      term_years,
      interest,
      installments_per_year = 12,  // Default to 12 if not provided
      property_insurance,
      loan_protection_insurance,
      extra_installments = []
    } = params

    const { interest_only = false, balloon_payment = 0 } = options

    let baseInstallment = 0
    let payments: PaymentRow[] = []
    let totalMonths = 0
    let totalInterest = 0
    let totalToPay = 0

    // Calculate the correct monthly installment amount
    if (interest_only) {
      // Interest-only: monthly payment is just the interest
      const monthlyRate = Math.pow(1 + interest/100, 1/12) - 1
      baseInstallment = amount * monthlyRate
    } else {
      // Calculate base installment using goal seek
      const result = GoalSeekService.calculate({
        amount,
        months: term_years * 12,
        interest,
        installments_per_year,  // Pass installmentsPerYear
        target_balance: balloon_payment,
        property_insurance,
        loan_protection_insurance
      })

      baseInstallment = result.base_installment
      payments = result.payments
      totalMonths = term_years * 12
      totalInterest = result.total_interest
      totalToPay = result.total_to_pay
    }

    // If there are extra payments, recalculate the schedule
    if (extra_installments.length > 0 && !interest_only) {
      const fixedResult = FixedPaymentsService.calculate({
        amount,
        base_installment: baseInstallment,
        interest,
        installments_per_year,  // Pass installmentsPerYear
        property_insurance,
        loan_protection_insurance,
        extra_installments
      })

      totalMonths = fixedResult.total_months
      payments = fixedResult.payments

      // Recalculate totals from the payment schedule
      totalInterest = payments.reduce((sum, payment) => sum + payment.monthly_interest, 0)
      totalToPay = payments.reduce((sum, payment) => sum + payment.monthly_payment, 0)
    } else if (interest_only) {
      // Generate amortization schedule for interest-only loans
      const amortizationResult = AmortizationService.calculate({
        amount,
        base_installment: baseInstallment,
        interest,
        installments_per_year,  // Pass installmentsPerYear
        property_insurance,
        loan_protection_insurance,
        months: term_years * 12
      })

      payments = amortizationResult.payments
      totalInterest = amortizationResult.total_interest
      totalToPay = amortizationResult.total_to_pay
    }

    return {
      monthly_installment: baseInstallment,
      total_months: totalMonths,
      total_interest: totalInterest,
      total_to_pay: totalToPay,
      payments
    }
  }
} 