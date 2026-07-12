import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getHistory } from './_lib/rates';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  try {
    const from = (req.query.from as string) || 'USD';
    const to = (req.query.to as string) || 'TWD';
    const period = (req.query.period as string) || '1M';
    const result = await getHistory(from, to, period);
    if (!result.success) {
      return res.status(400).json(result);
    }
    return res.status(200).json(result);
  } catch (error: any) {
    console.error('[api/history] error:', error);
    return res.status(500).json({ success: false, error: error?.message || String(error) });
  }
}
