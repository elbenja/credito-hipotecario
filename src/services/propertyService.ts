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
      const { data: bonusValue, error: bonusError } = await supabase
        .rpc("property_bonus", { p_property_id: p.id });
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
 * React Query hook to load all properties for a given user.
 * Delegates to fetchProperties in the service layer.
 */
export function useProperties(userId?: string | null) {
  return useQuery<PropertyWithBonus[], Error>({
    queryKey: ["properties", userId],
    queryFn:     () => (userId ? fetchProperties(userId) : []),
    enabled:     Boolean(userId),
    staleTime:   5_000,
    gcTime:      120_000,
  });
}