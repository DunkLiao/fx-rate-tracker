import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getHistory } from '../src/lib/ratesApi';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  try {
    const from = (req.query.from as string) || 'USD';
    const to = (req.query.to as string) || 'TWD';
    const period = (req.query.period as string) || '1M';
    const result = await getHistory(from, to, period);
    if (!result.success) {
      res.status(400).json(result);
    } else {
      res.setHeader('Content-Type', 'application/json');
      res.status(200).json(result);
    }
  } catch (error: any) {
    console.error('[api/history] error:', error);
    res.status(500).json({ success: false, error: error?.message || String(error) });
  }
}