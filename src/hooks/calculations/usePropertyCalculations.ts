import { useMemo } from 'react';
import type { PropertyWithBonus } from '@/types/property';
import type { CalculationSource, MonthlyCalculationResult } from '@/types/calculations';
import { useSimulationParameters } from '../useSimulationParameters';
import { 
  usePercentageCalculations, 
  createPropertyAppreciationSource, 
  createInitialEquitySource 
} from './usePercentageCalculations';

interface UsePropertyCalculationsProps {
  selectedProperty: PropertyWithBonus | null;
  propertyAnnualAppreciation: number;
  mortgageData?: any;
}

export const usePropertyCalculations = ({
  selectedProperty,
  propertyAnnualAppreciation,
  mortgageData
}: UsePropertyCalculationsProps) => {
  const simulationParams = useSimulationParameters(mortgageData);
  
  // Create calculation sources for the selected property
  const calculationSources = useMemo(() => {
    if (!selectedProperty) return [];
    
    const sources: CalculationSource[] = [];
    
    // Initial equity (property purchase price as one-time equity investment)
    const initialEquitySource = createInitialEquitySource(
      selectedProperty.id,
      selectedProperty.price_cost,
      simulationParams.startDate
    );
    sources.push(initialEquitySource);
    
    // Property appreciation (monthly compounding)
    const appreciationSource = createPropertyAppreciationSource(
      selectedProperty.id,
      selectedProperty.price_cost,
      propertyAnnualAppreciation,
      simulationParams.startDate
    );
    sources.push(appreciationSource);
    
    return sources;
  }, [selectedProperty, propertyAnnualAppreciation, simulationParams.startDate]);
  
  // Prepare parameters for the percentage calculations hook
  const calculationParams = useMemo(() => {
    return calculationSources.map(source => ({
      source,
      simulationParams
    }));
  }, [calculationSources, simulationParams]);
  
  // Calculate monthly results
  const monthlyResults = usePercentageCalculations(calculationParams);
  
  // Calculate summary metrics
  const summaryMetrics = useMemo(() => {
    if (!monthlyResults.length || !selectedProperty) {
      return {
        initialInvestment: 0,
        finalPropertyValue: 0,
        totalAppreciation: 0,
        totalAppreciationPercentage: 0,
        averageMonthlyAppreciation: 0,
        effectiveAnnualReturn: 0
      };
    }
    
    const firstMonth = monthlyResults[0];
    const lastMonth = monthlyResults[monthlyResults.length - 1];
    
    const initialInvestment = selectedProperty.price_cost;
    const finalPropertyValue = lastMonth.propertyValue;
    const totalAppreciation = finalPropertyValue - initialInvestment;
    const totalAppreciationPercentage = (totalAppreciation / initialInvestment) * 100;
    
    // Calculate average monthly appreciation
    const totalMonthlyAppreciation = monthlyResults.reduce((sum, month) => {
      const appreciationAmount = month.sources[`property-appreciation-${selectedProperty.id}`] || 0;
      return sum + appreciationAmount;
    }, 0);
    const averageMonthlyAppreciation = totalMonthlyAppreciation / monthlyResults.length;
    
    // Calculate effective annual return
    const years = simulationParams.durationInYears;
    const effectiveAnnualReturn = (Math.pow(finalPropertyValue / initialInvestment, 1 / years) - 1) * 100;
    
    return {
      initialInvestment,
      finalPropertyValue,
      totalAppreciation,
      totalAppreciationPercentage,
      averageMonthlyAppreciation,
      effectiveAnnualReturn
    };
  }, [monthlyResults, selectedProperty, simulationParams.durationInYears]);
  
  return {
    monthlyResults,
    calculationSources,
    summaryMetrics,
    isCalculated: monthlyResults.length > 0
  };
}; 