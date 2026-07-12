import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize Gemini SDK with telemetry header
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

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

// 3. POST /api/analyze
// Request body: AIAnalysisRequest
app.post('/api/analyze', async (req, res) => {
  try {
    const { from, to, period, currentRate, customQuestion } = req.body;

    if (!from || !to) {
      res.status(400).json({ success: false, error: 'Missing from or to currency' });
      return;
    }

    // Construct detailed instruction prompt
    let prompt = `你是一位資深的國際外匯市場分析師（使用繁體中文）。
請分析貨幣對 ${from} 到 ${to} 於時間區間「${period}」的匯率走勢（當前匯率為：${currentRate}）。
`;

    if (customQuestion) {
      prompt += `\n使用者特別提出了以下具體問題，請在回答中「優先且詳盡地」解答：\n「${customQuestion}」\n`;
    } else {
      prompt += `\n請提供一個客觀深入的分析，包含：
1. 該貨幣對的近期趨勢（上升、下跌或持平）與主要成因。
2. 影響這兩種貨幣的三個關鍵經濟因素（如利差、政策、通膨或地緣政治）。
3. 實用的換匯操作策略或時機點建議。
4. 預估的合理買進（支撐）與賣出（阻力）匯率區間。`;
    }

    prompt += `\n請嚴格按照以下 JSON Schema 格式進行回覆，不要包含 markdown 標籤或其餘雜訊，確保可以直接被 parse：`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: prompt,
      config: {
        systemInstruction: '你是一個專業、精準、口吻客觀的金融理財與外匯交易分析師，一律使用繁體中文（台灣口吻）回覆。請確保輸出的 JSON 格式絕對正確，且無任何前後 markdown 格式包裝。',
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: {
              type: Type.STRING,
              description: '關於走勢的繁體中文深度分析摘要。若使用者有提問，需包含解答。',
            },
            trend: {
              type: Type.STRING,
              description: '走勢判斷。必須為 "up" (上升), "down" (下跌) 或 "stable" (持平) 之一。',
            },
            factors: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: '影響此匯率走勢的 3 個關鍵經濟或事件因素。',
            },
            advice: {
              type: Type.STRING,
              description: '給使用者的實用換匯操作時機或資金分配建議。',
            },
            suggestedLevels: {
              type: Type.OBJECT,
              properties: {
                buy: { type: Type.NUMBER, description: '建議買進（支撐位）的參考匯率數值' },
                sell: { type: Type.NUMBER, description: '建議賣出（阻力位）的參考匯率數值' },
              },
              required: ['buy', 'sell'],
            },
            answer: {
              type: Type.STRING,
              description: '如果有 customQuestion，這裡填寫專門針對使用者問題的詳細解答；如果沒有，此欄位可以為空。',
            },
          },
          required: ['summary', 'trend', 'factors', 'advice', 'suggestedLevels'],
        },
      },
    });

    const text = response.text || '{}';
    const analysisData = JSON.parse(text);

    res.json({
      success: true,
      analysis: analysisData,
    });
  } catch (error: any) {
    console.error('Gemini API analysis failed:', error);
    res.status(500).json({
      success: false,
      error: 'AI 分析服務暫時無法使用：' + error.message,
    });
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
