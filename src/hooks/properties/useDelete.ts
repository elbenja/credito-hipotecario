import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'

export function useDeleteProperty() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('properties')
        .delete()
        .eq('id', id)
      if (error) throw error
    },
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: ['propertyCount'] })
      const prev = qc.getQueryData<number>(['propertyCount'])
      // Optimistically decrement
      qc.setQueryData<number>(['propertyCount'], (old) => (old ?? 0) - 1)
      return { prev }
    },
    onError: (_error, _id, context) => {
      // Rollback if error
      if (context?.prev != null) {
        qc.setQueryData<number>(['propertyCount'], context.prev)
      }
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['propertyCount'] })
    },
  })
}
