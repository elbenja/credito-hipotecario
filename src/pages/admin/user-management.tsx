import { useState, useEffect } from "react"
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from "@/integrations/supabase/client"
import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Download, Search, UserPlus, Mail, UserCog, Trash2, CreditCard, EllipsisVertical, ChevronUp, ChevronDown } from "lucide-react"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"
import { toast } from "sonner"
import { Label } from "@/components/ui/label"
import { PlanWithFeatures } from "@/types/subscription"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { UserTabs } from "@/components/admin/user-tabs"
import { mapSupabaseErrorToTranslationKey } from "@/utils/supabase-error-mapper"

type User = {
  id: string
  email: string
  created_at: string
  last_sign_in_at: string | null
  role: string
  subscription?: {
    id: string
    plan_id: string
    plan_name?: string
    current_period_start: string
  } | null
  mortgages_count?: number
}

type SortField = 'email' | 'role' | 'created_at' | 'last_sign_in_at' | 'plan' | 'current_period_start' | 'mortgages_count'
type SortDirection = 'asc' | 'desc'

// Custom hooks using React Query
function useUsers() {
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
            .select('id, user_id, plan_id, current_period_start, plan:plan_id(name)')
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
                plan_name: (userSubscription.plan as any)?.name,
                current_period_start: userSubscription.current_period_start
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

function useCreateUser() {
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

function useDeleteUser() {
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

function useSendPasswordReset() {
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

// Add a helper function for date formatting
function formatDateDDMMYYYY(dateString: string) {
  const date = new Date(dateString);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
}

export default function UserManagement() {
  const { t } = useTranslation(["admin", "global"])
  const navigate = useNavigate()
  
  // State for filters and UI
  const [search, setSearch] = useState("")
  const [roleFilter, setRoleFilter] = useState<string>("all")
  const [activeTab, setActiveTab] = useState("all")
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null)
  const [newUserEmail, setNewUserEmail] = useState("")
  const [newUserRole, setNewUserRole] = useState("user")
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [userToDelete, setUserToDelete] = useState<User | null>(null)
  const [subscriptionPlans, setSubscriptionPlans] = useState<PlanWithFeatures[]>([])
  const [changingSubscription, setChangingSubscription] = useState<{[key: string]: boolean}>({})
  const [sortField, setSortField] = useState<SortField>('email')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')

  // React Query hooks
  const { data: users = [], isLoading, error } = useUsers()
  const createUserMutation = useCreateUser()
  const deleteUserMutation = useDeleteUser()
  const sendPasswordResetMutation = useSendPasswordReset()

  useEffect(() => {
    checkAdminStatus()
  }, [])

  const checkAdminStatus = async () => {
    try {
      const { data: { user }, error } = await supabase.auth.getUser()
      
      if (error || !user) {
        toast.error(t('messages.please_login'))
        navigate('/')
        return
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (profileError) {
        toast.error(t('messages.error_fetching_profile'))
        navigate('/')
        return
      }

      if (!profile.is_admin) {
        toast.error(t('messages.admin_only'))
        navigate('/')
        return
      }

      setIsAdmin(true)
      fetchSubscriptionPlans()
    } catch (error) {
      toast.error(t('messages.error_checking_admin'))
      navigate('/')
    }
  }

  // Fetch available subscription plans
  async function fetchSubscriptionPlans() {
    try {
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('*, features:plan_features(*)')
        .eq('is_active', true)
        .order('price_monthly', { ascending: true });
        
      if (error) {
        throw error;
      }
      
      setSubscriptionPlans(data as PlanWithFeatures[]);
    } catch (error) {
      console.error("Error fetching subscription plans:", error)
      toast.error("Failed to fetch subscription plans")
    }
  }

  // Handle subscription plan change
  async function changeSubscriptionPlan(userId: string, planId: string) {
    setChangingSubscription({...changingSubscription, [userId]: true});
    
    try {
      const today = new Date();
      const nextMonth = new Date();
      nextMonth.setMonth(today.getMonth() + 1);
      
      // Check if user already has a subscription
      const { data: existingSubscription, error: checkError } = await supabase
        .from('user_subscriptions')
        .select('id')
        .eq('user_id', userId)
        .eq('status', 'active')
        .single();
      
      if (checkError && checkError.code !== 'PGRST116') { // PGRST116 is the "no rows returned" error
        throw checkError;
      }
      
      if (existingSubscription) {
        // Update existing subscription
        const { error } = await supabase
          .from('user_subscriptions')
          .update({
            plan_id: planId,
            current_period_start: today.toISOString(),
            current_period_end: nextMonth.toISOString(),
            status: 'active',
            cancel_at_period_end: false
          })
          .eq('id', existingSubscription.id);
          
        if (error) throw error;
      } else {
        // Create new subscription
        const { error } = await supabase
          .from('user_subscriptions')
          .insert({
            user_id: userId,
            plan_id: planId,
            status: 'active',
            current_period_start: today.toISOString(),
            current_period_end: nextMonth.toISOString()
          });
          
        if (error) throw error;
      }
      
      toast.success('Subscription plan updated successfully');
      // Use refetch from React Query instead of manual refresh
    } catch (error: any) {
      console.error('Error changing subscription plan:', error);
      toast.error(`Failed to update subscription: ${error.message || "Unknown error"}`);
    } finally {
      setChangingSubscription({...changingSubscription, [userId]: false});
    }
  }

  // Handle sorting
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  // Sort function
  const sortUsers = (users: User[]) => {
    return [...users].sort((a, b) => {
      let aValue: any
      let bValue: any

      switch (sortField) {
        case 'email':
          aValue = a.email.toLowerCase()
          bValue = b.email.toLowerCase()
          break
        case 'role':
          aValue = a.role
          bValue = b.role
          break
        case 'created_at':
          aValue = new Date(a.created_at)
          bValue = new Date(b.created_at)
          break
        case 'last_sign_in_at':
          aValue = a.last_sign_in_at ? new Date(a.last_sign_in_at) : new Date(0)
          bValue = b.last_sign_in_at ? new Date(b.last_sign_in_at) : new Date(0)
          break
        case 'plan':
          aValue = a.subscription?.plan_name?.toLowerCase() || ''
          bValue = b.subscription?.plan_name?.toLowerCase() || ''
          break
        case 'current_period_start':
          aValue = a.subscription?.current_period_start ? new Date(a.subscription.current_period_start) : new Date(0)
          bValue = b.subscription?.current_period_start ? new Date(b.subscription.current_period_start) : new Date(0)
          break
        case 'mortgages_count':
          aValue = a.mortgages_count || 0
          bValue = b.mortgages_count || 0
          break
        default:
          return 0
      }

      if (aValue < bValue) {
        return sortDirection === 'asc' ? -1 : 1
      }
      if (aValue > bValue) {
        return sortDirection === 'asc' ? 1 : -1
      }
      return 0
    })
  }

  // Filter users based on active tab, search, and role
  const filteredUsers = sortUsers(users.filter((user: User) => {
    const matchesSearch = user.email.toLowerCase().includes(search.toLowerCase())
    const matchesRole = roleFilter === "all" || user.role === roleFilter
    
    // Tab filtering
    let matchesTab = true
    if (activeTab === 'personal') {
      matchesTab = user.subscription?.plan_name?.toLowerCase() === 'personal'
    } else if (activeTab === 'profesional') {
      matchesTab = user.subscription?.plan_name?.toLowerCase() === 'profesional'
    } else if (activeTab === 'inversionista') {
      matchesTab = user.subscription?.plan_name?.toLowerCase() === 'inversionista'
    } else if (activeTab === 'none') {
      matchesTab = !user.subscription
    }
    
    return matchesSearch && matchesRole && matchesTab
  }))

  const handleCreateUser = async () => {
    if (!newUserEmail) {
      toast.error("Email is required")
      return
    }

    createUserMutation.mutate(
      { email: newUserEmail, role: newUserRole },
      {
        onSuccess: () => {
          setNewUserEmail("")
          setNewUserRole("user")
          setCreateDialogOpen(false)
        }
      }
    )
  }

  const handleDeleteUser = (user: User) => {
    deleteUserMutation.mutate(user.id, {
      onSuccess: () => {
        setUserToDelete(null)
      }
    })
  }

  // If still checking admin status or not an admin, show loading
  if (isAdmin === null || !isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-lg">{t("ui.loading", { ns: "global" })}...</p>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-lg">{t("loading")}...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-lg text-destructive">Error loading users</p>
      </div>
    )
  }

  return (
    <DashboardLayout
      header={{
        title: <h1 className="text-xl font-bold">{t("user_management")}</h1>,
      }}
    >
      <div className="container mx-auto py-4 px-2 sm:py-10 sm:px-10">
        {/* <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold">{t("user_management")}  
            <span className="text-sm"> {filteredUsers.length}</span></h1>
          </div>
     
        </div> */}

        {/* Tab Filtering */}


  <div className="w-full self-stretch inline-flex justify-between items-start">
    <div className="size- flex justify-start items-center gap-3">
          <UserTabs 
                users={users} 
                activeTab={activeTab} 
                onTabChange={setActiveTab} 
              />
    </div>
        {/* button Add user and Download CSV */}
        <div className="flex gap-2">
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <UserPlus className="mr-2 h-4 w-4" />
                {t("create_user")}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t("create_new_user")}</DialogTitle>
                <DialogDescription>
                  {t("create_user_description")}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="email">{t("email")}</Label>
                  <Input
                    id="email"
                    type="email"
                    value={newUserEmail}
                    onChange={(e) => setNewUserEmail(e.target.value)}
                    placeholder="user@example.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">{t("role")}</Label>
                  <Select value={newUserRole} onValueChange={setNewUserRole}>
                    <SelectTrigger id="role">
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">{t("user")}</SelectItem>
                      <SelectItem value="admin">{t("admin")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                  {t("cancel")}
                </Button>
                <Button 
                  onClick={handleCreateUser} 
                  disabled={Boolean(createUserMutation.isPending) || !newUserEmail}
                >
                  {createUserMutation.isPending ? t("creating") : t("create")}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          {/* Download CSV Button */}
          <Button
            variant="outline"
            onClick={() => {
              // Prepare CSV header
              const header = '"email";"plan";"created_at"\n';
              // Prepare CSV rows with DD-MM-YYYY format and plan, all fields quoted
              const rows = filteredUsers.map(user => `"${user.email}";"${user.subscription?.plan_name || ''}";"${formatDateDDMMYYYY(user.created_at)}"`);
              const csvContent = header + rows.join('\n');
              // Create a blob and trigger download
              const blob = new Blob([csvContent], { type: 'text/csv' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = 'users.csv';
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              URL.revokeObjectURL(url);
            }}
          >
            <Download className="mr-2 h-4 w-4" />
            Download CSV
          </Button>
        </div>
  </div>



        <div className="mb-6 flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={t("search_by_email")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select
            value={roleFilter}
            onValueChange={(value) => setRoleFilter(value)}
          >
            <SelectTrigger className="w-40">
              <SelectValue placeholder={t("filter_by_role")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("all")}</SelectItem>
              <SelectItem value="user">{t("user")}</SelectItem>
              <SelectItem value="admin">{t("admin")}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  <Button 
                    variant="ghost" 
                    className="h-auto p-0 font-semibold hover:bg-transparent"
                    onClick={() => handleSort('email')}
                  >
                    {t("email")}
                    {sortField === 'email' && (
                      sortDirection === 'asc' ? <ChevronUp className="ml-1 h-4 w-4" /> : <ChevronDown className="ml-1 h-4 w-4" />
                    )}
                  </Button>
                </TableHead>
                <TableHead className="hidden sm:table-cell">
                  <Button 
                    variant="ghost" 
                    className="h-auto p-0 font-semibold hover:bg-transparent"
                    onClick={() => handleSort('role')}
                  >
                    {t("role")}
                    {sortField === 'role' && (
                      sortDirection === 'asc' ? <ChevronUp className="ml-1 h-4 w-4" /> : <ChevronDown className="ml-1 h-4 w-4" />
                    )}
                  </Button>
                </TableHead>
                <TableHead>
                  <Button 
                    variant="ghost" 
                    className="h-auto p-0 font-semibold hover:bg-transparent"
                    onClick={() => handleSort('created_at')}
                  >
                    {t("created_at")}
                    {sortField === 'created_at' && (
                      sortDirection === 'asc' ? <ChevronUp className="ml-1 h-4 w-4" /> : <ChevronDown className="ml-1 h-4 w-4" />
                    )}
                  </Button>
                </TableHead>
                <TableHead className="hidden sm:table-cell">
                  <Button 
                    variant="ghost" 
                    className="h-auto p-0 font-semibold hover:bg-transparent"
                    onClick={() => handleSort('last_sign_in_at')}
                  >
                    {t("last_sign_in")}
                    {sortField === 'last_sign_in_at' && (
                      sortDirection === 'asc' ? <ChevronUp className="ml-1 h-4 w-4" /> : <ChevronDown className="ml-1 h-4 w-4" />
                    )}
                  </Button>
                </TableHead>
                <TableHead className="hidden md:table-cell">
                  <Button 
                    variant="ghost" 
                    className="h-auto p-0 font-semibold hover:bg-transparent"
                    onClick={() => handleSort('plan')}
                  >
                    Plan
                    {sortField === 'plan' && (
                      sortDirection === 'asc' ? <ChevronUp className="ml-1 h-4 w-4" /> : <ChevronDown className="ml-1 h-4 w-4" />
                    )}
                  </Button>
                </TableHead>
                <TableHead className="hidden md:table-cell">
                  <Button
                    variant="ghost"
                    className="h-auto p-0 font-semibold hover:bg-transparent"
                    onClick={() => handleSort('current_period_start')}
                  >
                    {'Current Period Start'}
                    {sortField === 'current_period_start' && (
                      sortDirection === 'asc' ? <ChevronUp className="ml-1 h-4 w-4" /> : <ChevronDown className="ml-1 h-4 w-4" />
                    )}
                  </Button>
                </TableHead>
                <TableHead className="hidden md:table-cell">
                  <Button 
                    variant="ghost" 
                    className="h-auto p-0 font-semibold hover:bg-transparent"
                    onClick={() => handleSort('mortgages_count')}
                  >
                    Mortgages
                    {sortField === 'mortgages_count' && (
                      sortDirection === 'asc' ? <ChevronUp className="ml-1 h-4 w-4" /> : <ChevronDown className="ml-1 h-4 w-4" />
                    )}
                  </Button>
                </TableHead>
                <TableHead>{t("actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center">
                    {t("no_users_found")}
                  </TableCell>
                </TableRow>
              ) : (
                filteredUsers.map((user: User) => (
                  <TableRow key={user.id}>
                    <TableCell>{user.email}</TableCell>
                    <TableCell className="capitalize hidden sm:table-cell">{user.role}</TableCell>
                    <TableCell>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            {new Date(user.created_at).toLocaleDateString()}
                          </TooltipTrigger>
                          <TooltipContent>
                            {new Date(user.created_at).toLocaleString()}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      {user.last_sign_in_at ? (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger>
                              {new Date(user.last_sign_in_at).toLocaleDateString()}
                            </TooltipTrigger>
                            <TooltipContent>
                              {new Date(user.last_sign_in_at).toLocaleString()}
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      ) : (
                        t("never")
                      )}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <Select 
                        value={user.subscription?.plan_id || ''}
                        onValueChange={(value) => changeSubscriptionPlan(user.id, value)}
                        disabled={Boolean(changingSubscription[user.id])}
                      >
                        <SelectTrigger className="w-40">
                          <SelectValue placeholder="Select plan">
                            {user.subscription?.plan_name || 'No plan'}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {subscriptionPlans.map((plan) => (
                            <SelectItem key={plan.id} value={plan.id}>
                              {plan.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {user.subscription?.current_period_start ? (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger>
                              {new Date(user.subscription.current_period_start).toLocaleDateString()}
                            </TooltipTrigger>
                            <TooltipContent>
                              {new Date(user.subscription.current_period_start).toLocaleString()}
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      ) : ''}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {user.mortgages_count || 0}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <span className="sr-only">Open menu</span>
                            <EllipsisVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem 
                            onClick={() => sendPasswordResetMutation.mutate(user.email)} 
                            disabled={Boolean(sendPasswordResetMutation.isPending)}
                          >
                            <Mail className="mr-2 h-4 w-4" />
                            {sendPasswordResetMutation.isPending ? t("sending") : t("send_reset_email")}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => setUserToDelete(user)} className="text-destructive">
                            <Trash2 className="mr-2 h-4 w-4" />
                            {t("ui.delete", { ns: "global" })}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Delete Confirmation Dialog */}
        <Dialog open={!!userToDelete} onOpenChange={(open) => !open && setUserToDelete(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("confirm_delete_user")}</DialogTitle>
              <DialogDescription>
                {t("delete_user_description", { email: userToDelete?.email })}
                {userToDelete?.role === 'admin' && (
                  <p className="mt-2 text-destructive">
                    {t("warning_deleting_admin")}
                  </p>
                )}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setUserToDelete(null)}
                disabled={Boolean(deleteUserMutation.isPending)}
              >
                {t("cancel")}
              </Button>
              <Button
                variant="destructive"
                onClick={() => userToDelete && handleDeleteUser(userToDelete)}
                disabled={Boolean(deleteUserMutation.isPending)}
              >
                {deleteUserMutation.isPending ? t("deleting") : t("delete")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  )
} 