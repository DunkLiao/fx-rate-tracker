import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import { getLatestRates, getHistory } from './src/lib/ratesApi';
import { CORS_HEADERS } from './src/lib/cors';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// CORS: allow all origins (frontend and API share same origin in prod, this is defensive)
app.use((req, res, next) => {
  Object.entries(CORS_HEADERS).forEach(([key, value]) => res.setHeader(key, value));
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }
  next();
});

// 1. GET /api/rates
app.get('/api/rates', async (_req, res) => {
  try {
    const data = await getLatestRates();
    res.json({ success: true, base: 'USD', ...data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 2. GET /api/history
// Query params: from, to, period ('1W' | '1M' | '1Y')
app.get('/api/history', async (req, res) => {
  try {
    const from = (req.query.from as string) || 'USD';
    const to = (req.query.to as string) || 'TWD';
    const period = (req.query.period as string) || '1M';
    const result = await getHistory(from, to, period);
    if (!result.success) {
      res.status(400).json(result);
    } else {
      res.json(result);
    }
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