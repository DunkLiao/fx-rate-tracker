import { getLatestRates } from './shared/rates';

export default async function handler(req: any, res: any) {
  const data = await getLatestRates();
  return res.status(200).json({ ok: true, count: Object.keys(data.rates).length, source: data.source });
}
