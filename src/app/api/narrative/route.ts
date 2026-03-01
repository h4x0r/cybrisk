import { streamText, gateway } from 'ai';
import type { AssessmentInputs, SimulationResults } from '@/lib/types';
import type { Currency } from '@/lib/currency';
import { CURRENCY_SYMBOLS } from '@/lib/currency';

const MODEL = 'perplexity/sonar-pro';

const SYSTEM_PROMPT = `You are a senior cyber risk advisor writing a 3-4 sentence executive summary for a board audience. Be direct and financial. Cite the ALE figure in the user's selected currency, name the primary loss driver, and include one specific regulatory or industry context relevant to their geography and industry. Where relevant, reference a recent real-world breach or regulatory action to ground the figures. No jargon. No hedging. No bullet points. No em dashes. Plain prose only.`;

// Rate limiting (10 req/IP/min)
const RATE_LIMIT = 10;
const RATE_WINDOW_MS = 60_000;
const rateMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return true;
  }
  if (entry.count >= RATE_LIMIT) return false;
  entry.count++;
  return true;
}

function buildPrompt(
  inputs: AssessmentInputs,
  results: SimulationResults,
  currency: Currency,
): string {
  const sym = CURRENCY_SYMBOLS[currency];
  const aleMean = (results.ale.mean / 1_000_000).toFixed(2);
  const aleP95  = (results.ale.p95  / 1_000_000).toFixed(2);
  const glSpend = (results.gordonLoebSpend / 1_000).toFixed(0);

  return `Organisation profile:
- Industry: ${inputs.company.industry}
- Geography: ${inputs.company.geography}
- Revenue band: ${inputs.company.revenueBand}
- Controls: MFA=${inputs.controls.mfa}, SecurityTeam=${inputs.controls.securityTeam}, IRPlan=${inputs.controls.irPlan}
- Threat concerns: ${inputs.threats.topConcerns.join(', ')}

Simulation results (100,000 Monte Carlo trials):
- Annual Loss Expectancy (mean): ${sym}${aleMean}M
- 95th percentile (tail risk): ${sym}${aleP95}M
- Gordon-Loeb optimal security spend: ${sym}${glSpend}K/year
- Risk rating: ${results.riskRating}
- Primary driver: ${results.keyDrivers[0]?.factor ?? 'threat event frequency'}

Write the executive summary now.`;
}

export async function POST(req: Request) {
  const ip = req.headers.get('x-forwarded-for') ?? 'unknown';
  if (!checkRateLimit(ip)) {
    return new Response('Rate limit exceeded', { status: 429 });
  }

  const body = await req.json() as {
    inputs: AssessmentInputs;
    results: SimulationResults;
    currency: Currency;
  };

  const result = streamText({
    model: gateway(MODEL),
    system: SYSTEM_PROMPT,
    prompt: buildPrompt(body.inputs, body.results, body.currency),
    maxOutputTokens: 256,
  });

  return result.toTextStreamResponse();
}
