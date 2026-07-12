import { getHistory } from '../src/lib/ratesApi';

export default async function handler(request: Request): Promise<Response> {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204 });
  }

  try {
    const url = new URL(request.url, 'https://localhost');
    const from = url.searchParams.get('from') || 'USD';
    const to = url.searchParams.get('to') || 'TWD';
    const period = url.searchParams.get('period') || '1M';
    const result = await getHistory(from, to, period);
    if (!result.success) {
      return new Response(JSON.stringify(result), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('[api/history] error:', error);
    return new Response(JSON.stringify({ success: false, error: error?.message || String(error) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
