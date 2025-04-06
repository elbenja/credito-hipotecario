export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      amortizations: {
        Row: {
          created_at: string
          down_payment: number
          first_installment_date: string
          id: string
          installment_amount: number
          installments_per_year: number
          interest_rate: number
          loan_amount: number
          loan_protection_insurance: number | null
          loan_protection_type: string | null
          name: string
          property_id: string
          term_years: number
          total_interest: number
          total_payment: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          down_payment: number
          first_installment_date: string
          id?: string
          installment_amount: number
          installments_per_year: number
          interest_rate: number
          loan_amount: number
          loan_protection_insurance?: number | null
          loan_protection_type?: string | null
          name: string
          property_id: string
          term_years: number
          total_interest: number
          total_payment: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          down_payment?: number
          first_installment_date?: string
          id?: string
          installment_amount?: number
          installments_per_year?: number
          interest_rate?: number
          loan_amount?: number
          loan_protection_insurance?: number | null
          loan_protection_type?: string | null
          name?: string
          property_id?: string
          term_years?: number
          total_interest?: number
          total_payment?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "amortizations_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      bonus_rules: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          max_value: number
          min_value: number
          sustainable_bonus: number
          traditional_bonus: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          max_value: number
          min_value: number
          sustainable_bonus: number
          traditional_bonus: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          max_value?: number
          min_value?: number
          sustainable_bonus?: number
          traditional_bonus?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      exchange_rates: {
        Row: {
          from_currency: string
          id: string
          last_updated: string | null
          rate: number
          to_currency: string
        }
        Insert: {
          from_currency: string
          id?: string
          last_updated?: string | null
          rate: number
          to_currency: string
        }
        Update: {
          from_currency?: string
          id?: string
          last_updated?: string | null
          rate?: number
          to_currency?: string
        }
        Relationships: []
      }
      extra_installments: {
        Row: {
          amortization_id: string
          amount: number
          created_at: string
          frequency: string
          id: string
          start_date: string
          updated_at: string
        }
        Insert: {
          amortization_id: string
          amount: number
          created_at?: string
          frequency: string
          id?: string
          start_date: string
          updated_at?: string
        }
        Update: {
          amortization_id?: string
          amount?: number
          created_at?: string
          frequency?: string
          id?: string
          start_date?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "extra_installments_amortization_id_fkey"
            columns: ["amortization_id"]
            isOneToOne: false
            referencedRelation: "amortizations"
            referencedColumns: ["id"]
          },
        ]
      }
      insurance_rates: {
        Row: {
          effective_year: number
          id: number
          percentage: number
          type: string
        }
        Insert: {
          effective_year: number
          id?: number
          percentage: number
          type: string
        }
        Update: {
          effective_year?: number
          id?: number
          percentage?: number
          type?: string
        }
        Relationships: []
      }
      interest_rate_limits: {
        Row: {
          created_at: string
          id: string
          is_active: boolean | null
          max_rate: number
          min_rate: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean | null
          max_rate: number
          min_rate: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean | null
          max_rate?: number
          min_rate?: number
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          last_property_number: number | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          last_property_number?: number | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          last_property_number?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      properties: {
        Row: {
          created_at: string
          currency: string
          description: string | null
          id: string
          is_first_home: boolean | null
          is_sustainable: boolean | null
          name: string
          price_cost: number
          property_insurance: number | null
          property_insurance_type: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          currency: string
          description?: string | null
          id?: string
          is_first_home?: boolean | null
          is_sustainable?: boolean | null
          name: string
          price_cost: number
          property_insurance?: number | null
          property_insurance_type?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          is_first_home?: boolean | null
          is_sustainable?: boolean | null
          name?: string
          price_cost?: number
          property_insurance?: number | null
          property_insurance_type?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      property_insurance_rates: {
        Row: {
          created_at: string | null
          effective_year: number
          id: string
          percentage: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          effective_year: number
          id?: string
          percentage: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          effective_year?: number
          id?: string
          percentage?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      rate_changes: {
        Row: {
          amortization_id: string
          created_at: string
          effective_date: string
          id: string
          new_interest_rate: number
          updated_at: string
        }
        Insert: {
          amortization_id: string
          created_at?: string
          effective_date: string
          id?: string
          new_interest_rate: number
          updated_at?: string
        }
        Update: {
          amortization_id?: string
          created_at?: string
          effective_date?: string
          id?: string
          new_interest_rate?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rate_changes_amortization_id_fkey"
            columns: ["amortization_id"]
            isOneToOne: false
            referencedRelation: "amortizations"
            referencedColumns: ["id"]
          },
        ]
      }
      new_rates: {
        Row: {
          amortization_id: string
          created_at: string
          effective_date: string
          id: string
          new_interest_rate: number
          new_term_years: number | null
          updated_at: string
        }
        Insert: {
          amortization_id: string
          created_at?: string
          effective_date: string
          id?: string
          new_interest_rate: number
          new_term_years?: number | null
          updated_at?: string
        }
        Update: {
          amortization_id?: string
          created_at?: string
          effective_date?: string
          id?: string
          new_interest_rate?: number
          new_term_years?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "new_rates_amortization_id_fkey"
            columns: ["amortization_id"]
            isOneToOne: false
            referencedRelation: "amortizations"
            referencedColumns: ["id"]
          },
        ]
      }
      scenario_payments: {
        Row: {
          capital: number
          created_at: string
          id: string
          interest: number
          is_different_from_base: boolean | null
          loan_insurance: number
          monthly_payment: number
          payment_date: string
          property_insurance: number
          scenario_summary_id: string
          updated_at: string
        }
        Insert: {
          capital: number
          created_at?: string
          id?: string
          interest: number
          is_different_from_base?: boolean | null
          loan_insurance: number
          monthly_payment: number
          payment_date: string
          property_insurance: number
          scenario_summary_id: string
          updated_at?: string
        }
        Update: {
          capital?: number
          created_at?: string
          id?: string
          interest?: number
          is_different_from_base?: boolean | null
          loan_insurance?: number
          monthly_payment?: number
          payment_date?: string
          property_insurance?: number
          scenario_summary_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "scenario_payments_scenario_summary_id_fkey"
            columns: ["scenario_summary_id"]
            isOneToOne: false
            referencedRelation: "scenario_summaries"
            referencedColumns: ["id"]
          },
        ]
      }
      scenario_summaries: {
        Row: {
          amortization_id: string
          created_at: string
          id: string
          monthly_payment: number
          scenario_type: Database["public"]["Enums"]["scenario_type"]
          total_interest_and_insurance: number
          total_months: number
          updated_at: string
        }
        Insert: {
          amortization_id: string
          created_at?: string
          id?: string
          monthly_payment: number
          scenario_type: Database["public"]["Enums"]["scenario_type"]
          total_interest_and_insurance: number
          total_months: number
          updated_at?: string
        }
        Update: {
          amortization_id?: string
          created_at?: string
          id?: string
          monthly_payment?: number
          scenario_type?: Database["public"]["Enums"]["scenario_type"]
          total_interest_and_insurance?: number
          total_months?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "scenario_summaries_amortization_id_fkey"
            columns: ["amortization_id"]
            isOneToOne: false
            referencedRelation: "amortizations"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_plans: {
        Row: {
          id: string
          name: string
          description: string | null
          price_monthly: number
          price_yearly: number
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          price_monthly: number
          price_yearly: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          price_monthly?: number
          price_yearly?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      plan_features: {
        Row: {
          id: string
          plan_id: string
          feature_name: string
          feature_limit: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          plan_id: string
          feature_name: string
          feature_limit: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          plan_id?: string
          feature_name?: string
          feature_limit?: number
          created_at?: string
          updated_at?: string
        }
      }
      user_subscriptions: {
        Row: {
          id: string
          user_id: string
          plan_id: string
          status: string
          current_period_start: string
          current_period_end: string
          cancel_at_period_end: boolean
          payment_provider: string | null
          payment_provider_subscription_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          plan_id: string
          status?: string
          current_period_start: string
          current_period_end: string
          cancel_at_period_end?: boolean
          payment_provider?: string | null
          payment_provider_subscription_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          plan_id?: string
          status?: string
          current_period_start?: string
          current_period_end?: string
          cancel_at_period_end?: boolean
          payment_provider?: string | null
          payment_provider_subscription_id?: string | null
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
      scenario_type: "regular" | "accelerated" | "lower_payment" | "new_rate"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof PublicSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof PublicSchema["CompositeTypes"]
    ? PublicSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never
