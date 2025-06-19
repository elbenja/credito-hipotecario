import { usePropertyCalculations } from '@/hooks/calculations/usePropertyCalculations';
import { formatCurrency } from '@/utils/utils';
import type { PropertyWithBonus } from '@/types/property';

interface PropertyInvestmentDebugProps {
  selectedProperty: PropertyWithBonus | null;
  propertyAnnualAppreciation: number;
  mortgageData?: any;
}

export function PropertyInvestmentDebug({
  selectedProperty,
  propertyAnnualAppreciation,
  mortgageData
}: PropertyInvestmentDebugProps) {
  const { monthlyResults, summaryMetrics, isCalculated } = usePropertyCalculations({
    selectedProperty,
    propertyAnnualAppreciation,
    mortgageData
  });

  if (!selectedProperty || !isCalculated) {
    return (
      <div className="p-4 bg-muted rounded-lg">
        <p className="text-sm text-muted-foreground">
          Select a property to see investment calculations
        </p>
      </div>
    );
  }

  // Show first few and last few months for debugging
  const firstMonths = monthlyResults.slice(0, 3);
  const lastMonths = monthlyResults.slice(-3);
  const totalMonths = monthlyResults.length;

  return (
    <div className="space-y-4 p-4 bg-muted rounded-lg">
      <div>
        <h3 className="font-semibold mb-2">Property Investment Analysis</h3>
        <p className="text-sm text-muted-foreground">
          Property: {selectedProperty.name} | 
          Annual Appreciation: {propertyAnnualAppreciation}% | 
          Simulation: {totalMonths} months
        </p>
      </div>

      {/* Summary Metrics */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <div className="text-sm">
            <span className="font-medium">Initial Investment:</span>
            <br />
            {formatCurrency(summaryMetrics.initialInvestment, selectedProperty.currency as "USD" | "PEN")}
          </div>
          <div className="text-sm">
            <span className="font-medium">Final Property Value:</span>
            <br />
            {formatCurrency(summaryMetrics.finalPropertyValue, selectedProperty.currency as "USD" | "PEN")}
          </div>
          <div className="text-sm">
            <span className="font-medium">Total Appreciation:</span>
            <br />
            {formatCurrency(summaryMetrics.totalAppreciation, selectedProperty.currency as "USD" | "PEN")}
            <span className="text-muted-foreground ml-1">
              ({summaryMetrics.totalAppreciationPercentage.toFixed(1)}%)
            </span>
          </div>
        </div>
        <div className="space-y-2">
          <div className="text-sm">
            <span className="font-medium">Effective Annual Return:</span>
            <br />
            {summaryMetrics.effectiveAnnualReturn.toFixed(2)}%
          </div>
          <div className="text-sm">
            <span className="font-medium">Avg Monthly Appreciation:</span>
            <br />
            {formatCurrency(summaryMetrics.averageMonthlyAppreciation, selectedProperty.currency as "USD" | "PEN")}
          </div>
        </div>
      </div>

      {/* Monthly Results Preview */}
      <div className="space-y-2">
        <h4 className="font-medium text-sm">Monthly Results Preview</h4>
        <div className="space-y-1 text-xs">
          <div className="grid grid-cols-4 gap-2 font-medium">
            <span>Month</span>
            <span>Property Value</span>
            <span>Monthly Appreciation</span>
            <span>Accumulated Equity</span>
          </div>
          
          {/* First few months */}
          {firstMonths.map((month, index) => (
            <div key={index} className="grid grid-cols-4 gap-2">
              <span>{index + 1}</span>
              <span>{formatCurrency(month.propertyValue, selectedProperty.currency as "USD" | "PEN")}</span>
              <span>
                {formatCurrency(
                  month.sources[`property-appreciation-${selectedProperty.id}`] || 0,
                  selectedProperty.currency as "USD" | "PEN"
                )}
              </span>
              <span>{formatCurrency(month.accumulatedEquity, selectedProperty.currency as "USD" | "PEN")}</span>
            </div>
          ))}
          
          {totalMonths > 6 && (
            <div className="grid grid-cols-4 gap-2 text-muted-foreground">
              <span>...</span>
              <span>...</span>
              <span>...</span>
              <span>...</span>
            </div>
          )}
          
          {/* Last few months */}
          {lastMonths.map((month, index) => (
            <div key={index} className="grid grid-cols-4 gap-2">
              <span>{totalMonths - 2 + index}</span>
              <span>{formatCurrency(month.propertyValue, selectedProperty.currency as "USD" | "PEN")}</span>
              <span>
                {formatCurrency(
                  month.sources[`property-appreciation-${selectedProperty.id}`] || 0,
                  selectedProperty.currency as "USD" | "PEN"
                )}
              </span>
              <span>{formatCurrency(month.accumulatedEquity, selectedProperty.currency as "USD" | "PEN")}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
} 