export type Property = {
  id: string
  name: string
  currency: "USD" | "PEN"
  price_cost: number
  mortgages: Mortgage[]
}

export type Mortgage = {
  id: string
  name: string
  loan_amount: number
  down_payment: number
  interest_rate: number
  term_years: number
  installments_per_year: number
  property_id: string
  loan_protection_type: "none" | "custom" | "individual" | "joint"
  loan_protection_insurance: number
  first_installment_date: string
  saved_scenario?: string
  saved_scenario_total_interest_and_insurance?: number
  saved_scenario_total_months?: number
  saved_scenario_monthly_payment?: number
  saved_scenario_breakeven_point?: number
} 