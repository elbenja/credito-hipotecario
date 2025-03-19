import type { PaymentRow } from "../types/common"

interface GoalSeekInput {
  amount: number
  months: number
  interest: number
  installments_per_year: number
  property_insurance: number
  loan_protection_insurance: number
  past_months?: number
}

interface GoalSeekResult {
  base_installment: number
  total_months: number
  payments: PaymentRow[]
}

/**
 * GoalSeek Service
 * Determines the exact monthly payment required to reach zero balance at loan end
 */
export class GoalSeekService {
  private static readonly PRECISION = 0.01
  private static readonly MAX_ITERATIONS = 100

  /**
   * Calculate the monthly payment that will result in a zero balance at the end of the term
   */
  static calculate(input: GoalSeekInput): GoalSeekResult {
    const {
      amount,
      months,
      interest,
      installments_per_year = 12,
      property_insurance,
      loan_protection_insurance,
      past_months = 0
    } = input

    // Convert annual interest rate to monthly using Effective Annual Rate formula
    const monthlyInterestRate = Math.pow(1 + interest/100, 1/12) - 1

    // If interest rate is 0, simple division
    if (monthlyInterestRate === 0) {
      const base_installment = amount / months + property_insurance
      return {
        base_installment,
        total_months: past_months + months,
        payments: this.generatePaymentSchedule(
          amount, 
          base_installment, 
          months, 
          0, 
          installments_per_year,
          property_insurance, 
          loan_protection_insurance
        )
      }
    }

    // Initial guess for monthly payment using standard amortization formula
    let payment = (amount * monthlyInterestRate * Math.pow(1 + monthlyInterestRate, months)) /
                 (Math.pow(1 + monthlyInterestRate, months) - 1)

    // Add property insurance to base payment
    payment += property_insurance

    // Binary search to find the correct payment amount that results in zero balance
    // accounting for double payments in July and December for 14 installments option
    let low = 0
    let high = payment * 2
    let iterations = 0
    let finalPayment = payment
    
    while (iterations < this.MAX_ITERATIONS) {
      const balance = this.calculateFinalBalance(
        amount,
        payment,
        months,
        monthlyInterestRate,
        installments_per_year,
        property_insurance,
        loan_protection_insurance
      )

      if (Math.abs(balance) < this.PRECISION) {
        finalPayment = payment
        break
      }

      if (balance > 0) {
        low = payment
        payment = (payment + high) / 2
      } else {
        high = payment
        payment = (payment + low) / 2
      }

      iterations++
    }

    return {
      base_installment: finalPayment,
      total_months: past_months + months,
      payments: this.generatePaymentSchedule(
        amount,
        finalPayment,
        months,
        monthlyInterestRate,
        installments_per_year,
        property_insurance,
        loan_protection_insurance
      )
    }
  }

  /**
   * Calculate the final balance after making payments for the specified term
   */
  private static calculateFinalBalance(
    principal: number,
    payment: number,
    months: number,
    monthlyInterestRate: number,
    installmentsPerYear: number,
    property_insurance: number,
    loan_protection_insurance: number
  ): number {
    let balance = principal

    for (let i = 0; i < months; i++) {
      // Determine if this is a double payment month (July or December for 14 installments)
      const month = i % 12;
      const isDoublePayment = installmentsPerYear === 14 && (month === 6 || month === 11);
      
      // Get payment for this month (could be double for July/December)
      const currentPayment = isDoublePayment ? payment * 2 : payment;
      
      // Calculate interest and insurance
      const monthlyInterest = balance * monthlyInterestRate;
      const monthlyLoanInsurance = balance * (loan_protection_insurance / 100);
      
      // Adjust insurance for double payment months
      const currentPropertyInsurance = isDoublePayment ? property_insurance * 2 : property_insurance;
      const currentLoanInsurance = isDoublePayment ? monthlyLoanInsurance * 2 : monthlyLoanInsurance;
      
      // Calculate principal reduction
      const availableForPrincipal = currentPayment - monthlyInterest - currentPropertyInsurance - currentLoanInsurance;
      
      // Update balance
      balance -= availableForPrincipal;
    }

    return balance;
  }

  /**
   * Generate a complete payment schedule
   */
  private static generatePaymentSchedule(
    principal: number,
    payment: number,
    months: number,
    monthlyInterestRate: number,
    installmentsPerYear: number,
    property_insurance: number,
    loan_protection_insurance: number
  ): PaymentRow[] {
    const schedule: PaymentRow[] = [];
    let balance = principal;
    const baseDate = new Date();

    for (let i = 0; i < months; i++) {
      const paymentDate = new Date(baseDate);
      paymentDate.setMonth(baseDate.getMonth() + i);
      
      // Determine if this is a double payment month (July or December for 14 installments)
      const month = paymentDate.getMonth();
      const isDoublePayment = installmentsPerYear === 14 && (month === 6 || month === 11);
      
      // Get payment for this month (could be double for July/December)
      const currentPayment = isDoublePayment ? payment * 2 : payment;
      
      // Calculate interest and insurance
      const monthlyInterest = balance * monthlyInterestRate;
      const monthlyLoanInsurance = balance * (loan_protection_insurance / 100);
      
      // Adjust insurance for double payment months
      const currentPropertyInsurance = isDoublePayment ? property_insurance * 2 : property_insurance;
      const currentLoanInsurance = isDoublePayment ? monthlyLoanInsurance * 2 : monthlyLoanInsurance;
      
      // Calculate principal reduction
      const availableForPrincipal = currentPayment - monthlyInterest - currentPropertyInsurance - currentLoanInsurance;
      
      const row: PaymentRow = {
        payment_date: paymentDate,
        beginning_balance: balance,
        monthly_payment: currentPayment,
        monthly_interest: monthlyInterest,
        property_insurance: currentPropertyInsurance,
        monthly_loan_insurance: currentLoanInsurance,
        principal: availableForPrincipal,
        ending_balance: balance - availableForPrincipal,
        is_different_from_base: false
      };

      schedule.push(row);
      balance = row.ending_balance;
    }

    return schedule;
  }
} 