import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { simulate } from '@/lib/monte-carlo';

// ---------------------------------------------------------------------------
// Zod schema — mirrors src/lib/types.ts AssessmentInputs
// ---------------------------------------------------------------------------
const IndustrySchema = z.enum([
  'healthcare', 'financial', 'pharmaceuticals', 'technology', 'energy',
  'industrial', 'services', 'retail', 'education', 'entertainment',
  'communications', 'consumer', 'media', 'research', 'transportation',
  'hospitality', 'public_sector',
]);

const RevenueBandSchema = z.enum([
  'under_50m', '50m_250m', '250m_1b', '1b_5b', 'over_5b',
]);

const EmployeeCountSchema = z.enum([
  'under_250', '250_1000', '1000_5000', '5000_25000', 'over_25000',
]);

const GeographySchema = z.enum(['us', 'uk', 'eu', 'hk', 'sg', 'other']);

const DataTypeSchema = z.enum([
  'customer_pii', 'employee_pii', 'payment_card', 'health_records', 'ip', 'financial',
]);

const ThreatTypeSchema = z.enum([
  'ransomware', 'bec_phishing', 'insider_threat', 'third_party',
  'web_app_attack', 'system_intrusion', 'lost_stolen',
]);

const AssessmentInputsSchema = z.object({
  company: z.object({
    organizationName: z.string().optional(),
    industry: IndustrySchema,
    revenueBand: RevenueBandSchema,
    employees: EmployeeCountSchema,
    geography: GeographySchema,
  }),
  data: z.object({
    dataTypes: z.array(DataTypeSchema).min(1, 'At least one data type required'),
    recordCount: z.number().int().positive().max(1_000_000_000),
    cloudPercentage: z.number().min(0).max(100),
  }),
  controls: z.object({
    securityTeam: z.boolean(),
    irPlan: z.boolean(),
    aiAutomation: z.boolean(),
    mfa: z.boolean(),
    pentest: z.boolean(),
    cyberInsurance: z.boolean(),
  }),
  threats: z.object({
    topConcerns: z.array(ThreatTypeSchema).min(1, 'At least one threat concern required'),
    previousIncidents: z.enum(['0', '1', '2_5', '5_plus']),
  }),
});

// ---------------------------------------------------------------------------
// Simple in-memory rate limiter: 10 req / IP / 60s
// ---------------------------------------------------------------------------
const RATE_LIMIT = 10;
const RATE_WINDOW_MS = 60_000;
const rateMap = new Map<string, { count: number; resetAt: number }>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return false;
  }
  if (entry.count >= RATE_LIMIT) return true;
  entry.count++;
  return false;
}

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
    req.headers.get('x-real-ip') ??
    'unknown'
  );
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------
export async function POST(request: NextRequest) {
  const ip = getClientIp(request);

  if (isRateLimited(ip)) {
    return NextResponse.json(
      { error: 'Rate limit exceeded. Max 10 requests per minute.' },
      { status: 429 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = AssessmentInputsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: 'Validation failed',
        fieldErrors: parsed.error.flatten().fieldErrors,
      },
      { status: 400 },
    );
  }

  try {
    const results = simulate(parsed.data);
    const { rawLosses, ...clientResults } = results;
    return NextResponse.json(clientResults);
  } catch {
    return NextResponse.json({ error: 'Simulation failed' }, { status: 500 });
  }
}
