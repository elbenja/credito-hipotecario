import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { formatCurrency, normalizeDate } from "@/lib/utils"
import { ScenarioCalculator } from "@/services/amortization/services/scenarioCalculator"
import { useQuery } from "@tanstack/react-query"
import { supabase } from "@/integrations/supabase/client"

interface PaymentDetails {
  totalInterestAndInsurance: number
  totalMonths: number
  monthlyPayment: number
}

interface PaymentScenariosProps {
  paymentDetails: {
    regular: PaymentDetails
    accelerated: PaymentDetails
    lower: PaymentDetails
    newRate: PaymentDetails
  }
  showMobileDetails?: boolean
  onCloseMobilePanel?: () => void
  onOpenMobilePanel?: () => void
  currency: "USD" | "PEN"
  loanAmount: number
  annualInterestRate: number
  termYears: number
  installmentsPerYear?: 12 | 14
  firstInstallmentDate?: Date
  propertyInsurance?: number
  loanProtection?: number
  amortizationId: string
}

export function PaymentScenariosPanel({
  showMobileDetails,
  onCloseMobilePanel,
  onOpenMobilePanel,
  currency,
  loanAmount,
  annualInterestRate,
  termYears,
  installmentsPerYear = 12,
  firstInstallmentDate = new Date(),
  propertyInsurance = 0,
  loanProtection = 0,
  amortizationId
}: PaymentScenariosProps) {
  const { t } = useTranslation()
  const [selectedScenario, setSelectedScenario] = useState("regular")

  // Fetch extra installments
  const { data: extraInstallments = [] } = useQuery({
    queryKey: ["extra-installments", amortizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("extra_installments")
        .select("*")
        .eq("amortization_id", amortizationId)
        .order("start_date", { ascending: true })

      if (error) {
        console.error("Error fetching extra installments:", error)
        return []
      }

      return data
    },
    enabled: !!amortizationId,
  })

  // Fetch rate changes
  const { data: rateChanges = [] } = useQuery({
    queryKey: ["rate-changes", amortizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("new_rates")
        .select("*")
        .eq("amortization_id", amortizationId)
        .order("effective_date", { ascending: true })

      if (error) {
        console.error("Error fetching rate changes:", error)
        return []
      }

      return data
    },
    enabled: !!amortizationId,
  })

  // Memoize scenario calculations to prevent unnecessary recalculations
  const paymentDetails = useMemo(() => {
    const normalizedDate = normalizeDate(firstInstallmentDate)

    const scenarios = ScenarioCalculator.calculateScenarios({
      loan_amount: loanAmount,
      interest_rate: annualInterestRate,
      term_years: termYears,
      installments_per_year: installmentsPerYear,
      first_installment_date: normalizedDate,
      property_insurance: propertyInsurance,
      loan_insurance: loanProtection,
      extra_installments: extraInstallments,
      rate_changes: rateChanges
    })

    return {
      regular: {
        totalInterestAndInsurance: scenarios.regular.summary.total_interest_and_insurance,
        totalMonths: scenarios.regular.summary.total_months,
        monthlyPayment: scenarios.regular.summary.monthly_payment
      },
      accelerated: {
        totalInterestAndInsurance: scenarios.accelerated.summary.total_interest_and_insurance,
        totalMonths: scenarios.accelerated.summary.total_months,
        monthlyPayment: scenarios.accelerated.summary.monthly_payment
      },
      lower: {
        totalInterestAndInsurance: scenarios.lower_payment.summary.total_interest_and_insurance,
        totalMonths: scenarios.lower_payment.summary.total_months,
        monthlyPayment: scenarios.lower_payment.summary.monthly_payment
      },
      newRate: {
        totalInterestAndInsurance: scenarios.new_rate.summary.total_interest_and_insurance,
        totalMonths: scenarios.new_rate.summary.total_months,
        monthlyPayment: scenarios.new_rate.summary.monthly_payment
      }
    }
  }, [
    loanAmount,
    annualInterestRate,
    termYears,
    installmentsPerYear,
    firstInstallmentDate,
    propertyInsurance,
    loanProtection,
    extraInstallments,
    rateChanges
  ])

  const handleScenarioChange = (value: string) => {
    setSelectedScenario(value)
  }

  const ScenarioSummary = ({ details }: { details: PaymentDetails }) => (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        <div>
          <h3 className="text-sm font-medium text-muted-foreground">
            {t("Sum Interest & Insurances")}
          </h3>
          <p className="text-2xl font-bold">
            {formatCurrency(details.totalInterestAndInsurance, currency)}
          </p>
        </div>
        <div>
          <h3 className="text-sm font-medium text-muted-foreground">
            {t("Months")}
          </h3>
          <p className="text-2xl font-bold">
            {details.totalMonths}
          </p>
        </div>
        <div>
          <h3 className="text-sm font-medium text-muted-foreground">
            {t("Monthly Payment")}
          </h3>
          <p className="text-2xl font-bold">
            {formatCurrency(details.monthlyPayment, currency)}
          </p>
        </div>
      </div>
    </div>
  )
  
  return (
    <div className="w-full p-6">
      <h2 className="text-lg font-semibold mb-4">{t("Payment Scenarios and Amortizations")}</h2>
      
      <Tabs defaultValue="regular" className="w-full" onValueChange={handleScenarioChange}>
        <TabsList className="grid w-full grid-cols-4 gap-1">
          <TabsTrigger 
            value="regular" 
            className="text-xs md:text-sm whitespace-nowrap px-2 md:px-3"
          >
            {t("Regular")}
          </TabsTrigger>
          <TabsTrigger 
            value="accelerated" 
            className="text-xs md:text-sm whitespace-nowrap px-2 md:px-3"
          >
            {t("Accelerated")}
          </TabsTrigger>
          <TabsTrigger 
            value="lower" 
            className="text-xs md:text-sm whitespace-nowrap px-2 md:px-3"
          >
            {t("Lower Payment")}
          </TabsTrigger>
          <TabsTrigger 
            value="new-rate" 
            className="text-xs md:text-sm whitespace-nowrap px-2 md:px-3"
          >
            {t("New Rate")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="regular" className="mt-4">
          <p className="text-sm text-muted-foreground mb-4">
            {t("Base mortgage with standard parameters.")}
          </p>
          <ScenarioSummary details={paymentDetails.regular} />
        </TabsContent>

        <TabsContent value="accelerated" className="mt-4">
          <p className="text-sm text-muted-foreground mb-4">
            {t("Accelerated payment schedule to reduce total interest.")}
          </p>
          <ScenarioSummary details={paymentDetails.accelerated} />
        </TabsContent>

        <TabsContent value="lower" className="mt-4">
          <p className="text-sm text-muted-foreground mb-4">
            {t("Extended term with lower monthly payments.")}
          </p>
          <ScenarioSummary details={paymentDetails.lower} />
        </TabsContent>

        <TabsContent value="new-rate" className="mt-4">
          <p className="text-sm text-muted-foreground mb-4">
            {t("Scenario with interest rate changes.")}
          </p>
          <ScenarioSummary details={paymentDetails.newRate} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
