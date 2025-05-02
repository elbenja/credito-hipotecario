// src/hooks/useMortgageCount.ts
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'



export function useMortgageCount() {
    return useQuery<number>({
      queryKey: ['mortgageCount'],
      queryFn: async () => {
        const { count, error } = await supabase
          .from('mortgages')
          .select('*', { count: 'exact', head: true })
        if (error) throw error
        return count!
      },
      staleTime: 60 * 1000,          // cache 1 minute
      refetchOnWindowFocus: false,
    })
  }