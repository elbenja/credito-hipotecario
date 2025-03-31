import { Plus, MoreVertical, Copy, Trash } from "lucide-react"
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
}

export default function Mortgages() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { t } = useTranslation()
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
        ...amortization,
        name: `${amortization.name} (${t('copy')})`,
      }
      delete (duplicatedAmortization as any).id

      const { data, error } = await supabase
        .from("amortizations")
        .insert(duplicatedAmortization)
        .select()
        .single()

      if (error) throw error

      toast({
        title: t('success'),
        description: t('amortization_duplicated'),
      })

      // Refresh the data
      queryClient.invalidateQueries({ queryKey: ["properties-with-amortizations"] })
    } catch (error) {
      console.error("Error duplicating amortization:", error)
      toast({
        variant: "destructive",
        title: t('error'),
        description: t('error_duplicating_amortization'),
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
        title: t('success'),
        description: t('amortization_deleted'),
      })

      // Refresh the data
      queryClient.invalidateQueries({ queryKey: ["properties-with-amortizations"] })
    } catch (error) {
      console.error("Error deleting amortization:", error)
      toast({
        variant: "destructive",
        title: t('error'),
        description: t('error_deleting_amortization'),
      })
    }
  }

  const headerActions = (
    <Button onClick={() => navigate("/mortgages/new")}>
      <Plus className="mr-2 h-4 w-4" />
      {t('add_amortization')}
    </Button>
  )

  if (isLoading) {
    return (
      <DashboardLayout>
        <div>{t('loading')}</div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout
      header={{
        title: <h1 className="text-3xl font-bold">{t('amortizations_title')}</h1>,
        actions: headerActions
      }}
    >
      <SEO 
        title={`${t('amortizations_title')} - CreditoHipotecar.io`}
        description={t('amortizations_description')}
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
                    <TableHead className="w-[20%]">{t('loan_name')}</TableHead>
                    <TableHead className="w-[12%]">{t('loan_amount')}</TableHead>
                    <TableHead className="w-[12%]">{t('down_payment')}</TableHead>
                    <TableHead className="w-[8%]">{t('interest_rate')}</TableHead>
                    <TableHead className="w-[8%]">{t('term')}</TableHead>
                    <TableHead className="w-[10%]">{t('installments_per_year')}</TableHead>
                    <TableHead className="w-[10%]">{t('monthly_payment')}</TableHead>
                    <TableHead className="w-[10%]">{t('total_interest')}</TableHead>
                    <TableHead className="w-[10%]">{t('total_payment')}</TableHead>
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
                      <TableCell className="w-[20%]">{amortization.name}</TableCell>
                      <TableCell className="w-[12%]">
                        {formatCurrency(amortization.loan_amount, property.currency)}
                      </TableCell>
                      <TableCell className="w-[12%]">
                        {formatCurrency(amortization.down_payment, property.currency)}
                      </TableCell>
                      <TableCell className="w-[8%]">{amortization.interest_rate}%</TableCell>
                      <TableCell className="w-[8%]">{amortization.term_years} {t('years')}</TableCell>
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
                      <TableCell className="w-[50px]">
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            className="flex h-8 w-8 items-center justify-center rounded-md border transition-colors hover:bg-muted"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MoreVertical className="h-4 w-4" />
                            <span className="sr-only">{t('open_menu')}</span>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={(e) => handleDuplicate(e, amortization)}>
                              <Copy className="mr-2 h-4 w-4" />
                              <span>{t('duplicate')}</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={(e) => handleDelete(e, amortization)}
                              className="text-red-600 focus:text-red-600"
                            >
                              <Trash className="mr-2 h-4 w-4" />
                              <span>{t('delete')}</span>
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
            {t('no_amortizations')}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
} 