import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Property, PropertyWithBonus } from "@/types/property";

export interface MortgageBundle {
  mortgage: {
    id: string;
    name: string;
    down_payment: number;
    interest_rate: number;
    term_years: number;
    installments_per_year: number;
    first_installment_date: string;
    loan_protection_type: "none" | "custom" | "individual" | "joint";
    loan_protection_insurance: number;
    loan_amount: number;
    saved_scenario: string | null;
    saved_scenario_total_interest_and_insurance: number | null;
    saved_scenario_total_months: number | null;
    saved_scenario_monthly_payment: number | null;
    saved_scenario_breakeven_point: number | null;
    property_id: string;
    user_id: string;
    property: PropertyWithBonus;
  };
  // property: Property;
  extraInstallments: Array<{
    id: string;
    mortgage_id: string;
    amount: number;
    frequency: string;
    start_date: string;
    end_date: string | null;
  }>;
  newRates: Array<{
    id: string;
    mortgage_id: string;
    new_interest_rate: number;
    effective_date: string;
    new_term_years: number;
  }>;
}

export const useMortgageBundle = (mortgageId: string | null) => {
  return useQuery({
    queryKey: ["mortgage-bundle", mortgageId],
    queryFn: async () => {
      if (!mortgageId) return null;

      const { data, error } = await supabase
        .rpc("get_mortgage_bundle", { m_id: mortgageId });

      if (error) throw error;
      
      if (!data) return null;
      
      const property = {
        ...data.property,
        bonus: data.property.bonus || 0,
        is_first_home: data.property.is_first_home || false,
        is_sustainable: data.property.is_sustainable || false,
        property_insurance: data.property.property_insurance || null,
        property_insurance_type: data.property.property_insurance_type || "auto",
        description: data.property.description || ""
      } as Property;
      
      const bundle = {
        mortgage: {
          ...data.mortgage,
          property: property
        },
        property: property,
        extraInstallments: data.extra_installments || [],
        newRates: data.new_rates || []
      } as MortgageBundle;
      
      return bundle;
    },
    enabled: !!mortgageId,
    staleTime: 30000, // 30 seconds
    refetchOnWindowFocus: false, // Prevent unnecessary refetches
  });
}; 