import { Link, useNavigate, useLocation } from "react-router-dom"
import { useState, useEffect, useCallback, useRef } from "react"
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
import { PropertySelect, type Property } from "@/components/mortgages/property-select"
import { AmortizationDetailsForm } from "@/components/mortgages/mortgage-details-form"
import { 
  RegularPanelGraph, 
  AcceleratedPanelGraph, 
  LowerPaymentPanelGraph, 
  NewRatePanelGraph 
} from '@/components/mortgages/scenario-panels/graph-panels'
import { ExtraInstallmentsSection } from '@/components/mortgages/extra-installments-section'
import { NewRateForm } from '@/components/mortgages/new-rate-form'
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { 
  mortgageFormSchema, 
  defaultValues, 
  type MortgageFormValues 
} from "@/components/mortgages/schema"
import { LoanCalculator } from "@/services/mortgages/calculations/loan"
import { supabase } from "@/integrations/supabase/client"
import { useToast } from "@/components/ui/use-toast"
import type { ScenarioResult } from "@/services/mortgages/types/common"
import { NoMoreSpace } from "@/components/common/NoMoreSpace"
import { useSubscriptionLimits, DEFAULT_SUBSCRIPTION_PLANS } from "@/hooks/useSubscriptionLimits"
import { useExchangeRate } from "@/hooks/use-exchange-rate"

