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
  const [chartKey, setChartKey] = useState(0)
  const [selectedNewRate, setSelectedNewRate] = useState(false)
  const [refinancingForm, setRefinancingForm] = useState({
    newInterestRate: "",
    newTerm: "",
    startDate: undefined as Date | undefined
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  
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
      setIsSubmitting(true)

      const { error } = await supabase
        .from("refinancing_options")
        .insert({
          amortization_id: amortizationId,
          new_interest_rate: parseFloat(refinancingForm.newInterestRate),
          new_term_years: refinancingForm.newTerm ? parseInt(refinancingForm.newTerm) : null,
          effective_date: refinancingForm.startDate ? format(refinancingForm.startDate, 'yyyy-MM-dd') : null,
        })

      if (error) throw error

      toast({
        title: "Success",
        description: "Refinancing option saved successfully",
      })

      // Reset form and refresh calculations
      setRefinancingForm({
        newInterestRate: "",
        newTerm: "",
        startDate: undefined
      })
      handleNewRateSuccess()
    } catch (error) {
      console.error("Error saving refinancing option:", error)
      toast({
        title: "Error",
        description: "Failed to save refinancing option. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
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
            <h3 className="text-lg font-medium">Extra Installments</h3>
            <p className="text-sm text-muted-foreground">
              Add extra payments to reduce your loan term or monthly payment.
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
    cost: loanAmount + (parseFloat(refinancingForm.newInterestRate) || 0),
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
      <h2 className="text-sm font-medium mb-4">Payment Scenarios</h2>
      <Tabs defaultValue="regular" className="w-full">
        <TabsList className="grid w-full grid-cols-4 gap-1">
          <TabsTrigger value="regular" className="text-xs md:text-sm whitespace-nowrap px-2 md:px-3">Regular</TabsTrigger>
          <TabsTrigger value="accelerated" className="text-xs md:text-sm whitespace-nowrap px-2 md:px-3">Accelerated</TabsTrigger>
          <TabsTrigger value="lower" className="text-xs md:text-sm whitespace-nowrap px-2 md:px-3">Lower Payment</TabsTrigger>
          <TabsTrigger value="new-rate" className="text-xs md:text-sm whitespace-nowrap px-2 md:px-3">New Rate</TabsTrigger>
        </TabsList>
        <TabsContent value="regular" className="mt-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Base mortgage with standard parameters.
              </p>
              <div className="flex items-center space-x-2">
                <Switch id="regular-select" />
                <Label htmlFor="regular-select">Select</Label>
              </div>
            </div>
            <PaymentSummary {...paymentDetails.regular} currency={currency} />
            <Separator className="my-4" />
            <PaymentChart 
              key={`regular-${chartKey}`}
              {...baseChartProps}
            />
          </div>
        </TabsContent>
        <TabsContent value="accelerated" className="mt-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Extra payments reduce the term, installment remains constant.
              </p>
              <div className="flex items-center space-x-2">
                <Switch id="accelerated-select" />
                <Label htmlFor="accelerated-select">Select</Label>
              </div>
            </div>
            <PaymentSummary {...paymentDetails.accelerated} currency={currency} />
            <Separator className="my-4" />
            <PaymentChart 
              key={`accelerated-${chartKey}`}
              {...baseChartProps}
            />
            {renderExtraInstallmentsSection()}
          </div>
        </TabsContent>
        <TabsContent value="lower" className="mt-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Extra payments reduce the monthly payment, term remains the same.
              </p>
              <div className="flex items-center space-x-2">
                <Switch id="lower-select" />
                <Label htmlFor="lower-select">Select</Label>
              </div>
            </div>
            <PaymentSummary {...paymentDetails.lower} currency={currency} />
            <Separator className="my-4" />
            <PaymentChart 
              key={`lower-${chartKey}`}
              {...baseChartProps}
            />
            {renderExtraInstallmentsSection()}
          </div>
        </TabsContent>
        <TabsContent value="new-rate" className="mt-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Simulate a new interest rate.
              </p>
              <div className="flex items-center space-x-2">
                <Switch id="new-rate-select" />
                <Label htmlFor="new-rate-select">Select</Label>
              </div>
            </div>
            <PaymentSummary {...paymentDetails.newRate} currency={currency} />
            <Separator className="my-4" />
            <PaymentChart 
              key={`new-rate-${chartKey}`}
              {...baseChartProps}
              annualInterestRate={parseFloat(refinancingForm.newInterestRate) || annualInterestRate}
              termYears={parseInt(refinancingForm.newTerm) || termYears}
            />
            
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-medium">New Rate Details</h3>
                <p className="text-sm text-muted-foreground">
                  Simulate how your payments would change with a new interest rate.
                </p>
              </div>

              <div className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="new-interest-rate">New Interest Rate (%)</Label>
                  <Input
                    id="new-interest-rate"
                    type="number"
                    placeholder="Enter new rate"
                    value={refinancingForm.newInterestRate}
                    onChange={(e) => setRefinancingForm(prev => ({ ...prev, newInterestRate: e.target.value }))}
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="new-term">New Term (Years)</Label>
                  <Input
                    id="new-term"
                    type="number"
                    placeholder="Enter new term"
                    value={refinancingForm.newTerm}
                    onChange={(e) => setRefinancingForm(prev => ({ ...prev, newTerm: e.target.value }))}
                  />
                </div>

                <div className="grid gap-2">
                  <Label>Start Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-start text-left font-normal"
                      >
                        {refinancingForm.startDate ? (
                          format(refinancingForm.startDate, "PPP")
                        ) : (
                          <span>Pick a date</span>
                        )}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={refinancingForm.startDate}
                        onSelect={(date) => setRefinancingForm(prev => ({ ...prev, startDate: date || undefined }))}
                        disabled={(date) =>
                          date < new Date()
                        }
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                {amortizationId && (
                  <Button 
                    className="w-full"
                    onClick={handleRefinancingSubmit}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <div className="flex items-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Saving...
                      </div>
                    ) : (
                      "Save Refinancing Option"
                    )}
                  </Button>
                )}
              </div>
            </div>
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
              Back
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
          View Payment Scenarios
        </Button>
      </div>

      {/* Desktop View */}
      <div className="hidden md:block w-[60%] p-6">
        {content}
      </div>
    </>
  )
}
