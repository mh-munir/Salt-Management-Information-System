export type BalanceSummary = {
  signedAmount: number;
  absoluteAmount: number;
  dueAmount: number;
  advanceAmount: number;
  isAdvance: boolean;
  isDue: boolean;
  isSettled: boolean;
};

export function getBalanceSummary(value: number): BalanceSummary {
  const signedAmount = Number.isFinite(value) ? value : 0;
  const absoluteAmount = Math.abs(signedAmount);
  const dueAmount = Math.max(signedAmount, 0);
  const advanceAmount = Math.max(-signedAmount, 0);

  return {
    signedAmount,
    absoluteAmount,
    dueAmount,
    advanceAmount,
    isAdvance: signedAmount < 0,
    isDue: signedAmount > 0,
    isSettled: signedAmount === 0,
  };
}
