import type { CurrencyInfo } from '../types';

export function formatCurrencyOptionLabel(currency: CurrencyInfo): string {
  return `${currency.code} (${currency.name})`;
}
