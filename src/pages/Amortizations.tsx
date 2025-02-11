
import { Plus } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { supabase } from "@/integrations/supabase/client"
import { useAuth } from "@/context/auth-context"
import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatCurrency } from "@/lib/utils"

type Property = {
  id: string
  name: string
  currency: string
  price_cost: number
  amortizations: Amortization[]
}

type Amortization = {
  id: string
  name: string
  loan_amount: number
  down_payment: number
  interest_rate: number
  term_years: number
  installments_per_year: number
  installment_amount: number
  total_interest: number
  total_payment: number
  property_id: string
}

export default function Amortizations() {
  const navigate = useNavigate()
  const { user } = useAuth()

  const { data: propertiesWithAmortizations, isLoading } = useQuery({
    queryKey: ["properties-with-amortizations", user?.id],
    queryFn: async () => {
      if (!user) return []

      const { data: properties, error: propertiesError } = await supabase
        .from("properties")
        .select(`
          id,
          name,
          currency,
          price_cost,
          amortizations (
            id,
            name,
            loan_amount,
            down_payment,
            interest_rate,
            term_years,
            installments_per_year,
            installment_amount,
            total_interest,
            total_payment
          )
        `)
        .eq("user_id", user.id)

      if (propertiesError) {
        console.error("Error fetching properties:", propertiesError)
        return []
      }

      // Add logging to debug the data
      console.log("Properties data:", properties)

      return (properties || []) as Property[]
    },
    enabled: !!user,
  })

  if (isLoading) {
    return (
      <DashboardLayout>
        <div>Loading...</div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <div className="flex items-center justify-between pb-4">
            <h1 className="text-3xl font-bold">Amortizations</h1>
            <Button onClick={() => navigate("/amortizations/new")}>
              <Plus className="mr-2 h-4 w-4" />
              Add Amortization
            </Button>
          </div>
          <Separator className="w-[calc(100%+4rem)] -ml-8" />
        </div>

        <div className="space-y-8">
          {propertiesWithAmortizations?.map((property) => (
            property.amortizations.length > 0 && (
              <div key={property.id} className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold">{property.name}</h2>
                  <span className="text-xl font-semibold">
                    {property.price_cost !== undefined && property.price_cost !== null 
                      ? formatCurrency(property.price_cost, property.currency)
                      : '-'}
                  </span>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[20%]">Name</TableHead>
                      <TableHead className="w-[12%]">Loan Amount</TableHead>
                      <TableHead className="w-[12%]">Down Payment</TableHead>
                      <TableHead className="w-[8%]">Interest Rate</TableHead>
                      <TableHead className="w-[8%]">Term</TableHead>
                      <TableHead className="w-[10%]">Installments/Year</TableHead>
                      <TableHead className="w-[10%]">Monthly Payment</TableHead>
                      <TableHead className="w-[10%]">Total Interest</TableHead>
                      <TableHead className="w-[10%]">Total Payment</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {property.amortizations.map((amortization) => (
                      <TableRow 
                        key={amortization.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => navigate(`/amortizations/${amortization.id}`)}
                      >
                        <TableCell className="w-[20%]">{amortization.name}</TableCell>
                        <TableCell className="w-[12%]">
                          {formatCurrency(amortization.loan_amount, property.currency)}
                        </TableCell>
                        <TableCell className="w-[12%]">
                          {formatCurrency(amortization.down_payment, property.currency)}
                        </TableCell>
                        <TableCell className="w-[8%]">{amortization.interest_rate}%</TableCell>
                        <TableCell className="w-[8%]">{amortization.term_years} years</TableCell>
                        <TableCell className="w-[10%]">{amortization.installments_per_year}</TableCell>
                        <TableCell className="w-[10%]">
                          {formatCurrency(amortization.installment_amount, property.currency)}
                        </TableCell>
                        <TableCell className="w-[10%]">
                          {formatCurrency(amortization.total_interest, property.currency)}
                        </TableCell>
                        <TableCell className="w-[10%]">
                          {formatCurrency(amortization.total_payment, property.currency)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )
          ))}

          {(!propertiesWithAmortizations || propertiesWithAmortizations.length === 0) && (
            <div className="text-center text-muted-foreground py-8">
              No amortizations found. Create your first amortization by clicking the button above.
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}
