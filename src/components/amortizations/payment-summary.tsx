import { formatCurrency } from "@/lib/utils"

interface PaymentSummaryProps {
  totalInterestAndInsurance: number
  totalMonths: number
  monthlyPayment: number
  currency: "USD" | "PEN"
}

export function PaymentSummary({
  totalInterestAndInsurance,
  totalMonths,
  monthlyPayment,
  currency,
}: PaymentSummaryProps) {
  return (
    <div className="grid grid-cols-10 gap-1 p-2 bg-white/50 rounded-lg">
      <div className="col-span-5 space-y-2">
        <h3 className="text-sm font-medium text-muted-foreground">
          Sum Interest & Insurances
        </h3>
        <p className="text-2xl font-bold tracking-tight">
          {formatCurrency(totalInterestAndInsurance, currency)}
        </p>
      </div>
      <div className="col-span-2 space-y-2">
        <h3 className="text-sm font-medium text-muted-foreground">
          Months
        </h3>
        <p className="text-2xl font-bold tracking-tight">
          {totalMonths}
        </p>
      </div>
      <div className="col-span-3 space-y-2">
        <h3 className="text-sm font-medium text-muted-foreground">
          Monthly Pay
        </h3>
        <p className="text-2xl font-bold tracking-tight">
          {formatCurrency(monthlyPayment, currency)}
        </p>
      </div>
    </div>
  )
} 