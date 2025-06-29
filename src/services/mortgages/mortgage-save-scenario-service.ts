import { useUpdateMortgage } from '@/hooks/mortgages/useUpdate';
import { useToast } from '@/components/ui/use-toast';
import { useTranslation } from 'react-i18next';
import type { Mortgage } from '@/types/mortgage';

export interface SaveScenarioParams {
  mortgageId: string;
  scenarioType: string;
  scenarioData: {
    total_interest_and_insurance: number;
    total_months: number;
    monthly_payment: number;
    breakeven_point?: number | null;
  };
  formValues: any; // You might want to type this more specifically
  onSuccess?: () => void;
}

export const useSaveMortgageScenario = () => {
  const updateMortgage = useUpdateMortgage();
  const { toast } = useToast();
  const { t } = useTranslation(['mortgages', 'global']);

  const saveScenario = async ({ 
    mortgageId, 
    scenarioType, 
    scenarioData,
    formValues,
    onSuccess
  }: SaveScenarioParams) => {
    try {
      const { term_years, ...cleanFormValues } = formValues;
      
      await updateMortgage.mutateAsync({
        id: mortgageId,
        ...cleanFormValues,
        saved_scenario: scenarioType,
        saved_scenario_total_interest_and_insurance: scenarioData.total_interest_and_insurance,
        saved_scenario_total_months: scenarioData.total_months,
        saved_scenario_monthly_payment: scenarioData.monthly_payment,
        saved_scenario_breakeven_point: scenarioData.breakeven_point
      } as Mortgage);

      localStorage.setItem(`savedScenario_${mortgageId}`, scenarioType);

      toast({
        title: t('ui.success', { ns: 'global' }),
        description: t('messages.scenario_saved', 'Scenario saved as default', { ns: 'mortgages' }),
      });

      if (onSuccess) onSuccess();
      return true;
    } catch (error) {
      console.error('Error saving scenario:', error);
      toast({
        variant: 'destructive',
        title: t('ui.error', { ns: 'global' }),
        description: t('messages.error_saving_scenario', 'Error saving scenario', { ns: 'mortgages' }),
      });
      return false;
    }
  };

  return {
    saveScenario
  };
}; 