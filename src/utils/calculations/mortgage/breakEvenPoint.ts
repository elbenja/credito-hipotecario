// src/utils/calculations/mortgage/breakEvenPoint.ts
import type { PaymentRow } from "@/types/common";

/**
 * Find the breakeven point from payments data.
 * Returns the point in years where principal payments exceed interest+insurance payments.
 */
export function findBreakEvenPoint(payments: PaymentRow[]): number | null {
  if (!payments || payments.length === 0) return null;

  // Detect bi-weekly (14/year) if July & December payments exist
  const hasJuly = payments.some(p => new Date(p.payment_date).getMonth() === 6);
  const hasDec  = payments.some(p => new Date(p.payment_date).getMonth() === 11);
  const doublePay = hasJuly && hasDec;

  for (let i = 0; i < payments.length - 1; i++) {
    const cur = payments[i], next = payments[i+1];
    if (!cur.payment_date || !next.payment_date) continue;

    // Skip mid-year double months
    if (doublePay) {
      const m1 = new Date(cur.payment_date).getMonth();
      const m2 = new Date(next.payment_date).getMonth();
      if (m1 === 6 || m1 === 11 || m2 === 6 || m2 === 11) continue;
    }

    const principalCur = cur.principal ?? cur.capital ?? 0;
    const interestCur  = (cur.monthly_interest ?? cur.interest ?? 0)
                         + cur.property_insurance
                         + (cur.monthly_loan_insurance ?? cur.loan_insurance ?? 0);

    const principalNext = next.principal ?? next.capital ?? 0;
    const interestNext  = (next.monthly_interest ?? next.interest ?? 0)
                         + next.property_insurance
                         + (next.monthly_loan_insurance ?? next.loan_insurance ?? 0);

    // Crossing principal > interest
    if (principalCur <= interestCur && principalNext > interestNext) {
      return (i + 1) / 12;
    }
    if (principalCur >= interestCur) {
      return i / 12;
    }
  }

  return null;
}