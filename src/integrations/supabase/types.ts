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
          loan_protection_insurance: number | null
          name: string
          other_expenses: number | null
          price_cost: number
          property_insurance: number | null
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
          loan_protection_insurance?: number | null
          name: string
          other_expenses?: number | null
          price_cost: number
          property_insurance?: number | null
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
          loan_protection_insurance?: number | null
          name?: string
          other_expenses?: number | null
          price_cost?: number
          property_insurance?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      refinancing_options: {
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
            foreignKeyName: "refinancing_options_amortization_id_fkey"
            columns: ["amortization_id"]
            isOneToOne: false
            referencedRelation: "amortizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
