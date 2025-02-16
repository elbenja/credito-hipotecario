import { formatCurrency } from "@/lib/utils"

interface PaymentSummaryProps {
  totalInterestAndInsurance: number
  totalMonths: number
  monthlyPayment: number
}

export function PaymentSummary({
  totalInterestAndInsurance,
  totalMonths,
  monthlyPayment,
}: PaymentSummaryProps) {
  return (
    <div className="grid grid-cols-3 gap-4 p-4 bg-white/50 rounded-lg">
      <div className="space-y-2">
        <h3 className="text-sm font-medium text-muted-foreground">
          Sum Interest & Insurances
        </h3>
        <p className="text-2xl font-bold tracking-tight">
          {formatCurrency(totalInterestAndInsurance)}
        </p>
      </div>
      <div className="space-y-2">
        <h3 className="text-sm font-medium text-muted-foreground">
          Months
        </h3>
        <p className="text-2xl font-bold tracking-tight">
          {totalMonths}
        </p>
      </div>
      <div className="space-y-2">
        <h3 className="text-sm font-medium text-muted-foreground">
          Monthly Pay
        </h3>
        <p className="text-2xl font-bold tracking-tight">
          {formatCurrency(monthlyPayment)}
        </p>
      </div>
    </div>
  )
} 