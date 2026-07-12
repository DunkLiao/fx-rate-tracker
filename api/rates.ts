import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getLatestRates } from '../src/lib/ratesApi';

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  try {
    const data = await getLatestRates();
    res.status(200).json({ success: true, base: 'USD', ...data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
}