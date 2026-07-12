export function calculateConvertedAmount(
  amount: number,
  fromCurrency: string,
  toCurrency: string,
  rates: Record<string, number>,
): number {
  const fromRate = rates[fromCurrency];
  const toRate = rates[toCurrency];

  if (!fromRate || !toRate) return 0;

  return Number(((amount * toRate) / fromRate).toFixed(4));
}

export function calculatePairRate(
  fromCurrency: string,
  toCurrency: string,
  rates: Record<string, number>,
): number {
  const fromRate = rates[fromCurrency];
  const toRate = rates[toCurrency];

  if (!fromRate || !toRate) return 0;

  return Number((toRate / fromRate).toFixed(4));
}
