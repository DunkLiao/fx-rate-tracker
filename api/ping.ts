import { BASELINES } from './shared/rates';

export default async function handler(req: any, res: any) {
  return res.status(200).json({ ok: true, count: Object.keys(BASELINES).length });
}
