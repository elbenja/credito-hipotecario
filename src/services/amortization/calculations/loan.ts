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

  // Add new method for goal-seeking calculation
  private findCorrectMonthlyInstallment(
    loanAmount: number,
    annualRate: number,
    termYears: number,
    installmentsPerYear: number
  ): number {
    const monthlyRate = (annualRate / 100) / installmentsPerYear;
    
    // Function to calculate final balance for a given monthly installment
    const calculateFinalBalance = (monthlyInstallmentGuess: number): number => {
      let balance = loanAmount;
      const months = termYears * 12;
      
      for (let i = 0; i < months; i++) {
        const isDoubleMonth = installmentsPerYear === 14 && (i % 12 === 6 || i % 12 === 11);
        const interest = Number((balance * monthlyRate).toFixed(10));
        const installment = isDoubleMonth ? monthlyInstallmentGuess * 2 : monthlyInstallmentGuess;
        const principal = Number((installment - interest).toFixed(10));
        balance = Number((balance - principal).toFixed(10));
      }
      
      return balance;
    };

    // Binary search implementation
    let low = 0;
    let high = loanAmount * 2; // Start with a high upper bound
    let guess = (low + high) / 2;
    const tolerance = 0.0000001;
    let iterations = 0;
    const maxIterations = 1000;

    while (Math.abs(calculateFinalBalance(guess)) > tolerance && iterations < maxIterations) {
      const balance = calculateFinalBalance(guess);
      
      if (balance > 0) {
        low = guess;
      } else {
        high = guess;
      }
      
      guess = Number(((low + high) / 2).toFixed(10));
      iterations++;
    }

    return guess;
  }

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
    // Use the goal-seeking method for 14 installments per year
    if (installmentsPerYear === 14) {
      return this.findCorrectMonthlyInstallment(loanAmount, annualRate, termYears, installmentsPerYear);
    }

    // Use the standard formula for 12 installments
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
    let remainingBalance = Number(loanAmount.toFixed(10));
    let paymentDate = new Date(baseValues.first_installment_date);
    
    // Calculate base installment amount (loan payment only, without insurances)
    const baseMonthlyPayment = this.calculateMonthlyPayment(
      loanAmount,
      baseValues.interest_rate,
      baseValues.term_years,
      baseValues.installments_per_year
    );

    const totalPayments = baseValues.term_years * baseValues.installments_per_year;

    for (let i = 1; i <= totalPayments; i++) {
      const isDoublePayment = baseValues.installments_per_year === 14 && 
        (paymentDate.getMonth() === 6 || paymentDate.getMonth() === 11);

      // Base payment without insurance
      const currentBasePayment = isDoublePayment ? baseMonthlyPayment * 2 : baseMonthlyPayment;
      
      // Insurance amounts (monthly)
      const monthlyPropertyInsurance = Number(property.property_insurance || 0);
      const monthlyLoanProtection = Number(baseValues.loan_protection_insurance || 0);
      
      // Double the insurance for double payment months
      const currentPropertyInsurance = isDoublePayment ? monthlyPropertyInsurance * 2 : monthlyPropertyInsurance;
      const currentLoanProtection = isDoublePayment ? monthlyLoanProtection * 2 : monthlyLoanProtection;

      const interestPayment = Number((remainingBalance * monthlyRate).toFixed(10));
      const principalPayment = Number((currentBasePayment - interestPayment).toFixed(10));
      const endingBalance = i === totalPayments ? 0 : Number((remainingBalance - principalPayment).toFixed(10));

      // Total payment includes base payment plus both insurances
      const totalPayment = Number((currentBasePayment + currentPropertyInsurance + currentLoanProtection).toFixed(10));

      const payment: PaymentDetail = {
        date: new Date(paymentDate),
        payment_number: i,
        beginning_balance: remainingBalance,
        scheduled_payment: totalPayment,
        extra_payment: 0,
        total_payment: totalPayment,
        principal: principalPayment,
        interest: interestPayment,
        ending_balance: endingBalance,
        property_insurance: currentPropertyInsurance,
        loan_protection_insurance: currentLoanProtection,
        is_extra_payment: false,
        is_double_payment: isDoublePayment
      };

      schedule.push(payment);
      remainingBalance = endingBalance;
      
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
    
    // Calculate base monthly payment (without insurances)
    const baseMonthlyPayment = this.calculateMonthlyPayment(
      loanAmount,
      baseValues.interest_rate,
      baseValues.term_years,
      baseValues.installments_per_year
    );

    // Add monthly insurance amounts to get total monthly payment
    const monthlyPropertyInsurance = Number(property.property_insurance || 0);
    const monthlyLoanProtection = Number(baseValues.loan_protection_insurance || 0);
    const totalMonthlyPayment = Number((baseMonthlyPayment + monthlyPropertyInsurance + monthlyLoanProtection).toFixed(10));

    const schedule = this.generatePaymentSchedule(loanAmount, baseValues, property);
    const totalMonths = baseValues.term_years * LoanCalculator.MONTHS_IN_YEAR;

    const totalInterestAndInsurance = schedule.reduce((sum, payment) => 
      sum + payment.interest + payment.property_insurance + payment.loan_protection_insurance,
      0
    );

    return {
      loan_amount: loanAmount,
      total_interest_and_insurance: totalInterestAndInsurance,
      total_months: totalMonths,
      base_monthly_payment: baseMonthlyPayment,
      monthly_payment: totalMonthlyPayment,
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