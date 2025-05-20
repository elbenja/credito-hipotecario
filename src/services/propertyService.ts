// src/services/propertyService.ts
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client"
import type { Property, PropertyWithBonus } from "@/types/property";

/**
 * Fetches all properties for a given user.
 * @param userId - the UUID of the current user
 * @returns array of PropertyWithBonus objects
 */
export async function fetchProperties(userId: string): Promise<PropertyWithBonus[]> {
  const { data, error } = await supabase
    .from("properties")
    .select("*")
    .eq("user_id", userId);

  if (error) {
    console.error("Error fetching properties:", error);
    
    // toast debt
    // toast ({
    //   variant: "destructive", title: t( 'global:ui.error'),
    //   description: t( 'properties:messages.error_loading_properties'),
    //   })
    throw error;
  }

  const props = data ?? [];
  const enriched = await Promise.all(
    props.map(async (p) => {
      // const { data: bonusValue, error: bonusError } = await supabase
     // ── Add debug logging here ──
            const { data: bonusValue, error: bonusError } = await supabase
            .rpc("property_bonus", { p_property_id: p.id });

          if (bonusError) {
            // you could also throw or fallback here
            console.error("Failed to fetch bonus for", p.id, bonusError);
          }
    
      return {
        ...p,
        property_insurance_type: p.property_insurance_type ?? "auto",
        bonus: bonusValue ?? 0,
      };
    })
  );
  return enriched;
}

/**
 * Fetches a single property by ID, including computed bonus.
 * @param propertyId - the UUID of the property
 * @returns a PropertyWithBonus object
 */
export async function fetchPropertyWithBonus(
  userId: string,
  propertyId: string
): Promise<PropertyWithBonus> {
  const all = await fetchProperties(userId);
  const prop = all.find((p) => p.id === propertyId);
  if (!prop) throw new Error("Property not found");
  return prop;
}
/**
 * React Query hook to load all properties for a given user.
 * Delegates to fetchProperties in the service layer.
 */
export function useProperties(userId?: string | null) {
  return useQuery<PropertyWithBonus[], Error>({
    queryKey: ["properties", userId],
    queryFn:     () => (userId ? fetchProperties(userId) : []),
    enabled:     Boolean(userId),
    staleTime:   5 * 60 * 1000,      // 5 minutes
    gcTime:     30 * 60 * 1000,     // 30 minutes
  });
}



export async function getPropertiesWithMortgagesAndBonus(userId: string) {
  const { data: properties, error } = await supabase
    .from("properties")
    .select(`
      *,
      mortgages(
        id, name, loan_amount, down_payment, interest_rate, term_years,
        installments_per_year, loan_protection_type, loan_protection_insurance,
        first_installment_date, saved_scenario, saved_scenario_total_interest_and_insurance,
        saved_scenario_total_months, saved_scenario_monthly_payment, saved_scenario_breakeven_point, property_id
      )
    `)
    .eq("user_id", userId)

  if (error || !properties) throw error

  const enriched = await Promise.all(
    properties.map(async (p) => {
      const bonus = p.is_first_home
        ? await supabase
            .rpc('property_bonus', { p_property_id: p.id })
            .then((res) => res.data)
        : null

      return {
        ...p,
        bonus,
      }
    })
  )

  return enriched
}