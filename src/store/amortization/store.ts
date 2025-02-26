import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import type {
  BaseAmortizationValues,
  CalculationResults,
  Property
} from '../../services/amortization/types/common';
import type {
  Scenario,
  ScenarioState,
  ScenarioType
} from '../../services/amortization/types/scenarios';
import { LoanCalculator } from '../../services/amortization/calculations/loan';
import { ScenarioCalculator } from '../../services/amortization/calculations/scenarios';

interface AmortizationState {
  property: Property | null;
  baseValues: BaseAmortizationValues | null;
  scenarios: ScenarioState;
  calculationResults: Record<ScenarioType, CalculationResults> | null;
  isCalculating: boolean;
  error: string | null;
}

interface AmortizationActions {
  setProperty: (property: Property) => void;
  setBaseValues: (values: BaseAmortizationValues) => void;
  updateScenario: (type: ScenarioType, scenario: Scenario) => void;
  selectScenario: (type: ScenarioType) => void;
  calculateScenarios: () => void;
  resetCalculations: () => void;
  setError: (error: string | null) => void;
}

const initialScenarioState: ScenarioState = {
  selected: 'regular',
  regular: {
    type: 'regular',
    is_selected: true
  },
  accelerated: {
    type: 'accelerated',
    is_selected: false,
    extra_payments: []
  },
  lower_payment: {
    type: 'lower_payment',
    is_selected: false,
    extra_payments: []
  },
  new_rate: {
    type: 'new_rate',
    is_selected: false,
    rate_changes: []
  }
};

const useAmortizationStore = create<AmortizationState & AmortizationActions>()(
  devtools(
    persist(
      (set, get) => ({
        // State
        property: null,
        baseValues: null,
        scenarios: initialScenarioState,
        calculationResults: null,
        isCalculating: false,
        error: null,

        // Actions
        setProperty: (property) => {
          set({ property });
          get().calculateScenarios();
        },

        setBaseValues: (values) => {
          set({ baseValues: values });
          get().calculateScenarios();
        },

        updateScenario: (type, scenario) => {
          set((state) => ({
            scenarios: {
              ...state.scenarios,
              [type]: {
                ...scenario,
                is_selected: type === state.scenarios.selected
              }
            }
          }));
          get().calculateScenarios();
        },

        selectScenario: (type) => {
          set((state) => ({
            scenarios: {
              ...state.scenarios,
              selected: type,
              regular: {
                ...state.scenarios.regular,
                is_selected: type === 'regular'
              },
              accelerated: {
                ...state.scenarios.accelerated,
                is_selected: type === 'accelerated'
              },
              lower_payment: {
                ...state.scenarios.lower_payment,
                is_selected: type === 'lower_payment'
              },
              new_rate: {
                ...state.scenarios.new_rate,
                is_selected: type === 'new_rate'
              }
            }
          }));
        },

        calculateScenarios: () => {
          const { property, baseValues } = get();
          
          if (!property || !baseValues) {
            return;
          }

          set({ isCalculating: true, error: null });

          try {
            const scenarioCalculator = new ScenarioCalculator();
            const results = scenarioCalculator.generateAllScenarios(property, baseValues);
            
            set({ calculationResults: results });
          } catch (error) {
            set({ error: error instanceof Error ? error.message : 'An error occurred during calculation' });
          } finally {
            set({ isCalculating: false });
          }
        },

        resetCalculations: () => {
          set({
            scenarios: initialScenarioState,
            calculationResults: null,
            error: null
          });
        },

        setError: (error) => {
          set({ error });
        }
      }),
      {
        name: 'amortization-store',
        partialize: (state) => ({
          property: state.property,
          baseValues: state.baseValues,
          scenarios: state.scenarios
        })
      }
    )
  )
);

export default useAmortizationStore; 