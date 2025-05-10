// src/services/propertyService.ts
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Property } from "@/types/property";

export function useUpdateProperty() {
  const qc = useQueryClient();
  return useMutation<Property, Error, Property>({
      // **Give it a key for DevTools**:
    mutationKey: ["updateProperty"],
    mutationFn: async (updated) => {
    
      // console.log("mutate called with", updated);
      try {
        const { data, error } = await supabase
          .from("properties")
          .update(updated)
          .eq("id", updated.id)
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