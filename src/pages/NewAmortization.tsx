import { Link } from "react-router-dom"
import { useState, useEffect } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { Plus } from "lucide-react"
import { useAuth } from "@/context/auth-context"
import { supabase } from "@/integrations/supabase/client"
import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { Button } from "@/components/ui/button"
import { useTranslation } from "react-i18next"
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
import { ExtraInstallmentsSection } from "@/components/amortizations/extra-installments-section"
import { type ExtraInstallment } from "@/components/amortizations/types"
import { LoanCalculator } from "@/services/amortization/calculations/loan"

export default function NewAmortization() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null)
  const [temporaryInstallments, setTemporaryInstallments] = useState<ExtraInstallment[]>([])
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
  const loanCalculator = new LoanCalculator()

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

    const mockProperty = {
      id: selectedProperty.id,
      cost: selectedProperty.price_cost,
      currency: selectedProperty.currency,
      property_insurance: selectedProperty.property_insurance || 0,
      property_insurance_type: selectedProperty.property_insurance_type,
      bonus: 0
    }

    const baseValues = {
      property_id: selectedProperty.id,
      down_payment: parseFloat(form.getValues("down_payment")),
      down_payment_percentage: (parseFloat(form.getValues("down_payment")) / selectedProperty.price_cost) * 100,
      interest_rate: parseFloat(form.getValues("interest_rate")),
      term_years: parseInt(form.getValues("term_years")),
      installments_per_year: parseInt(form.getValues("installments_per_year")) as 12 | 14,
      first_installment_date: form.getValues("first_installment_date"),
      loan_protection_type: form.getValues("loan_protection_type") as "individual" | "joint" | "none" | "custom",
      loan_protection_insurance: parseFloat(form.getValues("loan_protection_insurance"))
    }

    // Calculate results using the loan calculator service
    const results = loanCalculator.calculateResults(mockProperty, baseValues)

    // Base calculation for regular payments
    const regularCalculation = {
      totalInterestAndInsurance: results.total_interest_and_insurance,
      totalMonths: results.total_months,
      monthlyPayment: results.monthly_payment
    }

    // Calculate total extra payments
    const extraPayments = temporaryInstallments.reduce((total, installment) => {
      if (installment.frequency === 'monthly') {
        return total + (installment.amount * results.total_months)
      }
      return total + installment.amount
    }, 0)

    // Accelerated calculation (reduced term)
    const acceleratedMonthlyPayment = results.monthly_payment
    const reducedLoanAmount = selectedProperty.price_cost - parseFloat(form.getValues("down_payment")) - extraPayments
    const acceleratedResults = loanCalculator.calculateResults(mockProperty, {
      ...baseValues,
      down_payment: parseFloat(form.getValues("down_payment")) + extraPayments
    })

    // Lower payment calculation (same term)
    const lowerResults = loanCalculator.calculateResults(mockProperty, {
      ...baseValues,
      down_payment: parseFloat(form.getValues("down_payment")) + extraPayments
    })

    setPaymentDetails({
      regular: regularCalculation,
      accelerated: {
        totalInterestAndInsurance: acceleratedResults.total_interest_and_insurance,
        totalMonths: acceleratedResults.total_months,
        monthlyPayment: acceleratedResults.monthly_payment
      },
      lower: {
        totalInterestAndInsurance: lowerResults.total_interest_and_insurance,
        totalMonths: lowerResults.total_months,
        monthlyPayment: lowerResults.monthly_payment
      },
      newRate: regularCalculation // This will be updated when a new rate is selected
    })
  }, [selectedProperty, form.watch(), temporaryInstallments])

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

      // Insert amortization and get the ID
      const { data: amortizationResult, error: amortizationError } = await supabase
        .from("amortizations")
        .insert(amortizationData)
        .select("id")
        .single()

      if (amortizationError) throw amortizationError

      // If we have temporary installments, insert them with the new amortization ID
      if (temporaryInstallments.length > 0 && amortizationResult) {
        const installmentsToInsert = temporaryInstallments.map(installment => ({
          amortization_id: amortizationResult.id,
          amount: installment.amount,
          frequency: installment.frequency,
          start_date: installment.start_date
        }))

        const { error: installmentsError } = await supabase
          .from("extra_installments")
          .insert(installmentsToInsert)

        if (installmentsError) throw installmentsError
      }

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
                  {t("amortizations")}
                </Link>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>{t("new_amortization")}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        )
      }}
    >
      <div className="flex flex-col min-h-screen">
        <div className="flex items-center justify-between px-8 py-4">
          <h1 className="text-2xl font-bold">{t("new_amortization")}</h1>
        </div>

        <Separator />

        <div className="flex flex-col md:flex-row flex-1">
          {/* Left Container */}
          <div className="w-full md:w-[40%] px-8 pt-6 relative flex-shrink-0">
            <div className="absolute top-0 bottom-0 right-0 w-[1px] bg-border"></div>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("amortization_name")}</FormLabel>
                      <FormControl>
                        <Input placeholder={t("enter_amortization_name")} {...field} />
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
                    {t("save")}
                  </Button>
                  <Button type="button" variant="secondary">
                    <Plus className="mr-2 h-4 w-4" />
                    {t("save_and_create_rental")}
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
            loanAmount={selectedProperty ? selectedProperty.price_cost - parseFloat(form.getValues("down_payment").replace(/[^0-9.]/g, "")) : 0}
            annualInterestRate={parseFloat(form.getValues("interest_rate"))}
            termYears={parseInt(form.getValues("term_years"))}
            installmentsPerYear={parseInt(form.getValues("installments_per_year")) as 12 | 14}
            firstInstallmentDate={form.getValues("first_installment_date")}
            propertyInsurance={selectedProperty?.property_insurance || 0}
            loanProtection={parseFloat(form.getValues("loan_protection_insurance") || "0")}
            amortizationId=""
            extraInstallments={temporaryInstallments}
            onExtraInstallmentAdd={(installment) => {
              const newInstallment: Omit<ExtraInstallment, 'amortization_id' | 'created_at' | 'updated_at'> = {
                id: Math.random().toString(36).substr(2, 9), // Temporary ID
                ...installment
              }
              setTemporaryInstallments([...temporaryInstallments, newInstallment as ExtraInstallment])
            }}
            onExtraInstallmentDelete={(id) => {
              setTemporaryInstallments(temporaryInstallments.filter(i => i.id !== id))
            }}
          />
        </div>
      </div>
    </DashboardLayout>
  )
}
