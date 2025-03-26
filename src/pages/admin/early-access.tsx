import { useState, useEffect } from "react"
import { supabase } from "@/integrations/supabase/client"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Download, Search, Users } from "lucide-react"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"
import { toast } from "sonner"

type Signup = {
  id: string
  email: string
  language: string
  ip_address: string
  status: string
  created_at: string
  verified_at: string | null
}

export default function EarlyAccessAdmin() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [signups, setSignups] = useState<Signup[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null)

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
      fetchSignups()
    } catch (error) {
      toast.error(t('error_checking_admin'))
      navigate('/')
    } finally {
      setLoading(false)
    }
  }

  async function fetchSignups() {
    try {
      const { data, error } = await supabase
        .from("early_access_signups")
        .select("*")
        .order("created_at", { ascending: false })

      if (error) throw error
      setSignups(data || [])
    } catch (error) {
      console.error("Error fetching signups:", error)
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

  async function exportToCSV() {
    const headers = ["Email", "Language", "Status", "Created At", "Verified At"]
    const csvData = signups.map((signup) => [
      signup.email,
      signup.language,
      signup.status,
      new Date(signup.created_at).toLocaleString(),
      signup.verified_at
        ? new Date(signup.verified_at).toLocaleString()
        : "Not verified",
    ])

    const csv = [
      headers.join(","),
      ...csvData.map((row) => row.join(",")),
    ].join("\n")

    const blob = new Blob([csv], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "early-access-signups.csv"
    a.click()
    window.URL.revokeObjectURL(url)
  }

  const filteredSignups = signups.filter((signup) => {
    const matchesSearch = signup.email
      .toLowerCase()
      .includes(search.toLowerCase())
    const matchesStatus =
      statusFilter === "all" || signup.status === statusFilter
    return matchesSearch && matchesStatus
  })

  return (
    <div className="container mx-auto py-4 px-2 sm:py-10 sm:px-10">
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold">{t("early_access_signups")}  
          <span className="text-sm"> {filteredSignups.length}</span></h1>
      
        </div>
        <Button onClick={exportToCSV}>
          <Download className="mr-2 h-4 w-4" />
          {t("export_to_csv")}
        </Button>
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
          value={statusFilter}
          onValueChange={(value) => setStatusFilter(value)}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder={t("filter_by_status")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("all")}</SelectItem>
            <SelectItem value="unverified">{t("unverified")}</SelectItem>
            <SelectItem value="verified">{t("verified")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("email")}</TableHead>
              <TableHead className="hidden sm:table-cell">{t("language")}</TableHead>
              <TableHead className="hidden sm:table-cell">{t("status")}</TableHead>
              <TableHead>{t("created_at")}</TableHead>
              <TableHead className="hidden sm:table-cell">{t("verified_at")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center">
                  {t("loading")}...
                </TableCell>
              </TableRow>
            ) : filteredSignups.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center">
                  {t("no_signups_found")}
                </TableCell>
              </TableRow>
            ) : (
              filteredSignups.map((signup) => (
                <TableRow key={signup.id}>
                  <TableCell>{signup.email}</TableCell>
                  <TableCell className="capitalize hidden sm:table-cell">{signup.language}</TableCell>
                  <TableCell className="hidden sm:table-cell capitalize">{signup.status}</TableCell>
                  <TableCell>
                    {new Date(signup.created_at).toLocaleString()}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    {signup.verified_at
                      ? new Date(signup.verified_at).toLocaleString()
                      : t("not_verified")}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
} 