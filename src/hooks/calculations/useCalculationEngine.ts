import { useEffect } from 'react';
import { useInvestmentAnalysisStore } from '@/store/investmentAnalysis';
import { usePropertyCalculations } from './usePropertyCalculations';
import type { PropertyWithBonus } from '@/types/property';

interface UseCalculationEngineProps {
  selectedProperty: PropertyWithBonus | null;
  selectedMortgageId: string | null;
  mortgageData?: any;
}

export const useCalculationEngine = ({
  selectedProperty,
  selectedMortgageId,
  mortgageData
}: UseCalculationEngineProps) => {
  const {
    propertyAnnualAppreciation,
    activeCalculations,
    monthlyResults,
    isCalculating,
    setSelectedProperty,
    setSelectedMortgage,
    setActiveCalculations,
    setMonthlyResults,
    setCalculating,
    markCalculated,
    getSummaryMetrics
  } = useInvestmentAnalysisStore();

  // Update store when selections change
  useEffect(() => {
    setSelectedProperty(selectedProperty?.id || null);
  }, [selectedProperty?.id, setSelectedProperty]);

  useEffect(() => {
    setSelectedMortgage(selectedMortgageId);
  }, [selectedMortgageId, setSelectedMortgage]);

  // Property calculations
  const propertyCalculations = usePropertyCalculations({
    selectedProperty,
    propertyAnnualAppreciation,
    mortgageData
  });

  // Update calculations when property changes
  useEffect(() => {
    if (propertyCalculations.isCalculated) {
      setCalculating(true);
      
      // Update active calculations
      setActiveCalculations(propertyCalculations.calculationSources);
      
      // Update monthly results
      setMonthlyResults(propertyCalculations.monthlyResults);
      
      setCalculating(false);
      markCalculated();
    } else {
      // Clear calculations when no property is selected
      setActiveCalculations([]);
      setMonthlyResults([]);
    }
  }, [
    propertyCalculations.isCalculated,
    propertyCalculations.calculationSources,
    propertyCalculations.monthlyResults,
    setCalculating,
    setActiveCalculations,
    setMonthlyResults,
    markCalculated
  ]);

  // TODO: Add mortgage calculations integration here
  // const mortgageCalculations = useMortgageCalculations({
  //   selectedMortgageId,
  //   mortgageData
  // });

  // TODO: Add rental income calculations integration here
  // const rentalCalculations = useRentalIncomeCalculations({...});

  return {
    // Current calculations
    activeCalculations,
    monthlyResults,
    isCalculating,
    
    // Summary data
    summaryMetrics: getSummaryMetrics(),
    propertySummary: propertyCalculations.summaryMetrics,
    
    // Calculation status
    hasPropertyCalculations: propertyCalculations.isCalculated,
    hasMortgageCalculations: false, // TODO: implement
    hasRentalCalculations: false,   // TODO: implement
    
    // Debug info
    calculationSources: propertyCalculations.calculationSources,
  };
}; 