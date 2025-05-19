import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'

export function useDeleteMortgage() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('mortgages')
        .delete()
        .eq('id', id)
      if (error) throw error
    },
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: ['mortgageCount'] })
      const prev = qc.getQueryData<number>(['mortgageCount'])
      // Optimistically decrement
      qc.setQueryData<number>(['mortgageCount'], (old) => (old ?? 0) - 1)
      return { prev }
    },
    onError: (_error, _id, context) => {
      // Rollback if error
      if (context?.prev != null) {
        qc.setQueryData<number>(['mortgageCount'], context.prev)
      }
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['mortgageCount'] })
      qc.invalidateQueries({ queryKey: ['mortgages-with-bonus'] })
    },
  })
}
