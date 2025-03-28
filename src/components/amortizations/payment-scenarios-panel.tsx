import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { PaymentSummary } from "@/components/amortizations/payment-summary"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { PaymentChart } from "./payment-chart"
import { Separator } from "@/components/ui/separator"
import { ExtraInstallmentsSection } from "./extra-installments-section"
import { ExtraInstallmentForm } from "./extra-installment-form"
import { ExtraInstallmentsTable } from "./extra-installments-table"
import { NewRateForm } from "./new-rate-form"
import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { type ExtraInstallment } from "./types"
import { CalendarIcon, Check } from "lucide-react"
import { supabase } from "@/integrations/supabase/client"
import { useToast } from "@/hooks/use-toast"
import { format } from "date-fns"
import { useTranslation } from "react-i18next"
import { CalendarDatePicker } from "@/components/ui/calendar-date-picker"
import { cn } from "@/lib/utils"

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
  extraInstallments?: ExtraInstallment[]
  onExtraInstallmentAdd?: (installment: Omit<ExtraInstallment, "id">) => void
  onExtraInstallmentDelete?: (id: string) => void
}

export function PaymentScenariosPanel({
  paymentDetails,
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
  amortizationId,
  extraInstallments = [],
  onExtraInstallmentAdd,
  onExtraInstallmentDelete
}: PaymentScenariosProps) {
  const { toast } = useToast()
  const { t } = useTranslation()
  const [chartKey, setChartKey] = useState(0)
  const [selectedScenario, setSelectedScenario] = useState("regular")
  
  const handleScenarioChange = (value: string) => {
    setSelectedScenario(value)
    setChartKey(prev => prev + 1)
  }

  const handleInstallmentsChange = () => {
    setChartKey(prev => prev + 1)
  }

  const handleNewRateSuccess = () => {
    setChartKey(prev => prev + 1)
    // TODO: Recalculate payment details with new rate
  }

  const handleRefinancingSubmit = async () => {
    if (!amortizationId) return

    try {
      const { error } = await supabase
        .from("new_rates")
        .insert({
          amortization_id: amortizationId,
          new_interest_rate: parseFloat(refinancingForm.newInterestRate),
          new_term_years: refinancingForm.newTerm ? parseInt(refinancingForm.newTerm) : null,
          effective_date: refinancingForm.startDate ? format(refinancingForm.startDate, 'yyyy-MM-dd') : null,
        })

      if (error) throw error

      toast({
        title: "Success",
        description: "New rate saved successfully",
      })

      // Reset form and refresh calculations
      setRefinancingForm({
        newInterestRate: "",
        newTerm: "",
        startDate: undefined
      })
      handleNewRateSuccess()
    } catch (error) {
      console.error("Error saving new rate:", error)
      toast({
        title: "Error",
        description: "Failed to save new rate. Please try again.",
        variant: "destructive",
      })
    }
  }

  const renderExtraInstallmentsSection = () => {
    if (amortizationId) {
      return (
        <ExtraInstallmentsSection
          amortizationId={amortizationId}
          currency={currency}
          loanAmount={loanAmount}
          onInstallmentsChange={handleInstallmentsChange}
        />
      )
    }

    if (onExtraInstallmentAdd && onExtraInstallmentDelete) {
      return (
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-medium">{t("payment_scenarios.extra_installments.title")}</h3>
            <p className="text-sm text-muted-foreground">
              {t("payment_scenarios.extra_installments.description")}
            </p>
          </div>

          <ExtraInstallmentForm
            onSubmit={(values) => {
              onExtraInstallmentAdd({
                amount: parseFloat(values.amount.replace(/[^0-9.]/g, "")),
                frequency: values.frequency,
                start_date: values.start_date.toISOString(),
                amortization_id: "",
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              })
              handleInstallmentsChange()
            }}
            loanAmount={loanAmount}
            currency={currency}
          />

          <ExtraInstallmentsTable
            installments={extraInstallments}
            currency={currency}
            onDelete={(id) => {
              onExtraInstallmentDelete(id)
              handleInstallmentsChange()
            }}
          />
        </div>
      )
    }

    return null
  }

  const chartProperty = {
    id: "temp",
    cost: loanAmount,
    currency,
    property_insurance: propertyInsurance,
    property_insurance_type: "manual" as "auto" | "manual",
    bonus: 0
  }

  const baseChartProps = {
    property: chartProperty,
    downPayment: 0,
    annualInterestRate,
    termYears,
    installmentsPerYear,
    firstInstallmentDate,
    propertyInsurance,
    loanProtection
  }

  const content = (
    <>
      <h2 className="text-sm font-medium mb-4">{t("payment_scenarios.title")}</h2>
      <Tabs defaultValue="regular" className="w-full" onValueChange={handleScenarioChange}>
        <TabsList className="grid w-full grid-cols-4 gap-1">
          <TabsTrigger value="regular" className="text-xs md:text-sm whitespace-nowrap px-2 md:px-3">{t("payment_scenarios.regular")}</TabsTrigger>
          <TabsTrigger value="accelerated" className="text-xs md:text-sm whitespace-nowrap px-2 md:px-3">{t("payment_scenarios.accelerated")}</TabsTrigger>
          <TabsTrigger value="lower" className="text-xs md:text-sm whitespace-nowrap px-2 md:px-3">{t("payment_scenarios.lower_payment")}</TabsTrigger>
          <TabsTrigger value="new-rate" className="text-xs md:text-sm whitespace-nowrap px-2 md:px-3">{t("payment_scenarios.new_rate")}</TabsTrigger>
        </TabsList>
        <TabsContent value="regular" className="mt-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {t("payment_scenarios.regular_description")}
              </p>
              <div className="flex items-center space-x-2">
                <Switch id="regular-select" />
                <Label htmlFor="regular-select">{t("payment_scenarios.select")}</Label>
              </div>
            </div>
            <PaymentSummary 
              {...paymentDetails.regular} 
              currency={currency}
              scenarioType="regular"
              loanAmount={loanAmount}
              interestRate={annualInterestRate}
              termYears={termYears}
              installmentsPerYear={installmentsPerYear}
              propertyInsurance={propertyInsurance}
              loanInsurance={loanProtection}
              firstInstallmentDate={firstInstallmentDate}
              extraInstallments={extraInstallments}
            />
            <Separator className="my-4" />
            {/* Temporarily comment out chart while we fix scenario calculations */}
          </div>
        </TabsContent>
        <TabsContent value="accelerated" className="mt-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {t("payment_scenarios.accelerated_description")}
              </p>
              <div className="flex items-center space-x-2">
                <Switch id="accelerated-select" />
                <Label htmlFor="accelerated-select">{t("payment_scenarios.select")}</Label>
              </div>
            </div>
            <PaymentSummary 
              {...paymentDetails.accelerated} 
              currency={currency}
              scenarioType="accelerated"
              loanAmount={loanAmount}
              interestRate={annualInterestRate}
              termYears={termYears}
              installmentsPerYear={14}
              propertyInsurance={propertyInsurance}
              loanInsurance={loanProtection}
              firstInstallmentDate={firstInstallmentDate}
              extraInstallments={extraInstallments}
            />
            <Separator className="my-4" />
            {/* Temporarily comment out chart while we fix scenario calculations */}
            {renderExtraInstallmentsSection()}
          </div>
        </TabsContent>
        <TabsContent value="lower" className="mt-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {t("payment_scenarios.lower_description")}
              </p>
              <div className="flex items-center space-x-2">
                <Switch id="lower-select" />
                <Label htmlFor="lower-select">{t("payment_scenarios.select")}</Label>
              </div>
            </div>
            <PaymentSummary 
              {...paymentDetails.lower} 
              currency={currency}
              scenarioType="lower_payment"
              loanAmount={loanAmount}
              interestRate={annualInterestRate}
              termYears={termYears + 5}
              installmentsPerYear={installmentsPerYear}
              propertyInsurance={propertyInsurance}
              loanInsurance={loanProtection}
              firstInstallmentDate={firstInstallmentDate}
              extraInstallments={extraInstallments}
            />
            <Separator className="my-4" />
            {/* Temporarily comment out chart while we fix scenario calculations */}
            {renderExtraInstallmentsSection()}
          </div>
        </TabsContent>
        <TabsContent value="new-rate" className="mt-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {t("payment_scenarios.new_rate_description")}
              </p>
              <div className="flex items-center space-x-2">
                <Switch id="new-rate-select" />
                <Label htmlFor="new-rate-select">{t("payment_scenarios.select")}</Label>
              </div>
            </div>
            <PaymentSummary 
              {...paymentDetails.newRate} 
              currency={currency}
              scenarioType="new_rate"
              loanAmount={loanAmount}
              interestRate={annualInterestRate}
              termYears={termYears}
              installmentsPerYear={installmentsPerYear}
              propertyInsurance={propertyInsurance}
              loanInsurance={loanProtection}
              firstInstallmentDate={firstInstallmentDate}
              extraInstallments={extraInstallments}
              rateChanges={[]}
            />
            <Separator className="my-4" />
            {/* Temporarily comment out chart while we fix scenario calculations */}
            <NewRateForm
              amortizationId={amortizationId}
              onSuccess={handleNewRateSuccess}
              className="space-y-4"
            />
          </div>
        </TabsContent>
      </Tabs>
    </>
  )

  return (
    <>
      {/* Mobile Slide-in Panel */}
      <div className={`fixed inset-0 bg-background md:hidden transition-transform duration-200 ${showMobileDetails ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="h-full flex flex-col">
          <div className="p-4 border-b">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onCloseMobilePanel}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              {t("payment_scenarios.back")}
            </Button>
          </div>
          <div className="flex-1 p-6 overflow-y-auto">
            {content}
          </div>
        </div>
      </div>

      {/* Mobile Toggle Button */}
      <div className="md:hidden">
        <Button 
          className="w-full" 
          onClick={onOpenMobilePanel}
        >
          {t("payment_scenarios.view_scenarios")}
        </Button>
      </div>

      {/* Desktop View */}
      <div className="hidden md:block w-[60%] p-6">
        {content}
      </div>
    </>
  )
}
