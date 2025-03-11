import { formatCurrency } from "@/lib/utils"
import { useTranslation } from "react-i18next"

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
  const { t } = useTranslation()

  return (
    <div className="grid grid-cols-10 gap-4">
      <div className="col-span-5 grid gap-1">
        <div className="text-sm font-medium text-muted-foreground">
          {t("payment_summary.total_interest_insurance")}
        </div>
        <div className="text-2xl font-bold">
          {formatCurrency(totalInterestAndInsurance, currency)}
        </div>
      </div>
      <div className="col-span-2 grid gap-1">
        <div className="text-sm font-medium text-muted-foreground">
          {t("payment_summary.months")}
        </div>
        <div className="text-2xl font-bold">
          {totalMonths}
        </div>
      </div>
      <div className="col-span-3 grid gap-1">
        <div className="text-sm font-medium text-muted-foreground">
          {t("payment_summary.monthly_payment")}
        </div>
        <div className="text-2xl font-bold">
          {formatCurrency(monthlyPayment, currency)}
        </div>
      </div>
    </div>
  )
} 