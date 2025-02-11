
import { useEffect } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { supabase } from "@/integrations/supabase/client"
import { useAuth } from "@/context/auth-context"
import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { Link } from "react-router-dom"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { 
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form"
import { Button } from "@/components/ui/button"
import { PropertySelect } from "@/components/amortizations/property-select"
import { LoanDetails } from "@/components/amortizations/loan-details"
import { PaymentSchedule } from "@/components/amortizations/payment-schedule"
import { useToast } from "@/hooks/use-toast"
import { 
  amortizationFormSchema, 
  type AmortizationFormValues 
} from "@/components/amortizations/schema"
import { Input } from "@/components/ui/input"

export default function EditAmortization() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { toast } = useToast()

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
            currency,
            price_cost
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

  const form = useForm<AmortizationFormValues>({
    resolver: zodResolver(amortizationFormSchema),
    defaultValues: {
      name: amortization?.name || "",
      property_id: amortization?.property_id || "",
      down_payment: amortization?.down_payment?.toString() || "",
      interest_rate: amortization?.interest_rate?.toString() || "",
      term_years: amortization?.term_years?.toString() || "",
      installments_per_year: amortization?.installments_per_year?.toString() || "",
      first_installment_date: amortization?.first_installment_date 
        ? new Date(amortization.first_installment_date)
        : new Date(),
    },
  })

  useEffect(() => {
    if (amortization) {
      form.reset({
        name: amortization.name,
        property_id: amortization.property_id,
        down_payment: amortization.down_payment.toString(),
        interest_rate: amortization.interest_rate.toString(),
        term_years: amortization.term_years.toString(),
        installments_per_year: amortization.installments_per_year.toString(),
        first_installment_date: new Date(amortization.first_installment_date),
      })
    }
  }, [amortization, form])

  useEffect(() => {
    if (amortization && amortization.user_id !== user?.id) {
      navigate("/amortizations")
    }
  }, [amortization, user, navigate])

  const onSubmit = async (values: AmortizationFormValues) => {
    try {
      if (!user || !amortization?.property) return

      const downPayment = parseFloat(values.down_payment.replace(/[^0-9.]/g, ""))
      const loanAmount = amortization.property.price_cost - downPayment

      const amortizationData = {
        name: values.name,
        property_id: values.property_id,
        down_payment: downPayment,
        interest_rate: parseFloat(values.interest_rate),
        term_years: parseInt(values.term_years),
        installments_per_year: parseInt(values.installments_per_year),
        first_installment_date: values.first_installment_date.toISOString(),
        loan_amount: loanAmount,
        total_payment: 0, // These will be calculated by the database trigger
        total_interest: 0,
        installment_amount: 0,
      }

      const { error } = await supabase
        .from("amortizations")
        .update(amortizationData)
        .eq('id', id)

      if (error) throw error

      toast({
        title: "Success",
        description: "Amortization updated successfully",
      })

      navigate("/amortizations")
    } catch (error) {
      console.error("Error updating amortization:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "There was an error updating the amortization",
      })
    }
  }

  const handleDelete = async () => {
    try {
      if (!user || !id) return

      const { error } = await supabase
        .from("amortizations")
        .delete()
        .eq('id', id)

      if (error) throw error

      toast({
        title: "Success",
        description: "Amortization deleted successfully",
      })

      navigate("/amortizations")
    } catch (error) {
      console.error("Error deleting amortization:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "There was an error deleting the amortization",
      })
    }
  }

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
          <Separator className="my-4" />

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
        <div>
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
          <Separator className="my-4" />
        </div>

        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">{amortization.name}</h1>
          <Button variant="destructive" onClick={handleDelete}>
            Delete
          </Button>
        </div>

        <div className="max-w-2xl">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter amortization name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <PropertySelect 
                form={form}
                onPropertyChange={() => {}}
                disabled={true}
              />

              <LoanDetails 
                form={form}
                selectedProperty={{
                  ...amortization.property,
                  currency: amortization.property.currency as "USD" | "PEN"
                }}
                interestRateLimits={{
                  min_rate: 1,
                  max_rate: 25
                }}
              />

              <PaymentSchedule form={form} />

              <div className="flex space-x-4">
                <Button type="submit">
                  Update
                </Button>
                <Button 
                  type="button" 
                  variant="secondary" 
                  onClick={() => navigate("/amortizations")}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </div>
    </DashboardLayout>
  )
}
