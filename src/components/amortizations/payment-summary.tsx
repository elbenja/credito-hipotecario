import { formatCurrency } from "@/lib/utils"

type PaymentSummaryProps = {
  totalInterestAndInsurance: number
  totalMonths: number
  monthlyPayment: number
  currency: "USD" | "PEN"
}

export function PaymentSummary({
  totalInterestAndInsurance,
  totalMonths,
  monthlyPayment,
  currency
}: PaymentSummaryProps) {
  return (
    <div className="grid gap-4">
      <div className="grid gap-1">
        <div className="text-sm font-medium text-muted-foreground">
          Sum Interest & Insurances
        </div>
        <div className="text-2xl font-bold">
          {formatCurrency(totalInterestAndInsurance, currency)}
        </div>
      </div>
      <div className="grid gap-1">
        <div className="text-sm font-medium text-muted-foreground">
          Months
        </div>
        <div className="text-2xl font-bold">
          {totalMonths}
        </div>
      </div>
      <div className="grid gap-1">
        <div className="text-sm font-medium text-muted-foreground">
          Monthly Pay
        </div>
        <div className="text-2xl font-bold">
          {formatCurrency(monthlyPayment, currency)}
        </div>
      </div>
    </div>
  )
} 