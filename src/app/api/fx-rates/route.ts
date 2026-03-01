import { parseYahooFxResponse, FALLBACK_RATES } from '@/lib/currency';
import type { Currency } from '@/lib/currency';

// Revalidate every hour (Next.js ISR-style caching for Route Handlers)
export const revalidate = 3600;

const YAHOO_URL =
  'https://query1.finance.yahoo.com/v7/finance/quote?symbols=GBPUSD%3DX,EURUSD%3DX,USDHKD%3DX,USDSGD%3DX';

export async function GET() {
  try {
    const res = await fetch(YAHOO_URL, {
      next: { revalidate: 3600 },
      headers: { 'User-Agent': 'Mozilla/5.0' },
    });

    if (!res.ok) {
      return Response.json(FALLBACK_RATES);
    }

    const json = await res.json();
    const rates: Record<Currency, number> = parseYahooFxResponse(json);
    return Response.json(rates);
  } catch {
    return Response.json(FALLBACK_RATES);
  }
}
