// src/hooks/mortgages/useAdd.ts
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'

export function useAddMortgage() {
  const qc = useQueryClient()

  return useMutation({
    // 1) Return the inserted row here:
    mutationFn: async (newData: any) => {
      const { data, error } = await supabase
        .from('mortgages')
        .insert(newData)
        .select()     // fetch the full record
        .single()     // expect exactly one row
      if (error || !data) throw error || new Error('Failed to insert mortgage')
      return data   // <-- this is `newRow`
    },
    onMutate: async (_newData) => {
      await qc.cancelQueries({ queryKey: ['mortgageCount'] })
      const prev = qc.getQueryData<number>(['mortgageCount'])
      qc.setQueryData<number>(['mortgageCount'], old => (old ?? 0) + 1)
      return { prev }
    },
    onError: (_error, _newData, context) => {
      if (context?.prev != null) {
        qc.setQueryData<number>(['mortgageCount'], context.prev)
      }
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['mortgageCount'] })
      // qc.invalidateQueries({ queryKey: ['mortgages-with-bonus'] })
      qc.invalidateQueries({ queryKey: ['properties-mortgages-bonus'] })
    },
  })
}