
import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import { PaymentDetail } from '@/types/common'

export type ScenarioData = {
  total_interest_and_insurance: number
  total_months: number
  monthly_payment: number
  payment_schedule: PaymentDetail[]
}

export type ScenarioState = {
  selectedScenario: 'regular' | 'accelerated' | 'lower_payment' | 'new_rate'
  scenarios: {
    regular: ScenarioData | null
    accelerated: ScenarioData | null
    lower_payment: ScenarioData | null
    new_rate: ScenarioData | null
  }
}

interface AmortizationStore extends ScenarioState {
  setSelectedScenario: (scenario: 'regular' | 'accelerated' | 'lower_payment' | 'new_rate') => void
  setScenarioData: (
    scenario: 'regular' | 'accelerated' | 'lower_payment' | 'new_rate',
    data: ScenarioData
  ) => void
  resetScenarios: () => void
  getScenarioData: (scenario: 'regular' | 'accelerated' | 'lower_payment' | 'new_rate') => ScenarioData | null
}

const initialState: ScenarioState = {
  selectedScenario: 'regular',
  scenarios: {
    regular: null,
    accelerated: null,
    lower_payment: null,
    new_rate: null
  }
}

export const useAmortizationStore = create<AmortizationStore>()(
  devtools(
    (set, get) => ({
      ...initialState,

      setSelectedScenario: (scenario) => {
        set((state) => ({
          ...state,
          selectedScenario: scenario
        }))
      },

      setScenarioData: (scenario, data) => {
        set((state) => ({
          ...state,
          scenarios: {
            ...state.scenarios,
            [scenario]: data
          }
        }))
      },

      resetScenarios: () => {
        set((state) => ({
          ...state,
          scenarios: initialState.scenarios
        }))
      },

      getScenarioData: (scenario) => {
        return get().scenarios[scenario]
      }
    }),
    { name: 'amortization-store' }
  )
)
