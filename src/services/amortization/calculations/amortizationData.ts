import type { Property } from "../types/common"

export interface AmortizationRow {
  row: number;
  date: Date;
  monthlyPayment: number;
  monthlyInstallment: number;
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
    return (interestRate / 100) / installmentsPerYear;
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

    // Calculate base monthly installment using the same method as TestCalculator
    const baseMonthlyInstallment = this.findCorrectMonthlyInstallment(
      loanAmount,
      monthlyRate,
      totalMonths,
      installmentsPerYear
    );

    const rows: AmortizationRow[] = [];
    let currentDate = new Date(firstInstallmentDate);
    let beginBalance = loanAmount;

    for (let i = 0; i < totalMonths; i++) {
      const currentMonth = currentDate.getMonth();
      const isDoublePaymentMonth = installmentsPerYear === 14 && (currentMonth === 6 || currentMonth === 11);
      const monthlyInstallment = isDoublePaymentMonth ? baseMonthlyInstallment * 2 : baseMonthlyInstallment;
      
      // Insurance amounts
      const currentPropertyInsurance = isDoublePaymentMonth ? propertyInsurance * 2 : propertyInsurance;
      const currentLoanProtection = isDoublePaymentMonth ? loanProtection * 2 : loanProtection;
      const monthlyPaymentAmount = monthlyInstallment + currentPropertyInsurance + currentLoanProtection;
      
      const interest = Number((beginBalance * monthlyRate).toFixed(10));
      const principal = Number((monthlyInstallment - interest).toFixed(10));
      const endBalance = i === totalMonths - 1 ? 0 : Number((beginBalance - principal).toFixed(10));
      
      rows.push({
        row: i + 1,
        date: new Date(currentDate),
        monthlyPayment: Number(monthlyPaymentAmount.toFixed(10)),
        monthlyInstallment: Number(monthlyInstallment.toFixed(10)),
        interestAndPayments: Number((interest + monthlyInstallment).toFixed(10)),
        principal: Number(principal.toFixed(10)),
        interest: Number(interest.toFixed(10)),
        beginBalance: Number(beginBalance.toFixed(10)),
        endBalance: endBalance
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
    installmentsPerYear: number
  ): number {
    // Binary search to find the correct monthly installment
    const calculateFinalBalance = (monthlyInstallmentGuess: number): number => {
      let balance = loanAmount;
      
      for (let i = 0; i < totalMonths; i++) {
        const isDoubleMonth = installmentsPerYear === 14 && (i % 12 === 6 || i % 12 === 11);
        const interest = Number((balance * monthlyRate).toFixed(10));
        const installment = isDoubleMonth ? monthlyInstallmentGuess * 2 : monthlyInstallmentGuess;
        const principal = Number((installment - interest).toFixed(10));
        balance = Number((balance - principal).toFixed(10));
      }
      
      return balance;
    };

    let low = 0;
    let high = loanAmount * 2;
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