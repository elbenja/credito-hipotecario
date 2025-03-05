export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: s
ring]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      scenario_summaries: {
        Row: {
          id: string
          amortization_id: string
          scenario_type: 'regular' | 'accelerated' | 'lower_payment' | 'new_rate'
          total_interest_and_insurance: number
          total_months: number
          monthly_payment: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          amortization_id: string
          scenario_type: 'regular' | 'accelerated' | 'lower_payment' | 'new_rate'
          total_interest_and_insurance: number
          total_months: number
          monthly_payment: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          amortization_id?: string
          scenario_type?: 'regular' | 'accelerated' | 'lower_payment' | 'new_rate'
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
          payment_date: string | Date
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
          payment_date?: string | Date
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
      extra_installments: {
        Row: {
          id: string
          amortization_id: string
          amount: number
          frequency: 'one-time' | 'monthly'
          start_date: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          amortization_id: string
          amount: number
          frequency: 'one-time' | 'monthly'
          start_date: string | Date
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          amortization_id?: string
          amount?: number
          frequency?: 'one-time' | 'monthly'
          start_date?: string | Date
          created_at?: string
          updated_at?: string
        }
      }
      rate_changes: {
        Row: {
          id: string
          amortization_id: string
          new_interest_rate: number
          effective_date: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          amortization_id: string
          new_interest_rate: number
          effective_date: string | Date
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          amortization_id?: string
          new_interest_rate?: number
          effective_date?: string | Date
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      scenario_type: 'regular' | 'accelerated' | 'lower_payment' | 'new_rate'
    }
  }
}
