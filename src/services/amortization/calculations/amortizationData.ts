import type { Property } from "../types/common"

export interface AmortizationRow {
  row: number;
  date: Date;
  monthlyPayment: number;
  baseInstallment: number;
  interestAndPayments: number;
  principal: number;
  interest: number;
  beginBalance: number;
  endBalance: number;
}

export interface AmortizationChartData {
  period: number;
  monthlyPayment: number;
  principal: number;
  interest: number;
  total: number;
}

export interface AmortizationCalculationParams {
  property: Property;
  downPayment: number;
  interestRate: number;
  termYears: number;
  installmentsPerYear: 12 | 14;
  firstInstallmentDate: Date;
  propertyInsurance: number;
  loanProtection: number;
}

export class AmortizationDataService {
  private calculateMonthlyRate(interestRate: number, installmentsPerYear: number): number {
    // Convert annual percentage rate to decimal
    const annualRate = interestRate / 100;
    
    // For effective monthly rate: (1 + annual_rate)^(1/12) - 1
    // This properly accounts for compounding
    // Note: For 12 installments per year, this uses standard monthly compounding
    //       For 14 installments, we still use monthly compounding (divide by 12) as per Peruvian system
    return Math.pow(1 + annualRate, 1/12) - 1;
  }

  public calculateAmortizationSchedule(params: AmortizationCalculationParams): AmortizationRow[] {
    const {
      property,
      downPayment,
      interestRate,
      termYears,
      installmentsPerYear,
      firstInstallmentDate,
      propertyInsurance,
      loanProtection
    } = params;

    const loanAmount = property.cost - downPayment;
    const monthlyRate = this.calculateMonthlyRate(interestRate, installmentsPerYear);
    const totalMonths = termYears * 12;

    // Calculate the base monthly payment that will pay off the loan in the given term
    // This is the fixed monthly payment amount (excluding interest and insurances)
    const baseMonthlyPayment = this.findCorrectMonthlyInstallment(
      loanAmount,
      monthlyRate,
      totalMonths,
      installmentsPerYear,
      propertyInsurance,
      loanProtection
    );

    const rows: AmortizationRow[] = [];
    let currentDate = new Date(firstInstallmentDate);
    let beginBalance = loanAmount;

    for (let i = 0; i < totalMonths; i++) {
      const currentMonth = currentDate.getMonth();
      // July (6) and December (11) are double payment months for 14 installments
      const isDoublePaymentMonth = installmentsPerYear === 14 && (currentMonth === 6 || currentMonth === 11);
      
      // The base installment is the same for all months in both payment options
      // This is the principal + interest component without insurances
      const baseInstallment = baseMonthlyPayment;
      
      // For the monthly payment:
      // - For 12-installment option: Always equal to baseInstallment
      // - For 14-installment option: 
      //   - Regular months: Equal to baseInstallment
      //   - July & December: Equal to 2 * baseInstallment
      const monthlyPayment = isDoublePaymentMonth 
        ? baseInstallment * 2
        : baseInstallment;
      
      // Calculate interest
      const interest = beginBalance * monthlyRate;
      
      // Calculate loan protection as a percentage of the beginning balance
      const monthlyLoanProtection = beginBalance * (loanProtection / 100);
      
      // Insurance amounts (adjusted for double payment months)
      const currentPropertyInsurance = isDoublePaymentMonth ? propertyInsurance * 2 : propertyInsurance;
      const currentLoanProtection = isDoublePaymentMonth ? monthlyLoanProtection * 2 : monthlyLoanProtection;
      
      // Calculate principal (part of payment that reduces loan)
      // For the final payment, principal must exactly equal beginning balance
      // For other payments, principal is what remains after interest and insurances
      let principal = 0;
      if (i === totalMonths - 1) {
        // Final payment - principal equals remaining balance
        principal = beginBalance;
      } else {
        // Regular payment - principal is payment minus interest and insurances
        principal = monthlyPayment - interest - currentPropertyInsurance - currentLoanProtection;
        
        // Ensure principal doesn't cause negative balance
        if (principal > beginBalance) {
          principal = beginBalance;
        }
      }
      
      // Calculate ending balance
      const endBalance = i === totalMonths - 1 ? 0 : beginBalance - principal;
      
      rows.push({
        row: i + 1,
        date: new Date(currentDate),
        monthlyPayment: Number(monthlyPayment.toFixed(2)),
        baseInstallment: Number(baseInstallment.toFixed(2)),
        interestAndPayments: Number((interest + currentPropertyInsurance + currentLoanProtection).toFixed(2)),
        principal: Number(principal.toFixed(2)),
        interest: Number(interest.toFixed(2)),
        beginBalance: Number(beginBalance.toFixed(2)),
        endBalance: Number(endBalance.toFixed(2))
      });

      beginBalance = endBalance;
      currentDate.setMonth(currentDate.getMonth() + 1);
    }

    return rows;
  }

