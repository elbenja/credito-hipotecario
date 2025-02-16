import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { PaymentSummary } from "@/components/amortizations/payment-summary"

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
}

export function PaymentScenariosPanel({
  paymentDetails,
  showMobileDetails,
  onCloseMobilePanel,
  onOpenMobilePanel
}: PaymentScenariosProps) {
  const content = (
    <>
      <h2 className="text-xl font-semibold mb-4">Payment Scenarios</h2>
      <Tabs defaultValue="regular" className="w-full">
        <TabsList className="grid w-full grid-cols-4 gap-1">
          <TabsTrigger value="regular" className="text-xs md:text-sm whitespace-nowrap px-2 md:px-3">Regular</TabsTrigger>
          <TabsTrigger value="accelerated" className="text-xs md:text-sm whitespace-nowrap px-2 md:px-3">Accelerated</TabsTrigger>
          <TabsTrigger value="lower" className="text-xs md:text-sm whitespace-nowrap px-2 md:px-3">Lower Payment</TabsTrigger>
          <TabsTrigger value="new-rate" className="text-xs md:text-sm whitespace-nowrap px-2 md:px-3">New Rate</TabsTrigger>
        </TabsList>
        <TabsContent value="regular" className="mt-4">
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Base mortgage with standard parameters.
            </p>
            <PaymentSummary {...paymentDetails.regular} />
            {/* Payment schedule will go here */}
          </div>
        </TabsContent>
        <TabsContent value="accelerated" className="mt-4">
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Extra payments reduce the term, installment remains constant.
            </p>
            <PaymentSummary {...paymentDetails.accelerated} />
            {/* Accelerated payment schedule will go here */}
          </div>
        </TabsContent>
        <TabsContent value="lower" className="mt-4">
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Extra payments reduce the monthly payment, term remains the same.
            </p>
            <PaymentSummary {...paymentDetails.lower} />
            {/* Lower payment schedule will go here */}
          </div>
        </TabsContent>
        <TabsContent value="new-rate" className="mt-4">
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Adjusts the interest rate (and optionally term) from a specified date.
            </p>
            <PaymentSummary {...paymentDetails.newRate} />
            {/* New rate payment schedule will go here */}
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
          View Payment Details
        </Button>
      </div>

      {/* Desktop View */}
      <div className="hidden md:block w-[60%] p-6">
        {content}
      </div>
    </>
  )
} 