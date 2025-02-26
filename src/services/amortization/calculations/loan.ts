import type { 
  BaseAmortizationValues,
  CalculationResults,
  PaymentDetail,
  Property
} from '../types/common';

export class LoanCalculator {
  private static readonly FIXED_VALUES = {
    SUGGESTED_TERM_YEARS: 20,
    SUGGESTED_DOWN_PAYMENT_PERCENT: 10,
    SUGGESTED_INSTALLMENTS: 12
  } as const;

  private static readonly MONTHS_IN_YEAR = 12;

  calculateLoanAmount(property: Property, downPayment: number): number {
    // Apply bonus before down payment
    const costAfterBonus = property.cost - property.bonus;
    return costAfterBonus - downPayment;
  }

  calculateMonthlyPayment(
    loanAmount: number,
    annualRate: number,
    termYears: number,
    installmentsPerYear: number
  ): number {
    const monthlyRate = (annualRate / 100) / installmentsPerYear;
    const totalPayments = termYears * installmentsPerYear;
    
    if (monthlyRate === 0) {
      return loanAmount / totalPayments;
    }

    return (
      (loanAmount * monthlyRate * Math.pow(1 + monthlyRate, totalPayments)) /
      (Math.pow(1 + monthlyRate, totalPayments) - 1)
    );
  }

  generatePaymentSchedule(
    loanAmount: number,
    baseValues: BaseAmortizationValues,
    property: Property
  ): PaymentDetail[] {
    const schedule: PaymentDetail[] = [];
    const monthlyRate = (baseValues.interest_rate / 100) / baseValues.installments_per_year;
    let remainingBalance = loanAmount;
    let paymentDate = new Date(baseValues.first_installment_date);
    const monthlyPayment = this.calculateMonthlyPayment(
      loanAmount,
      baseValues.interest_rate,
      baseValues.term_years,
      baseValues.installments_per_year
    );

    for (let i = 1; i <= baseValues.term_years * baseValues.installments_per_year; i++) {
      const isDoublePayment = baseValues.installments_per_year === 14 && 
        (paymentDate.getMonth() === 6 || paymentDate.getMonth() === 11); // July or December

      const currentPayment = isDoublePayment ? monthlyPayment * 2 : monthlyPayment;
      const interestPayment = remainingBalance * monthlyRate;
      const principalPayment = currentPayment - interestPayment;

      const payment: PaymentDetail = {
        date: new Date(paymentDate),
        payment_number: i,
        beginning_balance: remainingBalance,
        scheduled_payment: currentPayment,
        extra_payment: 0,
        total_payment: currentPayment,
        principal: principalPayment,
        interest: interestPayment,
        ending_balance: remainingBalance - principalPayment,
        property_insurance: property.property_insurance,
        loan_protection_insurance: baseValues.loan_protection_insurance,
        is_extra_payment: false,
        is_double_payment: isDoublePayment
      };

      schedule.push(payment);
      remainingBalance = payment.ending_balance;
      
      // Move to next payment date
      paymentDate.setMonth(paymentDate.getMonth() + 1);
    }

    return schedule;
  }

  calculateResults(
    property: Property,
    baseValues: BaseAmortizationValues
  ): CalculationResults {
    const loanAmount = this.calculateLoanAmount(property, baseValues.down_payment);
    const schedule = this.generatePaymentSchedule(loanAmount, baseValues, property);
    
    const totalMonths = baseValues.term_years * LoanCalculator.MONTHS_IN_YEAR;
    const monthlyPayment = this.calculateMonthlyPayment(
      loanAmount,
      baseValues.interest_rate,
      baseValues.term_years,
      baseValues.installments_per_year
    );

    const totalInterestAndInsurance = schedule.reduce((sum, payment) => 
      sum + payment.interest + payment.property_insurance + payment.loan_protection_insurance,
      0
    );

    return {
      loan_amount: loanAmount,
      total_interest_and_insurance: totalInterestAndInsurance,
      total_months: totalMonths,
      monthly_payment: monthlyPayment,
      payment_schedule: schedule
    };
  }

  getSuggestedValues(property: Property): Partial<BaseAmortizationValues> {
    return {
      term_years: LoanCalculator.FIXED_VALUES.SUGGESTED_TERM_YEARS,
      down_payment: property.cost * (LoanCalculator.FIXED_VALUES.SUGGESTED_DOWN_PAYMENT_PERCENT / 100),
      down_payment_percentage: LoanCalculator.FIXED_VALUES.SUGGESTED_DOWN_PAYMENT_PERCENT,
      installments_per_year: LoanCalculator.FIXED_VALUES.SUGGESTED_INSTALLMENTS
    };
  }
} 