import React from "react"
import { Badge } from "@/components/ui/badge"
import { formatCurrency } from "@/lib/utils"

type Currency = "USD" | "PEN"

interface PaymentRow {
  payment_date: Date
  capital: number
  interest: number
  property_insurance: number
  loan_insurance: number
  monthly_payment: number
  is_different_from_base: boolean
}

interface ScenarioSummaryResult {
  total_interest_and_insurance: number
  total_months: number
  monthly_payment: number
}

interface ScenarioResult {
  summary: ScenarioSummaryResult
  payments: PaymentRow[]
}

interface ScenarioPanelProps {
  scenario: ScenarioResult | undefined
  regularScenario?: ScenarioResult | undefined
  currency: string
  installmentsPerYear: number
}

const ScenarioPanel = ({ 
  title,
  scenario,
  regularScenario,
  currency,
  showBaseline = false
}: ScenarioPanelProps & { title: string, showBaseline?: boolean }) => {
  if (!scenario?.summary) return null

  const getDifference = (current: number, base?: number) => {
    if (!base) return null
    const diff = current - base
    // Return null if the difference is 0 to hide the badge
    return diff === 0 ? null : diff
  }

  const getBadgeVariant = (difference: number | null, isMonths = false): "default" | "destructive" | "primary" | "outline" | "blue" | "green" => {
    if (difference === null || showBaseline) return "primary"
    if (isMonths) {
      return difference < 0 ? "blue" : "outline"
    }
    return difference < 0 ? "blue" : "outline"
  }

  const formatDifference = (difference: number | null) => {
    if (difference === null) return ""
    const prefix = difference < 0 ? "-" : "+"
    return `${prefix}${Math.abs(difference)}`
  }

  const sumDifference = getDifference(
    scenario.summary.total_interest_and_insurance,
    regularScenario?.summary?.total_interest_and_insurance
  )

  const monthsDifference = getDifference(
    scenario.summary.total_months,
    regularScenario?.summary?.total_months
  )

  const paymentDifference = getDifference(
    scenario.summary.monthly_payment,
    regularScenario?.summary?.monthly_payment
  )

  return (
    <div className="p-4 border rounded-lg">
      <h3 className="text-lg font-semibold mb-4">{title}</h3>
      
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <span className="text-muted-foreground">Sum Interest & Insurances:</span>
          <div className="flex items-center gap-2">
            <span>{formatCurrency(scenario.summary.total_interest_and_insurance, currency as Currency)}</span>
            {showBaseline ? (
              <Badge variant="primary">Baseline</Badge>
            ) : sumDifference && (
              <Badge variant={getBadgeVariant(sumDifference)} className="text-green-600">
                {sumDifference < 0 ? '-' : '+'}{formatCurrency(Math.abs(sumDifference), currency as Currency)}
              </Badge>
            )}
          </div>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-muted-foreground">Months:</span>
          <div className="flex items-center gap-2">
            <span>{scenario.summary.total_months}</span>
            {monthsDifference && !showBaseline && (
              <Badge variant={getBadgeVariant(monthsDifference, true)}>
                {formatDifference(monthsDifference)}
              </Badge>
            )}
          </div>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-muted-foreground">Monthly Payment:</span>
          <div className="flex items-center gap-2">
            <span>{formatCurrency(scenario.summary.monthly_payment, currency as Currency)}</span>
            {paymentDifference && !showBaseline && (
              <Badge variant={getBadgeVariant(paymentDifference)}>
                {paymentDifference < 0 ? '-' : '+'}{formatCurrency(Math.abs(paymentDifference), currency as Currency)}
              </Badge>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export const RegularPanelGraph = (props: ScenarioPanelProps) => (
  <ScenarioPanel {...props} title="Regular Scenario" showBaseline />
)

export const AcceleratedPanelGraph = (props: ScenarioPanelProps) => (
  <ScenarioPanel {...props} title="Accelerated Scenario" />
)

export const LowerPaymentPanelGraph = (props: ScenarioPanelProps) => (
  <ScenarioPanel {...props} title="Lower Payment Scenario" />
)

export const NewRatePanelGraph = (props: ScenarioPanelProps) => (
  <ScenarioPanel {...props} title="New Rate Scenario" />
) 