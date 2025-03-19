import { GoalSeekService } from "./goalSeek"
import { FixedPaymentsService } from "./fixedPayments"
import type { Scenarios, ScenarioSummary, PaymentRow } from "../types/common"

interface ExtraInstallment {
  amount: number
  frequency: 'once' | 'monthly' | 'yearly'
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
      property_insurance,
      loan_insurance,
      extra_installments = [],
      rate_changes = []
    } = input

    // Calculate regular scenario first as other scenarios depend on it
    const regularScenario = this.calculateRegularScenario(
      loan_amount,
      interest_rate,
      term_years,
      installments_per_year,
      property_insurance,
      loan_insurance
    )

    // Calculate other scenarios
    const acceleratedScenario = this.calculateAcceleratedScenario(
      loan_amount,
      regularScenario.summary.monthly_payment,
      interest_rate,
      installments_per_year,
      property_insurance,
      loan_insurance,
      extra_installments
    )

    const lowerPaymentScenario = this.calculateLowerPaymentScenario(
      loan_amount,
      interest_rate,
      term_years,
      installments_per_year,
      property_insurance,
      loan_insurance,
      extra_installments
    )

    const newRateScenario = this.calculateNewRateScenario(
      loan_amount,
      interest_rate,
      term_years,
      installments_per_year,
      property_insurance,
      loan_insurance,
      rate_changes
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
    loanInsurance: number
  ) {
    const result = GoalSeekService.calculate({
      amount,
      months: termYears * 12,
      interest,
      installments_per_year: installmentsPerYear,
      property_insurance: propertyInsurance,
      loan_protection_insurance: loanInsurance
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
    installmentsPerYear: number,
    propertyInsurance: number,
    loanInsurance: number,
    extraInstallments: ExtraInstallment[]
  ) {
    const result = FixedPaymentsService.calculate({
      amount,
      base_installment: baseInstallment,
      interest,
      installments_per_year: installmentsPerYear,
      property_insurance: propertyInsurance,
      loan_protection_insurance: loanInsurance,
      extra_installments: extraInstallments
    })

    return {
      summary: this.calculateSummary(result.payments),
      payments: result.payments
    }
  }

  /**
   * Calculate lower payment scenario with extra payments
   */
  private static calculateLowerPaymentScenario(
    amount: number,
    interest: number,
    termYears: number,
    installmentsPerYear: number,
    propertyInsurance: number,
    loanInsurance: number,
    extraInstallments: ExtraInstallment[]
  ) {
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
      interest,
      installments_per_year: installmentsPerYear,
      property_insurance: propertyInsurance,
      loan_protection_insurance: loanInsurance
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
    rateChanges: RateChange[]
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
        interest: currentInterest,
        installments_per_year: installmentsPerYear,
        property_insurance: propertyInsurance,
        loan_protection_insurance: loanInsurance,
        past_months: pastMonths
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
        interest: currentInterest,
        installments_per_year: installmentsPerYear,
        property_insurance: propertyInsurance,
        loan_protection_insurance: loanInsurance,
        past_months: pastMonths
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