import { useNavigate, useParams, Link, useLocation } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { useQueryClient } from "@tanstack/react-query"
import { supabase } from "@/integrations/supabase/client"
import { useAuth } from "@/context/auth-context"
import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { EditableHeading } from "@/components/ui/editable-heading"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { PropertyDisplay } from "@/components/mortgages/property-select"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Form } from "@/components/ui/form"
import { MortgageDetailsForm } from "@/components/mortgages/mortgage-details-form"
import { useToast } from "@/components/ui/use-toast"
import { parseDatabaseDate } from "@/utils/utils"
import { useScenarioCalculations } from "@/hooks/use-scenario-calculations"
import { 
  RegularPanelGraph,
  AcceleratedPanelGraph,
  LowerPaymentPanelGraph,
  NewRatePanelGraph 
} from '@/components/mortgages/scenario-panels/graph-panels'
import { ExtraInstallmentsSection } from '@/components/mortgages/extra-installments-section'
import { NewRateForm } from '@/components/mortgages/new-rate-form'
import { useState, useEffect } from "react"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { useExchangeRate } from "@/hooks/use-exchange-rate"
import { SVGfixed } from "@/components/ui/svg-fixed"
import { useMortgageDraft } from "@/hooks/useMortgageDraft"

export default function EditMortgageWithZustand() {
  const { t } = useTranslation()
  const { t: tMortgages } = useTranslation('mortgages')
  const navigate = useNavigate()
  const { id: paramId } = useParams<{ id?: string }>()
  const id = paramId ?? null
  const { user } = useAuth()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const location = useLocation()
  
  // Extract tab from URL query parameters
  const queryParams = new URLSearchParams(location.search)
  const tabFromUrl = queryParams.get('tab')
  
  // Get the current exchange rate
  const { data: exchangeRate } = useExchangeRate()

  // Add state to track if the form is submitting
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // Use our combined hook for mortgage data
  const {
    bundle: mortgageBundle,
    mortgage,
    property,
    extraInstallments,
    newRates,
    mortgageDraft,
    form: mortgageForm,
    isLoading,
    error: mortgageError,
    isDirty,
    markClean,
    refetch
  } = useMortgageDraft(id || null)
  
  // Initialize calculatedLoanAmount based on mortgage data
  const [calculatedLoanAmount, setCalculatedLoanAmount] = useState<number>(mortgage?.loan_amount || 0)
  
  // Add state to track which tab is active
  const [activeTab, setActiveTab] = useState(
    tabFromUrl && ["regular", "accelerated", "lower_payment", "new_rate"].includes(tabFromUrl) 
    ? tabFromUrl 
      : "regular"
  )
  
  // Add state to track saved scenario with localStorage persistence
  const [savedScenario, setSavedScenario] = useState(() => {
    // Try to get the saved scenario from localStorage for this mortgage
    const savedValue = localStorage.getItem(`savedScenario_${id}`)
    // Default to "regular" if nothing is saved
    return savedValue || "regular"
  })
  
  // Set active tab to match the saved scenario when appropriate
  useEffect(() => {
    if (mortgage?.saved_scenario && !tabFromUrl) {
      setActiveTab(mortgage.saved_scenario)
      setSavedScenario(mortgage.saved_scenario)
    }
  }, [mortgage, tabFromUrl])

  // Helper function to get consistently formatted mortgage form values
  const getFormattedMortgageValues = () => {
    return {
      mortgageId: id || "",
      loanAmount: calculatedLoanAmount,
      downPayment: parseFloat(mortgageForm.getValues().down_payment?.replace(/[^0-9.]/g, "") || "0"),
      interestRate: parseFloat(mortgageForm.getValues().interest_rate || "0"),
      termYears: parseInt(mortgageForm.getValues().term_years || "0"),
      installmentsPerYear: parseInt(mortgageForm.getValues().installments_per_year || "12"),
      loanProtectionType: mortgageForm.getValues().loan_protection_type,
      loanProtectionInsurance: parseFloat(mortgageForm.getValues().loan_protection_insurance || "0"),
      firstInstallmentDate: mortgageForm.getValues().first_installment_date || new Date()
    }
  }

  // Setup scenario inputs for calculations
  const [scenarioInputs, setScenarioInputs] = useState({
    mortgageId: id || "",
    loanAmount: 0,
    interestRate: 0,
    termYears: 0,
    installmentsPerYear: 12,
    firstInstallmentDate: undefined as Date | undefined,
    propertyInsurance: 0,
    loanInsurance: 0
  })

  // Update scenario inputs when form values change
  useEffect(() => {
    if (mortgage && property && mortgageDraft) {
        setScenarioInputs({
      mortgageId: id || "",
      loanAmount: calculatedLoanAmount,
        interestRate: parseFloat(mortgageDraft.interest_rate || "0"),
        termYears: parseInt(mortgageDraft.term_years || "0"),
        installmentsPerYear: parseInt(mortgageDraft.installments_per_year || "12"),
        firstInstallmentDate: mortgageDraft.first_installment_date,
        propertyInsurance: property.property_insurance || 0,
        loanInsurance: parseFloat(mortgageDraft.loan_protection_insurance || "0")
      })
    }
  }, [mortgage, property, mortgageDraft, calculatedLoanAmount, id])

  // Use the scenario calculations hook
  const { data: scenarios, isLoading: isLoadingScenarios, error: scenariosError } = useScenarioCalculations(scenarioInputs)

  // Handler for tab changes
  const handleTabChange = (value: string) => {
    setActiveTab(value)
  }

  // Handler for saving scenario
  const handleSaveScenario = async (scenarioType: string) => {
    try {
      // Save current form values first
      await onUpdateMortgage(mortgageForm.getValues())
      
      // Save to state
      setSavedScenario(scenarioType)
      
      // Save to localStorage for persistence
      localStorage.setItem(`savedScenario_${id}`, scenarioType)
      
      // Get the appropriate scenario data
      let totalInterest = 0
      let totalMonths = 0
      let monthlyPayment = 0
      let breakEvenPoint = null
      
      // Extract data based on scenario type
      if (scenarioType === "regular" && scenarios?.regular?.summary) {
        totalInterest = scenarios.regular.summary.total_interest_and_insurance || 0
        totalMonths = scenarios.regular.summary.total_months || 0
        monthlyPayment = scenarios.regular.summary.monthly_payment || 0
        breakEvenPoint = scenarios.regular.summary.breakeven_point || null
      } 
      else if (scenarioType === "accelerated" && scenarios?.accelerated?.summary) {
        totalInterest = scenarios.accelerated.summary.total_interest_and_insurance || 0
        totalMonths = scenarios.accelerated.summary.total_months || 0
        monthlyPayment = scenarios.accelerated.summary.monthly_payment || 0
        breakEvenPoint = scenarios.accelerated.summary.breakeven_point || null
      }
      else if (scenarioType === "lower_payment" && scenarios?.lower_payment?.summary) {
        totalInterest = scenarios.lower_payment.summary.total_interest_and_insurance || 0
        totalMonths = scenarios.lower_payment.summary.total_months || 0
        monthlyPayment = scenarios.lower_payment.summary.monthly_payment || 0
        breakEvenPoint = scenarios.lower_payment.summary.breakeven_point || null
      }
      else if (scenarioType === "new_rate" && scenarios?.new_rate?.summary) {
        totalInterest = scenarios.new_rate.summary.total_interest_and_insurance || 0
        totalMonths = scenarios.new_rate.summary.total_months || 0
        monthlyPayment = scenarios.new_rate.summary.monthly_payment || 0
        breakEvenPoint = scenarios.new_rate.summary.breakeven_point || null
      }
      
      // Save to database if we have an ID
      if (id) {
        const { error } = await supabase
          .from("mortgages")
          .update({
            saved_scenario: scenarioType,
            saved_scenario_total_interest_and_insurance: totalInterest,
            saved_scenario_total_months: totalMonths, 
            saved_scenario_monthly_payment: monthlyPayment,
            saved_scenario_breakeven_point: breakEvenPoint
          })
          .eq("id", id)

        if (error) throw error
        
        // Invalidate queries to refresh data
        queryClient.invalidateQueries({ queryKey: ["mortgage-bundle", id] })
      }

        toast({
          title: t("ui.success", { ns: "global" }),
        description: t("messages.scenario_saved", "Scenario saved as default", { ns: "mortgages" }),
      })
    } catch (error) {
      console.error("Error saving scenario:", error)
      toast({
        variant: "destructive",
        title: t("ui.error", { ns: "global" }),
        description: t("messages.error_saving_scenario", "Error saving scenario", { ns: "mortgages" }),
      })
    }
  }

  // Handler for updating mortgage
  const onUpdateMortgage = async (formValues: any) => {
    setIsSubmitting(true)
    
    try {
      // Parse numeric values
      const downPayment = parseFloat(formValues.down_payment.replace(/[^0-9.]/g, ""))
      const interestRate = parseFloat(formValues.interest_rate)
      const termYears = parseInt(formValues.term_years)
      const installmentsPerYear = parseInt(formValues.installments_per_year)
      
      // Determine loan protection insurance based on type
      let loanProtectionInsurance = 0
      const loanProtectionType = formValues.loan_protection_type
        
        switch (loanProtectionType) {
          case "individual":
          loanProtectionInsurance = 0.028
          break
          case "joint":
          loanProtectionInsurance = 0.052
          break
          case "custom":
          const rawValue = parseFloat(formValues.loan_protection_insurance || "0")
            if (isNaN(rawValue) || rawValue < 0 || rawValue > 1) {
            throw new Error("Invalid loan protection insurance amount")
            }
          loanProtectionInsurance = rawValue
          break
          case "none":
          loanProtectionInsurance = 0
          break
          default:
          throw new Error("Invalid loan protection type")
      }
      
      // Calculate loan amount
      const propertyPrice = property?.price_cost || 0
      const bonus = property?.bonus || 0
      let loanAmount = propertyPrice - downPayment - bonus
      
      if (loanAmount <= 0) {
          throw new Error("Down payment cannot be greater than property cost")
        }

      // Format date
      const formattedDate = formValues.first_installment_date instanceof Date
        ? `${formValues.first_installment_date.getFullYear()}-${String(formValues.first_installment_date.getMonth() + 1).padStart(2, '0')}-${String(formValues.first_installment_date.getDate()).padStart(2, '0')}`
        : ""
        
        // Prepare mortgage data
        const mortgageData = {
        name: formValues.name,
        property_id: formValues.property_id,
          down_payment: downPayment,
          interest_rate: interestRate,
          term_years: termYears,
          installments_per_year: installmentsPerYear,
        first_installment_date: formattedDate,
        loan_amount: loanAmount,
        loan_protection_type: loanProtectionType,
          loan_protection_insurance: loanProtectionInsurance,
        }

      // Update in Supabase
      const { error } = await supabase
          .from("mortgages")
        .update(mortgageData)
          .eq('id', id)

      if (error) throw error
      
      // Mark the form as clean in Zustand
      markClean()
      
      // Refresh data
      queryClient.invalidateQueries({ queryKey: ["mortgage-bundle", id] })
      queryClient.invalidateQueries({ queryKey: ["scenarios", id] })
        
        toast({
          title: t("ui.success", { ns: "global" }),
          description: t("messages.success_update", { ns: "mortgages" }),
        })
    } catch (error) {
      console.error("Error updating mortgage:", error)
      toast({
        variant: "destructive",
        title: t("ui.error", { ns: "global" }),
        description: error instanceof Error ? error.message : t("messages.error_update", { ns: "mortgages" })
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handler for invalidating queries when extra installments or new rates change
  const handleDataChange = () => {
    queryClient.invalidateQueries({ queryKey: ["scenarios", id] })
    queryClient.invalidateQueries({ queryKey: ["mortgage-bundle", id] })
  }

  // Loading state
  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-[50vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <p className="mt-2 text-sm text-muted-foreground">{t("ui.loading", { ns: "global" })}</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  // Error state
  if (mortgageError) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-[50vh]">
          <div className="text-center">
            <p className="text-lg text-destructive">{t("messages.error_loading", "Error loading mortgage data", { ns: "mortgages" })}</p>
            <Button 
              variant="outline" 
              className="mt-4"
              onClick={() => window.location.reload()}
            >
              {t("ui.reload", "Reload", { ns: "global" })}
            </Button>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  // Not found state
  if (!mortgage || !property) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <p className="text-lg text-foreground">{t("messages.amortization_not_found", { ns: "mortgages" })}</p>
            <Button 
              variant="link" 
              className="mt-2"
              onClick={() => navigate("/mortgages")}
            >
              {t("ui.back", { ns: "global" })}
            </Button>
          </div>
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
                  <EditableHeading 
                    value={mortgage?.name || ""} 
                    onChange={async (newName) => {
                      try {
                        const { error } = await supabase
                          .from("mortgages")
                          .update({ name: newName })
                          .eq("id", id)

                        if (error) throw error
                        
                      // Refresh the data
                      queryClient.invalidateQueries({ queryKey: ["mortgage-bundle", id] })
                      } catch (error) {
                        console.error("Error updating name:", error)
                      }
                    }}
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
          {/* Left Container */}
          <div className="sm:w-full md:w-[30%] md:min-w-[340px] md:max-w-[520px] relative flex-shrink-0">
            <div className="absolute top-0 bottom-0 right-0 w-[1px] bg-border"></div>
            
                  <PropertyDisplay 
              property={property}
              onPropertyUpdate={() => {
                // After property update, refresh data
                queryClient.invalidateQueries({ queryKey: ["mortgage-bundle", id] })
              }}
            />
              
            <Separator />
            
            <div className="p-1 md:p-2 lg:p-4">
                <Form {...mortgageForm}>
                  <MortgageDetailsForm
                    form={mortgageForm}
                  selectedProperty={property}
                    onSubmit={onUpdateMortgage}
                    isSubmitting={isSubmitting}
                  submitLabel={t("ui.save", { ns: "global" })}
                    onLoanAmountChange={(amount: number) => {
                    setCalculatedLoanAmount(amount)
                    }}
                  propertyBonus={property.bonus || 0}
                  />
                </Form>
              <p className="text-xs text-muted-foreground"> v Zustand </p>
            </div>
          </div>

          {/* Right Container */}
          <div className="w-screen sm:w-full overflow-hidden flex-1 pt-8 sm:p-0">
              {(!mortgage || !scenarios || isLoadingScenarios) ? (
                <div className="flex items-center justify-center h-64">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mr-2"></div>
                  <div className="text-muted-foreground">{t("ui.loading", { ns: "global" })}</div>
                </div>
              ) : scenariosError ? (
                <div className="flex items-center justify-center h-64 flex-col">
                  <div className="text-destructive mb-2">{t("messages.error_calculating", "Error calculating scenarios", { ns: "mortgages" })}</div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => queryClient.invalidateQueries({ queryKey: ["scenarios", id] })}
                  >
                    {t("ui.retry", "Retry", { ns: "global" })}
                  </Button>
                </div>
              ) : (
                <Tabs 
                  value={activeTab} 
                  className="w-full"
                  onValueChange={handleTabChange}
                >
                  <TabsList className="w-screen sm:w-full items-center justify-start flex inline-flex overflow-x-auto h-14 px-2 lg:px-3 xl:px-4 rounded-none">
                    <TabsTrigger className="flex-shrink-0 px-3 lg:px-4 xl:px-5 py-2 flex items-center gap-1.5" value="regular">
                      {t("scenarios.regular.title", { ns: "mortgages" })}
                      {savedScenario === "regular" && (
                          <SVGfixed size={14} name="heartFilled" strokeClassName="text-transparent" fillClassName="fill-brand" />  
                      )}
                    </TabsTrigger>
                    <TabsTrigger className="flex-shrink-0 px-3 lg:px-4 xl:px-5 py-2 flex items-center gap-1.5" value="accelerated">
                      {t("scenarios.accelerated.title", { ns: "mortgages" })}
                      {savedScenario === "accelerated" && (
                        <SVGfixed size={14} name="heartFilled" strokeClassName="text-transparent" fillClassName="fill-brand" />  
                      )}
                    </TabsTrigger>
                    <TabsTrigger className="flex-shrink-0 px-3 lg:px-4 xl:px-5 py-2 flex items-center gap-1.5" value="lower_payment">
                      {t("scenarios.lower_payment.title", { ns: "mortgages" })}
                      {savedScenario === "lower_payment" && (
                        <SVGfixed size={14} name="heartFilled" strokeClassName="text-transparent" fillClassName="fill-brand" />  
                      )}
                    </TabsTrigger>
                    <TabsTrigger className="flex-shrink-0 px-3 lg:px-4 xl:px-5 py-2 flex items-center gap-1.5" value="new_rate">
                      {t("scenarios.new_rate.title", { ns: "mortgages" })}
                      {savedScenario === "new_rate" && (
                        <SVGfixed size={14} name="heartFilled" strokeClassName="text-transparent" fillClassName="fill-brand" />  
                      )}
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="regular" className="m-0">
                    {scenarios.regular && (
                      <RegularPanelGraph
                        scenario={scenarios.regular}
                      currency={property.currency}
                        installmentsPerYear={parseInt(mortgageForm.getValues().installments_per_year || "12")}
                      propertyCost={property.price_cost}
                        isThisScenarioSaved={savedScenario === "regular"}
                        onSaveScenario={handleSaveScenario}
                        formValues={{
                          loan_amount: calculatedLoanAmount,
                          down_payment: getFormattedMortgageValues().downPayment,
                          interest_rate: getFormattedMortgageValues().interestRate,
                          term_years: getFormattedMortgageValues().termYears,
                          installments_per_year: getFormattedMortgageValues().installmentsPerYear,
                          loan_protection_type: getFormattedMortgageValues().loanProtectionType,
                          loan_protection_insurance: getFormattedMortgageValues().loanProtectionInsurance,
                          first_installment_date: getFormattedMortgageValues().firstInstallmentDate
                        }}
                      extraInstallments={extraInstallments}
                      newRates={newRates}
                      />
                    )}
                  </TabsContent>
                
                  <TabsContent value="accelerated" className="m-0">
                    {scenarios.accelerated && (
                      <>
                      {extraInstallments.length > 0 && (
                          <AcceleratedPanelGraph
                            scenario={scenarios.accelerated}
                            regularScenario={scenarios.regular}
                          currency={property.currency}
                            installmentsPerYear={getFormattedMortgageValues().installmentsPerYear}
                          propertyCost={property.price_cost}
                            isThisScenarioSaved={savedScenario === "accelerated"}
                            onSaveScenario={handleSaveScenario}
                            formValues={{
                              loan_amount: calculatedLoanAmount,
                              down_payment: getFormattedMortgageValues().downPayment,
                              interest_rate: getFormattedMortgageValues().interestRate,
                              term_years: getFormattedMortgageValues().termYears,
                              installments_per_year: getFormattedMortgageValues().installmentsPerYear,
                              loan_protection_type: getFormattedMortgageValues().loanProtectionType,
                              loan_protection_insurance: getFormattedMortgageValues().loanProtectionInsurance,
                              first_installment_date: getFormattedMortgageValues().firstInstallmentDate
                            }}
                          extraInstallments={extraInstallments}
                          />
                      )}
                        <div className="mt-8">
                          <ExtraInstallmentsSection
                          mortgageId={id || ""}
                          currency={property.currency}
                            loanAmount={calculatedLoanAmount}
                          onInstallmentsChange={handleDataChange}
                            firstInstallmentDate={mortgage.first_installment_date ? parseDatabaseDate(mortgage.first_installment_date) : undefined}
                          />
                        </div>
                      </>
                    )}
                  </TabsContent>
                
                  <TabsContent value="lower_payment" className="m-0">
                    {scenarios.lower_payment && (
                      <>
                      {extraInstallments.length > 0 && (
                          <LowerPaymentPanelGraph
                            scenario={scenarios.lower_payment}
                            regularScenario={scenarios.regular}
                          currency={property.currency}
                            installmentsPerYear={getFormattedMortgageValues().installmentsPerYear}
                          propertyCost={property.price_cost}
                            isThisScenarioSaved={savedScenario === "lower_payment"}
                            onSaveScenario={handleSaveScenario}
                            formValues={{
                              loan_amount: calculatedLoanAmount,
                              down_payment: getFormattedMortgageValues().downPayment,
                              interest_rate: getFormattedMortgageValues().interestRate,
                              term_years: getFormattedMortgageValues().termYears,
                              installments_per_year: getFormattedMortgageValues().installmentsPerYear,
                              loan_protection_type: getFormattedMortgageValues().loanProtectionType,
                              loan_protection_insurance: getFormattedMortgageValues().loanProtectionInsurance,
                              first_installment_date: getFormattedMortgageValues().firstInstallmentDate
                            }}
                          extraInstallments={extraInstallments}
                          />
                      )}
                        <div className="mt-8">
                          <ExtraInstallmentsSection
                          mortgageId={id || ""}
                          currency={property.currency}
                            loanAmount={calculatedLoanAmount}
                          onInstallmentsChange={handleDataChange}
                            firstInstallmentDate={mortgage.first_installment_date ? parseDatabaseDate(mortgage.first_installment_date) : undefined}
                          />
                        </div>
                      </>
                    )}
                  </TabsContent>
                
                  <TabsContent value="new_rate" className="m-0">
                    {scenarios.new_rate && (
                      <>
                      {newRates.length > 0 && (
                          <NewRatePanelGraph
                            scenario={scenarios.new_rate}
                            regularScenario={scenarios.regular}
                          currency={property.currency}
                            installmentsPerYear={getFormattedMortgageValues().installmentsPerYear}
                          propertyCost={property.price_cost}
                            isThisScenarioSaved={savedScenario === "new_rate"}
                            onSaveScenario={handleSaveScenario}
                            formValues={{
                              loan_amount: calculatedLoanAmount,
                              down_payment: getFormattedMortgageValues().downPayment,
                              interest_rate: getFormattedMortgageValues().interestRate,
                              term_years: getFormattedMortgageValues().termYears,
                              installments_per_year: getFormattedMortgageValues().installmentsPerYear,
                              loan_protection_type: getFormattedMortgageValues().loanProtectionType,
                              loan_protection_insurance: getFormattedMortgageValues().loanProtectionInsurance,
                              first_installment_date: getFormattedMortgageValues().firstInstallmentDate
                            }}
                          newRates={newRates}
                          />
                      )}
                        <div className="mt-8">
                          <NewRateForm
                          mortgageId={id || ""}
                          onSuccess={handleDataChange}
                            className="space-y-4"
                            firstInstallmentDate={mortgage.first_installment_date ? parseDatabaseDate(mortgage.first_installment_date) : undefined}
                          />
                        </div>
                      </>
                    )}
                  </TabsContent>
                </Tabs>
              )}
            </div>
        </div>
      </div>
    </DashboardLayout>
  )
} 