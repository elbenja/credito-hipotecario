import { useEffect, useState } from "react"
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
import { EditableHeading } from "@/components/ui/editable-heading"
import { 
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form"
import { Button } from "@/components/ui/button"
import { PropertySelect, PropertyDisplay, type Property } from "@/components/amortizations/property-select"
import { LoanDetails } from "@/components/amortizations/loan-details"
import { useToast } from "@/hooks/use-toast"
import { 
  amortizationFormSchema, 
  type AmortizationFormValues 
} from "@/components/amortizations/schema"
import { Input } from "@/components/ui/input"
import { PlayCircle, ArrowLeft } from "lucide-react"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { PaymentSummary } from "@/components/amortizations/payment-summary"
import { PaymentScenariosPanel } from "@/components/amortizations/payment-scenarios-panel"

export default function EditAmortization() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { toast } = useToast()
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null)
  const [showMobileDetails, setShowMobileDetails] = useState(false)
  const [paymentDetails, setPaymentDetails] = useState({
    regular: {
      totalInterestAndInsurance: 182017.59,
      totalMonths: 360,
      monthlyPayment: 691.44
    },
    accelerated: {
      totalInterestAndInsurance: 0,
      totalMonths: 0,
      monthlyPayment: 0
    },
    lower: {
      totalInterestAndInsurance: 0,
      totalMonths: 0,
      monthlyPayment: 0
    },
    newRate: {
      totalInterestAndInsurance: 0,
      totalMonths: 0,
      monthlyPayment: 0
    }
  })

  const form = useForm<AmortizationFormValues>({
    resolver: zodResolver(amortizationFormSchema),
    defaultValues: {
      name: "",
      property_id: "",
      down_payment: "0",
      interest_rate: "4",
      term_years: "20",
      installments_per_year: "12",
      first_installment_date: new Date(),
    }
  })

  const { data: amortization, isLoading, refetch } = useQuery({
    queryKey: ["amortization", id],
    queryFn: async () => {
      if (!user || !id) return null

      const [{ data: amortizationData, error: amortizationError }, { data: limitsData, error: limitsError }] = await Promise.all([
        supabase
          .from("amortizations")
          .select(`
            *,
            property:properties (
              id,
              name,
              currency,
              price_cost,
              is_first_home,
              is_sustainable
            )
          `)
          .eq("id", id)
          .maybeSingle(),
        supabase
          .from("interest_rate_limits")
          .select("min_rate, max_rate")
          .eq("is_active", true)
          .maybeSingle()
      ])

      if (amortizationError) {
        console.error("Error fetching amortization:", amortizationError)
        return null
      }

      if (limitsError) {
        console.error("Error fetching interest rate limits:", limitsError)
      }

      if (!amortizationData || !amortizationData.property) {
        return null
      }

      // Ensure property has the correct type
      const property = {
        ...amortizationData.property,
        currency: amortizationData.property.currency as "USD" | "PEN"
      }

      return {
        ...amortizationData,
        property,
        interestRateLimits: limitsData || { min_rate: 4, max_rate: 18 }
      }
    },
    enabled: !!user && !!id,
  })

  useEffect(() => {
    if (amortization && amortization.property) {
      setSelectedProperty({
        ...amortization.property,
        is_first_home: amortization.property.is_first_home || false,
        is_sustainable: amortization.property.is_sustainable || false
      })
      form.reset({
        name: amortization.name,
        property_id: amortization.property_id,
        down_payment: amortization.down_payment.toString(),
        interest_rate: amortization.interest_rate.toString(),
        term_years: amortization.term_years.toString(),
        installments_per_year: amortization.installments_per_year.toString(),
        first_installment_date: new Date(amortization.first_installment_date),
      }, {
        keepDefaultValues: true
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

  const handleNameChange = async (newName: string) => {
    try {
      if (!user || !id) return

      const { error } = await supabase
        .from("amortizations")
        .update({ name: newName })
        .eq('id', id)

      if (error) throw error

      toast({
        title: "Success",
        description: "Name updated successfully",
      })

      refetch()
    } catch (error) {
      console.error("Error updating name:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "There was an error updating the name",
      })
    }
  }

  // Calculate payment details when form values change
  useEffect(() => {
    if (!amortization?.property) return

    // TODO: Implement actual calculations based on form values
    // This is just a placeholder for now
    const loanAmount = amortization.property.price_cost - parseFloat(form.getValues("down_payment"))
    const interestRate = parseFloat(form.getValues("interest_rate")) / 100
    const termYears = parseInt(form.getValues("term_years"))
    const installmentsPerYear = parseInt(form.getValues("installments_per_year"))

    // Regular payment calculation
    const totalMonths = termYears * installmentsPerYear
    const monthlyRate = interestRate / installmentsPerYear
    const monthlyPayment = (loanAmount * monthlyRate * Math.pow(1 + monthlyRate, totalMonths)) / (Math.pow(1 + monthlyRate, totalMonths) - 1)
    const totalPayment = monthlyPayment * totalMonths
    const totalInterest = totalPayment - loanAmount

    setPaymentDetails(prev => ({
      ...prev,
      regular: {
        totalInterestAndInsurance: totalInterest,
        totalMonths,
        monthlyPayment
      }
    }))
  }, [amortization?.property, form.watch()])

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-[50vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <p className="mt-2 text-sm text-muted-foreground">Loading amortization...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  if (!amortization) {
    return (
      <DashboardLayout
        header={{
          title: (
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <Link to="/amortizations" className="transition-colors hover:text-foreground">
                    Amortizations
                  </Link>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>{amortization?.name || 'Not Found'}</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          )
        }}
      >
        <div className="text-center py-8">
          <h1 className="text-2xl font-semibold mb-2">Amortization not found</h1>
          <p className="text-muted-foreground mb-4">
            The amortization you're looking for doesn't exist or has been deleted.
          </p>
          <Button onClick={() => navigate("/amortizations")}>
            Back to Amortizations
          </Button>
        </div>
      </DashboardLayout>
    )
  }

  if (!amortization.property) {
    toast({
      variant: "destructive",
      title: "Error",
      description: "Could not load property details. Please try again.",
    })
    navigate("/amortizations")
    return null
  }

  return (
    <DashboardLayout
      header={{
        title: (
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <Link to="/amortizations" className="transition-colors hover:text-foreground">
                  Amortizations
                </Link>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>{amortization?.name || 'Not Found'}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        )
      }}
    >
      <div>
        <div className="flex items-center justify-between px-8 py-4">
          <EditableHeading 
            value={amortization.name} 
            onChange={handleNameChange}
          />
          <Button variant="destructive" onClick={handleDelete}>
            Delete
          </Button>
        </div>

        <Separator />

        <div className="space-y-6 px-8 pt-6">
          <div className="flex flex-col md:flex-row gap-6">
            {/* Left Container */}
            <div className="w-full md:w-[40%]">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <FormItem>
                    <FormLabel>Property</FormLabel>
                    <PropertyDisplay 
                      property={{
                        ...amortization.property,
                        is_first_home: amortization.property.is_first_home || false,
                        is_sustainable: amortization.property.is_sustainable || false
                      }}
                    />
                  </FormItem>

                  <LoanDetails 
                    form={form}
                    selectedProperty={selectedProperty}
                    interestRateLimits={amortization?.interestRateLimits || { min_rate: 4, max_rate: 18 }}
                  />

                  <Separator className="w-full" />

                  <div className="flex flex-col gap-2">
                    <Button type="submit" className="w-full">
                      Update
                    </Button>
                    <Button 
                      type="button" 
                      variant="secondary" 
                      className="w-full"
                      onClick={() => navigate("/amortizations")}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              </Form>
            </div>

            <PaymentScenariosPanel 
              paymentDetails={paymentDetails}
              showMobileDetails={showMobileDetails}
              onCloseMobilePanel={() => setShowMobileDetails(false)}
              isMobile={true}
            />

            <PaymentScenariosPanel 
              paymentDetails={paymentDetails}
            />
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
