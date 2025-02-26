export type Currency = "PEN" | "USD";

export interface Property {
  id: string;
  cost: number;
  currency: Currency;
  bonus: number;
  property_insurance: number;
  property_insurance_type: "auto" | "manual";
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