import { formatCurrency } from "@/lib/utils"
import { useTranslation } from "react-i18next"
import { format } from "date-fns"
import { type ExtraInstallment } from "./types"
import { type RateChange } from "@/services/amortization/types/common"

type ScenarioType = 'regular' | 'accelerated' | 'lower_payment' | 'new_rate'

type PaymentSummaryProps = {
  totalInterestAndInsurance: number
  totalMonths: number
  monthlyPayment: number
  currency: "USD" | "PEN"
  scenarioType?: ScenarioType
  loanAmount: number
  interestRate: number
  termYears: number
  installmentsPerYear: number
  propertyInsurance: number
  loanInsurance: number
  firstInstallmentDate: Date
  extraInstallments?: ExtraInstallment[]
  rateChanges?: RateChange[]
  rateChangeInfo?: {
    effectiveDate: string
    newInterestRate: number
    newTermYears?: number
  }
}

export function PaymentSummary({
  totalInterestAndInsurance,
  totalMonths,
  monthlyPayment,
  currency,
  scenarioType = 'regular',
  rateChangeInfo,
  loanAmount,
  interestRate,
  termYears,
  installmentsPerYear,
  propertyInsurance,
  loanInsurance,
  firstInstallmentDate,
  extraInstallments,
  rateChanges
}: PaymentSummaryProps) {
  const { t } = useTranslation()

  return (
    <div className="space-y-4">
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
      
      {rateChangeInfo && (
        <div className="bg-muted/40 p-3 rounded-md text-sm">
          <div className="font-medium mb-1">Rate Change Details:</div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div>
              <span className="text-muted-foreground mr-1">Effective:</span>
              <span className="font-medium">
                {format(new Date(rateChangeInfo.effectiveDate), 'MMM d, yyyy')}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground mr-1">New Rate:</span>
              <span className="font-medium">{rateChangeInfo.newInterestRate}%</span>
            </div>
            {rateChangeInfo.newTermYears && (
              <div>
                <span className="text-muted-foreground mr-1">New Term:</span>
                <span className="font-medium">{rateChangeInfo.newTermYears} years</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
} 