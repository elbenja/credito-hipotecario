import type { 
  BaseAmortizationValues,
  CalculationResults,
  PaymentDetail,
  Property,
  BonusRule
} from '../types/common';

export class LoanCalculator {
  private static readonly FIXED_VALUES = {
    SUGGESTED_TERM_YEARS: 20,
    SUGGESTED_DOWN_PAYMENT_PERCENT: 10,
    SUGGESTED_INSTALLMENTS: 12
  } as const;

  private static readonly MONTHS_IN_YEAR = 12;

  // Add property to store exchange rate
  private exchangeRate: number = 3.7167; // Default exchange rate

  // Method to update exchange rate
  setExchangeRate(rate: number) {
    this.exchangeRate = rate;
  }

  // Helper method to convert currency to PEN
  private convertToPEN(amount: number, currency: string): number {
    if (currency === 'PEN') return amount;
    return amount * this.exchangeRate;
  }

  // Change from private to public so it can be used by components
  calculateBonus(property: Property, externalBonusRules?: BonusRule[]): number {
    // console.log('==== CALCULATE BONUS DEBUG ====');
    // console.log('Property is First Home:', property?.is_first_home);
    
    if (!property || !property.is_first_home) {
      // console.log('Early return - not a first home or no property provided');
      // console.log('=============================');
      return 0;
    }

    const propertyValueInPEN = this.convertToPEN(property.price_cost, property.currency);
    // console.log('Property Value in PEN:', propertyValueInPEN);
    
    // Use provided external rules or property's bonus rules
    const bonusRules = externalBonusRules || property.bonus_rules || [];
    // console.log('Bonus Rules being used:', bonusRules);
    // console.log('Number of rules:', bonusRules.length);
    
    const applicableRule = bonusRules.find(
      (rule: BonusRule) => propertyValueInPEN >= rule.min_value && propertyValueInPEN <= rule.max_value
    );
    
    // console.log('Applicable Rule found:', applicableRule ? 'Yes' : 'No');
    // console.log('Applicable Rule:', applicableRule);

    if (!applicableRule) {
      console.log('No applicable rule found, returning 0 bonus');
      console.log('=============================');
      return 0;
    }

    const bonusValue = property.is_sustainable 
      ? applicableRule.sustainable_bonus 
      : applicableRule.traditional_bonus;
      
    // console.log('Property is Sustainable:', property.is_sustainable);
    // console.log('Bonus Value Selected:', bonusValue);
    // console.log('=============================');
    
    return bonusValue;
  }

  // New method to fetch bonus rules from the database
  async fetchBonusRules(supabase: any): Promise<BonusRule[]> {
    try {
      const { data, error } = await supabase
        .from("bonus_rules")
        .select("*")
        .order('min_value', { ascending: true });

      if (error) {
        // console.error("Error loading bonus rules:", error);
        return [];
      }

      return data || [];
    } catch (error) {
      // console.error("Error loading bonus rules:", error);
      return [];
    }
  }

  // Calculate loan amount with option to provide external bonus rules
  calculateLoanAmount(property: Property, downPayment: number, externalBonusRules?: BonusRule[]): number {
    if (!property) return 0;

    // console.log('==== CALCULATE LOAN AMOUNT DEBUG ====');
    // console.log('Property:', property);
    // console.log('Down Payment:', downPayment);
    // console.log('External Bonus Rules provided:', externalBonusRules ? `Yes (${externalBonusRules.length} rules)` : 'No');
    // console.log('External Bonus Rules:', externalBonusRules);
    
    const bonus = this.calculateBonus(property, externalBonusRules);
    // console.log('Calculated Bonus (in PEN):', bonus);
    
    const bonusInPropertyCurrency = property.currency === 'USD' 
      ? bonus / this.exchangeRate
      : bonus;
    // console.log('Bonus in Property Currency:', bonusInPropertyCurrency);
    // console.log('Exchange Rate:', this.exchangeRate);
    
    const loanAmount = property.price_cost - bonusInPropertyCurrency - downPayment;
    // console.log('Final Loan Amount:', loanAmount);
    // console.log('================================');
    
    return loanAmount;
  }

  // New method to handle property price updates and recalculate mortgage values
  async recalculateMortgageFromProperty(supabase: any, propertyId: string, updatedProperty: Property): Promise<void> {
    try {
      // 1. Get all mortgages related to this property
      const { data: mortgages, error: mortgagesError } = await supabase
        .from("mortgages")
        .select("id, down_payment")
        .eq("property_id", propertyId);
        
      if (mortgagesError) throw mortgagesError;
      
      // 2. Get bonus rules
      const bonusRules = await this.fetchBonusRules(supabase);
      
      // 3. Update each mortgage with the new loan amount
      for (const mortgage of mortgages || []) {
        const newLoanAmount = this.calculateLoanAmount(updatedProperty, mortgage.down_payment, bonusRules);
        
        // Update the mortgage with the new loan amount
        const { error: updateError } = await supabase
          .from("mortgages")
          .update({ loan_amount: newLoanAmount })
          .eq('id', mortgage.id);
          
        if (updateError) throw updateError;
        
        console.log(`Updated mortgage ${mortgage.id} with new loan amount: ${newLoanAmount}`);
      }
    } catch (error) {
      console.error("Error recalculating mortgages after property update:", error);
      throw error;
    }
  }

  // Add new method for goal-seeking calculation
  private findCorrectMonthlyInstallment(
    loanAmount: number,
    annualRate: number,
    termYears: number,
    installmentsPerYear: number
  ): number {
    // Convert to effective monthly rate using EAR formula
    // Formula: monthlyRate = (1 + annualRate/100)^(1/12) - 1
    const monthlyRate = Math.pow(1 + annualRate/100, 1/12) - 1;
    
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
    // Convert to effective monthly rate using EAR formula
    const monthlyRate = Math.pow(1 + annualRate/100, 1/12) - 1;
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
    // Convert to effective monthly rate using EAR formula
    const monthlyRate = Math.pow(1 + baseValues.interest_rate/100, 1/12) - 1;
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
      down_payment: property.price_cost * (LoanCalculator.FIXED_VALUES.SUGGESTED_DOWN_PAYMENT_PERCENT / 100),
      down_payment_percentage: LoanCalculator.FIXED_VALUES.SUGGESTED_DOWN_PAYMENT_PERCENT,
      installments_per_year: LoanCalculator.FIXED_VALUES.SUGGESTED_INSTALLMENTS
    };
  }
} 