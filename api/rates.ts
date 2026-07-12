import type { VercelRequest, VercelResponse } from '@vercel/node';

const BASELINES: Record<string, number> = {
  USD: 1.0, TWD: 32.48, JPY: 156.45, EUR: 0.93, GBP: 0.79,
  AUD: 1.51, CNY: 7.25, HKD: 7.81, KRW: 1385.0, SGD: 1.35,
};

function seededRandom(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (Math.imul(31, h) + seed.charCodeAt(i)) | 0;
  }
  return Math.sin(h) * 10000 - Math.floor(Math.sin(h) * 10000);
}

let cachedRates: Record<string, number> | null = null;
let lastFetchedTime = 0;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  try {
    const now = Date.now();
    if (cachedRates && now - lastFetchedTime < 600_000) {
      return res.status(200).json({ success: true, base: 'USD', rates: cachedRates, source: 'cache', date: new Date(lastFetchedTime).toISOString().split('T')[0] });
    }

    let rates: Record<string, number>;
    let source: string;
    let date: string;

    try {
      const response = await fetch('https://open.er-api.com/v6/latest/USD');
      if (response.ok) {
        const data = await response.json() as any;
        if (data?.rates) {
          rates = {};
          Object.keys(BASELINES).forEach((code) => {
            rates[code] = data.rates[code] || BASELINES[code];
          });
          cachedRates = rates;
          lastFetchedTime = now;
          source = 'api';
          date = data.time_last_update_utc
            ? new Date(data.time_last_update_utc).toISOString().split('T')[0]
            : new Date().toISOString().split('T')[0];
          return res.status(200).json({ success: true, base: 'USD', rates, source, date });
        }
      }
    } catch {
      // fall through to fallback
    }

    // Fallback
    const todayStr = new Date().toISOString().split('T')[0];
    rates = {};
    Object.entries(BASELINES).forEach(([code, baseValue]) => {
      if (code === 'USD') {
        rates[code] = 1.0;
      } else {
        const drift = (seededRandom(`${code}-${todayStr}`) - 0.5) * 0.005;
        rates[code] = Number((baseValue * (1 + drift)).toFixed(4));
      }
    });

    return res.status(200).json({ success: true, base: 'USD', rates, source: 'fallback', date: todayStr });
  } catch (error: any) {
    console.error('[api/rates] error:', error);
    return res.status(500).json({ success: false, error: error?.message || String(error) });
  }
}
