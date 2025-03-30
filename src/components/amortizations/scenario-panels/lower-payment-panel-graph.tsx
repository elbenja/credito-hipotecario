import { formatCurrency } from "@/lib/utils"
import { CollapsibleScenarioPanel } from "@/components/amortizations/collapsible-scenario-panel"
import { ScenarioTable } from "@/components/amortizations/scenario-table"
import type { BaseScenarioPanelProps } from "./types"

export function LowerPaymentPanelGraph({
  scenario,
  regularScenario,
  currency,
  installmentsPerYear,
  mapPaymentForTable
}: BaseScenarioPanelProps) {
  if (!scenario) return null

  return (
    <CollapsibleScenarioPanel 
      title="Lower Payment Scenario Graph"
      tag="Reduces Payment"
      tagColor="blue"
      defaultOpen={false}
      summary={{
        months: scenario.summary.total_months || 0,
        payment: formatCurrency(scenario.summary.monthly_payment || 0, currency),
        difference: regularScenario && scenario 
          ? formatCurrency(regularScenario.summary.monthly_payment - scenario.summary.monthly_payment, currency) 
          : undefined,
        isPaymentReduction: true,
        totalInterest: formatCurrency(scenario.summary.total_interest_and_insurance || 0, currency),
        totalInterestDifference: regularScenario && scenario 
          ? formatCurrency(Math.abs(regularScenario.summary.total_interest_and_insurance - scenario.summary.total_interest_and_insurance), currency)
          : undefined,
        isInterestReduction: regularScenario && scenario 
          ? scenario.summary.total_interest_and_insurance < regularScenario.summary.total_interest_and_insurance 
          : true
      }}
    >
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Sum Interest & Insurances</p>
            <p className="text-lg font-medium">
              {formatCurrency(scenario.summary.total_interest_and_insurance || 0, currency)}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Months</p>
            <p className="text-lg font-medium">
              {scenario.summary.total_months || 0}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Monthly Payment</p>
            <p className="text-lg font-medium">
              {formatCurrency(scenario.summary.monthly_payment || 0, currency)}
              {regularScenario && scenario && (
                <span className="text-sm text-blue-600 ml-1">
                  (-{formatCurrency(regularScenario.summary.monthly_payment - scenario.summary.monthly_payment, currency)})
                </span>
              )}
            </p>
            {installmentsPerYear === 14 && (
              <p className="text-xs text-amber-700">
                (2× in July & December: {formatCurrency((scenario.summary.monthly_payment || 0) * 2, currency)})
              </p>
            )}
          </div>
        </div>
        {scenario.payments && (
          <ScenarioTable
            rows={scenario.payments.map(mapPaymentForTable)}
            currency={currency}
            compareWithBaseScenario={true}
          />
        )}
      </div>
    </CollapsibleScenarioPanel>
  )
} 