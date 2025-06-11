import { useMemo } from "react";
import { MortgageBundle } from "@/hooks/useMortgageBundle";

/**
 * Returns extra installments relevant to the current scenario ('accelerated' or 'lower_payment').
 * @param bundle MortgageBundle object
 * @returns Array of { amount, start_date } where start_date is a Date object
 */
export function useExtraInstallmentsFromBundle(
  bundle: MortgageBundle | null | undefined
): { amount: number; start_date: Date }[] {
  return useMemo(() => {
    if (!bundle || !bundle.mortgage || !bundle.mortgage.saved_scenario) return [];
    const scenario = bundle.mortgage.saved_scenario;
    if (scenario !== 'accelerated' && scenario !== 'lower_payment') return [];
    if (!Array.isArray(bundle.extraInstallments)) return [];
    return bundle.extraInstallments
      .filter(ei =>
        typeof ei.amount === 'number' &&
        ei.start_date &&
        !isNaN(new Date(ei.start_date).getTime())
      )
      .map(ei => ({
        amount: ei.amount,
        start_date: new Date(ei.start_date + 'T12:00:00Z'),
      }));
  }, [bundle]);
}

export default useExtraInstallmentsFromBundle; 