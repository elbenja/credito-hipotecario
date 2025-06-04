import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/use-toast';
import { useTranslation } from 'react-i18next';
import type { Mortgage } from '@/types/mortgage';

/**
 * Hook to create a new mortgage (used for capturing scenarios).
 */
export function useCreateMortgage() {
  const qc = useQueryClient();
  const { t } = useTranslation(['mortgages', 'global']);

  return useMutation<Mortgage, Error, Omit<Mortgage, 'id'>>({
    mutationKey: ['createMortgage'],

    // 1) The actual create call to Supabase
    mutationFn: async (newMortgage) => {
      const { data, error } = await supabase
        .from('mortgages')
        .insert(newMortgage)
        .select()
        .single();

      if (error || !data) {
        throw error || new Error('Failed to create mortgage');
      }
      return data;
    },
    //this was missing
    onMutate: async (_newData) => {
      await qc.cancelQueries({ queryKey: ['mortgageCount'] })
      const prev = qc.getQueryData<number>(['mortgageCount'])
      qc.setQueryData<number>(['mortgageCount'], old => (old ?? 0) + 1)
      return { prev }
    },
    // 2) On success, show a toast and refresh relevant queries
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['mortgages'] });
      qc.invalidateQueries({ queryKey: ['mortgage-bundle', data.id] });
      qc.invalidateQueries({ queryKey: ["scenarios"] });
      qc.invalidateQueries({ queryKey: ['properties-mortgages-bonus'] });

      toast({
        title: t('ui.success', { ns: 'global' }),
        description: t('messages.scenario_captured', 'Scenario captured successfully', { ns: 'mortgages' }),
      });
    },

    // 3) On error, log and show destructive toast
    onError: (error) => {
      console.error('Error creating mortgage:', error);
      toast({
        variant: 'destructive',
        title: t('ui.error', { ns: 'global' }),
        description: t('messages.error_capturing_scenario', 'Error capturing scenario', { ns: 'mortgages' }),
      });
    },
  });
} 