import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getLatestRates } from '../src/lib/ratesApi';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  try {
    const data = await getLatestRates();
    res.setHeader('Content-Type', 'application/json');
    res.status(200).json({ success: true, base: 'USD', ...data });
  } catch (error: any) {
    console.error('[api/rates] error:', error);
    res.status(500).json({ success: false, error: error?.message || String(error) });
  }
}