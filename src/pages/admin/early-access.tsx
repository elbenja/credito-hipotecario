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
import { Download, Search } from "lucide-react"

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
  const [signups, setSignups] = useState<Signup[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")

  useEffect(() => {
    fetchSignups()
  }, [])

  async function fetchSignups() {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from("early_access_signups")
        .select("*")
        .order("created_at", { ascending: false })

      if (error) throw error
      setSignups(data || [])
    } catch (error) {
      console.error("Error fetching signups:", error)
    } finally {
      setLoading(false)
    }
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
    <div className="container mx-auto py-10">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-3xl font-bold">Early Access Signups</h1>
        <Button onClick={exportToCSV}>
          <Download className="mr-2 h-4 w-4" />
          Export to CSV
        </Button>
      </div>

      <div className="mb-6 flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by email..."
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
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="unverified">Unverified</SelectItem>
            <SelectItem value="verified">Verified</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead>Language</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created At</TableHead>
              <TableHead>Verified At</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center">
                  Loading...
                </TableCell>
              </TableRow>
            ) : filteredSignups.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center">
                  No signups found
                </TableCell>
              </TableRow>
            ) : (
              filteredSignups.map((signup) => (
                <TableRow key={signup.id}>
                  <TableCell>{signup.email}</TableCell>
                  <TableCell className="capitalize">{signup.language}</TableCell>
                  <TableCell className="capitalize">{signup.status}</TableCell>
                  <TableCell>
                    {new Date(signup.created_at).toLocaleString()}
                  </TableCell>
                  <TableCell>
                    {signup.verified_at
                      ? new Date(signup.verified_at).toLocaleString()
                      : "Not verified"}
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