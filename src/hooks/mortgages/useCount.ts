// src/hooks/useMortgageCount.ts
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'



export function useMortgageCount() {
  const [manualIncrement, setManualIncrement] = useState(0);

  const query = useQuery<number>({
    queryKey: ['mortgageCount'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('mortgages')
        .select('*', { count: 'exact', head: true });
      if (error) throw error;
      return count!;
    },
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const incrementMortgageCount = () => {
    setManualIncrement((prev) => prev + 1);
  };

  return {
    ...query,
    data: typeof query.data === 'number' ? query.data + manualIncrement : query.data,
    incrementMortgageCount,
  };
}