export interface PaymentRow {
  payment_date: string | Date
  capital: number
  interest: number
  property_insurance: number
  loan_insurance: number
  monthly_payment: number
  is_different_from_base: boolean
  beginning_balance?: number
  ending_balance?: number
}

export interface ScenarioSummary {
  total_interest_and_insurance: number
  total_months: number
  monthly_payment: number
}

export interface Scenario {
  summary: ScenarioSummary
  payments: PaymentRow[]
}

export interface BaseScenarioPanelProps {
  scenario?: Scenario
  regularScenario?: Scenario
  currency: string
  installmentsPerYear: number
  mapPaymentForTable: (payment: PaymentRow) => any
} 