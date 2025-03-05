export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type ScenarioType = 'regular' | 'accelerated' | 'lower_payment' | 'new_rate'

export interface Database {
  public: {
    Tables: {
      amortizations: {
        Row: {
          id: string
          user_id: string
          property_id: string
          name: string
          loan_amount: number
          down_payment: number
          interest_rate: number
          term_years: number
          installments_per_year: number
          installment_amount: number
          total_interest: number
          total_payment: number
          first_installment_date: string
          loan_protection_type?: 'individual' | 'joint' | 'none' | 'custom'
          loan_protection_insurance?: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          property_id: string
          name: string
          loan_amount: number
          down_payment: number
          interest_rate: number
          term_years: number
          installments_per_year: number
          installment_amount: number
          total_interest: number
          total_payment: number
          first_installment_date: string
          loan_protection_type?: 'individual' | 'joint' | 'none' | 'custom'
          loan_protection_insurance?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          property_id?: string
          name?: string
          loan_amount?: number
          down_payment?: number
          interest_rate?: number
          term_years?: number
          installments_per_year?: number
          installment_amount?: number
          total_interest?: number
          total_payment?: number
          first_installment_date?: string
          loan_protection_type?: 'individual' | 'joint' | 'none' | 'custom'
          loan_protection_insurance?: number
          created_at?: string
          updated_at?: string
        }
      }
      extra_installments: {
        Row: {
          id: string
          amortization_id: string
          amount: number
          frequency: 'monthly' | 'one-time'
          start_date: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          amortization_id: string
          amount: number
          frequency: 'monthly' | 'one-time'
          start_date: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          amortization_id?: string
          amount?: number
          frequency?: 'monthly' | 'one-time'
          start_date?: string
          created_at?: string
          updated_at?: string
        }
      }
      rate_changes: {
        Row: {
          id: string
          amortization_id: string
          effective_date: string
          new_interest_rate: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          amortization_id: string
          effective_date: string
          new_interest_rate: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          amortization_id?: string
          effective_date?: string
          new_interest_rate?: number
          created_at?: string
          updated_at?: string
        }
      }
      scenario_summaries: {
        Row: {
          id: string
          amortization_id: string
          scenario_type: ScenarioType
          total_interest_and_insurance: number
          total_months: number
          monthly_payment: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          amortization_id: string
          scenario_type: ScenarioType
          total_interest_and_insurance: number
          total_months: number
          monthly_payment: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          amortization_id?: string
          scenario_type?: ScenarioType
          total_interest_and_insurance?: number
          total_months?: number
          monthly_payment?: number
          created_at?: string
          updated_at?: string
        }
      }
      scenario_payments: {
        Row: {
          id: string
          scenario_summary_id: string
          payment_date: string
          capital: number
          interest: number
          property_insurance: number
          loan_insurance: number
          monthly_payment: number
          is_different_from_base: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          scenario_summary_id: string
          payment_date: string
          capital: number
          interest: number
          property_insurance: number
          loan_insurance: number
          monthly_payment: number
          is_different_from_base?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          scenario_summary_id?: string
          payment_date?: string
          capital?: number
          interest?: number
          property_insurance?: number
          loan_insurance?: number
          monthly_payment?: number
          is_different_from_base?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      // ... other existing tables ...
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      scenario_type: ScenarioType
    }
  }
} 