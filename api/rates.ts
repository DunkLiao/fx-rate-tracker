import { getLatestRates } from '../src/lib/ratesApi';

export function OPTIONS() {
  return new Response(null, { status: 204 });
}

export async function GET() {
  try {
    const data = await getLatestRates();
    return new Response(JSON.stringify({ success: true, base: 'USD', ...data }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('[api/rates] error:', error);
    return new Response(JSON.stringify({ success: false, error: error?.message || String(error) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
