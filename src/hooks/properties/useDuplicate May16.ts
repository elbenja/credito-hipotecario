// src/hooks/useDuplicateProperty.ts
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from '@/integrations/supabase/client'
import { useToast } from "@/components/ui/use-toast";
import { useTranslation } from "react-i18next";
import type { Property } from "@/types/property";
import { useAuth } from "@/context/auth-context";

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


  return useMutation<Property, Error, Property, ContextProps>({
    mutationFn: async (property) => {
      console.log("useDuplicate Property", property);
      const duplicated: Partial<Property> = {
        ...property,
        name: `${property.name} (${t("ui.copy", { ns: "global" })})`,
        user_id: userId,
      };
      delete (duplicated as any).id;

      const { data, error } = await supabase
        .from("properties")
        .insert(duplicated)
        .select()
        .single();

      if (error || !data) throw error || new Error("Duplication failed");
      return data;
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
    onSuccess: (data) => {
      toast({
        title: t('ui.success', 'Success', { ns: 'global' }),
        description: t('messages.property_duplicated', 'Property duplicated successfully', { ns: 'properties' }),
      });
      const channel = supabase.channel("property-updates");
      channel.send({
        type: "broadcast",
        event: "property-created",
        payload: {
          action: "create",
          userId,
          propertyId: data.id,
        },
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["properties", userId] });
      queryClient.invalidateQueries({ queryKey: ['properties-mortgages-bonus'] })
    },
  });
}
