import type { CalculationResults, ExtraPayment, RateChange } from '@/types/common';

export type ScenarioType = 'regular' | 'accelerated' | 'lower_payment' | 'new_rate';

export interface BaseScenario {
  type: ScenarioType;
  is_selected: boolean;
  calculation_results: CalculationResults | null;
}

export interface RegularScenario extends BaseScenario {
  type: 'regular';
}

export interface AcceleratedScenario extends BaseScenario {
  type: 'accelerated';
  extra_payments: ExtraPayment[];
}

export interface LowerPaymentScenario extends BaseScenario {
  type: 'lower_payment';
  extra_payments: ExtraPayment[];
}

export interface NewRateScenario extends BaseScenario {
  type: 'new_rate';
  rate_changes: RateChange[];
}

export type Scenario = 
  | RegularScenario 
  | AcceleratedScenario 
  | LowerPaymentScenario 
  | NewRateScenario;

export interface ScenarioState {
  selected_scenario: ScenarioType;
  scenarios: {
    regular: RegularScenario;
    accelerated: AcceleratedScenario;
    lower_payment: LowerPaymentScenario;
    new_rate: NewRateScenario;
  };
} 