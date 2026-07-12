export const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400',
};

export function applyCorsHeaders(res: {
  setHeader: (key: string, value: string) => void;
  status: (code: number) => any;
  end: () => void;
}): boolean {
  if (process.env.VERCEL === '1') {
    // Vercel routes will handle CORS headers via vercel.json configuration.
    // We don't set them here to avoid duplicate headers.
    return false;
  }
  Object.entries(CORS_HEADERS).forEach(([key, value]) => {
    res.setHeader(key, value);
  });
  return false;
}

export function handlePreflight(
  method: string | undefined,
  res: {
    setHeader: (key: string, value: string) => void;
    status: (code: number) => any;
    end: () => void;
  },
): boolean {
  if (method === 'OPTIONS') {
    applyCorsHeaders(res);
    res.status(204).end();
    return true;
  }
  applyCorsHeaders(res);
  return false;
}

// Fetch with timeout helper (defaults to 8s) to avoid hanging serverless functions
export async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs = 8000,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    return response;
  } finally {
    clearTimeout(timer);
  }
}