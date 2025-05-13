/**
 * Mortgage related type definitions
 * This implements the new terminology while maintaining backward compatibility
 */

// Base Mortgage type
// export interface Mortgage {
//   id: string;
//   name: string;
//   property_id: string;
//   loan_amount: number;
//   down_payment: number;
//   // down_payment_percentage: number;
//   interest_rate: number;
//   term_years: number;
//   installments_per_year: number;
//   first_installment_date: string;
//   loan_protection_type: 'individual' | 'joint' | 'none' | 'custom';
//   loan_protection_insurance: number;
//   saved_scenario: string;
//   // user_id: string;
//   // created_at: string;
//   // updated_at: string;
// }

export type Mortgage = {
  id: string
  name: string
  property_id: string
  loan_amount: number
  down_payment: number
  interest_rate: number
  term_years: number
  installments_per_year: number
  first_installment_date: string
  loan_protection_type: "none" | "custom" | "individual" | "joint"
  loan_protection_insurance: number

  saved_scenario?: string
  saved_scenario_total_interest_and_insurance?: number
  saved_scenario_total_months?: number
  saved_scenario_monthly_payment?: number
  saved_scenario_breakeven_point?: number
} 

// For backward compatibility
export type Amortization = Mortgage;

// Mortgage with related property information
export interface MortgageWithProperty extends Mortgage {
  property?: {
    id: string;
    name: string;
    currency: "USD" | "PEN";
    price_cost: number;
  };
}

// For backward compatibility
export type AmortizationWithProperty = MortgageWithProperty;

// Payment row type for mortgage schedules
export interface MortgagePaymentRow {
  date: Date;
  beginning_balance?: number;
  capital: number;
  interest: number;
  property_insurance: number;
  loan_insurance: number;
  monthly_payment: number;
  is_different_from_base?: boolean;
  is_double_payment?: boolean;
}

// For backward compatibility
export type AmortizationRow = MortgagePaymentRow;

// Mortgage form values for creating/editing mortgages
export interface MortgageFormValues {
  name: string;
  down_payment: number | string;
  down_payment_percentage: number | string;
  interest_rate: number | string;
  term_years: number | string;
  installments_per_year: number | string;
  first_installment_date: Date;
  loan_protection_type: 'individual' | 'joint' | 'none' | 'custom';
  loan_protection_insurance?: number | string;
}

// For backward compatibility
export type AmortizationFormValues = MortgageFormValues; 