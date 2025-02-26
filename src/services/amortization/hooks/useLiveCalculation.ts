import { useCallback, useEffect, useRef } from 'react';
import useAmortizationStore from '../../../store/amortization/store';
import type { BaseAmortizationValues, Property } from '../types/common';

interface UseLiveCalculationProps {
  property?: Property | null;
  baseValues?: BaseAmortizationValues | null;
  debounceMs?: number;
}

export const useLiveCalculation = ({
  property,
  baseValues,
  debounceMs = 500
}: UseLiveCalculationProps = {}) => {
  const debounceTimer = useRef<NodeJS.Timeout>();
  const {
    setProperty,
    setBaseValues,
    calculateScenarios,
    isCalculating,
    error,
    calculationResults
  } = useAmortizationStore();

  const debouncedCalculate = useCallback(() => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    debounceTimer.current = setTimeout(() => {
      calculateScenarios();
    }, debounceMs);
  }, [calculateScenarios, debounceMs]);

  useEffect(() => {
    if (property) {
      setProperty(property);
    }
  }, [property, setProperty]);

  useEffect(() => {
    if (baseValues) {
      setBaseValues(baseValues);
    }
  }, [baseValues, setBaseValues]);

  useEffect(() => {
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, []);

  return {
    isCalculating,
    error,
    calculationResults,
    debouncedCalculate
  };
}; 