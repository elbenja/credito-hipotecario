// src/hooks/usepropertyCount.ts
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'



export function usePropertyCount() {
    return useQuery<number>({
      queryKey: ['propertyCount'],
      queryFn: async () => {
        const { count, error } = await supabase
          .from('properties')
          .select('*', { count: 'exact', head: true })
        if (error) throw error
        return count!
      },
      staleTime: 60 * 1000,          // cache 1 minute
      refetchOnWindowFocus: false,
    })
  }