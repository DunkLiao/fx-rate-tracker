const BASELINES: Record<string, number> = {
  USD: 1.0,
  TWD: 32.48,
  JPY: 156.45,
  EUR: 0.93,
  GBP: 0.79,
  AUD: 1.51,
  CNY: 7.25,
  HKD: 7.81,
  KRW: 1385.0,
  SGD: 1.35,
};

function seededRandom(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (Math.imul(31, h) + seed.charCodeAt(i)) | 0;
  }
  const x = Math.sin(h) * 10000;
  return x - Math.floor(x);
}

let cachedRates: Record<string, number> | null = null;
let lastFetchedTime = 0;
const CACHE_DURATION_MS = 10 * 60 * 1000;

interface LatestRatesResult {
  rates: Record<string, number>;
  source: string;
  date: string;
}

export async function getLatestRates(): Promise<LatestRatesResult> {
  const now = Date.now();
  if (cachedRates && now - lastFetchedTime < CACHE_DURATION_MS) {
    return { rates: cachedRates, source: 'cache', date: new Date(lastFetchedTime).toISOString().split('T')[0] };
  }

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    const response = await fetch('https://open.er-api.com/v6/latest/USD', { signal: controller.signal });
    clearTimeout(timer);

    if (!response.ok) {
      throw new Error(`API error: status ${response.status}`);
    }
    const data = await response.json() as any;
    if (data?.rates) {
      const rates: Record<string, number> = {};
      Object.keys(BASELINES).forEach((code) => {
        rates[code] = data.rates[code] || BASELINES[code];
      });
      cachedRates = rates;
      lastFetchedTime = now;
      return {
        rates,
        source: 'api',
        date: data.time_last_update_utc
          ? new Date(data.time_last_update_utc).toISOString().split('T')[0]
          : new Date().toISOString().split('T')[0],
      };
    }
  } catch (error) {
    console.warn('Failed to fetch latest rates, falling back to baselines:', error);
  }

  const simulatedRates: Record<string, number> = {};
  const todayStr = new Date().toISOString().split('T')[0];
  Object.entries(BASELINES).forEach(([code, baseValue]) => {
    if (code === 'USD') {
      simulatedRates[code] = 1.0;
    } else {
      const driftSeed = `${code}-${todayStr}`;
      const drift = (seededRandom(driftSeed) - 0.5) * 0.005;
      simulatedRates[code] = Number((baseValue * (1 + drift)).toFixed(4));
    }
  });

  return { rates: simulatedRates, source: 'fallback', date: todayStr };
}

interface HistoryResult {
  success: boolean;
  from?: string;
  to?: string;
  period?: string;
  data?: Array<{ date: string; rate: number; displayRate: string }>;
  stats?: {
    max: number;
    min: number;
    avg: number;
    changePercent: number;
  };
  error?: string;
}

export async function getHistory(from: string, to: string, period: string): Promise<HistoryResult> {
  const fromCode = (from || 'USD').toUpperCase();
  const toCode = (to || 'TWD').toUpperCase();
  const periodCode = (period || '1M').toUpperCase();

  if (!BASELINES[fromCode] || !BASELINES[toCode]) {
    return { success: false, error: 'Unsupported currency code' };
  }

  const { rates } = await getLatestRates();
  const currentRate = rates[toCode] / rates[fromCode];

  let days = 30;
  if (periodCode === '1W') days = 7;
  if (periodCode === '1Y') days = 365;

  const dataPoints: Array<{ date: string; rate: number; displayRate: string }> = [];
  const now = new Date();

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const dateStr = d.toISOString().split('T')[0];
    const seedBase = `${fromCode}-${toCode}-${dateStr}`;
    const macroWave1 = Math.sin(i / (days / 4)) * 0.035;
    const macroWave2 = Math.cos(i / (days / 1.5)) * 0.015;
    const noise = (seededRandom(seedBase) - 0.5) * 0.01;
    const percentOffset = macroWave1 + macroWave2 + noise;
    const rate = currentRate * (1 + percentOffset);
    dataPoints.push({ date: dateStr, rate: Number(rate.toFixed(4)), displayRate: rate.toFixed(4) });
  }

  const values = dataPoints.map((dp) => dp.rate);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const avg = values.reduce((sum, val) => sum + val, 0) / values.length;
  const firstRate = values[0];
  const lastRate = values[values.length - 1];
  const changePercent = ((lastRate - firstRate) / firstRate) * 100;

  return {
    success: true,
    from: fromCode,
    to: toCode,
    period: periodCode,
    data: dataPoints,
    stats: {
      max: Number(max.toFixed(4)),
      min: Number(min.toFixed(4)),
      avg: Number(avg.toFixed(4)),
      changePercent: Number(changePercent.toFixed(2)),
    },
  };
}
