import type { PaymentRow } from "../types/common"

interface AmortizationInput {
  amount: number
  base_installment: number
  interest: number
  installments_per_year: number  // Add installmentsPerYear parameter
  property_insurance: number
  loan_protection_insurance: number
  months?: number
}

interface AmortizationResult {
  total_to_pay: number
  total_interest: number
  payments: PaymentRow[]
}

/**
 * Amortization Service
 * Generates payment schedule for fixed term loans
 */
export class AmortizationService {
  /**
   * Calculate amortization schedule for a loan
   */
  static calculate(input: AmortizationInput): AmortizationResult {
    const {
      amount,
      base_installment,
      interest,
      installments_per_year = 12,  // Default to 12 if not provided
      property_insurance,
      loan_protection_insurance,
      months = this.calculateTotalMonths(amount, base_installment, interest)
    } = input

    // Convert annual interest rate to monthly
    const monthlyInterestRate = Math.pow(1 + interest/100, 1/12) - 1

    // Generate payment schedule
    let balance = amount
    const schedule: PaymentRow[] = []
    let totalInterest = 0
    let totalPaid = 0
    const baseDate = new Date()

    for (let i = 0; i < months; i++) {
      const currentDate = new Date(baseDate)
      currentDate.setMonth(baseDate.getMonth() + i)
      
      // Check if this is a double payment month (July or December for 14 installments)
      const currentMonth = currentDate.getMonth();
      const isDoublePayment = installments_per_year === 14 && 
        (currentMonth === 6 || currentMonth === 11);
      
      // Calculate payment components
      const monthlyInterest = balance * monthlyInterestRate
      const monthlyLoanInsurance = balance * (loan_protection_insurance / 100)
      
      // Apply double payment if needed
      const currentBaseInstallment = isDoublePayment ? base_installment * 2 : base_installment;
      const currentPropertyInsurance = isDoublePayment ? property_insurance * 2 : property_insurance;
      const currentLoanInsurance = isDoublePayment ? monthlyLoanInsurance * 2 : monthlyLoanInsurance;
      
      const availableForPrincipal = currentBaseInstallment - monthlyInterest - currentPropertyInsurance - currentLoanInsurance
      
      // Ensure the last payment exactly reaches zero
      let principal = availableForPrincipal
      if (i === months - 1 && balance < availableForPrincipal) {
        principal = balance
      }

      const payment = monthlyInterest + principal + currentPropertyInsurance + currentLoanInsurance
      
      const row: PaymentRow = {
        payment_date: currentDate,
        beginning_balance: balance,
        monthly_payment: payment,
        monthly_interest: monthlyInterest,
        property_insurance: currentPropertyInsurance,
        monthly_loan_insurance: currentLoanInsurance,
        principal: principal,
        ending_balance: balance - principal,
        is_different_from_base: isDoublePayment
      }

      schedule.push(row)
      balance = row.ending_balance
      totalInterest += monthlyInterest
      totalPaid += payment
    }

    return {
      total_to_pay: totalPaid,
      total_interest: totalInterest,
      payments: schedule
    }
  }

  /**
   * Calculate the total months required to pay off a loan
   */
  private static calculateTotalMonths(amount: number, baseInstallment: number, interest: number, installmentsPerYear = 12): number {
    // Convert annual interest rate to monthly
    const monthlyRate = Math.pow(1 + interest/100, 1/12) - 1
    
    // For 14 installments per year, we need to adjust the calculation
    if (installmentsPerYear === 14) {
      // For 14 payments per year, we need to use a more complex approach
      // The effective monthly payment becomes: (baseInstallment * 14) / 12
      const effectiveMonthlyPayment = (baseInstallment * 14) / 12;
      
      // Use standard formula with effective monthly payment
      return Math.log(effectiveMonthlyPayment / (effectiveMonthlyPayment - (amount * monthlyRate))) / Math.log(1 + monthlyRate);
    } else {
      // Standard formula for fixed installments
      return Math.log(baseInstallment / (baseInstallment - (amount * monthlyRate))) / Math.log(1 + monthlyRate)
    }
  }
} 