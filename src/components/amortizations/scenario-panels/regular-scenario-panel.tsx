import { formatCurrency } from "@/utils/utils"
import { CollapsibleScenarioPanel } from "@/components/amortizations/collapsible-scenario-panel"
import { ScenarioTable } from "@/components/amortizations/scenario-table"
import type { BaseScenarioPanelProps } from "./types"

export function RegularScenarioPanel({
  scenario,
  currency,
  installmentsPerYear,
  mapPaymentForTable
}: Omit<BaseScenarioPanelProps, 'regularScenario'>) {
  if (!scenario) return null

  return (
    <CollapsibleScenarioPanel 
      title="Regular Scenario"
      tag="Baseline"
      tagColor="primary"
      defaultOpen={false}
      summary={{
        months: scenario.summary.total_months || 0,
        payment: formatCurrency(scenario.summary.monthly_payment || 0, currency),
        totalInterest: formatCurrency(scenario.summary.total_interest_and_insurance || 0, currency)
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
            <p className="text-lg font-medium">{scenario.summary.total_months || 0}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Monthly Payment</p>
            <p className="text-lg font-medium">
              {formatCurrency(scenario.summary.monthly_payment || 0, currency)}
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
            compareWithBaseScenario={false}
          />
        )}
      </div>
    </CollapsibleScenarioPanel>
  )
} 