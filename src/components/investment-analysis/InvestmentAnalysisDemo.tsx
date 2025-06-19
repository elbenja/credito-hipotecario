import { useState } from 'react';
import { PropertyInvestmentSection } from '@/components/rentals-ui/PropertyInvestmentSection';
import { DynamicInvestmentTable } from './DynamicInvestmentTable';
import { useCalculationEngine } from '@/hooks/calculations/useCalculationEngine';
import type { PropertyWithBonus } from '@/types/property';

// Mock data for demonstration
const mockProperties: PropertyWithBonus[] = [
  {
    id: '1',
    name: 'Downtown Apartment',
    price_cost: 300000,
    currency: 'USD',
    bonus: 15000,
    bonus_type: 'MiBanco'
  },
  {
    id: '2', 
    name: 'Suburban House',
    price_cost: 850000,
    currency: 'PEN',
    bonus: 50000,
    bonus_type: 'BCP'
  }
];

export function InvestmentAnalysisDemo() {
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);
  const [selectedMortgageId, setSelectedMortgageId] = useState<string | null>(null);
  const [propertyAnnualAppreciation, setPropertyAnnualAppreciation] = useState(3.5);

  const selectedProperty = selectedPropertyId ? mockProperties.find(p => p.id === selectedPropertyId) : null;

  const calculationEngine = useCalculationEngine({
    selectedProperty: selectedProperty || null,
    selectedMortgageId,
    mortgageData: null
  });

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">Property Investment Analysis</h1>
        <p className="text-muted-foreground">
          Comprehensive property investment calculator with dynamic analysis table
        </p>
      </div>

      {/* Property Investment Section */}
      <PropertyInvestmentSection
        properties={mockProperties}
        propertiesWithMortgages={[]}
        isLoadingProperties={false}
        isLoadingMortgages={false}
        selectedPropertyId={selectedPropertyId}
        selectedMortgageId={selectedMortgageId}
        propertyAnnualAppreciation={propertyAnnualAppreciation}
        onPropertySelect={setSelectedPropertyId}
        onMortgageSelect={setSelectedMortgageId}
        onPropertyAnnualAppreciationChange={setPropertyAnnualAppreciation}
      />

      {/* Calculation Status */}
      {calculationEngine.hasPropertyCalculations && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <h3 className="font-semibold text-green-800 mb-2">✅ Calculation Engine Active</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-green-600">Active Sources:</span>
              <div className="font-medium">{calculationEngine.activeCalculations.length}</div>
            </div>
            <div>
              <span className="text-green-600">Monthly Results:</span>
              <div className="font-medium">{calculationEngine.monthlyResults.length}</div>
            </div>
            <div>
              <span className="text-green-600">Final Property Value:</span>
              <div className="font-medium">
                {calculationEngine.summaryMetrics.finalPropertyValue.toLocaleString('en-US', {
                  style: 'currency',
                  currency: selectedProperty?.currency || 'PEN'
                })}
              </div>
            </div>
            <div>
              <span className="text-green-600">Total Equity:</span>
              <div className="font-medium">
                {calculationEngine.summaryMetrics.totalEquity.toLocaleString('en-US', {
                  style: 'currency',
                  currency: selectedProperty?.currency || 'PEN'
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Architecture Flow Diagram */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-blue-800 mb-3">🏗️ System Architecture Flow</h3>
        <div className="flex items-center justify-between text-sm">
          <div className="text-center">
            <div className="bg-blue-100 rounded px-3 py-2 mb-1">Property Data</div>
            <div className="text-blue-600">Selected Property</div>
          </div>
          <div className="text-blue-400">→</div>
          <div className="text-center">
            <div className="bg-blue-100 rounded px-3 py-2 mb-1">Calculation Engine</div>
            <div className="text-blue-600">usePercentageCalculations</div>
          </div>
          <div className="text-blue-400">→</div>
          <div className="text-center">
            <div className="bg-blue-100 rounded px-3 py-2 mb-1">Monthly Results</div>
            <div className="text-blue-600">300 months × sources</div>
          </div>
          <div className="text-blue-400">→</div>
          <div className="text-center">
            <div className="bg-blue-100 rounded px-3 py-2 mb-1">Zustand Store</div>
            <div className="text-blue-600">Central State</div>
          </div>
          <div className="text-blue-400">→</div>
          <div className="text-center">
            <div className="bg-blue-100 rounded px-3 py-2 mb-1">Dynamic Table</div>
            <div className="text-blue-600">Configurable UI</div>
          </div>
        </div>
      </div>

      {/* Instructions */}
      {!selectedProperty && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <h3 className="font-semibold text-amber-800 mb-2">🚀 Get Started</h3>
          <p className="text-amber-700">
            Select a property from the accordion above to see the investment analysis calculations in action. 
            The system will automatically generate 25 years of monthly projections showing property appreciation and equity growth.
          </p>
        </div>
      )}
    </div>
  );
} 