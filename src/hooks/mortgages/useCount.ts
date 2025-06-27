// src/hooks/useMortgageCount.ts
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/context/auth-context'

export function useMortgageCount() {
  const [manualIncrement, setManualIncrement] = useState(0);
  const { user } = useAuth();

  const query = useQuery<number>({
    queryKey: ['mortgageCount', user?.id],
    queryFn: async () => {
      if (!user?.id) {
        return 0;
      }
      
      const { count, error } = await supabase
        .from('mortgages')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id); // Filter by current user's ID
        
      if (error) throw error;
      return count || 0;
    },
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
    enabled: !!user?.id, // Only run query when user is available
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