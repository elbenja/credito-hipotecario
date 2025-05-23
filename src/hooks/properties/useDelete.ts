import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/components/ui/use-toast'
// import { useAuth } from "@/context/auth-context";
import { useTranslation } from "react-i18next";

export function useDeleteProperty(property_id?: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { t } = useTranslation(["properties", "global"]);

  return useMutation<void, Error, string, { prev?: number }>({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("properties")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ["propertyCount"] });
      const prev = queryClient.getQueryData<number>(["propertyCount"]);
      queryClient.setQueryData<number>(["propertyCount"], (old) => (old ?? 0) - 1);
      toast({
        title: t("ui.success", { ns: "global" }),
        description: t("messages.property_deleted", { ns: "properties" }),
      });
      return { prev };
    },
    onError: (_error, _id, context) => {
      if (context?.prev != null) {
        queryClient.setQueryData<number>(["propertyCount"], context.prev);
      }
      toast({
        variant: "destructive",
        title: t("ui.error", { ns: "global" }),
        description: t("messages.error_deleting_property", { ns: "properties" }),
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["propertyCount"] });
      queryClient.invalidateQueries({ queryKey: ["mortgageCount"] })
      queryClient.invalidateQueries({ queryKey: ["properties-mortgages-bonus"] });
      if (property_id) {
        queryClient.invalidateQueries({ queryKey: ["properties", property_id] });
      }
    },
  });
}
