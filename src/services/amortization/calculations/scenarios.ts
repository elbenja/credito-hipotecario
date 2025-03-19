import type {
  BaseAmortizationValues,
  CalculationResults,
  ExtraPayment,
  PaymentDetail,
  Property,
  RateChange
} from '../types/common';
import type {
  AcceleratedScenario,
  LowerPaymentScenario,
  NewRateScenario,
  RegularScenario,
  Scenario,
  ScenarioType
} from '../types/scenarios';
import { LoanCalculator } from './loan';

export class ScenarioCalculator {
  private loanCalculator: LoanCalculator;

  constructor() {
    this.loanCalculator = new LoanCalculator();
  }

  private applyExtraPayments(
    schedule: PaymentDetail[],
    extraPayments: ExtraPayment[]
  ): PaymentDetail[] {
    const modifiedSchedule = [...schedule];
    
    for (const extraPayment of extraPayments) {
      const paymentDate = new Date(extraPayment.date);
      const paymentIndex = modifiedSchedule.findIndex(
        payment => payment.date.getTime() === paymentDate.getTime()
      );

      if (paymentIndex === -1) continue;

      // Apply extra payment
      const payment = modifiedSchedule[paymentIndex];
      payment.extra_payment = extraPayment.amount;
      payment.total_payment = payment.scheduled_payment + extraPayment.amount;
      payment.principal += extraPayment.amount;
      payment.ending_balance -= extraPayment.amount;
      payment.is_extra_payment = true;

      // Recalculate remaining payments
      for (let i = paymentIndex + 1; i < modifiedSchedule.length; i++) {
        const currentPayment = modifiedSchedule[i];
        currentPayment.beginning_balance = modifiedSchedule[i - 1].ending_balance;
        
        const monthlyRate = currentPayment.interest / currentPayment.beginning_balance;
        currentPayment.interest = currentPayment.beginning_balance * monthlyRate;
        currentPayment.principal = currentPayment.scheduled_payment - currentPayment.interest;
        currentPayment.ending_balance = currentPayment.beginning_balance - currentPayment.principal;
      }
    }

    return modifiedSchedule;
  }

  private applyRateChanges(
    schedule: PaymentDetail[],
    rateChanges: RateChange[],
    loanAmount: number,
    baseValues: BaseAmortizationValues
  ): PaymentDetail[] {
    const modifiedSchedule = [...schedule];
    
    for (const rateChange of rateChanges) {
      const changeDate = new Date(rateChange.effective_date);
      const changeIndex = modifiedSchedule.findIndex(
        payment => payment.date.getTime() === changeDate.getTime()
      );

      if (changeIndex === -1) continue;

      // Calculate new monthly payment with new rate
      const remainingTermMonths = modifiedSchedule.length - changeIndex;
      const remainingBalance = modifiedSchedule[changeIndex].beginning_balance;
      const newMonthlyPayment = this.loanCalculator.calculateMonthlyPayment(
        remainingBalance,
        rateChange.new_interest_rate,
        remainingTermMonths / baseValues.installments_per_year,
        baseValues.installments_per_year
      );

      // Recalculate remaining payments with new rate
      for (let i = changeIndex; i < modifiedSchedule.length; i++) {
        const payment = modifiedSchedule[i];
        // Convert to effective monthly rate using EAR formula
        const monthlyRate = Math.pow(1 + rateChange.new_interest_rate/100, 1/12) - 1;
        
        payment.scheduled_payment = newMonthlyPayment;
        payment.beginning_balance = i === changeIndex ? remainingBalance : modifiedSchedule[i - 1].ending_balance;
        payment.interest = payment.beginning_balance * monthlyRate;
        payment.principal = payment.scheduled_payment - payment.interest;
        payment.total_payment = payment.scheduled_payment + (payment.extra_payment || 0);
        payment.ending_balance = payment.beginning_balance - payment.principal;
      }
    }

    return modifiedSchedule;
  }

  calculateScenario(
    type: ScenarioType,
    property: Property,
    baseValues: BaseAmortizationValues,
    scenario: Scenario
  ): CalculationResults {
    let results = this.loanCalculator.calculateResults(property, baseValues);
    let modifiedSchedule = [...results.payment_schedule];

    switch (type) {
      case 'accelerated': {
        const acceleratedScenario = scenario as AcceleratedScenario;
        modifiedSchedule = this.applyExtraPayments(
          modifiedSchedule,
          acceleratedScenario.extra_payments
        );
        break;
      }
      case 'lower_payment': {
        const lowerPaymentScenario = scenario as LowerPaymentScenario;
        modifiedSchedule = this.applyExtraPayments(
          modifiedSchedule,
          lowerPaymentScenario.extra_payments
        );
        break;
      }
      case 'new_rate': {
        const newRateScenario = scenario as NewRateScenario;
        modifiedSchedule = this.applyRateChanges(
          modifiedSchedule,
          newRateScenario.rate_changes,
          results.loan_amount,
          baseValues
        );
        break;
      }
      case 'regular':
      default:
        // Regular scenario uses base calculation
        break;
    }

    // Recalculate totals
    const totalInterestAndInsurance = modifiedSchedule.reduce(
      (sum, payment) => sum + payment.interest + payment.property_insurance + payment.loan_protection_insurance,
      0
    );

    return {
      ...results,
      payment_schedule: modifiedSchedule,
      total_interest_and_insurance: totalInterestAndInsurance,
      monthly_payment: modifiedSchedule[0].scheduled_payment
    };
  }

  generateAllScenarios(
    property: Property,
    baseValues: BaseAmortizationValues
  ): Record<ScenarioType, CalculationResults> {
    const regularScenario: RegularScenario = {
      type: 'regular',
      is_selected: true,
      calculation_results: null
    };

    const acceleratedScenario: AcceleratedScenario = {
      type: 'accelerated',
      is_selected: false,
      extra_payments: [],  // To be filled by user
      calculation_results: null
    };

    const lowerPaymentScenario: LowerPaymentScenario = {
      type: 'lower_payment',
      is_selected: false,
      extra_payments: [],  // To be filled by user
      calculation_results: null
    };

    const newRateScenario: NewRateScenario = {
      type: 'new_rate',
      is_selected: false,
      rate_changes: [],  // To be filled by user
      calculation_results: null
    };

    return {
      regular: this.calculateScenario('regular', property, baseValues, regularScenario),
      accelerated: this.calculateScenario('accelerated', property, baseValues, acceleratedScenario),
      lower_payment: this.calculateScenario('lower_payment', property, baseValues, lowerPaymentScenario),
      new_rate: this.calculateScenario('new_rate', property, baseValues, newRateScenario)
    };
  }
} 