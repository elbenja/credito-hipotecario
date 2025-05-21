// src/hooks/useUpdateMortgage.ts

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/use-toast';
import { useTranslation } from 'react-i18next';
import type { Mortgage } from '@/types/mortgage';

/**
 * Hook to update an existing mortgage.
 */
export function useUpdateMortgage() {
  const qc = useQueryClient();
  const { t } = useTranslation(['mortgages', 'global']);

  return useMutation<Mortgage, Error, Mortgage>({
    mutationKey: ['updateMortgage'],

    // 1) The actual update call to Supabase
    mutationFn: async (updatedMortgage) => {
      // If you have any computed-only fields (like `bonus`), strip them out:
      const { bonus, ...payload } = updatedMortgage as any;

      const { data, error } = await supabase
        .from('mortgages')
        .update(payload)
        
        .eq('id', payload.id)
        .select()
        .single();

      if (error || !data) {
        throw error || new Error('Failed to update mortgage');
      }
      return data;
    },

    // 2) On success, show a toast and refresh relevant queries
    onSuccess: (data) => {

      qc.invalidateQueries({ queryKey: ['mortgages'] });
      qc.invalidateQueries({ queryKey: ['mortgage-bundle', data.id] });
      qc.invalidateQueries({ queryKey: ["scenarios", id] })
      qc.invalidateQueries({ queryKey: ['properties-mortgages-bonus'] });

      toast({
        title: t('ui.success', { ns: 'global' }),
        description: t('messages.mortgage_updated', { ns: 'mortgages' }),
      });
    },

    // 3) On error, log and show destructive toast
    onError: (error) => {
      console.error('Error updating mortgage:', error);
      toast({
        variant: 'destructive',
        title: t('ui.error', { ns: 'global' }),
        description: t('messages.error_updating_mortgage', { ns: 'mortgages' }),
      });
    },
  });
}