  private findCorrectMonthlyInstallment(
    loanAmount: number,
    monthlyRate: number,
    totalMonths: number,
    installmentsPerYear: number,
    propertyInsurance: number = 0,
    loanProtection: number = 0
  ): number {
    // For 0% interest rate, the calculation is simple
    if (monthlyRate === 0) {
      return loanAmount / totalMonths;
    }

    // Binary search to find the correct base installment amount (principal + interest only)
    // This is a constant value throughout all months - it doesn't change
    // The algorithm ensures this base installment will pay off the loan in the given term,
    // accounting for double payments in July and December for the 14-installment option
    const calculateFinalBalance = (baseInstallmentGuess: number): number => {
      let balance = loanAmount;
      
      for (let i = 0; i < totalMonths; i++) {
        // For month calculation, we need the actual month (0-11)
        // i % 12 gives us 0-11 where 0 is January, 6 is July, 11 is December
        const month = i % 12;
        const isDoubleMonth = installmentsPerYear === 14 && (month === 6 || month === 11);
        
        // Calculate interest for this month
        const monthlyInterest = balance * monthlyRate;
        
        // Calculate insurance costs
        const monthlyLoanProtectionInsurance = balance * (loanProtection / 100);
        const currentPropertyInsurance = isDoubleMonth ? propertyInsurance * 2 : propertyInsurance;
        const currentLoanProtection = isDoubleMonth ? monthlyLoanProtectionInsurance * 2 : monthlyLoanProtectionInsurance;
        
        // Monthly payment is baseInstallmentGuess or 2x for double months
        const payment = isDoubleMonth ? baseInstallmentGuess * 2 : baseInstallmentGuess;
        
        // The principal component that will reduce the balance:
        // Principal is what remains after paying interest and insurances
        const principalReduction = payment - monthlyInterest - currentPropertyInsurance - currentLoanProtection;
        
        // Update balance (principal reduction)
        balance = balance - principalReduction;
      }
      
      return balance;
    };

    // Start with reasonable bounds for the binary search
    let low = 0;
    let high = loanAmount / (totalMonths * 0.5); // Approximate upper bound
    let guess = (low + high) / 2;
    const tolerance = 0.0000001;
    let iterations = 0;
    const maxIterations = 1000;

    while (Math.abs(calculateFinalBalance(guess)) > tolerance && iterations < maxIterations) {
      const balance = calculateFinalBalance(guess);
      
      if (balance > 0) {
        // If balance is positive, our guess is too low
        low = guess;
      } else {
        // If balance is negative, our guess is too high
        high = guess;
      }
      
      guess = Number(((low + high) / 2).toFixed(10));
      iterations++;
    }

    return guess;
  }

  public getChartData(schedule: AmortizationRow[]): AmortizationChartData[] {
    const chartData: AmortizationChartData[] = [];
    
    // Group data by 6-month periods
    for (let i = 0; i < schedule.length; i += 6) {
      const row = schedule[i];
      if (row) {
        chartData.push({
          period: i / 6,
          monthlyPayment: row.monthlyPayment,
          principal: row.principal,
          interest: row.interest,
          total: row.monthlyPayment
        });
      }
    }

    return chartData;
  }
}

export const amortizationDataService = new AmortizationDataService(); 