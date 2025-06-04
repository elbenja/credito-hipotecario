import { ScenarioResult, PaymentRow } from "@/types/common";
import { MortgageBundle } from "@/hooks/useMortgageBundle";

/**
 * Utility functions for working with mortgage scenario payments
 */

/**
 * Formats currency for display based on the mortgage's currency
 */
export function formatCurrency(amount: number, currency: string = "PEN"): string {
  const locale = currency === "USD" ? "en-US" : "es-PE";
  const currencySymbol = currency === "USD" ? "USD" : "PEN";
  
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: currencySymbol,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Get payment breakdown for a specific month
 */
export function getPaymentBreakdown(payment: PaymentRow) {
  return {
    paymentDate: payment.payment_date,
    monthlyPayment: payment.monthly_payment,
    principal: payment.principal || payment.capital,
    interest: payment.monthly_interest || payment.interest,
    propertyInsurance: payment.property_insurance,
    loanInsurance: payment.monthly_loan_insurance || payment.loan_insurance,
    beginningBalance: payment.beginning_balance,
    endingBalance: payment.ending_balance,
    isDifferentFromBase: payment.is_different_from_base,
  };
}

/**
 * Calculate total amounts for the entire scenario
 */
export function calculateScenarioTotals(payments: PaymentRow[]) {
  return payments.reduce(
    (totals, payment) => {
      const principal = payment.principal || payment.capital;
      const interest = payment.monthly_interest || payment.interest;
      const loanInsurance = payment.monthly_loan_insurance || payment.loan_insurance;
      
      return {
        totalPayments: totals.totalPayments + payment.monthly_payment,
        totalPrincipal: totals.totalPrincipal + principal,
        totalInterest: totals.totalInterest + interest,
        totalPropertyInsurance: totals.totalPropertyInsurance + payment.property_insurance,
        totalLoanInsurance: totals.totalLoanInsurance + loanInsurance,
      };
    },
    {
      totalPayments: 0,
      totalPrincipal: 0,
      totalInterest: 0,
      totalPropertyInsurance: 0,
      totalLoanInsurance: 0,
    }
  );
}

/**
 * Find when the loan will be paid off
 */
export function findPayoffDate(payments: PaymentRow[]): Date | null {
  const lastPayment = payments[payments.length - 1];
  return lastPayment ? lastPayment.payment_date : null;
}

/**
 * Get payments for a specific year
 */
export function getPaymentsByYear(payments: PaymentRow[], year: number): PaymentRow[] {
  return payments.filter(payment => payment.payment_date.getFullYear() === year);
}

/**
 * Compare two scenarios and get the differences
 */
export function compareScenarios(scenario1: ScenarioResult, scenario2: ScenarioResult) {
  return {
    monthlyPaymentDiff: scenario1.summary.monthly_payment - scenario2.summary.monthly_payment,
    totalMonthsDiff: scenario1.summary.total_months - scenario2.summary.total_months,
    totalInterestAndInsuranceDiff: 
      scenario1.summary.total_interest_and_insurance - scenario2.summary.total_interest_and_insurance,
    timeSavingsYears: (scenario2.summary.total_months - scenario1.summary.total_months) / 12,
  };
}

/**
 * Get scenario description based on type
 */
export function getScenarioDescription(scenarioType: string): string {
  const descriptions = {
    regular: "Standard monthly payments with original terms",
    accelerated: "Extra payments to reduce loan term and interest",
    lower_payment: "Reduced monthly payments with lump sum payments",
    new_rate: "Modified interest rate scenario",
  };
  
  return descriptions[scenarioType as keyof typeof descriptions] || "Unknown scenario";
}

/**
 * Check if a mortgage bundle has complete data for calculations
 */
export function validateMortgageBundle(bundle: MortgageBundle): {
  isValid: boolean;
  missingFields: string[];
} {
  const requiredFields = [
    'loan_amount',
    'interest_rate', 
    'term_years',
    'installments_per_year',
    'first_installment_date',
    'loan_protection_insurance'
  ];
  
  const missingFields: string[] = [];
  
  requiredFields.forEach(field => {
    if (bundle.mortgage[field as keyof typeof bundle.mortgage] === undefined || 
        bundle.mortgage[field as keyof typeof bundle.mortgage] === null) {
      missingFields.push(field);
    }
  });
  
  // Check property insurance
  if (!bundle.mortgage.property?.property_insurance && bundle.mortgage.property?.property_insurance !== 0) {
    missingFields.push('property.property_insurance');
  }
  
  return {
    isValid: missingFields.length === 0,
    missingFields
  };
}

/**
 * Generate a summary report for a saved scenario
 */
export function generateScenarioReport(
  bundle: MortgageBundle,
  scenarioResult: ScenarioResult
): {
  mortgageInfo: {
    name: string;
    loanAmount: number;
    interestRate: number;
    termYears: number;
    currency: string;
  };
  scenarioInfo: {
    type: string;
    description: string;
    monthlyPayment: number;
    totalMonths: number;
    totalInterestAndInsurance: number;
    breakevenPoint?: number | null;
  };
  paymentTotals: ReturnType<typeof calculateScenarioTotals>;
  payoffDate: Date | null;
} {
  const totals = calculateScenarioTotals(scenarioResult.payments);
  const payoffDate = findPayoffDate(scenarioResult.payments);
  
  return {
    mortgageInfo: {
      name: bundle.mortgage.name,
      loanAmount: bundle.mortgage.loan_amount,
      interestRate: bundle.mortgage.interest_rate,
      termYears: bundle.mortgage.term_years,
      currency: bundle.mortgage.property.currency || "PEN",
    },
    scenarioInfo: {
      type: bundle.mortgage.saved_scenario || "unknown",
      description: getScenarioDescription(bundle.mortgage.saved_scenario || ""),
      monthlyPayment: scenarioResult.summary.monthly_payment,
      totalMonths: scenarioResult.summary.total_months,
      totalInterestAndInsurance: scenarioResult.summary.total_interest_and_insurance,
      breakevenPoint: scenarioResult.summary.breakeven_point,
    },
    paymentTotals: totals,
    payoffDate,
  };
} 