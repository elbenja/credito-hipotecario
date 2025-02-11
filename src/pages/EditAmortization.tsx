
import { useEffect } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { supabase } from "@/integrations/supabase/client"
import { useAuth } from "@/context/auth-context"
import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Link } from "react-router-dom"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"

export default function EditAmortization() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()

  const { data: amortization, isLoading } = useQuery({
    queryKey: ["amortization", id],
    queryFn: async () => {
      if (!user || !id) return null

      const { data, error } = await supabase
        .from("amortizations")
        .select(`
          *,
          property:properties (
            id,
            name,
            currency
          )
        `)
        .eq("id", id)
        .maybeSingle()

      if (error) {
        console.error("Error fetching amortization:", error)
        return null
      }

      return data
    },
    enabled: !!user && !!id,
  })

  useEffect(() => {
    if (amortization && amortization.user_id !== user?.id) {
      navigate("/amortizations")
    }
  }, [amortization, user, navigate])

  if (isLoading) {
    return (
      <DashboardLayout>
        <div>Loading...</div>
      </DashboardLayout>
    )
  }

  if (!amortization) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <Link to="/amortizations" className="transition-colors hover:text-foreground">
                  Amortizations
                </Link>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Not Found</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          <div className="text-center py-8">
            <h1 className="text-2xl font-semibold mb-2">Amortization not found</h1>
            <p className="text-muted-foreground mb-4">
              The amortization you're looking for doesn't exist or has been deleted.
            </p>
            <Button onClick={() => navigate("/amortizations")}>
              Back to Amortizations
            </Button>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <Link to="/amortizations" className="transition-colors hover:text-foreground">
                Amortizations
              </Link>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{amortization.name}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">{amortization.name}</h1>
          <Button variant="destructive" onClick={() => navigate("/amortizations")}>
            Delete
          </Button>
        </div>

        {/* TODO: Add edit form with the same fields as NewAmortization */}
        <div className="max-w-2xl">
          <p className="text-muted-foreground">
            Edit form will be implemented here with the same fields as the New Amortization form.
          </p>
        </div>
      </div>
    </DashboardLayout>
  )
}
