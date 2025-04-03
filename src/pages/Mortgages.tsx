import { Plus, MoreVertical, Copy, Trash, MoreHorizontal, Trash2 } from "lucide-react"
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { formatCurrency } from "@/lib/utils"
import { SEO } from "@/components/seo"
import { useTranslation } from "react-i18next"
import { useToast } from "@/components/ui/use-toast"
import { useQueryClient } from "@tanstack/react-query"

type Property = {
  id: string
  name: string
  currency: "USD" | "PEN"
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
  loan_protection_type: "none" | "custom" | "individual" | "joint"
  loan_protection_insurance: number
  first_installment_date: string
}

export default function Mortgages() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { t: tGlobal } = useTranslation('global')
  const { t: tMortgages } = useTranslation('mortgages')
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const { data: propertiesWithAmortizations, isLoading } = useQuery({
    queryKey: ["properties-with-amortizations", user?.id],
    queryFn: async () => {
      if (!user) return []

      const { data: properties, error: propertiesError } = await supabase
        .from("properties")
        .select("*, amortizations(*)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })

      if (propertiesError) {
        console.error("Error fetching properties:", propertiesError)
        return []
      }

      return properties as Property[]
    },
    enabled: !!user,
  })

  const handleDuplicate = async (e: React.MouseEvent, amortization: Amortization) => {
    e.stopPropagation()
    try {
      const duplicatedAmortization = {
        name: `${amortization.name} (${tGlobal('ui.copy')})`,
        property_id: amortization.property_id,
        user_id: user?.id,
        loan_amount: amortization.loan_amount,
        down_payment: amortization.down_payment,
        interest_rate: amortization.interest_rate,
        term_years: amortization.term_years,
        installments_per_year: amortization.installments_per_year,
        installment_amount: amortization.installment_amount,
        total_interest: amortization.total_interest,
        total_payment: amortization.total_payment,
        loan_protection_type: amortization.loan_protection_type,
        loan_protection_insurance: amortization.loan_protection_insurance,
        first_installment_date: amortization.first_installment_date,
      }

      const { data, error } = await supabase
        .from("amortizations")
        .insert(duplicatedAmortization)
        .select()
        .single()

      if (error) throw error

      toast({
        title: tGlobal('ui.success'),
        description: tMortgages('messages.amortization_duplicated'),
      })

      // Refresh the data
      queryClient.invalidateQueries({ queryKey: ["properties-with-amortizations"] })
    } catch (error) {
      console.error("Error duplicating amortization:", error)
      toast({
        variant: "destructive",
        title: tGlobal('ui.error'),
        description: tMortgages('messages.error_duplicating_amortization'),
      })
    }
  }

  const handleDelete = async (e: React.MouseEvent, amortization: Amortization) => {
    e.stopPropagation()
    try {
      const { error } = await supabase
        .from("amortizations")
        .delete()
        .eq('id', amortization.id)

      if (error) throw error

      toast({
        title: tGlobal('ui.success'),
        description: tMortgages('messages.success_delete'),
      })

      // Refresh the data
      queryClient.invalidateQueries({ queryKey: ["properties-with-amortizations"] })
    } catch (error) {
      console.error("Error deleting amortization:", error)
      toast({
        variant: "destructive",
        title: tGlobal('ui.error'),
        description: tMortgages('messages.error_delete'),
      })
    }
  }

  const headerActions = (
    <Button onClick={() => navigate("/mortgages/new")}>
      <Plus className="mr-2 h-4 w-4" />
      {tMortgages('amortization.new')}
    </Button>
  )

  if (isLoading) {
    return (
      <DashboardLayout>
        <div>{tGlobal('ui.loading')}</div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout
      header={{
        title: <h1 className="text-xl font-bold">{tMortgages('title')}</h1>,
        actions: headerActions
      }}
    >
      <SEO 
        title={`${tMortgages('title')} - CreditoHipotecar.io`}
        description={tMortgages('description')}
      />
      <div className="p-8 space-y-8">
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
                    <TableHead className="w-[22%]">{tMortgages('amortization.name')}</TableHead>
                    <TableHead className="w-[20%]">{tMortgages('amortization.loan_amount')}</TableHead>
                    <TableHead className="w-[12%]">{tMortgages('amortization.down_payment')}</TableHead>
                    <TableHead className="w-[12%]">{tMortgages('amortization.interest_rate')}</TableHead>
                    <TableHead className="w-[12%]">{tMortgages('amortization.term')}</TableHead>
                    <TableHead className="w-[12%]">{tMortgages('amortization.installments_per_year')}</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {property.amortizations.map((amortization) => (
                    <TableRow 
                      key={amortization.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => navigate(`/mortgages/${amortization.id}`)}
                    >
                      <TableCell className="w-[22%]">{amortization.name}</TableCell>
                      <TableCell className="w-[20%]">
                        {formatCurrency(amortization.loan_amount, property.currency)}
                      </TableCell>
                      <TableCell className="w-[12%]">
                        {formatCurrency(amortization.down_payment, property.currency)}
                      </TableCell>
                      <TableCell className="w-[12%]">{amortization.interest_rate}%</TableCell>
                      <TableCell className="w-[12%]">{amortization.term_years} {tMortgages('amortization.years')}</TableCell>
                      <TableCell className="w-[12%]">{amortization.installments_per_year}</TableCell>
                      <TableCell className="w-[50px]">
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            className="flex h-8 w-8 items-center justify-center rounded-md border transition-colors hover:bg-muted touch-none"
                            onClick={(e) => e.stopPropagation()}
                            data-touch="true"
                            style={{ touchAction: 'none' }}
                          >
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">{tGlobal('ui.open_menu')}</span>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" sideOffset={5} className="touch-none">
                            <DropdownMenuItem onClick={() => handleDuplicate(e, amortization)}>
                              <Copy className="mr-2 h-4 w-4" />
                              <span>{tGlobal('ui.duplicate')}</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={(e) => handleDelete(e, amortization)}>
                              <Trash2 className="mr-2 h-4 w-4" />
                              <span>{tGlobal('ui.delete')}</span>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
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
            {tMortgages('messages.no_amortizations')}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
} 