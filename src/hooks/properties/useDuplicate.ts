// src/hooks/useDuplicateProperty.ts
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from '@/integrations/supabase/client'
import { useToast } from "@/components/ui/use-toast";
import { useTranslation } from "react-i18next";
import type { Property, PropertyWithBonus } from "@/types/property";
import { useAuth } from "@/context/auth-context";
type RawProperty = Omit<PropertyWithBonus, 'bonus'>

interface ContextProps {
  previous?: Property[];
  prevCount?: number;
}

/**
 * Hook to duplicate a property optimistically.
 */
export function useDuplicateProperty() {
  const { user } = useAuth();
  if (!user?.id) throw new Error("No user ID available for duplication");
  const userId = user.id;

  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { t } = useTranslation(["properties", "global"]);


  // export function useDuplicateProperty() {
    // const qc = useQueryClient()
  
    return useMutation<
      RawProperty,           // returned data
      Error,                 // error
      PropertyWithBonus,      // input
      ContextProps  //for the counter
    >({
      mutationKey: ['duplicateProperty'],
      mutationFn: async (propWithBonus) => {
        // 1) pull off the bonus (and any other non‐DB fields)
        const { bonus, ...clean } = propWithBonus
  
        // 2) build your payload
        const payload: RawProperty = {
          ...clean,
          name: `${clean.name} (${t("ui.copy", { ns: "global" })})`,
          // you may want to clear id so supabase will generate a new one
        }
        
        delete (payload as any).id
  
        // 3) insert & select
        const { data, error } = await supabase
          .from('properties')
          .insert(payload)
          .select()
          .single()
  
        if (error) throw error
        return data
      },
      onMutate: async (property) => {
        await queryClient.cancelQueries({ queryKey: ["propertyCount"] });
        const prevCount = queryClient.getQueryData<number>(["propertyCount"]);
        queryClient.setQueryData<number>(["propertyCount"], (old) => (old ?? 0) + 1);
    
        await queryClient.cancelQueries({ queryKey: ["properties", userId] });
        const previous = queryClient.getQueryData<Property[]>(["properties", userId]);
        if (previous) {
          const tempId = `temp-${Date.now()}`;
          const temp: Property = {
            ...property,
            id: tempId,
            name: `${property.name} (${t("ui.copy", { ns: "global" })})`,
            user_id: userId,
          };
          queryClient.setQueryData<Property[]>(["properties", userId], [...previous, temp]);
        }
        return { previous, prevCount };
      },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['properties'] })
      queryClient.invalidateQueries({ queryKey: ['properties-mortgages-bonus'] })
      toast({
        title: t('ui.success', 'Success', { ns: 'global' }),
        description: t('messages.property_duplicated', 'Property duplicated successfully', { ns: 'properties' }),
      });
      // const channel = supabase.channel("property-updates");
      // channel.send({
      //   type: "broadcast",
      //   event: "property-created",
      //   payload: {
      //     action: "create",
      //     userId,
      //     propertyId: data.id,
      //   },
      // });
    },
    onError: (_error, _property, context) => {
      toast({
        variant: "destructive",
        title: t("ui.error", { ns: "global" }),
        description: t("messages.error_duplicating_property", { ns: "properties" }),
      });
      if (context?.previous) {
        queryClient.setQueryData(["properties", userId], context.previous);
      }
      if (context?.prevCount != null) {
        queryClient.setQueryData<number>(["propertyCount"], context.prevCount);
      }
    },
    // onSettled: () => {
    //   queryClient.invalidateQueries({ queryKey: ["properties", userId] });
    // },
  });
}


