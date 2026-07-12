import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getLatestRates } from '../src/lib/ratesApi';
import { handlePreflight } from '../src/lib/cors';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handlePreflight(req.method, res)) return;
  try {
    const data = await getLatestRates();
    res.status(200).json({ success: true, base: 'USD', ...data });
  } catch (error: any) {
    console.error('[api/rates] error:', error);
    res.status(500).json({ success: false, error: error?.message || String(error) });
  }
}