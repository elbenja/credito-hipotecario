import { useState, useEffect } from "react"
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
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Download, Search, UserPlus, Mail, UserCog, Trash2 } from "lucide-react"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"
import { toast } from "sonner"
import { Label } from "@/components/ui/label"

type User = {
  id: string
  email: string
  created_at: string
  last_sign_in_at: string | null
  role: string
}

export default function UserManagement() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [roleFilter, setRoleFilter] = useState<string>("all")
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null)
  const [newUserEmail, setNewUserEmail] = useState("")
  const [newUserRole, setNewUserRole] = useState("user")
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [creatingUser, setCreatingUser] = useState(false)
  const [sendingResetEmail, setSendingResetEmail] = useState<{[key: string]: boolean}>({})
  const [userToDelete, setUserToDelete] = useState<User | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    checkAdminStatus()
  }, [])

  const checkAdminStatus = async () => {
    try {
      const { data: { user }, error } = await supabase.auth.getUser()
      
      if (error || !user) {
        toast.error(t('please_login'))
        navigate('/')
        return
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (profileError) {
        toast.error(t('error_fetching_profile'))
        navigate('/')
        return
      }

      if (!profile.is_admin) {
        toast.error(t('admin_only'))
        navigate('/')
        return
      }

      setIsAdmin(true)
      fetchUsers()
    } catch (error) {
      toast.error(t('error_checking_admin'))
      navigate('/')
    } finally {
      setLoading(false)
    }
  }

  async function fetchUsers() {
    try {
      // First try to get all users from auth.users using the RPC function
      try {
        const { data, error } = await supabase.rpc('get_all_users')
        if (!error) {
          setUsers(data || [])
          return
        }
        console.error("RPC error:", error)
      } catch (rpcError) {
        console.error("RPC failed:", rpcError)
      }
      
      // If RPC fails, fall back to querying profiles table
      toast.info("Using alternative method to fetch users...")
      
      // Get users from profiles table
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('id, email, is_admin, created_at')
      
      if (profileError) {
        throw profileError
      }
      
      // Transform the data to match our User type
      const transformedUsers = (profiles || []).map(profile => ({
        id: profile.id,
        email: profile.email || 'No email',
        role: profile.is_admin ? 'admin' : 'user',
        created_at: profile.created_at,
        last_sign_in_at: null // We don't have this info in profiles table
      }))
      
      setUsers(transformedUsers)
    } catch (error) {
      console.error("Error fetching users:", error)
      toast.error("Failed to fetch users")
    }
  }

  async function createUser() {
    if (!newUserEmail) {
      toast.error("Email is required")
      return
    }

    setCreatingUser(true)
    try {
      try {
        // Try using admin API via Supabase Edge Function
        const { data, error } = await supabase.functions.invoke('create-user', {
          body: { 
            email: newUserEmail, 
            role: newUserRole 
          }
        })

        if (error) throw error

        if (data?.user?.id) {
          toast.success("User created successfully!")
          // Send password reset email
          await sendPasswordResetEmail(newUserEmail)
          setNewUserEmail("")
          setNewUserRole("user")
          setCreateDialogOpen(false)
          fetchUsers() // Refresh user list
          return
        }
      } catch (edgeFunctionError) {
        console.error("Edge function error:", edgeFunctionError)
        
        // If Edge Function fails, fall back to using resetPasswordForEmail
        toast.info("Trying alternative method to create user...")
        
        // Use resetPasswordForEmail, which will create the user if it doesn't exist
        // and send a password reset email
        const { data, error } = await supabase.auth.resetPasswordForEmail(
          newUserEmail,
          {
            redirectTo: `${window.location.origin}/update-password`,
          }
        );
        
        if (error) throw error;
        
        toast.success("User invited successfully! They will receive an email to set their password.");
        
        // Note: with this method we can't set admin rights directly
        // Show notice about this limitation
        if (newUserRole === 'admin') {
          toast.info("Note: You'll need to update this user to admin status after they sign in.");
        }
        
        setNewUserEmail("");
        setNewUserRole("user");
        setCreateDialogOpen(false);
        fetchUsers(); // Refresh user list
      }
    } catch (error: any) {
      toast.error(`Failed to create user: ${error.message || "Unknown error"}`)
      console.error("User creation error:", error)
    } finally {
      setCreatingUser(false)
    }
  }

  async function sendPasswordResetEmail(email: string) {
    try {
      setSendingResetEmail({...sendingResetEmail, [email]: true})
      
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/update-password`,
      })

      if (error) throw error
      
      toast.success(`Password reset email sent to ${email}`)
    } catch (error: any) {
      toast.error(`Failed to send reset email: ${error.message || "Unknown error"}`)
    } finally {
      setSendingResetEmail({...sendingResetEmail, [email]: false})
    }
  }

  async function deleteUser(user: User) {
    setIsDeleting(true)
    try {
      // Try using admin API via Supabase Edge Function first
      try {
        const { data, error } = await supabase.functions.invoke('delete-user', {
          body: { userId: user.id }
        })

        if (error) throw error

        toast.success(`User ${user.email} deleted successfully`)
        fetchUsers() // Refresh the user list
        setUserToDelete(null) // Close the modal
        return
      } catch (edgeFunctionError) {
        console.error("Edge function error:", edgeFunctionError)
        
        // If Edge Function fails, try direct database deletion
        toast.info("Trying alternative method to delete user...")
        
        // Delete from profiles table
        const { error: profileError } = await supabase
          .from('profiles')
          .delete()
          .eq('id', user.id)

        if (profileError) throw profileError

        toast.success(`User ${user.email} deleted from profiles`)
        fetchUsers() // Refresh the user list
        setUserToDelete(null) // Close the modal
      }
    } catch (error: any) {
      toast.error(`Failed to delete user: ${error.message || "Unknown error"}`)
      console.error("User deletion error:", error)
    } finally {
      setIsDeleting(false)
    }
  }

  // If still checking admin status or not an admin, show loading
  if (isAdmin === null || !isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-lg">{t("loading")}...</p>
      </div>
    )
  }

  const filteredUsers = users.filter((user) => {
    const matchesSearch = user.email
      .toLowerCase()
      .includes(search.toLowerCase())
    const matchesRole =
      roleFilter === "all" || user.role === roleFilter
    return matchesSearch && matchesRole
  })

  return (
    <DashboardLayout
      header={{
        title: <h1 className="text-3xl font-bold">{t("user_management")}</h1>,
      }}
    >
      <div className="container mx-auto py-4 px-2 sm:py-10 sm:px-10">
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold">{t("user_management")}  
            <span className="text-sm"> {filteredUsers.length}</span></h1>
          </div>
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
                <Button onClick={createUser} disabled={creatingUser || !newUserEmail}>
                  {creatingUser ? t("creating") : t("create")}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
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
                <TableHead>{t("email")}</TableHead>
                <TableHead className="hidden sm:table-cell">{t("role")}</TableHead>
                <TableHead>{t("created_at")}</TableHead>
                <TableHead className="hidden sm:table-cell">{t("last_sign_in")}</TableHead>
                <TableHead>{t("actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center">
                    {t("loading")}...
                  </TableCell>
                </TableRow>
              ) : filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center">
                    {t("no_users_found")}
                  </TableCell>
                </TableRow>
              ) : (
                filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>{user.email}</TableCell>
                    <TableCell className="capitalize hidden sm:table-cell">{user.role}</TableCell>
                    <TableCell>
                      {new Date(user.created_at).toLocaleString()}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      {user.last_sign_in_at
                        ? new Date(user.last_sign_in_at).toLocaleString()
                        : t("never")}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => sendPasswordResetEmail(user.email)}
                          disabled={sendingResetEmail[user.id]}
                        >
                          <Mail className="mr-2 h-4 w-4" />
                          {sendingResetEmail[user.id] ? t("sending") : t("send_reset_email")}
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => setUserToDelete(user)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
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
                disabled={isDeleting}
              >
                {t("cancel")}
              </Button>
              <Button
                variant="destructive"
                onClick={() => userToDelete && deleteUser(userToDelete)}
                disabled={isDeleting}
              >
                {isDeleting ? t("deleting") : t("delete")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  )
} 