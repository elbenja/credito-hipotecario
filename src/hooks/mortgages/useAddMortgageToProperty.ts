// src/hooks/useAddMortgage.ts
import { useNavigate } from "react-router-dom";
import { useMortgageDraftStore } from "@/store/mortgage/store";
import { useCallback } from "react";
import { useCanCreateFeature } from "@/hooks/usePlanLimits";
import { usePlanLimitDialog } from "@/components/dashboard/dashboard-layout";

export function useAddMortgageToProperty() {
  const navigate = useNavigate();
  const resetDraft = useMortgageDraftStore((s) => s.resetDraft);
  const { canCreate } = useCanCreateFeature();
  const { showDialog } = usePlanLimitDialog(); // Use global context instead of local state

  const AddMortgageToProperty = useCallback(
    async (e: React.MouseEvent, propertyId: string) => {
      e.stopPropagation();
      const allowed = await canCreate("mortgages");
      if (!allowed) {
        showDialog(); // Use global dialog method
      } else {
        resetDraft();
        navigate(`/mortgages/new?propertyId=${propertyId}`);
      }
    },
    [canCreate, navigate, resetDraft, showDialog]
  );

  return { AddMortgageToProperty }; // Remove local dialog state from return
}