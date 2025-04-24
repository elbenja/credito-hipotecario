import { Link, useNavigate, useLocation } from "react-router-dom"
import { useState, useEffect, useCallback, useRef } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { useAuth } from "@/context/auth-context"
import { DashboardLayout } from "@/components/dashboard/dashboard-layout"

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
  mortgageFormSchema, 
  defaultValues, 
  type MortgageFormValues 
} from "@/components/mortgages/schema"
import { LoanCalculator } from "@/services/mortgages/calculations/loan"
import { supabase } from "@/integrations/supabase/client"
import { useToast } from "@/components/ui/use-toast"
import type { ScenarioResult, BonusRule, BaseAmortizationValues } from "@/services/mortgages/types/common"
import { NoMoreSpace } from "@/components/common/NoMoreSpace"
import { useSubscriptionLimits, DEFAULT_SUBSCRIPTION_PLANS } from "@/hooks/useSubscriptionLimits"
import { useExchangeRate } from "@/hooks/use-exchange-rate"
import { useScenarioCalculations } from "@/hooks/use-scenario-calculations"
import { normalizeDate } from "@/lib/utils"

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
  const [interestRateLimits] = useState({
    min_rate: 4,
    max_rate: 18,
    by_default: 8.5
  })
  
  // State for scenario calculations
  const [scenarioInputs, setScenarioInputs] = useState({
    loanAmount: 0,
    interestRate: 0,
    termYears: 0,
    installmentsPerYear: 12,
    firstInstallmentDate: normalizeDate(new Date()),
    propertyInsurance: 0,
    loanInsurance: 0
  });
  
  // Use the same scenario calculations hook as EditMortgage.tsx
  const { data: scenarios, isLoading: isLoadingScenarios } = useScenarioCalculations(scenarioInputs);
  
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
  const createCalculatorProperty = (property: Property, bonusRules: BonusRule[] = []) => {
    return {
      id: property.id,
      name: property.name,
      price_cost: property.price_cost,
      currency: property.currency,
      property_insurance: property.property_insurance || 0,
      property_insurance_type: property.property_insurance_type || 'auto',
      is_first_home: property.is_first_home || false,
      is_sustainable: property.is_sustainable || false,
      bonus_rules: bonusRules // Use the passed bonus rules instead of empty array
    };
  };

  // Update scenario inputs when form values change
  useEffect(() => {
    if (!selectedProperty) return;
    
    const subscription = form.watch((values) => {
      if (!values) return;
      
      try {
        // Get current values
        const downPayment = parseFloat(values.down_payment?.replace(/[^0-9.]/g, "") || "0");
        const interestRate = parseFloat(values.interest_rate || "0");
        const termYears = parseInt(values.term_years || "0");
        const installmentsPerYear = parseInt(values.installments_per_year || "12");
        
        // Handle loan protection insurance based on type
        let loanInsurance = 0;
        switch (values.loan_protection_type) {
          case "individual":
            loanInsurance = 0.028;
            break;
          case "joint":
            loanInsurance = 0.052;
            break;
          case "custom":
            loanInsurance = parseFloat(values.loan_protection_insurance || "0");
            break;
          case "none":
            loanInsurance = 0;
            break;
        }
        
        // Get first installment date
        let firstInstallmentDate = normalizeDate(new Date());
        if (values.first_installment_date) {
          firstInstallmentDate = normalizeDate(new Date(values.first_installment_date));
        }
        
        // Calculate proper loan amount using LoanCalculator
        // Create property object for calculator
        const calculatorProperty = createCalculatorProperty(selectedProperty);
        const loanAmount = loanCalculator.calculateLoanAmount(calculatorProperty, downPayment);
        
        // Update scenario inputs
        setScenarioInputs({
          loanAmount: loanAmount,
          interestRate,
          termYears,
          installmentsPerYear,
          firstInstallmentDate,
          propertyInsurance: selectedProperty.property_insurance || 0,
          loanInsurance
        });
      } catch (error) {
        console.error("Error updating scenario inputs:", error);
      }
    });
    
    return () => subscription.unsubscribe();
  }, [form, selectedProperty, loanCalculator]);
  
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
                          if (!selectedProperty) {
                            toast({
                              variant: "destructive",
                              title: t("ui.error", { ns: "global" }),
                              description: t("messages.please_complete_all_fields", { ns: "mortgages" }),
                            });
                            return;
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

                          // Fetch bonus rules from the database
                          const { data: bonusRulesData, error: bonusRulesError } = await supabase
                            .from("bonus_rules")
                            .select("*")
                            .order('min_value', { ascending: true });
                            
                          if (bonusRulesError) {
                            console.error("Error fetching bonus rules:", bonusRulesError);
                          }
                          
                          // Create property with bonus rules
                          const propertyForCalculator = createCalculatorProperty(selectedProperty, bonusRulesData || []);
                          
                          // Calculate loan amount using the LoanCalculator
                          const loanAmount = loanCalculator.calculateLoanAmount(
                            propertyForCalculator, 
                            downPayment, 
                            bonusRulesData || []
                          );

                          // Validate loan amount
                          if (loanAmount <= 0) {
                            throw new Error("Down payment cannot be greater than property cost")
                          }

                          // Create a proper ISO date string preserving the exact date
                          const inputDate = new Date(values.first_installment_date);
                          const dateString = `${inputDate.getFullYear()}-${String(inputDate.getMonth() + 1).padStart(2, '0')}-${String(inputDate.getDate()).padStart(2, '0')}`;

                          // Calculate values from scenarios if available, or use loan calculator directly
                          let totalInterestAndInsurance = scenarios?.regular?.summary?.total_interest_and_insurance;
                          let totalMonths = scenarios?.regular?.summary?.total_months;
                          let monthlyPayment = scenarios?.regular?.summary?.monthly_payment;
                          let breakEvenPoint = null;
                          
                          // If scenarios data is not available or values are 0, calculate directly
                          if (!totalInterestAndInsurance || !monthlyPayment) {
                            // Create base values for calculator with proper types
                            const installmentsPer: 12 | 14 = installmentsPerYear === 12 ? 12 : 14;
                            const baseValues: BaseAmortizationValues = {
                              interest_rate: interestRate,
                              term_years: termYears,
                              installments_per_year: installmentsPer,
                              down_payment: downPayment,
                              down_payment_percentage: (downPayment / selectedProperty.price_cost) * 100,
                              first_installment_date: new Date(dateString),
                              loan_protection_type: values.loan_protection_type,
                              loan_protection_insurance: loanProtectionInsurance,
                              property_id: selectedProperty.id
                            };
                            
                            // Get direct calculation results
                            const results = loanCalculator.calculateResults(propertyForCalculator, baseValues);
                            
                            // Use the direct calculation results
                            totalInterestAndInsurance = results.total_interest_and_insurance;
                            totalMonths = results.total_months;
                            monthlyPayment = results.monthly_payment;
                            
                            // Calculate breakeven point
                            const schedule = results.payment_schedule;
                            if (schedule && schedule.length > 0) {
                              for (let i = 0; i < schedule.length - 1; i++) {
                                const current = schedule[i];
                                const next = schedule[i + 1];
                                
                                const currentPrincipal = current.principal || 0;
                                const currentInterest = (current.interest || 0) + 
                                                (current.property_insurance || 0) + 
                                                (current.loan_protection_insurance || 0);
                                
                                const nextPrincipal = next.principal || 0;
                                const nextInterest = (next.interest || 0) + 
                                              (next.property_insurance || 0) + 
                                              (next.loan_protection_insurance || 0);
                                
                                // Found the crossover point
                                if (currentPrincipal <= currentInterest && nextPrincipal > nextInterest) {
                                  // Return year value with one decimal
                                  breakEvenPoint = (i + 1) / 12;
                                  break;
                                }
                                
                                // Alternative check when principal already exceeds interest
                                if (i === 0 && currentPrincipal >= currentInterest) {
                                  breakEvenPoint = 0;
                                  break;
                                }
                              }
                            }
                          } else if (scenarios?.regular?.payments && scenarios.regular.payments.length > 0) {
                            // Calculate breakeven from scenarios if available
                            for (let i = 0; i < scenarios.regular.payments.length - 1; i++) {
                              const current = scenarios.regular.payments[i];
                              const next = scenarios.regular.payments[i + 1];
                              
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
                              
                              // Alternative check when principal already exceeds interest
                              if (i === 0 && currentPrincipal >= currentInterest) {
                                breakEvenPoint = 0;
                                break;
                              }
                            }
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
                            saved_scenario: "regular",
                            saved_scenario_total_interest_and_insurance: totalInterestAndInsurance,
                            saved_scenario_total_months: totalMonths,
                            saved_scenario_monthly_payment: monthlyPayment,
                            saved_scenario_breakeven_point: breakEvenPoint
                          }

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