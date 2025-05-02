import { Link, useNavigate, useLocation } from "react-router-dom"
import { useState, useEffect } from "react"
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
import { PropertySelect, PropertyDisplay, type Property } from "@/components/mortgages/property-select"
import { MortgageDetailsForm } from "@/components/mortgages/mortgage-details-form"
import { supabase } from "@/integrations/supabase/client"
import { useToast } from "@/components/ui/use-toast"
import { NoMoreSpace } from "@/components/common/NoMoreSpace"
// import { useSubscriptionLimits, DEFAULT_SUBSCRIPTION_PLANS } from "@/hooks/useSubscriptionLimits"
import { normalizeDate } from "@/lib/utils"
import { useMortgageDraft } from "@/hooks/useMortgageDraft"
import { useMortgageDraftStore } from "@/store/mortgage/store"
import { ScenarioCalculator } from "@/services/mortgages/services/scenarioCalculator"
import { defaultValues } from "@/components/mortgages/schema"
import { useAddMortgage } from "@/hooks/mortgages"
export default function NewMortgage() {
  const addMortgage = useAddMortgage()
  const { t } = useTranslation(['mortgages', 'dashboard', 'global'])
  const { t: tMortgages } = useTranslation('mortgages')
  const { user } = useAuth()
  const navigate = useNavigate()
  const { toast } = useToast()
  const location = useLocation()
  
  // Extract propertyId from URL query parameters
  const queryParams = new URLSearchParams(location.search)
  const propertyIdFromUrl = queryParams.get('propertyId')
  
  // Reset draft store on component mount
  // This ensures we always start with default values
  const { resetDraft: resetStore, updateDraft } = useMortgageDraftStore()
  
  // Now use the mortgage draft hook for form handling
  const {
    form,
    mortgageDraft,
    resetDraft,
    isLoading: isLoadingDraft,
  } = useMortgageDraft(null) // Pass null since this is a new mortgage
  
  // State for property data when coming from property-list
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null)
  
  // Fetch property details if needed
  const fetchPropertyIfNeeded = async (propertyId: string) => {
    try {
      const { data, error } = await supabase
        .from("properties")
        .select(`
          id,
          name,
          currency,
          price_cost,
          property_insurance,
          property_insurance_type,
          is_first_home,
          is_sustainable
        `)
        .eq("id", propertyId)
        .single()
        
      if (error) throw error
      
      if (data) {
        // Get bonus using database function
        const { data: bonusAmount, error: bonusError } = await supabase
          .rpc('property_bonus', { p_property_id: data.id })
        
        if (bonusError) console.error("Error fetching bonus:", bonusError)
        
        const propertyWithBonus = {
          ...data,
          bonus: bonusAmount || 0
        } as Property
        
        // Set selected property
        setSelectedProperty(propertyWithBonus)
        
        // Update draft with property info
        updateDraft({ 
          property: propertyWithBonus,
          name: `${data.name} Mortgage` 
        })
      }
    } catch (error) {
      console.error("Error fetching property:", error)
    }
  }
  
  useEffect(() => {
    // Reset the store when component mounts to ensure we start fresh
    resetStore()
    
    // Also reset the form and selected property
    setSelectedProperty(null)
    
    // Reset the draft form as well
    if (resetDraft) {
      resetDraft()
    }
    
    // If we have a property ID from URL, update the draft with it
    if (propertyIdFromUrl) {
      updateDraft({
        ...defaultValues,
        property_id: propertyIdFromUrl
      })
      
      // Fetch the property details
      fetchPropertyIfNeeded(propertyIdFromUrl)
    }
    
    // Cleanup on unmount
    return () => {
      // We will reset when navigating away too for extra safety
      resetStore()
      if (resetDraft) {
        resetDraft()
      }
    }
  }, [resetStore, updateDraft, resetDraft, propertyIdFromUrl])
  
  // State to track if form is being submitted
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // Subscription limits hooks and state
  // const {
  //   isLoading: isCheckingLimits,
  //   hasReachedLimit,
  //   checkLimit,
  //   currentUsage,
  //   planLimit,
  //   currentPlan,
  //   nextPlan,
  // } = useSubscriptionLimits()
  
  // const [isLimitCheckDone, setIsLimitCheckDone] = useState(false)
  // const [isLimitReached, setIsLimitReached] = useState(false)
  // const [mortgageCount, setMortgageCount] = useState(0)
  
  // Property is now coming from either the selectedProperty state or the mortgageDraft
  const property = selectedProperty || mortgageDraft?.property
  
  // Function to handle property selection from PropertySelect
  const handlePropertyChange = (newProperty: Property | null) => {
    setSelectedProperty(newProperty)
    
    if (newProperty) {
      // Update the form property ID
      form.setValue("property_id", newProperty.id, { shouldValidate: true })
      
      // Update the form name if empty
      if (!form.getValues("name")) {
        const defaultName = `${newProperty.name} Mortgage`
        form.setValue("name", defaultName, { shouldValidate: true })
      }
      
      // Update the draft in store
      updateDraft({ 
        property_id: newProperty.id,
        property: newProperty 
      })
    } else {
      form.setValue("property_id", "", { shouldValidate: true })
    }
  }

  // Function to check limits once
  const checkLimitOnce = async () => {
    if (!user?.id || !currentPlan) return false
    
    try {
      // Get direct count from database
      const { count, error } = await supabase
        .from("mortgages")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)

      if (error) {
        return false
      }
      
      // Store the count
      const currentCount = count || 0
      setMortgageCount(currentCount)
      
      // Determine the user's plan limit
      const limitValue = planLimit > 0 ? planLimit : 
                        (DEFAULT_SUBSCRIPTION_PLANS[currentPlan]?.mortgages || 3)
      
      // Simple comparison to determine if limit is reached
      const limitReached = currentCount >= limitValue
      
      // Set state based on the check
      setIsLimitReached(limitReached)
      return limitReached
    } catch (err) {
      return false
    } finally {
      setIsLimitCheckDone(true)
    }
  }
  
  // Run the limit check when component mounts
  useEffect(() => {
    if (!isLimitCheckDone && user?.id && currentPlan) {
      checkLimitOnce()
    }
  }, [isLimitCheckDone, user?.id, currentPlan])

  // Form submission handler
  const handleFormSubmit = async (values: any) => {
    if (isSubmitting) return
    setIsSubmitting(true)
    
    try {
      if (!property) {
        toast({
          variant: "destructive",
          title: t("ui.error", { ns: "global" }),
          description: t("messages.please_complete_all_fields", { ns: "mortgages" }),
        })
        setIsSubmitting(false)
        return
      }
      
      // Check limits
      const isLimitExceeded = await checkLimitOnce()
      if (isLimitExceeded) {
        toast({
          variant: "destructive",
          title: t("ui.error", { ns: "global" }),
          description: "You have reached your plan limit for mortgages"
        })
        setIsSubmitting(false)
        return
      }
      
      // Parse form values
      const downPayment = parseFloat(values.down_payment.replace(/[^0-9.]/g, "") || "0")
      const interestRate = parseFloat(values.interest_rate)
      const termYears = parseInt(values.term_years)
      const installmentsPerYear = parseInt(values.installments_per_year)
      
      // Ensure down payment is a valid number, with a fallback to 0
      const validDownPayment = isNaN(downPayment) ? 0 : Math.max(0, downPayment);
      
      if (isNaN(interestRate) || interestRate <= 0) {
        throw new Error("Invalid interest rate")
      }
      if (isNaN(termYears) || termYears <= 0) {
        throw new Error("Invalid term years")
      }
      if (![12, 14].includes(installmentsPerYear)) {
        throw new Error("Invalid installments per year")
      }
      
      // Handle date
      const firstInstallmentDate = values.first_installment_date ? 
        normalizeDate(new Date(values.first_installment_date)) : 
        normalizeDate(new Date())
      
      // Format date for database
      const dateString = `${firstInstallmentDate.getFullYear()}-${String(firstInstallmentDate.getMonth() + 1).padStart(2, '0')}-${String(firstInstallmentDate.getDate()).padStart(2, '0')}`
      
      // Handle loan protection insurance
      let loanProtectionInsurance: number
      switch (values.loan_protection_type) {
        case "individual":
          loanProtectionInsurance = 0.028
          break
        case "joint":
          loanProtectionInsurance = 0.052
          break
        case "custom":
          const customValue = parseFloat(values.loan_protection_insurance || "0")
          if (isNaN(customValue) || customValue < 0 || customValue > 1) {
            throw new Error("Invalid loan protection insurance amount")
          }
          loanProtectionInsurance = customValue
          break
        case "none":
        default:
          loanProtectionInsurance = 0
          break
      }
      
      // Calculate loan amount: (property_cost - bonus) - down_payment
      const propertyPrice = property.price_cost
      const bonus = property.bonus || 0
      const calculatedLoanAmount = Math.max(0, (propertyPrice - bonus) - validDownPayment)
      
      // Calculate scenario values using ScenarioCalculator
      const scenarios = ScenarioCalculator.calculateScenarios({
        loan_amount: calculatedLoanAmount,
        interest_rate: interestRate,
        term_years: termYears,
        installments_per_year: installmentsPerYear,
        first_installment_date: firstInstallmentDate,
        property_insurance: property.property_insurance || 0,
        loan_insurance: loanProtectionInsurance
      })
      
      // Get the regular scenario
      const regularScenario = scenarios.regular
      
      // Create mortgage object
      const mortgageData = {
        name: values.name,
        property_id: property.id,
        user_id: user?.id,
        loan_amount: calculatedLoanAmount,
        down_payment: validDownPayment,
        interest_rate: interestRate,
        term_years: termYears,
        installments_per_year: installmentsPerYear,
        loan_protection_type: values.loan_protection_type,
        loan_protection_insurance: loanProtectionInsurance,
        first_installment_date: dateString,
        saved_scenario: "regular",
        saved_scenario_total_interest_and_insurance: regularScenario.summary.total_interest_and_insurance || 0,
        saved_scenario_total_months: regularScenario.summary.total_months || 0,
        saved_scenario_monthly_payment: regularScenario.summary.monthly_payment || 0,
        saved_scenario_breakeven_point: regularScenario.summary.breakeven_point || null
      }
      
      // Save mortgage to database
      // const { data, error } = await supabase
      //   .from("mortgages")
      //   .insert(mortgageData)
      //   .select()
      //   .single()
        
      // if (error) throw error

    
       // Save mortgage to database (optimistically via React Query)
       addMortgage.mutate(mortgageData, {
        onSuccess(newRow) {
          toast({
            title: t("ui.success", { ns: "global" }),
            description: t("messages.amortization_created", { ns: "mortgages" }),
          })
          resetDraft()
          resetStore()
          navigate(`/mortgages/${newRow.id}`)
        },
        onError(err) {
          console.error(err)
          toast({
            variant: "destructive",
            title: t("ui.error", { ns: "global" }),
            description: err.message,
          })
        },
      })
      

      
    } catch (error) {
      console.error("Error creating mortgage:", error)
      toast({
        variant: "destructive",
        title: t("ui.error", { ns: "global" }),
        description: error instanceof Error ? error.message : t("messages.error_creating_amortization", { ns: "mortgages" }),
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // If we haven't checked limits yet or loading property data, show a loading state
  if ((!isLimitCheckDone && user?.id) || isLoadingDraft) {
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
    )
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
    )
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
                  {form.watch("name") || t("amortization.new", { ns: "mortgages" })}
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
              <div className="p-0">
                {property ? (
                  <>
                    <PropertyDisplay 
                      property={property}
                      onPropertyUpdate={(updatedProperty) => {
                        // Update our local property state when property is updated
                        handlePropertyChange(updatedProperty)
                      }}
                    />
                  </>
                ) : (
                <PropertySelect 
                  form={form} 
                  onPropertyChange={handlePropertyChange}
                />
                )}

                <Separator />
                <div className="p-1 md:p-2 lg:p-4 space-y-6">

          
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

                {property && (
                  <>
                    <Separator />
                    
                    <MortgageDetailsForm
                      form={form}
                      selectedProperty={property}
                      onSubmit={handleFormSubmit}
                      isSubmitting={isSubmitting}
                      submitLabel={t("ui.create", { ns: "global" })}
                      propertyBonus={property.bonus || 0}
                      onLoanAmountChange={(amount) => {
                        // This is handled in our hook but kept for compatibility
                      }}
                    />
                  </>
                )}
                </div>
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