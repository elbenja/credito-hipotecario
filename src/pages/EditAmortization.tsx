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
import { LoanCalculator } from "@/services/amortization/calculations/loan"
import { useTranslation } from "react-i18next"

export default function EditAmortization() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { toast } = useToast()
  const { t } = useTranslation()
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
              is_sustainable,
              property_insurance,
              property_insurance_type
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

  const loanCalculator = new LoanCalculator()

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
        loan_protection_type: amortization.loan_protection_type || "none",
        loan_protection_insurance: amortization.loan_protection_insurance?.toString() || "0",
      }, {
        keepDefaultValues: true
      })
    }
  }, [amortization, form])

  useEffect(() => {
    if (amortization && amortization.user_id !== user?.id) {
      navigate("/mortgages")
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
        loan_protection_type: values.loan_protection_type,
        loan_protection_insurance: parseFloat(values.loan_protection_insurance),
      }

      const { error } = await supabase
        .from("amortizations")
        .update(amortizationData)
        .eq('id', id)

      if (error) throw error

      toast({
        title: t("success"),
        description: t("success_update"),
      })

      // Only navigate if this was an explicit form submission
      const isExplicitSubmit = (event?.target as HTMLElement)?.tagName === 'FORM'
      if (isExplicitSubmit) {
        navigate("/mortgages")
      }
    } catch (error) {
      console.error("Error updating amortization:", error)
      toast({
        variant: "destructive",
        title: t("error"),
        description: t("error_update"),
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
        title: t("success"),
        description: t("success_delete"),
      })

      navigate("/mortgages")
    } catch (error) {
      console.error("Error deleting amortization:", error)
      toast({
        variant: "destructive",
        title: t("error"),
        description: t("error_delete"),
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
        title: t("success"),
        description: t("success_name_update"),
      })

      refetch()
    } catch (error) {
      console.error("Error updating name:", error)
      toast({
        variant: "destructive",
        title: t("error"),
        description: t("error_name_update"),
      })
    }
  }

  // Calculate payment details when form values change
  useEffect(() => {
    if (!amortization?.property) return

    const mockProperty = {
      id: amortization.property.id,
      cost: amortization.property.price_cost,
      currency: amortization.property.currency,
      property_insurance: amortization.property.property_insurance || 0,
      property_insurance_type: amortization.property.property_insurance_type,
      bonus: 0
    }

    const baseValues = {
      property_id: amortization.property.id,
      down_payment: parseFloat(form.getValues("down_payment")),
      down_payment_percentage: (parseFloat(form.getValues("down_payment")) / amortization.property.price_cost) * 100,
      interest_rate: parseFloat(form.getValues("interest_rate")),
      term_years: parseInt(form.getValues("term_years")),
      installments_per_year: parseInt(form.getValues("installments_per_year")) as 12 | 14,
      first_installment_date: form.getValues("first_installment_date"),
      loan_protection_type: form.getValues("loan_protection_type") as "individual" | "joint" | "none" | "custom",
      loan_protection_insurance: parseFloat(form.getValues("loan_protection_insurance"))
    }

    // Calculate results using the loan calculator service
    const results = loanCalculator.calculateResults(mockProperty, baseValues)

    // Set the same base calculation for all scenarios initially
    const baseCalculation = {
      totalInterestAndInsurance: results.total_interest_and_insurance,
      totalMonths: results.total_months,
      monthlyPayment: results.monthly_payment
    }

    setPaymentDetails({
      regular: baseCalculation,
      accelerated: baseCalculation,
      lower: baseCalculation,
      newRate: baseCalculation
    })
  }, [amortization?.property, form.watch()])

  const handlePropertyUpdate = (updatedProperty: Property) => {
    setSelectedProperty(updatedProperty)
    refetch() // Refresh the amortization data to get the latest property info
  }

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-[50vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <p className="mt-2 text-sm text-muted-foreground">{t("loading_amortization")}</p>
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
                  <Link to="/mortgages" className="transition-colors hover:text-foreground">
                    {t("mortgages")}
                  </Link>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>{amortization?.name || t("amortization_not_found")}</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          )
        }}
      >
        <div className="text-center py-8">
          <h1 className="text-2xl font-semibold mb-2">{t("amortization_not_found")}</h1>
          <p className="text-muted-foreground mb-4">
            {t("amortization_not_found_description")}
          </p>
          <Button onClick={() => navigate("/mortgages")}>
            {t("back_to_mortgages")}
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
    navigate("/mortgages")
    return null
  }

  return (
    <DashboardLayout
      header={{
        title: (
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <Link to="/mortgages" className="transition-colors hover:text-foreground">
                  {t("mortgages")}
                </Link>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <EditableHeading 
                  value={amortization.name} 
                  onChange={handleNameChange}
                  size="breadcrumb"
                  as="span"
                  className="text-foreground"
                />
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        )
      }}
    >
      <div className="flex flex-col min-h-screen">
        <div className="flex flex-col md:flex-row flex-1">
          <div className="w-full md:w-[40%] px-8 pt-6 relative flex-shrink-0">
            <div className="absolute top-0 bottom-0 right-0 w-[1px] bg-border"></div>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormItem>
                  <FormLabel>{t("property")}</FormLabel>
                  <PropertyDisplay 
                    property={{
                      ...amortization.property,
                      is_first_home: amortization.property.is_first_home || false,
                      is_sustainable: amortization.property.is_sustainable || false
                    }}
                    onPropertyUpdate={handlePropertyUpdate}
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
                    {t("update")}
                  </Button>
                  <Button 
                    type="button" 
                    variant="secondary" 
                    className="w-full"
                    onClick={() => navigate("/mortgages")}
                  >
                    {t("cancel")}
                  </Button>
                </div>
              </form>
            </Form>
          </div>

          <PaymentScenariosPanel 
            paymentDetails={paymentDetails}
            showMobileDetails={showMobileDetails}
            onCloseMobilePanel={() => setShowMobileDetails(false)}
            onOpenMobilePanel={() => setShowMobileDetails(true)}
            currency={amortization.property.currency}
            loanAmount={amortization.property.price_cost - parseFloat(form.getValues("down_payment"))}
            annualInterestRate={parseFloat(form.getValues("interest_rate"))}
            termYears={parseInt(form.getValues("term_years"))}
            installmentsPerYear={parseInt(form.getValues("installments_per_year")) as 12 | 14}
            firstInstallmentDate={form.getValues("first_installment_date")}
            propertyInsurance={amortization.property.property_insurance || 0}
            loanProtection={parseFloat(form.getValues("loan_protection_insurance") || "0")}
            amortizationId={id || ""}
          />
        </div>
      </div>
    </DashboardLayout>
  )
}
