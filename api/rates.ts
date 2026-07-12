import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getLatestRates } from './_lib/rates';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  try {
    const data = await getLatestRates();
    return res.status(200).json({ success: true, base: 'USD', ...data });
  } catch (error: any) {
    console.error('[api/rates] error:', error);
    return res.status(500).json({ success: false, error: error?.message || String(error) });
  }
}
