
import { useCallback, useEffect } from 'react'
import { useAmortizationStore } from '@/store/-amortization/store'
import { AmortizationBaseValues, Property } from '@/services/amortization/types/common'

// Define the store shape for type safety
interface AmortizationStoreType {
  setProperty: (property: Property) => void
  setBaseValues: (values: AmortizationBaseValues) => void
  calculateScenarios: () => void
  isCalculating: boolean
  error: string | null
  calculationResults: any
}

export function useLiveCalculation() {
  // Cast the store to have the expected properties
  const store = useAmortizationStore() as unknown as AmortizationStoreType
  
  const {
    setProperty,
    setBaseValues,
    calculateScenarios,
    isCalculating,
    error,
    calculationResults
  } = store

  const updatePropertyDetails = useCallback((property: Property) => {
    setProperty(property)
  }, [setProperty])

  const updateLoanDetails = useCallback((values: AmortizationBaseValues) => {
    setBaseValues(values)
  }, [setBaseValues])

  useEffect(() => {
    calculateScenarios()
  }, [calculateScenarios])

  return {
    updatePropertyDetails,
    updateLoanDetails,
    isCalculating,
    error,
    results: calculationResults
  }
}
