import { Link, useNavigate, useLocation } from "react-router-dom"
import { useState, useEffect, useCallback } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { useAuth } from "@/context/auth-context"
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
import { AmortizationDetailsForm } from "@/components/amortizations/amortization-details-form"
import { 
  RegularPanelGraph, 
  AcceleratedPanelGraph, 
  LowerPaymentPanelGraph, 
  NewRatePanelGraph 
} from '@/components/amortizations/scenario-panels/graph-panels'
import { ExtraInstallmentsSection } from '@/components/mortgages/extra-installments-section'
import { NewRateForm } from '@/components/mortgages/new-rate-form'
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { 
  amortizationFormSchema, 
  defaultValues, 
  type AmortizationFormValues 
} from "@/components/amortizations/schema"
import { LoanCalculator } from "@/services/amortization/calculations/loan"
import { supabase } from "@/integrations/supabase/client"
import { useToast } from "@/components/ui/use-toast"
import type { ScenarioResult } from "@/services/amortization/types/common"

export default function NewMortgage() {
  const { t } = useTranslation(['mortgages', 'dashboard', 'global'])
  const { t: tMortgages } = useTranslation('mortgages')
  const { user } = useAuth()
  const navigate = useNavigate()
  const { toast } = useToast()
  const location = useLocation()
  
  // Extract propertyId from URL query parameters
  const queryParams = new URLSearchParams(location.search)
  const propertyIdFromUrl = queryParams.get('propertyId')
  
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null)
  const [regularScenario, setRegularScenario] = useState<ScenarioResult | null>(null)
  const [interestRateLimits] = useState({
    min_rate: 4,
    max_rate: 18,
    by_default: 8.5
  })
  const [activeTab, setActiveTab] = useState("regular")
  const [isLoadingScenarios, setIsLoadingScenarios] = useState(false)
  const [scenarios, setScenarios] = useState<{
    regular: ScenarioResult | null;
    accelerated: ScenarioResult | null;
    lower_payment: ScenarioResult | null;
    new_rate: ScenarioResult | null;
  }>({
    regular: null,
    accelerated: null,
    lower_payment: null,
    new_rate: null
  })

  const form = useForm<AmortizationFormValues>({
    resolver: zodResolver(amortizationFormSchema),
    defaultValues: {
      ...defaultValues,
      property_id: propertyIdFromUrl || ""
    },
    mode: "onChange"
  })

  // Add loan protection type watcher effect
  useEffect(() => {
    const type = form.watch("loan_protection_type");
    
    switch (type) {
      case "individual":
        form.setValue("loan_protection_insurance", "0.028", {
          shouldValidate: true,
          shouldDirty: true
        });
        break;
      case "joint":
        form.setValue("loan_protection_insurance", "0.052", {
          shouldValidate: true,
          shouldDirty: true
        });
        break;
      case "none":
        form.setValue("loan_protection_insurance", "0", {
          shouldValidate: true,
          shouldDirty: true
        });
        break;
      // For custom type, don't override the value
    }
  }, [form.watch("loan_protection_type"), form]);

  // Watch for name changes to update breadcrumb
  const amortizationName = form.watch("name")

  const loanCalculator = new LoanCalculator()

  const calculateScenarios = (values: Partial<AmortizationFormValues>) => {
    if (!selectedProperty || !values.down_payment || !values.interest_rate || !values.term_years || !values.installments_per_year || !values.first_installment_date) {
      return {
        regular: null,
        accelerated: null,
        lower_payment: null,
        new_rate: null
      }
    }

    setIsLoadingScenarios(true)

    const mockProperty = {
      id: selectedProperty.id,
      name: selectedProperty.name,
      price_cost: selectedProperty.price_cost,
      cost: selectedProperty.price_cost,
      currency: selectedProperty.currency,
      property_insurance: selectedProperty.property_insurance || 0,
      property_insurance_type: selectedProperty.property_insurance_type,
      is_first_home: selectedProperty.is_first_home || false,
      is_sustainable: selectedProperty.is_sustainable || false,
      bonus: 0
    }

    const baseValues = {
      property_id: selectedProperty.id,
      down_payment: parseFloat(values.down_payment),
      down_payment_percentage: (parseFloat(values.down_payment) / selectedProperty.price_cost) * 100,
      interest_rate: parseFloat(values.interest_rate),
      term_years: parseInt(values.term_years),
      installments_per_year: parseInt(values.installments_per_year) as 12 | 14,
      first_installment_date: values.first_installment_date,
      loan_protection_type: values.loan_protection_type as "individual" | "joint" | "none" | "custom",
      loan_protection_insurance: parseFloat(values.loan_protection_insurance || "0")
    }

    // Regular scenario
    const regularResults = loanCalculator.calculateResults(mockProperty, baseValues)
    const regular = transformToScenarioResult(regularResults) as ScenarioResult
    
    // Accelerated scenario - higher payments (15% increase)
    // We need to simulate accelerated payments by increasing the monthly payment
    const acceleratedBaseValues = { ...baseValues }
    const acceleratedMultiplier = 1.15 // 15% higher payments
    const regularBasePayment = regularResults.base_monthly_payment
    const acceleratedBasePayment = regularBasePayment * acceleratedMultiplier
    const acceleratedResults = simulateAcceleratedPayments(
      regularResults.loan_amount, 
      acceleratedBasePayment, 
      baseValues, 
      mockProperty
    )
    const accelerated = transformToScenarioResult(acceleratedResults) as ScenarioResult
    
    // Lower payment scenario - longer term (5 years more)
    const lowerPaymentBaseValues = { 
      ...baseValues,
      term_years: Math.min(baseValues.term_years + 5, 40) // Add 5 years but don't exceed 40
    }
    const lowerPaymentResults = loanCalculator.calculateResults(mockProperty, lowerPaymentBaseValues)
    const lower_payment = transformToScenarioResult(lowerPaymentResults) as ScenarioResult
    
    // New rate scenario - 1% higher rate
    const newRateBaseValues = { 
      ...baseValues,
      interest_rate: baseValues.interest_rate + 1 // 1% higher rate
    }
    const newRateResults = loanCalculator.calculateResults(mockProperty, newRateBaseValues)
    const new_rate = transformToScenarioResult(newRateResults) as ScenarioResult

    setIsLoadingScenarios(false)
    
    return {
      regular,
      accelerated,
      lower_payment,
      new_rate
    }
  }

  // Helper function to simulate accelerated payments
  const simulateAcceleratedPayments = (
    loanAmount: number,
    acceleratedPayment: number,
    baseValues: any,
    property: any
  ): any => {
    // Clone the loan calculator results structure but with accelerated payments
    // This is a simplified simulation for the UI demo
    const monthlyRate = Math.pow(1 + baseValues.interest_rate/100, 1/12) - 1
    const originalSchedule = loanCalculator.generatePaymentSchedule(loanAmount, baseValues, property)
    const schedule: any[] = []
    
    let remainingBalance = loanAmount
    let currentDate = new Date(baseValues.first_installment_date)
    let paymentNumber = 1
    
    // Continue until balance is effectively zero
    while (remainingBalance > 0.01 && paymentNumber <= 600) { // 50 years max
      const isDoublePayment = baseValues.installments_per_year === 14 && 
        (currentDate.getMonth() === 6 || currentDate.getMonth() === 11)
      
      // Base payment without insurance
      const currentBasePayment = isDoublePayment ? acceleratedPayment * 2 : acceleratedPayment
      
      // Insurance amounts (monthly)
      const monthlyPropertyInsurance = Number(property.property_insurance || 0)
      const monthlyLoanProtection = Number(baseValues.loan_protection_insurance || 0)
      
      // Double the insurance for double payment months
      const currentPropertyInsurance = isDoublePayment ? monthlyPropertyInsurance * 2 : monthlyPropertyInsurance
      const currentLoanProtection = isDoublePayment ? monthlyLoanProtection * 2 : monthlyLoanProtection
      
      const interestPayment = remainingBalance * monthlyRate
      let principalPayment = currentBasePayment - interestPayment
      
      // Adjust final payment to match remaining balance
      if (principalPayment > remainingBalance) {
        principalPayment = remainingBalance
      }
      
      const endingBalance = Math.max(0, remainingBalance - principalPayment)
      
      // Total payment includes base payment plus both insurances
      const totalPayment = principalPayment + interestPayment + currentPropertyInsurance + currentLoanProtection
      
      const payment = {
        date: new Date(currentDate),
        payment_number: paymentNumber,
        beginning_balance: remainingBalance,
        scheduled_payment: totalPayment,
        extra_payment: 0,
        total_payment: totalPayment,
        principal: principalPayment,
        interest: interestPayment,
        ending_balance: endingBalance,
        property_insurance: currentPropertyInsurance,
        loan_insurance: currentLoanProtection,
        is_extra_payment: false,
        is_double_payment: isDoublePayment
      }
      
      schedule.push(payment)
      remainingBalance = endingBalance
      
      // Move to next payment date
      currentDate.setMonth(currentDate.getMonth() + 1)
      paymentNumber++
      
      // Exit if we've paid off the loan
      if (endingBalance <= 0) break
    }
    
    // Calculate total interest and insurance
    const totalInterestAndInsurance = schedule.reduce((sum, payment) => 
      sum + payment.interest + payment.property_insurance + payment.loan_insurance, 0
    )
    
    return {
      loan_amount: loanAmount,
      total_interest_and_insurance: totalInterestAndInsurance,
      total_months: schedule.length,
      base_monthly_payment: acceleratedPayment,
      monthly_payment: acceleratedPayment + 
        Number(property.property_insurance || 0) + 
        Number(baseValues.loan_protection_insurance || 0),
      payment_schedule: schedule
    }
  }

  // Helper function to transform results to the format expected by ScenarioResult
  const transformToScenarioResult = (results: any): ScenarioResult => {
    return {
      summary: {
        total_interest_and_insurance: results.total_interest_and_insurance,
        total_months: results.total_months,
        monthly_payment: results.monthly_payment
      },
      payments: results.payment_schedule.map((payment: any) => ({
        payment_date: payment.date,
        capital: payment.principal,
        interest: payment.interest,
        property_insurance: payment.property_insurance,
        loan_insurance: payment.loan_insurance,
        monthly_payment: payment.total_payment,
        is_different_from_base: false,
        beginning_balance: payment.beginning_balance,
        ending_balance: payment.ending_balance
      }))
    }
  }

  // Update scenarios when form values change
  const handleFormChange = () => {
    const values = form.getValues()
    const calculatedScenarios = calculateScenarios(values)
    setScenarios(calculatedScenarios)
    setRegularScenario(calculatedScenarios.regular)
    // console.log('Scenarios updated:', { calculatedScenarios, selectedProperty })
  }

  // Subscribe to form changes
  useEffect(() => {
    const subscription = form.watch(handleFormChange)
    return () => subscription.unsubscribe()
  }, [form, selectedProperty])

  // Handle property selection
  const handlePropertyChange = useCallback((property: Property | null) => {
    setSelectedProperty(property)
    if (property) {
      form.setValue("property_id", property.id, { shouldValidate: true })
    } else {
      form.setValue("property_id", "", { shouldValidate: true })
    }
  }, [form])
  
  // Fetch property if propertyId is provided in URL
  useEffect(() => {
    const fetchPropertyFromUrl = async () => {
      if (!propertyIdFromUrl || !user) return
      
      try {
        const { data, error } = await supabase
          .from("properties")
          .select(`
            id,
            name,
            description,
            currency,
            price_cost,
            is_first_home,
            is_sustainable,
            property_insurance,
            property_insurance_type
          `)
          .eq("id", propertyIdFromUrl)
          .single()
          
        if (error) throw error
        if (data) {
          // Set the selected property
          handlePropertyChange(data as unknown as Property)
          
          // Set a default name for the mortgage based on the property name
          const defaultMortgageName = `${data.name} ${t("amortization.new_name")}`
          form.setValue("name", defaultMortgageName, { shouldValidate: true })
        }
      } catch (error) {
        console.error("Error fetching property:", error)
      }
    }
    
    fetchPropertyFromUrl()
  }, [propertyIdFromUrl, user, form, handlePropertyChange, t])

  return (
    <DashboardLayout
      header={{
        title: (
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <Link to="/mortgages" className="transition-colors hover:text-foreground">
                  {t("sections.mortgages", { ns: "dashboard" })}
                </Link>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>
                  {amortizationName || t("amortization.new", { ns: "mortgages" })}
                </BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        )
      }}
    >
      <Form {...form}>
        <div className="flex flex-col min-h-screen">
          <div className="flex flex-col md:flex-row flex-1">
            {/* Left Container */}
            <div className="w-full md:w-[40%] md:min-w-[320px] md:max-w-[540px] relative flex-shrink-0">
              <div className="absolute top-0 bottom-0 right-0 w-[1px] bg-border"></div>
              <div className="p-6 space-y-6">
                <PropertySelect 
                  form={form} 
                  onPropertyChange={handlePropertyChange}
                />

                <Separator />

                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("amortization.label", { ns: "mortgages" })}</FormLabel>
                      <FormControl>
                        <Input placeholder={t("amortization.name", { ns: "mortgages" })} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {selectedProperty && (
                  <>
                    <Separator />
                    
                    <AmortizationDetailsForm
                      form={form}
                      selectedProperty={selectedProperty}
                      onSubmit={async (values) => {
                        try {
                          if (!selectedProperty || !regularScenario) {
                            toast({
                              variant: "destructive",
                              title: t("ui.error", { ns: "global" }),
                              description: t("messages.please_complete_all_fields", { ns: "mortgages" }),
                            })
                            return
                          }

                          // Parse numeric values safely
                          const downPayment = parseFloat(values.down_payment.replace(/[^0-9.]/g, ""))
                          const interestRate = parseFloat(values.interest_rate)
                          const termYears = parseInt(values.term_years)
                          const installmentsPerYear = parseInt(values.installments_per_year)
                          
                          // Handle loan protection insurance based on type
                          let loanProtectionInsurance = null;
                          const loanProtectionType = values.loan_protection_type;
                          
                          switch (loanProtectionType) {
                            case "individual":
                              loanProtectionInsurance = 0.028;
                              break;
                            case "joint":
                              loanProtectionInsurance = 0.052;
                              break;
                            case "custom":
                              const rawValue = parseFloat(values.loan_protection_insurance || "0");
                              if (isNaN(rawValue) || rawValue < 0 || rawValue > 1) {
                                throw new Error("Invalid loan protection insurance amount (must be between 0 and 1)");
                              }
                              loanProtectionInsurance = rawValue;
                              break;
                            case "none":
                              loanProtectionInsurance = 0;
                              break;
                            default:
                              throw new Error("Invalid loan protection type");
                          }

                          // Validate numeric values
                          if (isNaN(downPayment) || downPayment < 0) {
                            throw new Error("Invalid down payment amount")
                          }
                          if (isNaN(interestRate) || interestRate < 0) {
                            throw new Error("Invalid interest rate")
                          }
                          if (isNaN(termYears) || termYears < 1) {
                            throw new Error("Invalid term years")
                          }
                          if (![12, 14].includes(installmentsPerYear)) {
                            throw new Error("Invalid installments per year")
                          }

                          // Calculate loan amount
                          const loanAmount = selectedProperty.price_cost - downPayment

                          // Validate loan amount
                          if (loanAmount <= 0) {
                            throw new Error("Down payment cannot be greater than property cost")
                          }

                          // Create a proper ISO date string preserving the exact date
                          const inputDate = new Date(values.first_installment_date);
                          const dateString = `${inputDate.getFullYear()}-${String(inputDate.getMonth() + 1).padStart(2, '0')}-${String(inputDate.getDate()).padStart(2, '0')}`;

                          const amortizationData = {
                            name: values.name,
                            property_id: selectedProperty.id,
                            user_id: user?.id,
                            loan_amount: loanAmount,
                            down_payment: downPayment,
                            interest_rate: interestRate,
                            term_years: termYears,
                            installments_per_year: installmentsPerYear,
                            installment_amount: regularScenario.summary.monthly_payment || 0,
                            total_interest: regularScenario.summary.total_interest_and_insurance || 0,
                            total_payment: regularScenario.summary.monthly_payment * regularScenario.summary.total_months || 0,
                            loan_protection_type: values.loan_protection_type,
                            loan_protection_insurance: loanProtectionInsurance,
                            first_installment_date: dateString,
                          }

                          console.log('Saving amortization data:', amortizationData)
                          const { data, error } = await supabase
                            .from("amortizations")
                            .insert(amortizationData)
                            .select()
                            .single()

                          if (error) {
                            console.error('Supabase error details:', error)
                            throw error
                          }

                          toast({
                            title: t("ui.success", { ns: "global" }),
                            description: t("messages.amortization_created", { ns: "mortgages" }),
                          })

                          navigate(`/mortgages/${data.id}`)
                        } catch (error) {
                          console.error("Error saving amortization:", error)
                          toast({
                            variant: "destructive",
                            title: t("ui.error", { ns: "global" }),
                            description: error instanceof Error ? error.message : t("messages.error_creating_amortization", { ns: "mortgages" }),
                          })
                        }
                      }}
                      submitLabel={t("ui.create", { ns: "global" })}
                    />
                  </>
                )}
              </div>
            </div>

            {/* Right Container */}
            <div className="w-full overflow-hidden flex-1 p-1 md:p-2 lg:p-4">
              <div className="flex w-full flex-1 p-1 md:p-2 lg:p-4 items-center justify-center h-full">
                <div className="flex flex-col gap-4 p-4 rounded-md border border-amber-400/10 bg-amber-500/5 ">
                      <div className="text-sm text-amber-600">
                        {t("messages.save_to_access_all_features", { ns: "mortgages" })}
                      </div>
                    </div>
              </div>
                
           
            </div>
          </div>
        </div>
      </Form>
    </DashboardLayout>
  )
} 