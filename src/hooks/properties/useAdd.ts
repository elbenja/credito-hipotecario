import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { toast } from '@/components/ui/use-toast'


export function useAddProperty() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (newData: any) => {
      const { data, error } = await supabase
        .from('properties')
        .insert(newData)
        .select()
        .single()
      if (error || !data) throw error || new Error('Failed to insert property')
      return data
    },
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: ['propertyCount'] })
      const prev = qc.getQueryData<number>(['propertyCount'])
      qc.setQueryData<number>(['propertyCount'], (old) => (old ?? 0) + 1)
      return { prev }
    },
    onError: (_err, _newData, context: any) => {
      if (context?.prev != null) {
        qc.setQueryData<number>(['propertyCount'], context.prev)
      }
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['propertyCount'] })
      qc.invalidateQueries({ queryKey: ['properties'] })
    },
  })
}

