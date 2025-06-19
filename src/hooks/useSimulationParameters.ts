import { useMemo } from 'react';
import type { SimulationParameters } from '@/types/calculations';

export const useSimulationParameters = (mortgageData?: any): SimulationParameters => {
  return useMemo(() => {
    const startDate = mortgageData?.first_installment_date 
      ? new Date(mortgageData.first_installment_date)
      : new Date(); // Today's date if no mortgage data
    
    const durationInYears = 25;
    const totalMonths = durationInYears * 12;
    
    return {
      startDate,
      durationInYears,
      totalMonths
    };
  }, [mortgageData]);
}; 