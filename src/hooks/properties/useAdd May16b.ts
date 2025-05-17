import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { toast } from '@/components/ui/use-toast'
import { useCanCreateFeature } from '@/hooks/usePlanLimits'

// export async function useAddProperty() {
//   const { canCreate, isChecking } = useCanCreateFeature();
//   const addProperty = useAddProperty();
  
//   const qc = useQueryClient()

//   if (await canCreate('properties')) {

//   return useMutation({
//     mutationFn: async (newData: any) => {
//       const { data, error } = await supabase
//         .from('properties')
//         .insert(newData)
//         .select()
//         .single()
//       if (error || !data) throw error || new Error('Failed to insert property')
//       return data
//     },
//     onMutate: async () => {
//       await qc.cancelQueries({ queryKey: ['propertyCount'] })
//       const prev = qc.getQueryData<number>(['propertyCount'])
//       qc.setQueryData<number>(['propertyCount'], (old) => (old ?? 0) + 1)
//       return { prev }
//     },
//     onError: (_err, _newData, context: any) => {
//       if (context?.prev != null) {
//         qc.setQueryData<number>(['propertyCount'], context.prev)
//       }
//     },
//     onSettled: () => {
//       qc.invalidateQueries({ queryKey: ['propertyCount'] })
//       qc.invalidateQueries({ queryKey: ['properties'] })
//     },
//   })
// } else {
//   // Show an upgrade banner or modal
//   console.log('You need to upgrade your plan to create more properties')
//   // openUpgradeBanner('properties');
// }


// }



export async function useAddProperty() {
  const { canCreate, isChecking } = useCanCreateFeature();
  const qc = useQueryClient();

  const allowed = await canCreate('properties');

  if (!allowed) {
    return {
      canCreate: false,
      mutation: null,
    };
  }

  const mutation = useMutation({
    mutationFn: async (newData: any) => {
      const { data, error } = await supabase
        .from('properties')
        .insert(newData)
        .select()
        .single()
      if (error || !data) throw error || new Error('Failed to insert property');
      return data;
    },
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: ['propertyCount'] })
      const prev = qc.getQueryData<number>(['propertyCount']);
      qc.setQueryData<number>(['propertyCount'], (old) => (old ?? 0) + 1);
      return { prev };
    },
    onError: (_err, _newData, context: any) => {
      if (context?.prev != null) {
        qc.setQueryData<number>(['propertyCount'], context.prev);
      }
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['propertyCount'] });
      qc.invalidateQueries({ queryKey: ['properties'] });
    },
  });

  return {
    canCreate: true,
    mutation,
  };
}




   
