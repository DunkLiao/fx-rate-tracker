import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Baseline rates relative to USD (1 USD = X Currency)
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

// In-memory cache for latest rates
let cachedRates: any = null;
let lastFetchedTime: number = 0;
const CACHE_DURATION_MS = 10 * 60 * 1000; // 10 minutes cache

// Helper to seed random generator for deterministic historical rates
function seededRandom(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(31, h) + seed.charCodeAt(i) | 0;
  }
  const x = Math.sin(h) * 10000;
  return x - Math.floor(x);
}

// Fetch exchange rates from free open API, or fallback to baselines
async function getLatestRates(): Promise<{ rates: Record<string, number>; source: string; date: string }> {
  const now = Date.now();
  if (cachedRates && (now - lastFetchedTime < CACHE_DURATION_MS)) {
    return { rates: cachedRates, source: 'cache', date: new Date(lastFetchedTime).toISOString().split('T')[0] };
  }

  try {
    // We use a free, robust open exchange rate API
    const response = await fetch('https://open.er-api.com/v6/latest/USD');
    if (!response.ok) {
      throw new Error(`API error: status ${response.status}`);
    }
    const data = await response.json();
    if (data && data.rates) {
      const rates: Record<string, number> = {};
      // Filter only our supported currencies to keep it clean and robust
      Object.keys(BASELINES).forEach(code => {
        rates[code] = data.rates[code] || BASELINES[code];
      });
      cachedRates = rates;
      lastFetchedTime = now;
      return { rates, source: 'api', date: data.time_last_update_utc ? new Date(data.time_last_update_utc).toISOString().split('T')[0] : new Date().toISOString().split('T')[0] };
    }
  } catch (error) {
    console.warn('Failed to fetch latest rates from open API, falling back to local baseline rates:', error);
  }

  // Fallback with tiny random fluctuation to simulate real-time feel
  const simulatedRates: Record<string, number> = {};
  const todayStr = new Date().toISOString().split('T')[0];
  Object.entries(BASELINES).forEach(([code, baseValue]) => {
    if (code === 'USD') {
      simulatedRates[code] = 1.0;
    } else {
      const driftSeed = `${code}-${todayStr}`;
      const drift = (seededRandom(driftSeed) - 0.5) * 0.005; // -0.25% to +0.25% drift
      simulatedRates[code] = Number((baseValue * (1 + drift)).toFixed(4));
    }
  });

  return { rates: simulatedRates, source: 'fallback', date: todayStr };
}

// 1. GET /api/rates
app.get('/api/rates', async (req, res) => {
  try {
    const { rates, source, date } = await getLatestRates();
    res.json({
      success: true,
      base: 'USD',
      date,
      rates,
      source,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 2. GET /api/history
// Query params: from, to, period ('1W' | '1M' | '1Y')
app.get('/api/history', async (req, res) => {
  try {
    const from = (req.query.from as string || 'USD').toUpperCase();
    const to = (req.query.to as string || 'TWD').toUpperCase();
    const period = (req.query.period as string || '1M').toUpperCase();

    if (!BASELINES[from] || !BASELINES[to]) {
      res.status(400).json({ success: false, error: 'Unsupported currency code' });
      return;
    }

    const { rates } = await getLatestRates();
    
    // Get current exchange rate for cross currency From -> To
    const currentRate = rates[to] / rates[from];

    // Determine number of days for chart
    let days = 30;
    if (period === '1W') days = 7;
    if (period === '1Y') days = 365;

    const dataPoints: any[] = [];
    const now = new Date();

    // Generate a deterministic curve based on dates
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dateStr = d.toISOString().split('T')[0];

      // Seed using the unique currency pair and date to ensure deterministic curves
      const seedBase = `${from}-${to}-${dateStr}`;
      
      // We simulate historical rate using a combination of sine wave macro cycles and random noise walk
      const macroWave1 = Math.sin(i / (days / 4)) * 0.035; // Short-medium wave
      const macroWave2 = Math.cos(i / (days / 1.5)) * 0.015; // Long wave
      const noise = (seededRandom(seedBase) - 0.5) * 0.01; // Daily noise

      const percentOffset = macroWave1 + macroWave2 + noise;
      const rate = currentRate * (1 + percentOffset);

      dataPoints.push({
        date: dateStr,
        rate: Number(rate.toFixed(4)),
        displayRate: rate.toFixed(4),
      });
    }

    // Calculate simple stats
    const values = dataPoints.map(dp => dp.rate);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const avg = values.reduce((sum, val) => sum + val, 0) / values.length;
    const firstRate = values[0];
    const lastRate = values[values.length - 1];
    const changePercent = ((lastRate - firstRate) / firstRate) * 100;

    res.json({
      success: true,
      from,
      to,
      period,
      data: dataPoints,
      stats: {
        max: Number(max.toFixed(4)),
        min: Number(min.toFixed(4)),
        avg: Number(avg.toFixed(4)),
        changePercent: Number(changePercent.toFixed(2)),
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Vite middleware setup or production static server
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
