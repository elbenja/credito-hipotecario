import { useNavigate, useParams, Link } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { supabase } from "@/integrations/supabase/client"
import { useAuth } from "@/context/auth-context"
import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { EditableHeading } from "@/components/ui/editable-heading"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { PropertyDisplay, type Property } from "@/components/amortizations/property-select"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { AmortizationDetailsForm } from "@/components/amortizations/amortization-details-form"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { amortizationFormSchema, type AmortizationFormValues } from "@/components/amortizations/schema"
import { useToast } from "@/components/ui/use-toast"
import { createLocalDate } from "@/lib/utils"
import { useScenarioCalculations } from "@/hooks/use-scenario-calculations"
import { 
  RegularPanelGraph,
  AcceleratedPanelGraph,
  LowerPaymentPanelGraph,
  NewRatePanelGraph 
} from '@/components/amortizations/scenario-panels/graph-panels'
import { ExtraInstallmentsSection } from '@/components/amortizations/extra-installments-section'
import { NewRateForm } from '@/components/amortizations/new-rate-form'
import { useMemo, useCallback } from "react"

export default function EditAmortization() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { id } = useParams()
  const { user } = useAuth()
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const amortizationForm = useForm<AmortizationFormValues>({
    resolver: zodResolver(amortizationFormSchema),
  })

  const { data: amortization, isLoading } = useQuery({
    queryKey: ["amortization", id],
    queryFn: async () => {
      if (!user || !id) return null

      const { data, error } = await supabase
        .from("amortizations")
        .select(`
          id, 
          name,
          down_payment,
          interest_rate,
          term_years,
          installments_per_year,
          first_installment_date,
          loan_protection_type,
          loan_protection_insurance,
          loan_amount,
          property:properties!inner (
            id,
            name,
            description,
            currency,
            price_cost,
            is_first_home,
            is_sustainable,
            property_insurance,
            property_insurance_type
          )
        `)
        .eq("id", id)
        .single()

      if (error) throw error
      if (!data) return null

      const property = data.property as unknown as Property

      // Initialize form with fetched data
      amortizationForm.reset({
        name: data.name || "",
        property_id: property.id,
        down_payment: data.down_payment?.toString() || "",
        interest_rate: data.interest_rate?.toString() || "",
        term_years: data.term_years?.toString() || "",
        installments_per_year: data.installments_per_year?.toString() || "",
        first_installment_date: createLocalDate(data.first_installment_date),
        loan_protection_type: data.loan_protection_type as "none" | "custom" | "individual" | "joint",
        loan_protection_insurance: data.loan_protection_insurance?.toString() || "",
      })

      return {
        ...data,
        property
      }
    },
    enabled: !!user && !!id
  })

  // Memoize the scenario calculation inputs to prevent unnecessary recalculations
  const scenarioInputs = useMemo(() => ({
    amortizationId: id || "",
    loanAmount: amortization?.loan_amount || 0,
    interestRate: amortization?.interest_rate || 0,
    termYears: amortization?.term_years || 0,
    installmentsPerYear: amortization?.installments_per_year || 12,
    firstInstallmentDate: amortization?.first_installment_date ? new Date(amortization.first_installment_date) : undefined,
    propertyInsurance: amortization?.property?.property_insurance || 0,
    loanInsurance: amortization?.loan_protection_insurance || 0
  }), [
    id,
    amortization?.loan_amount,
    amortization?.interest_rate,
    amortization?.term_years,
    amortization?.installments_per_year,
    amortization?.first_installment_date,
    amortization?.property?.property_insurance,
    amortization?.loan_protection_insurance
  ])

  const { data: scenarios } = useScenarioCalculations(scenarioInputs)

  // Helper function to transform payment rows for ScenarioTable
  const mapPaymentForTable = useCallback((payment: any) => {
    console.log('Raw payment data:', payment);
    const paymentDate = new Date(payment.payment_date)
    const isDoublePaymentMonth = amortization?.installments_per_year === 14 && 
      (paymentDate.getMonth() === 6 || paymentDate.getMonth() === 11)
    
    const mappedPayment = {
      date: paymentDate,
      beginning_balance: payment.beginning_balance || 0,
      capital: payment.principal || payment.capital || 0,
      interest: payment.monthly_interest || payment.interest || 0,
      property_insurance: payment.property_insurance || 0,
      loan_insurance: payment.monthly_loan_insurance || payment.loan_insurance || 0,
      monthly_payment: payment.monthly_payment || 0,
      ending_balance: payment.ending_balance || 0,
      is_different_from_base: payment.is_different_from_base || false,
      is_double_payment: isDoublePaymentMonth
    };
    console.log('Mapped payment data:', mappedPayment);
    return mappedPayment;
  }, [amortization?.installments_per_year])

  const onUpdateAmortization = async (values: AmortizationFormValues) => {
    try {
      if (!amortization) {
        throw new Error("No amortization selected")
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
      const loanAmount = amortization.property.price_cost - downPayment

      // Validate loan amount
      if (loanAmount <= 0) {
        throw new Error("Down payment cannot be greater than property cost")
      }

      // Create a proper ISO date string preserving the exact date
      const inputDate = new Date(values.first_installment_date);
      const dateString = `${inputDate.getFullYear()}-${String(inputDate.getMonth() + 1).padStart(2, '0')}-${String(inputDate.getDate()).padStart(2, '0')}`;
      
      // Prepare amortization data
      const amortizationData = {
        name: values.name,
        down_payment: downPayment,
        interest_rate: interestRate,
        term_years: termYears,
        installments_per_year: installmentsPerYear,
        first_installment_date: dateString,
        loan_amount: loanAmount,
        loan_protection_type: values.loan_protection_type,
        loan_protection_insurance: loanProtectionInsurance,
      }

      // Update amortization in Supabase
      const { error: updateError } = await supabase
        .from("amortizations")
        .update(amortizationData)
        .eq('id', id)

      if (updateError) throw updateError

      toast({
        title: t("success"),
        description: t("amortization_updated"),
      })
    } catch (error) {
      console.error("Error updating amortization:", error)
      toast({
        variant: "destructive",
        title: t("error"),
        description: error instanceof Error ? error.message : t("error_updating_amortization")
      })
    }
  }

  const handlePropertyUpdate = (updatedProperty: Property) => {
    // We'll implement this later when we add refetch functionality
    console.log("Property updated:", updatedProperty)
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
      <DashboardLayout>
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <p className="text-lg text-foreground">{t("error_loading_amortization")}</p>
            <Button 
              variant="link" 
              className="mt-2"
              onClick={() => navigate("/mortgages")}
            >
              {t("back_to_mortgages")}
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
                  {t("mortgages")}
                </Link>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <EditableHeading 
                  value={amortization.name} 
                  onChange={async (newName) => {
                    try {
                      const { error } = await supabase
                        .from("amortizations")
                        .update({ name: newName })
                        .eq("id", id)

                      if (error) throw error
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
          <div className=" sm:w-full md:w-[40%] md:min-w-[320px] md:max-w-[540px] relative flex-shrink-0">
            <div className="absolute top-0 bottom-0 right-0 w-[1px] bg-border"></div>
            <PropertyDisplay 
              property={amortization.property}
              onPropertyUpdate={handlePropertyUpdate}
            />
            <Separator className="my-2" />
            {amortization && (
              <div >
                
                <div className="p-6  ">
                  <AmortizationDetailsForm
                    form={amortizationForm}
                    selectedProperty={amortization.property}
                    onSubmit={onUpdateAmortization}
                    submitLabel={t("update")}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Right Container */}
          <div className="w-full overflow-hidden flex-1 px-2 sm:px-8 pt-2 sm:pt-6">
            <h2 className="text-sm  mb-6">payment scenarios graphs</h2>
            {!amortization || !scenarios ? (
              <div className="flex items-center justify-center h-64">
                <div className="text-muted-foreground">{t("loading")}</div>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-2">
              
                <RegularPanelGraph
                  scenario={scenarios.regular}
                  currency={amortization.property.currency}
                  installmentsPerYear={amortization.installments_per_year}
                />

                <AcceleratedPanelGraph
                  scenario={scenarios.accelerated}
                  regularScenario={scenarios.regular}
                  currency={amortization.property.currency}
                  installmentsPerYear={amortization.installments_per_year}
                />

                <LowerPaymentPanelGraph
                  scenario={scenarios.lower_payment}
                  regularScenario={scenarios.regular}
                  currency={amortization.property.currency}
                  installmentsPerYear={amortization.installments_per_year}
                />

                <NewRatePanelGraph
                  scenario={scenarios.new_rate}
                  regularScenario={scenarios.regular}
                  currency={amortization.property.currency}
                  installmentsPerYear={amortization.installments_per_year}
                />
              </div>
            )}

            <div className="mt-8">
              <ExtraInstallmentsSection
                amortizationId={id || ""}
                currency={amortization.property.currency}
                loanAmount={amortization.loan_amount}
                onInstallmentsChange={() => {
                  queryClient.invalidateQueries({
                    queryKey: ["scenarios", id]
                  })
                }}
              />
            </div>

            <div className="mt-8">
              <NewRateForm
                amortizationId={id || ""}
                onSuccess={() => {
                  queryClient.invalidateQueries({
                    queryKey: ["scenarios", id]
                  })
                }}
                className="space-y-4"
                firstInstallmentDate={amortization.first_installment_date ? new Date(amortization.first_installment_date) : undefined}
              />
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
