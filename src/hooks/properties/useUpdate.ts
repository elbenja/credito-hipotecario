// src/services/propertyService.ts
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Property, PropertyWithBonus } from "@/types/property";
// type RawProperty = Omit<PropertyWithBonus, 'bonus'>


export function useUpdateProperty() {
  const qc = useQueryClient();
  return useMutation<
  PropertyWithBonus,    // what the mutation returns
  Error,
  PropertyWithBonus     // the input type (so `updated` has `bonus`)
>({
      // **Give it a key for DevTools**:
    mutationKey: ["updateProperty"],
    mutationFn: async (updated) => {
      // Remove the bonus field before updating
      // const { bonus, ...clean } = updated;

      const clean: Property = {
        id: updated.id,
        user_id: updated.user_id,
        name: updated.name,
        price_cost: updated.price_cost,
        property_insurance: updated.property_insurance,
        // Include all other Property type fields here
        currency: updated.currency,
        property_insurance_type: updated.property_insurance_type,
        is_first_home: updated.is_first_home,
        is_sustainable: updated.is_sustainable,
        description: updated.description,
      };


      try {
        const { data, error } = await supabase
          .from("properties")
          .update(clean)
          .eq("id", clean.id)
          .select()
          .single();
        if (error || !data) {
          console.error("mutationFn error", error);
          throw error || new Error("Update failed");
        }
        return data;
      } catch (err) {
        console.error("mutationFn caught error", err);
        throw err;
      }
    },
    onMutate: (updated) => {
      // console.log("onMutate", updated);
    },
    onSuccess: (data, variables) => {
      // console.log("onSuccess", variables, data);
      qc.invalidateQueries({ queryKey: ['properties-mortgages-bonus'] })
    },
    onError: (error, variables) => {
      // console.error("onError", variables, error);
    },
    onSettled: () => {
      // invalidate the list so your UI refreshes everywhere
      qc.invalidateQueries({ queryKey: ["properties"] });
    }
  });
}