export interface CurrencyInfo {
  code: string;
  name: string;
  symbol: string;
  flag: string;
  locale: string;
}

export const SUPPORTED_CURRENCIES: Record<string, CurrencyInfo> = {
  TWD: { code: 'TWD', name: '新台幣', symbol: 'NT$', flag: '🇹🇼', locale: 'zh-TW' },
  USD: { code: 'USD', name: '美金', symbol: '$', flag: '🇺🇸', locale: 'en-US' },
  JPY: { code: 'JPY', name: '日圓', symbol: '¥', flag: '🇯🇵', locale: 'ja-JP' },
  EUR: { code: 'EUR', name: '歐元', symbol: '€', flag: '🇪🇺', locale: 'de-DE' },
  GBP: { code: 'GBP', name: '英鎊', symbol: '£', flag: '🇬🇧', locale: 'en-GB' },
  AUD: { code: 'AUD', name: '澳幣', symbol: 'A$', flag: '🇦🇺', locale: 'en-AU' },
  CNY: { code: 'CNY', name: '人民幣', symbol: '¥', flag: '🇨🇳', locale: 'zh-CN' },
  HKD: { code: 'HKD', name: '港幣', symbol: 'HK$', flag: '🇭🇰', locale: 'zh-HK' },
  KRW: { code: 'KRW', name: '韓元', symbol: '₩', flag: '🇰🇷', locale: 'ko-KR' },
  SGD: { code: 'SGD', name: '新加坡幣', symbol: 'S$', flag: '🇸🇬', locale: 'en-SG' },
};

export interface ExchangeRates {
  base: string;
  date: string;
  rates: Record<string, number>;
}

export interface HistoricalDataPoint {
  date: string;
  rate: number;
  displayRate: string;
}

export interface HistoricalRatesResponse {
  from: string;
  to: string;
  period: string; // '1W' | '1M' | '1Y'
  data: HistoricalDataPoint[];
  stats: {
    max: number;
    min: number;
    avg: number;
    changePercent: number;
  };
}

export interface ConversionRecord {
  id: string;
  timestamp: number;
  fromCurrency: string;
  toCurrency: string;
  fromAmount: number;
  toAmount: number;
  rate: number;
}

export interface AlertThreshold {
  id: string;
  fromCurrency: string;
  toCurrency: string;
  targetRate: number;
  condition: 'above' | 'below';
  isTriggered: boolean;
  createdAt: number;
}