export default function NewMortgage() {
  const { t } = useTranslation(['mortgages', 'dashboard', 'global'])
  const { t: tMortgages } = useTranslation('mortgages')
  const { user } = useAuth()
  const navigate = useNavigate()
  const { toast } = useToast()
  const location = useLocation()
  const { data: exchangeRate } = useExchangeRate()
  
  // Extract propertyId from URL query parameters
  const queryParams = new URLSearchParams(location.search)
  const propertyIdFromUrl = queryParams.get('propertyId')
  
  // Form setup
  const form = useForm<MortgageFormValues>({
    resolver: zodResolver(mortgageFormSchema),
    defaultValues: {
      ...defaultValues,
      property_id: propertyIdFromUrl || ""
    },
    mode: "onChange"
  })
  
  // Reference for tracking plan changes
  const hasPlanBeenChecked = useRef(false);
  
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
  
  // Subscription limits hook
  const {
    isLoading: isCheckingLimits,
    hasReachedLimit,
    currentUsage,
    planLimit,
    currentPlan,
    nextPlan,
    checkLimit
  } = useSubscriptionLimits();
  
  // State for limit checking
  const [isLimitCheckDone, setIsLimitCheckDone] = useState(false);
  const [isLimitReached, setIsLimitReached] = useState(false);
  const [mortgageCount, setMortgageCount] = useState(0);
  const limitCheckRef = useRef(false);

  // Direct count from database for checking
  const getMortgageCount = useCallback(async (): Promise<number> => {
    if (!user) return 0;

    try {
      const { count, error } = await supabase
        .from("mortgages")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id);

      if (error) {
        console.error("Error counting mortgages:", error);
        return 0;
      }

      return count || 0;
    } catch (e) {
      console.error("Exception counting mortgages:", e);
      return 0;
    }
  }, [user]);

  // Single function to check limits once
  const checkLimitOnce = useCallback(async () => {
    // Prevent multiple simultaneous checks
    if (limitCheckRef.current) return false;
    limitCheckRef.current = true;
    
    try {
      console.log("Performing one-time mortgage limit check");
      
      // 1. Get direct count from database
      const { count, error } = await supabase
        .from("mortgages")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user?.id || '');

      if (error) {
        console.error("Error counting mortgages:", error);
        return false;
      }
      
      // Store the count
      const currentCount = count || 0;
      setMortgageCount(currentCount);
      console.log("Direct mortgage count from database:", currentCount);
      
      // 2. Determine the user's plan limit
      // Use planLimit from the hook or fall back to plan defaults
      const limitValue = planLimit > 0 ? planLimit : 
                         (DEFAULT_SUBSCRIPTION_PLANS[currentPlan]?.mortgages || 3);
      console.log(`User plan: ${currentPlan}, Mortgage limit: ${limitValue}`);
      
      // 3. Simple comparison to determine if limit is reached
      const limitReached = currentCount >= limitValue;
      console.log(`Limit check result: ${currentCount} >= ${limitValue} = ${limitReached}`);
      
      // 4. Set state based on the check
      setIsLimitReached(limitReached);
      return limitReached;
    } catch (err) {
      console.error("Limit check failed:", err);
      return false;
    } finally {
      setIsLimitCheckDone(true);
      // Don't reset limitCheckRef.current so the check only runs once
    }
  }, [user?.id, planLimit, currentPlan]);
  
  // Run the check only once when component mounts
  useEffect(() => {
    // Only run if:
    // 1. We haven't done a check yet AND
    // 2. We have a user ID AND
    // 3. Current plan information is available
    if (!isLimitCheckDone && user?.id && currentPlan) {
      checkLimitOnce();
    }
  }, [checkLimitOnce, isLimitCheckDone, user?.id, currentPlan]);

  // Add a separate effect for currentPlan changes to avoid infinite loops
  useEffect(() => {
    // Skip the first render and only run when plan actually changes
    if (currentPlan && !hasPlanBeenChecked.current) {
      hasPlanBeenChecked.current = true;
      return;
    }
    
    if (currentPlan && hasPlanBeenChecked.current) {
      console.log("Plan changed, rechecking limits");
      checkLimitOnce();
    }
  }, [currentPlan, checkLimitOnce]);

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

  // Set the exchange rate whenever it changes
  useEffect(() => {
    if (exchangeRate?.data) {
      loanCalculator.setExchangeRate(exchangeRate.data);
    }
  }, [exchangeRate, loanCalculator]);

  // Helper function to create a property object compatible with LoanCalculator
  const createCalculatorProperty = (property: Property) => {
    return {
      id: property.id,
      name: property.name,
      price_cost: property.price_cost,
      currency: property.currency,
      property_insurance: property.property_insurance || 0,
      property_insurance_type: property.property_insurance_type || 'auto',
      is_first_home: property.is_first_home || false,
      is_sustainable: property.is_sustainable || false,
      bonus_rules: []
    };
  };

  const calculateScenarios = (values: Partial<MortgageFormValues>) => {
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
      is_sustainable: selectedProperty.is_sustainable || false
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

  // If we haven't checked limits yet, show a loading state
  if (!isLimitCheckDone) {
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
                    {t("amortization.new", { ns: "mortgages" })}
                  </BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          )
        }}
      >
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500"></div>
        </div>
      </DashboardLayout>
    );
  }
  
  // If user has reached their mortgage limit, show the NoMoreSpace component
  if (isLimitReached) {
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
                    {t("amortization.new", { ns: "mortgages" })}
                  </BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          )
        }}
      >
        <div className="flex items-center justify-center p-6">
          <NoMoreSpace
            resourceType="mortgage"
            currentUsage={mortgageCount}
            planLimit={planLimit > 0 ? planLimit : (DEFAULT_SUBSCRIPTION_PLANS[currentPlan]?.mortgages || 3)}
            currentPlan={currentPlan}
            nextPlan={nextPlan}
            onBack={() => navigate("/mortgages")}
          />
        </div>
      </DashboardLayout>
    );
  }

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

                          // Check for limits one more time before submitting
                          // Get a fresh count directly from the database
                          const currentCount = await getMortgageCount();
                          const limitValue = planLimit > 0 ? planLimit : 
                                           (DEFAULT_SUBSCRIPTION_PLANS[currentPlan]?.mortgages || 3);
                          
                          // Final check right before submission
                          if (currentCount >= limitValue) {
                            console.log(`Submission blocked: Current count ${currentCount} >= Limit ${limitValue}`);
                            toast({
                              variant: "destructive",
                              title: t("ui.error", { ns: "global" }),
                              description: "You have reached your plan limit for mortgages",
                            });
                            setIsLimitReached(true);
                            return;
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

                          // Use the regularScenario's loan_amount which already has the correct calculation
                          let loanAmount: number;
                          
                          // Prepare a property object compatible with the LoanCalculator
                          const propertyForCalculator = createCalculatorProperty(selectedProperty);
                          
                          // Fetch bonus rules from the database
                          const { data: bonusRulesData, error: bonusRulesError } = await supabase
                            .from("bonus_rules")
                            .select("*")
                            .order('min_value', { ascending: true });
                            
                          if (bonusRulesError) {
                            console.error("Error fetching bonus rules:", bonusRulesError);
                          }
                          
                          // Calculate loan amount using the LoanCalculator
                          loanAmount = loanCalculator.calculateLoanAmount(
                            propertyForCalculator, 
                            downPayment, 
                            bonusRulesData || []
                          );
                          
                          console.log('Calculated loan amount:', loanAmount);

                          // Validate loan amount
                          if (loanAmount <= 0) {
                            throw new Error("Down payment cannot be greater than property cost")
                          }

                          // Create a proper ISO date string preserving the exact date
                          const inputDate = new Date(values.first_installment_date);
                          const dateString = `${inputDate.getFullYear()}-${String(inputDate.getMonth() + 1).padStart(2, '0')}-${String(inputDate.getDate()).padStart(2, '0')}`;

                          // Extract regular scenario values if available
                          let regularScenarioValues = {};
                          if (regularScenario?.summary) {
                            console.log("Setting regular scenario values during creation:", regularScenario.summary);
                            
                            // Calculate breakeven point
                            let breakEvenPoint = null;
                            if (regularScenario.payments && regularScenario.payments.length > 0) {
                              // Find the point where principal becomes greater than interest+insurance
                              for (let i = 0; i < regularScenario.payments.length - 1; i++) {
                                const current = regularScenario.payments[i];
                                const next = regularScenario.payments[i + 1];
                                
                                const currentPrincipal = current.capital || 0;
                                const currentInterest = (current.interest || 0) + 
                                                  (current.property_insurance || 0) + 
                                                  (current.loan_insurance || 0);
                                
                                const nextPrincipal = next.capital || 0;
                                const nextInterest = (next.interest || 0) + 
                                                (next.property_insurance || 0) + 
                                                (next.loan_insurance || 0);
                                
                                // Found the crossover point
                                if (currentPrincipal <= currentInterest && nextPrincipal > nextInterest) {
                                  // Return year value with one decimal
                                  breakEvenPoint = (i + 1) / 12;
                                  break;
                                }
                                
                                // Alternative check for when principal already exceeds interest
                                if (i === 0 && currentPrincipal >= currentInterest) {
                                  breakEvenPoint = 0;
                                  break;
                                }
                              }
                            }
                            
                            regularScenarioValues = {
                              saved_scenario: "regular",
                              saved_scenario_total_interest_and_insurance: regularScenario.summary.total_interest_and_insurance || 0,
                              saved_scenario_total_months: regularScenario.summary.total_months || 0,
                              saved_scenario_monthly_payment: regularScenario.summary.monthly_payment || 0,
                              saved_scenario_breakeven_point: breakEvenPoint
                            };
                          } else {
                            console.log("No regular scenario summary available during creation");
                          }

                          const amortizationData = {
                            name: values.name,
                            property_id: selectedProperty.id,
                            user_id: user?.id,
                            loan_amount: loanAmount,
                            down_payment: downPayment,
                            interest_rate: interestRate,
                            term_years: termYears,
                            installments_per_year: installmentsPerYear,
                            loan_protection_type: values.loan_protection_type,
                            loan_protection_insurance: loanProtectionInsurance,
                            first_installment_date: dateString,
                            ...regularScenarioValues  // Include regular scenario values
                          }

                          console.log('Saving amortization data:', amortizationData)
                          const { data, error } = await supabase
                            .from("mortgages")
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

                          // After successful creation, immediately check limits again
                          // to ensure the UI state is updated
                          await getMortgageCount();
                          checkLimitOnce();
                          
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
                <div className="flex flex-col gap-4 p-4 rounded-md border border-amber-400/10 bg-amber-500/5 -mt-16 w-3/4">
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