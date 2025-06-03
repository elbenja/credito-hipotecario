import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { toast } from 'sonner'
import { mapSupabaseErrorToTranslationKey } from '@/utils/supabase-error-mapper'
import { useTranslation } from 'react-i18next'

export type User = {
  id: string
  email: string
  created_at: string
  last_sign_in_at: string | null
  role: string
  subscription?: {
    id: string
    plan_id: string
    plan_name?: string
  } | null
  mortgages_count?: number
}

// Fetch users with React Query
export function useUsers() {
  return useQuery({
    queryKey: ['admin-users'],
    queryFn: async (): Promise<User[]> => {
      try {
        const { data, error } = await supabase.rpc('get_all_users')
        
        if (!error && data) {
          const userIds = data.map((user: User) => user.id);
          
          // Fetch subscriptions
          const { data: subscriptions, error: subscriptionError } = await supabase
            .from('user_subscriptions')
            .select('id, user_id, plan_id, plan:plan_id(name)')
            .in('user_id', userIds)
            .eq('status', 'active');
            
          if (subscriptionError) {
            console.error("Error fetching subscriptions:", subscriptionError);
          }
          
          // Fetch mortgage counts
          const { data: mortgageCounts, error: mortgageError } = await supabase
            .rpc('get_mortgage_counts_for_admins');
            
          if (mortgageError) {
            console.error("Error fetching mortgage counts:", mortgageError);
          }
          
          return data.map((user: User) => {
            const userSubscription = subscriptions?.find(s => s.user_id === user.id);
            const userMortgageCount = mortgageCounts?.find((m: { user_id: string, count: number }) => m.user_id === user.id);
            
            return {
              ...user,
              subscription: userSubscription ? {
                id: userSubscription.id,
                plan_id: userSubscription.plan_id,
                plan_name: Array.isArray(userSubscription.plan) ? userSubscription.plan[0]?.name : userSubscription.plan?.name
              } : null,
              mortgages_count: userMortgageCount ? userMortgageCount.count : 0
            };
          });
        }
        throw new Error('Failed to fetch users')
      } catch (error) {
        console.error("Error fetching users:", error)
        throw error
      }
    },
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
  })
}

// Create user mutation
export function useCreateUser() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ email, role }: { email: string, role: string }) => {
      try {
        const { data, error } = await supabase.functions.invoke('create-user', {
          body: { email, role }
        })
        if (error) throw error
        return data
      } catch (edgeFunctionError) {
        // Fallback method
        const { data, error } = await supabase.auth.resetPasswordForEmail(
          email,
          { redirectTo: `${window.location.origin}/update-password` }
        );
        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      toast.success("User created successfully!")
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
    },
    onError: (error: any) => {
      toast.error(`Failed to create user: ${error.message || "Unknown error"}`)
    }
  })
}

// Delete user mutation
export function useDeleteUser() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (userId: string) => {
      try {
        const { data, error } = await supabase.functions.invoke('delete-user', {
          body: { userId }
        })
        if (error) throw error
        return data
      } catch (edgeFunctionError) {
        // Fallback: delete from profiles table
        const { error: profileError } = await supabase
          .from('profiles')
          .delete()
          .eq('id', userId)
        if (profileError) throw profileError
        return null
      }
    },
    onSuccess: () => {
      toast.success("User deleted successfully")
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
    },
    onError: (error: any) => {
      toast.error(`Failed to delete user: ${error.message || "Unknown error"}`)
    }
  })
}

// Send password reset mutation
export function useSendPasswordReset() {
  const { t } = useTranslation(['admin'])
  
  return useMutation({
    mutationFn: async (email: string) => {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/update-password`,
      })
      if (error) throw error
    },
    onSuccess: (_, email) => {
      toast.success(`Password reset email sent to ${email}`)
    },
    onError: (error: any, email) => {
      const errorKey = mapSupabaseErrorToTranslationKey(error)
      let translatedError: string
      try {
        translatedError = t(errorKey as any)
      } catch {
        translatedError = error.message || "Unknown error"
      }
      toast.error(`Failed to send reset email: ${translatedError}`)
    }
  })
} 