import { Link } from "react-router-dom"
import { useState, useEffect } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { Plus } from "lucide-react"
import { useAuth } from "@/context/auth-context"
import { supabase } from "@/integrations/supabase/client"
import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { Button } from "@/components/ui/button"
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { PropertySelect, type Property } from "@/components/amortizations/property-select"
import { LoanDetails } from "@/components/amortizations/loan-details"
import { PaymentSchedule } from "@/components/amortizations/payment-schedule"
import { 
  amortizationFormSchema, 
  defaultValues, 
  type AmortizationFormValues 
} from "@/components/amortizations/schema"
import { PaymentScenariosPanel } from "@/components/amortizations/payment-scenarios-panel"

export default function NewAmortization() {
  const { user } = useAuth()
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null)
  const [interestRateLimits, setInterestRateLimits] = useState({
    min_rate: 1,
    max_rate: 25
  })
  const [paymentDetails, setPaymentDetails] = useState({
    regular: {
      totalInterestAndInsurance: 0,
      totalMonths: 0,
      monthlyPayment: 0
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
  const [showMobileDetails, setShowMobileDetails] = useState(false)

  const form = useForm<AmortizationFormValues>({
    resolver: zodResolver(amortizationFormSchema),
    defaultValues,
  })

  useEffect(() => {
    const loadInterestRateLimits = async () => {
      const { data, error } = await supabase
        .from("interest_rate_limits")
        .select("min_rate, max_rate")
        .eq("is_active", true)
        .maybeSingle()

      if (error) {
        console.error("Error loading interest rate limits:", error)
        return
      }
      
      if (data) {
        setInterestRateLimits(data)
      }
    }

    loadInterestRateLimits()
  }, [])

  useEffect(() => {
    if (!selectedProperty) return

    const loanAmount = selectedProperty.price_cost - parseFloat(form.getValues("down_payment").replace(/[^0-9.]/g, ""))
    const interestRate = parseFloat(form.getValues("interest_rate")) / 100
    const termYears = parseInt(form.getValues("term_years"))
    const installmentsPerYear = parseInt(form.getValues("installments_per_year"))

    // Regular payment calculation
    const totalMonths = termYears * installmentsPerYear
    const monthlyRate = interestRate / installmentsPerYear
    const monthlyPayment = (loanAmount * monthlyRate * Math.pow(1 + monthlyRate, totalMonths)) / (Math.pow(1 + monthlyRate, totalMonths) - 1)
    const totalPayment = monthlyPayment * totalMonths
    const totalInterest = totalPayment - loanAmount

    // Set the same base calculation for all scenarios initially
    const baseCalculation = {
      totalInterestAndInsurance: totalInterest,
      totalMonths,
      monthlyPayment
    }

    setPaymentDetails({
      regular: baseCalculation,
      accelerated: baseCalculation,
      lower: baseCalculation,
      newRate: baseCalculation
    })
  }, [selectedProperty, form.watch()])

  const onSubmit = async (values: AmortizationFormValues) => {
    try {
      if (!user || !selectedProperty) return

      const interestRate = parseFloat(values.interest_rate)
      if (interestRate < interestRateLimits.min_rate || interestRate > interestRateLimits.max_rate) {
        return
      }

      const downPayment = parseFloat(values.down_payment.replace(/[^0-9.]/g, ""))
      const loanAmount = selectedProperty.price_cost - downPayment

      const amortizationData = {
        name: values.name,
        property_id: values.property_id,
        down_payment: downPayment,
        interest_rate: interestRate,
        term_years: parseInt(values.term_years),
        installments_per_year: parseInt(values.installments_per_year),
        first_installment_date: values.first_installment_date.toISOString(),
        loan_amount: loanAmount,
        user_id: user.id,
        total_payment: 0,
        total_interest: 0,
        installment_amount: 0,
        loan_protection_type: values.loan_protection_type,
        loan_protection_insurance: parseFloat(values.loan_protection_insurance),
      }

      const { error } = await supabase
        .from("amortizations")
        .insert(amortizationData)

      if (error) throw error

      window.location.href = "/amortizations"
    } catch (error) {
      console.error("Error saving amortization:", error)
    }
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
                <BreadcrumbPage>New Amortization</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        )
      }}
    >
      <div>
        <div className="flex items-center justify-between px-8 py-4">
          <h1 className="text-2xl font-bold">New Amortization</h1>
          </div>

<Separator />

<div className="space-y-6 px-8 pt-6">
          <div className="flex flex-col md:flex-row gap-6">
            {/* Left Container */}
            <div className="w-full md:w-[40%]">
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

                  <Separator />

                  <PropertySelect 
                    form={form} 
                    onPropertyChange={setSelectedProperty} 
                  />

                  <LoanDetails 
                    form={form}
                    selectedProperty={selectedProperty}
                    interestRateLimits={interestRateLimits}
                  />

                  <Separator />

                  <div className="flex flex-col gap-2">
                    <Button type="submit">
                      Save
                    </Button>
                    <Button type="button" variant="secondary">
                      <Plus className="mr-2 h-4 w-4" />
                      Save & Create Rental Scenario
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
              currency={selectedProperty?.currency || "PEN"}
            />
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
