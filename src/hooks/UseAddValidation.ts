// import { useCanCreateFeature } from '@/hooks/usePlanLimits'
// // import { useMutation, UseMutationOptions } from '@tanstack/react-query'
// import { useState } from 'react'

// export function useAddWithValidation (
//   featureName: 'properties' | 'mortgages' | 'rentals',
//   // mutationOptions: UseMutationOptions<TData, unknown, TVariables>,
// ) {
//   const { canCreate } = useCanCreateFeature()
//   const [isBlocked, setIsBlocked] = useState(false)

//   // const mutation = useMutation<TData, unknown, TVariables>(mutationOptions)

//   // const checkAndMutate = async (variables: TVariables) => {
//   //   const allowed = await canCreate(featureName)
//   //   if (!allowed) {
//   //     setIsBlocked(true)
//   //     return
//   //   }
//   //   // mutation.mutate(variables)
//   // }
//   const allowed =  canCreate(featureName)
//   if (!allowed) {
//     setIsBlocked(true)
//     console.log('You need to upgrade your plan to create more properties')
//     return
   
//   }else{
//     console.log('You can create more properties')
//   }
//   return {
//     // checkAndMutate,
//     // mutation,
//     isBlocked,
//     resetBlock: () => setIsBlocked(false),
//   }
// }
