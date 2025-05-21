export type Currency = "PEN" | "USD";

export interface Property {
  id: string;
  name: string;
  price_cost: number;
  currency: string;
  property_insurance: number;
  property_insurance_type: "auto" | "manual";
  is_first_home: boolean;
  is_sustainable: boolean;
  description?: string | null;
  bonus_rules?: BonusRule[];
}

export interface BonusRule {
  min_value: number;
  max_value: number;
  traditional_bonus: number;
  sustainable_bonus: number;
}

export interface BaseAmortizationValues {
  property_id: string;
  down_payment: number;
  down_payment_percentage: number;
  interest_rate: number;
  term_years: number;
  installments_per_year: 12 | 14;
  first_installment_date: Date;
  loan_protection_type: "individual" | "joint" | "none" | "custom";
  loan_protection_insurance: number;
}

export interface PaymentDetail {
  date: Date;
  payment_number: number;
  beginning_balance: number;
  scheduled_payment: number;
  extra_payment: number;
  total_payment: number;
  principal: number;
  interest: number;
  ending_balance: number;
  property_insurance: number;
  loan_protection_insurance: number;
  is_extra_payment: boolean;
  is_double_payment: boolean; // For 14 installments scheme
}

export interface CalculationResults {
  loan_amount: number;
  total_interest_and_insurance: number;
  total_months: number;
  base_monthly_payment: number;
  monthly_payment: number;
  payment_schedule: PaymentDetail[];
}

export interface ExtraPayment {
  amount: number;
  date: Date;
  frequency: "one-time" | "monthly" | "yearly";
  end_date?: Date; // For recurring payments
}

export interface RateChange {
  effective_date: Date;
  new_interest_rate: number;
  new_term_years?: number;
}

/**
 * Represents a single row in the payment schedule
 */
export interface PaymentRow {
  payment_date: Date
  capital: number
  interest: number
  property_insurance: number
  loan_insurance: number
  monthly_payment: number
  is_different_from_base: boolean
  beginning_balance?: number
  ending_balance?: number
  // Add aliases for compatibility with scenarioCalculator.ts
  monthly_interest?: number  // Alias for interest
  monthly_loan_insurance?: number  // Alias for loan_insurance
  principal?: number  // Alias for capital
}
// monthly_interest?: number
// monthly_loan_insurance?: number
// principal?: number
/**
 * Summary of a payment scenario
 */
export interface ScenarioSummaryResult {
  total_interest_and_insurance: number
  total_months: number
  monthly_payment: number
  breakeven_point?: number | null
}

/**
 * Complete scenario with summary and payment schedule
 */
export interface ScenarioResult {
  summary: ScenarioSummaryResult
  payments: PaymentRow[]
}

/**
 * Collection of all possible scenarios
 */
export type Scenarios = {
  regular: ScenarioResult
  accelerated: ScenarioResult
  lower_payment: ScenarioResult
  new_rate: ScenarioResult
} 

export interface ScenarioPanelProps {
  scenario: ScenarioResult | undefined
  regularScenario?: ScenarioResult | undefined
  currency: string
  installmentsPerYear: number
  propertyCost?: number
  scenarioType?: string
  isThisScenarioSaved?: boolean
  onSaveScenario?: (scenarioType: string) => void
  onShowLimitDialog?: () => void;
  formValues?: MortgageFormValues
  extraInstallments?: Array<{
    id: string;
    mortgage_id: string;
    amount: number;
    frequency: string;
    start_date: string;
    end_date: string | null;
  }>
  newRates?: Array<{
    id: string;
    mortgage_id: string;
    interest_rate: number;
    effective_date: string;
  }>
}
// Update the MortgageFormValues interface around line 40
export interface MortgageFormValues {
  loan_amount: number;
  down_payment: number;
  interest_rate: number;
  term_years: number;
  installments_per_year: number;
  loan_protection_type: "individual" | "joint" | "none" | "custom";
  loan_protection_insurance: number;
  first_installment_date: string | Date;
}
