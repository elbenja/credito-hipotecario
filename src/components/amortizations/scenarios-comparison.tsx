import { PaymentSummary } from "./payment-summary"
import { ScenarioTable } from "./scenario-table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface ScenariosComparisonProps {
  currency: "USD" | "PEN"
  acceleratedScenario: {
    summary: {
      totalInterestAndInsurance: number
      totalMonths: number
      monthlyPayment: number
    }
    payments: Array<{
      date: Date
      capital: number
      interest: number
      property_insurance: number
      loan_insurance: number
      monthly_payment: number
    }>
  }
  lowerPaymentScenario: {
    summary: {
      totalInterestAndInsurance: number
      totalMonths: number
      monthlyPayment: number
    }
    payments: Array<{
      date: Date
      capital: number
      interest: number
      property_insurance: number
      loan_insurance: number
      monthly_payment: number
    }>
  }
}

export function ScenariosComparison({
  currency,
  acceleratedScenario,
  lowerPaymentScenario
}: ScenariosComparisonProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Accelerated Scenario */}
      <Card>
        <CardHeader>
          <CardTitle>Accelerated Scenario</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <PaymentSummary
            totalInterestAndInsurance={acceleratedScenario.summary.totalInterestAndInsurance}
            totalMonths={acceleratedScenario.summary.totalMonths}
            monthlyPayment={acceleratedScenario.summary.monthlyPayment}
            currency={currency}
          />
          <ScenarioTable
            rows={acceleratedScenario.payments}
            currency={currency}
            compareWithBaseScenario={true}
          />
        </CardContent>
      </Card>

      {/* Lower Payment Scenario */}
      <Card>
        <CardHeader>
          <CardTitle>Lower Payment Scenario</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <PaymentSummary
            totalInterestAndInsurance={lowerPaymentScenario.summary.totalInterestAndInsurance}
            totalMonths={lowerPaymentScenario.summary.totalMonths}
            monthlyPayment={lowerPaymentScenario.summary.monthlyPayment}
            currency={currency}
          />
          <ScenarioTable
            rows={lowerPaymentScenario.payments}
            currency={currency}
            compareWithBaseScenario={true}
          />
        </CardContent>
      </Card>
    </div>
  )
} 