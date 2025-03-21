import type { PaymentRow } from "../types/common"

interface GoalSeekInput {
  amount: number
  months: number
  yearly_interest_rate: number
  past_months?: number
  installments_per_year?: number
  property_insurance?: number
  loan_protection_insurance?: number
  first_installment_date?: Date
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
      yearly_interest_rate,
      past_months,
      installments_per_year = 12,
      property_insurance = 0,
      loan_protection_insurance = 0,
      first_installment_date
    } = input
    
    // Convert yearly interest rate to monthly using Effective Annual Rate formula
    const annualRate = yearly_interest_rate / 100
    const monthlyInterestRate = Math.pow(1 + annualRate, 1/12) - 1

    // If interest rate is 0, simple division
    if (monthlyInterestRate === 0) {
      const base_installment = amount / months + property_insurance
      return {
        base_installment,
        total_months: (past_months || 0) + months,
        payments: this.generatePaymentSchedule(
          amount, 
          base_installment, 
          months, 
          0, 
          installments_per_year,
          property_insurance, 
          loan_protection_insurance,
          first_installment_date
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
        loan_protection_insurance,
        first_installment_date
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
      total_months: (past_months || 0) + months,
      payments: this.generatePaymentSchedule(
        amount,
        finalPayment,
        months,
        monthlyInterestRate,
        installments_per_year,
        property_insurance,
        loan_protection_insurance,
        first_installment_date
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
    loan_protection_insurance: number,
    first_installment_date?: Date
  ): number {
    let balance = principal
    
    // Use the provided first installment date or default to current date
    const baseDate = first_installment_date || new Date();

    for (let i = 0; i < months; i++) {
      // Create a new date object for each payment, preserving the day of month from base date
      const paymentDate = new Date(baseDate);
      // Use full date copying to ensure the exact day is preserved
      paymentDate.setFullYear(
        baseDate.getFullYear(),
        baseDate.getMonth() + i,
        baseDate.getDate()
      );
      
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
      
      // Update balance
      balance -= availableForPrincipal;
    }

    return balance;
  }

  /**
   * Generate the payment schedule with all breakdown details
   */
  private static generatePaymentSchedule(
    principal: number,
    payment: number, 
    months: number,
    monthlyInterestRate: number,
    installmentsPerYear: number,
    property_insurance: number,
    loan_protection_insurance: number,
    first_installment_date?: Date
  ): PaymentRow[] {
    const payments: PaymentRow[] = []
    let balance = principal
    
    // Use the provided first installment date or default to current date
    const baseDate = first_installment_date || new Date();

    for (let i = 0; i < months; i++) {
      // Create a new date object for each payment, preserving the day of month from base date
      const paymentDate = new Date(baseDate);
      // Use full date copying to ensure the exact day is preserved
      paymentDate.setFullYear(
        baseDate.getFullYear(),
        baseDate.getMonth() + i,
        baseDate.getDate()
      );
      
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

      payments.push(row);
      balance = row.ending_balance;
    }

    return payments;
  }
} 