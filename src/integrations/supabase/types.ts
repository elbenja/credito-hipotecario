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
          installment_amount: number | null
          installments_per_year: number
          interest_rate: number
          loan_amount: number
          loan_protection_insurance: number | null
          loan_protection_type: string | null
          name: string
          property_id: string
          saved_scenario: string | null
          saved_scenario_breakeven_point: number | null
          saved_scenario_monthly_payment: number | null
          saved_scenario_total_interest_and_insurance: number | null
          saved_scenario_total_months: number | null
          term_months: number | null
          term_years: number
          total_interest: number | null
          total_payment: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          down_payment: number
          first_installment_date: string
          id?: string
          installment_amount?: number | null
          installments_per_year: number
          interest_rate: number
          loan_amount: number
          loan_protection_insurance?: number | null
          loan_protection_type?: string | null
          name: string
          property_id: string
          saved_scenario?: string | null
          saved_scenario_breakeven_point?: number | null
          saved_scenario_monthly_payment?: number | null
          saved_scenario_total_interest_and_insurance?: number | null
          saved_scenario_total_months?: number | null
          term_months?: number | null
          term_years: number
          total_interest?: number | null
          total_payment?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          down_payment?: number
          first_installment_date?: string
          id?: string
          installment_amount?: number | null
          installments_per_year?: number
          interest_rate?: number
          loan_amount?: number
          loan_protection_insurance?: number | null
          loan_protection_type?: string | null
          name?: string
          property_id?: string
          saved_scenario?: string | null
          saved_scenario_breakeven_point?: number | null
          saved_scenario_monthly_payment?: number | null
          saved_scenario_total_interest_and_insurance?: number | null
          saved_scenario_total_months?: number | null
          term_months?: number | null
          term_years?: number
          total_interest?: number | null
          total_payment?: number | null
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
      early_access_signups: {
        Row: {
          created_at: string
          email: string
          headers: Json | null
          id: string
          ip_address: string | null
          ip_source: string | null
          language: string
          last_notification_at: string | null
          name: string | null
          status: string
          verified_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          headers?: Json | null
          id?: string
          ip_address?: string | null
          ip_source?: string | null
          language?: string
          last_notification_at?: string | null
          name?: string | null
          status?: string
          verified_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          headers?: Json | null
          id?: string
          ip_address?: string | null
          ip_source?: string | null
          language?: string
          last_notification_at?: string | null
          name?: string | null
          status?: string
          verified_at?: string | null
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
          amount: number
          created_at: string
          frequency: string
          id: string
          mortgage_id: string
          start_date: string
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          frequency: string
          id?: string
          mortgage_id: string
          start_date: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          frequency?: string
          id?: string
          mortgage_id?: string
          start_date?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "extra_installments_mortgage_id_fkey"
            columns: ["mortgage_id"]
            isOneToOne: false
            referencedRelation: "amortizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "extra_installments_mortgage_id_fkey"
            columns: ["mortgage_id"]
            isOneToOne: false
            referencedRelation: "mortgages"
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
      new_rates: {
        Row: {
          created_at: string
          effective_date: string
          id: string
          mortgage_id: string
          new_balance: number | null
          new_interest_rate: number
          new_term_years: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          effective_date: string
          id?: string
          mortgage_id: string
          new_balance?: number | null
          new_interest_rate: number
          new_term_years?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          effective_date?: string
          id?: string
          mortgage_id?: string
          new_balance?: number | null
          new_interest_rate?: number
          new_term_years?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "new_rates_mortgage_id_fkey"
            columns: ["mortgage_id"]
            isOneToOne: false
            referencedRelation: "amortizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "new_rates_mortgage_id_fkey"
            columns: ["mortgage_id"]
            isOneToOne: false
            referencedRelation: "mortgages"
            referencedColumns: ["id"]
          },
        ]
      }
      plan_features: {
        Row: {
          created_at: string
          feature_limit: number
          feature_name: string
          id: string
          plan_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          feature_limit: number
          feature_name: string
          id?: string
          plan_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          feature_limit?: number
          feature_name?: string
          id?: string
          plan_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "plan_features_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          is_admin: boolean | null
          last_property_number: number | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          is_admin?: boolean | null
          last_property_number?: number | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          is_admin?: boolean | null
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
      scenario_payments: {
        Row: {
          beginning_balance: number | null
          created_at: string
          ending_balance: number | null
          id: string
          is_different_from_base: boolean | null
          monthly_interest: number
          monthly_loan_insurance: number
          monthly_payment: number
          payment_date: string
          principal: number
          property_insurance: number
          scenario_summary_id: string
          updated_at: string
        }
        Insert: {
          beginning_balance?: number | null
          created_at?: string
          ending_balance?: number | null
          id?: string
          is_different_from_base?: boolean | null
          monthly_interest: number
          monthly_loan_insurance: number
          monthly_payment: number
          payment_date: string
          principal: number
          property_insurance: number
          scenario_summary_id: string
          updated_at?: string
        }
        Update: {
          beginning_balance?: number | null
          created_at?: string
          ending_balance?: number | null
          id?: string
          is_different_from_base?: boolean | null
          monthly_interest?: number
          monthly_loan_insurance?: number
          monthly_payment?: number
          payment_date?: string
          principal?: number
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
          {
            foreignKeyName: "scenario_summaries_amortization_id_fkey"
            columns: ["amortization_id"]
            isOneToOne: false
            referencedRelation: "mortgages"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_plans: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          price_id: string | null
          price_monthly: number
          price_yearly: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          price_id?: string | null
          price_monthly: number
          price_yearly: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          price_id?: string | null
          price_monthly?: number
          price_yearly?: number
          updated_at?: string
        }
        Relationships: []
      }
      user_subscriptions: {
        Row: {
          cancel_at_period_end: boolean
          created_at: string
          current_period_end: string
          current_period_start: string
          id: string
          payment_provider: string | null
          payment_provider_subscription_id: string | null
          plan_id: string
          status: string
          stripe_customer_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          cancel_at_period_end?: boolean
          created_at?: string
          current_period_end: string
          current_period_start: string
          id?: string
          payment_provider?: string | null
          payment_provider_subscription_id?: string | null
          plan_id: string
          status?: string
          stripe_customer_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          cancel_at_period_end?: boolean
          created_at?: string
          current_period_end?: string
          current_period_start?: string
          id?: string
          payment_provider?: string | null
          payment_provider_subscription_id?: string | null
          plan_id?: string
          status?: string
          stripe_customer_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      mortgages: {
        Row: {
          created_at: string | null
          down_payment: number | null
          first_installment_date: string | null
          id: string | null
          installments_per_year: number | null
          interest_rate: number | null
          loan_amount: number | null
          loan_protection_insurance: number | null
          loan_protection_type: string | null
          name: string | null
          property_id: string | null
          saved_scenario: string | null
          saved_scenario_breakeven_point: number | null
          saved_scenario_monthly_payment: number | null
          saved_scenario_total_interest_and_insurance: number | null
          saved_scenario_total_months: number | null
          term_months: number | null
          term_years: number | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          down_payment?: number | null
          first_installment_date?: string | null
          id?: string | null
          installments_per_year?: number | null
          interest_rate?: number | null
          loan_amount?: number | null
          loan_protection_insurance?: number | null
          loan_protection_type?: string | null
          name?: string | null
          property_id?: string | null
          saved_scenario?: string | null
          saved_scenario_breakeven_point?: number | null
          saved_scenario_monthly_payment?: number | null
          saved_scenario_total_interest_and_insurance?: number | null
          saved_scenario_total_months?: number | null
          term_months?: number | null
          term_years?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          down_payment?: number | null
          first_installment_date?: string | null
          id?: string | null
          installments_per_year?: number | null
          interest_rate?: number | null
          loan_amount?: number | null
          loan_protection_insurance?: number | null
          loan_protection_type?: string | null
          name?: string | null
          property_id?: string | null
          saved_scenario?: string | null
          saved_scenario_breakeven_point?: number | null
          saved_scenario_monthly_payment?: number | null
          saved_scenario_total_interest_and_insurance?: number | null
          saved_scenario_total_months?: number | null
          term_months?: number | null
          term_years?: number | null
          updated_at?: string | null
          user_id?: string | null
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
    }
    Functions: {
      check_user_feature_limit: {
        Args: { p_user_id: string; p_feature_name: string }
        Returns: boolean
      }
      "delete>get_mortgage_counts_for_admins": {
        Args: Record<PropertyKey, never>
        Returns: {
          user_id: string
          count: number
        }[]
      }
      get_active_bonus_rules: {
        Args: Record<PropertyKey, never>
        Returns: {
          created_at: string | null
          id: string
          is_active: boolean | null
          max_value: number
          min_value: number
          sustainable_bonus: number
          traditional_bonus: number
          updated_at: string | null
        }[]
      }
      get_active_plans_with_limits: {
        Args: { p_user_id: string }
        Returns: Json
      }
      get_all_users: {
        Args: Record<PropertyKey, never>
        Returns: {
          id: string
          email: string
          role: string
          created_at: string
          last_sign_in_at: string
        }[]
      }
      get_exchange_rate: {
        Args: { from_curr?: string; to_curr?: string }
        Returns: number
      }
      get_mortgage_and_property_counts_for_admins: {
        Args: Record<PropertyKey, never>
        Returns: {
          user_id: string
          mortgage_count: number
          property_count: number
        }[]
      }
      get_mortgage_bundle: {
        Args: { m_id: string }
        Returns: Json
      }
      get_user_plan_limits: {
        Args: { p_user_id: string }
        Returns: Json
      }
      property_bonus: {
        Args: { p_property_id: string }
        Returns: number
      }
      property_bonus_id: {
        Args: { property_id: number }
        Returns: number
      }
      update_property_and_calculate: {
        Args: { p_property_id: string; p_mortgage_id: string }
        Returns: Json
      }
    }
    Enums: {
      scenario_type: "regular" | "accelerated" | "lower_payment" | "new_rate"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      scenario_type: ["regular", "accelerated", "lower_payment", "new_rate"],
    },
  },
} as const
