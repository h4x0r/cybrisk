# CybRisk Enhancements Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add AI executive narrative, live FX currency localisation, assessment history, email delivery via Resend, and lead capture via Turso.

**Architecture:** TDD for all pure logic (currency utils, history utils — 16 new tests, 196 total). UI components are presentational only (TypeScript + build verification). Server-side DOCX for email uses `Packer.toBuffer()` with text/tables only (no Canvas — browser-only chart rendering stays in `downloadReport()`). Narrative streams via Vercel AI Gateway using `streamText` from the `ai` SDK with `perplexity/sonar-pro` — OIDC auth is automatic on Vercel, no API key required. Turso stores leads. Resend sends email.

**Tech Stack:** Vitest, resend, @libsql/client, ai (Vercel AI SDK), Next.js App Router API routes, localStorage, react-simple-maps (already installed). No BYOK — Vercel handles auth automatically via OIDC on deployment.

---

## Pre-flight

```bash
cd /Users/4n6h4x0r/src/cybrisk
npx vitest run
```

Expected: **180 passed**. If not, stop and fix before proceeding.

---

## Task 1: Install new dependencies

**Files:** `package.json`, `package-lock.json`

**Step 1: Install**

```bash
cd /Users/4n6h4x0r/src/cybrisk
npm install resend @libsql/client ai
```

**Step 2: Verify**

```bash
node -e "require('resend'); require('@libsql/client'); require('ai'); console.log('ok')"
```

Expected: `ok`

**Step 3: Run tests to confirm nothing broke**

```bash
npx vitest run
```

Expected: **180 passed**

**Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add resend, @libsql/client, ai (Vercel AI SDK)"
```

---

## Task 2: Write failing tests for `currency.ts`

**Files:**
- Create: `src/__tests__/currency.test.ts`

**Step 1: Write the failing tests**

Create `src/__tests__/currency.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import {
  convertAmount,
  parseYahooFxResponse,
  formatCurrency,
  FALLBACK_RATES,
} from '@/lib/currency';

const TEST_RATES = { USD: 1.00, GBP: 0.79, EUR: 0.92, HKD: 7.78, SGD: 1.35 };

describe('currency utils', () => {
  describe('convertAmount()', () => {
    it('returns same amount for USD', () => {
      expect(convertAmount(1_000_000, 'USD', TEST_RATES)).toBe(1_000_000);
    });

    it('converts USD to GBP', () => {
      expect(convertAmount(1_000_000, 'GBP', TEST_RATES)).toBeCloseTo(790_000, -2);
    });

    it('converts USD to HKD', () => {
      expect(convertAmount(1_000_000, 'HKD', TEST_RATES)).toBeCloseTo(7_780_000, -2);
    });
  });

  describe('parseYahooFxResponse()', () => {
    it('returns FALLBACK_RATES for null input', () => {
      expect(parseYahooFxResponse(null)).toEqual(FALLBACK_RATES);
    });

    it('returns FALLBACK_RATES for malformed input', () => {
      expect(parseYahooFxResponse({ foo: 'bar' })).toEqual(FALLBACK_RATES);
    });

    it('parses a valid Yahoo Finance v7 quote response', () => {
      const fixture = {
        quoteResponse: {
          result: [
            { symbol: 'GBPUSD=X', regularMarketPrice: 1.27 },
            { symbol: 'EURUSD=X', regularMarketPrice: 1.09 },
            { symbol: 'USDHKD=X', regularMarketPrice: 7.82 },
            { symbol: 'USDSGD=X', regularMarketPrice: 1.34 },
          ],
        },
      };
      const rates = parseYahooFxResponse(fixture);
      // GBPUSD=X: 1 GBP = 1.27 USD → GBP rate = 1/1.27 ≈ 0.787
      expect(rates.GBP).toBeCloseTo(1 / 1.27, 3);
      expect(rates.EUR).toBeCloseTo(1 / 1.09, 3);
      expect(rates.HKD).toBeCloseTo(7.82, 2);
      expect(rates.SGD).toBeCloseTo(1.34, 2);
      expect(rates.USD).toBe(1);
    });
  });

  describe('formatCurrency()', () => {
    it('formats USD millions with $ symbol', () => {
      expect(formatCurrency(2_400_000, 'USD', TEST_RATES)).toBe('$2.40M');
    });

    it('formats GBP with £ symbol', () => {
      const result = formatCurrency(2_400_000, 'GBP', TEST_RATES);
      expect(result.startsWith('£')).toBe(true);
    });

    it('formats HKD with HK$ symbol', () => {
      const result = formatCurrency(2_400_000, 'HKD', TEST_RATES);
      expect(result.startsWith('HK$')).toBe(true);
    });
  });
});
```

**Step 2: Run to verify they fail**

```bash
npx vitest run src/__tests__/currency.test.ts
```

Expected: FAIL — `Cannot find module '@/lib/currency'`

---

## Task 3: Implement `currency.ts`

**Files:**
- Create: `src/lib/currency.ts`

**Step 1: Write the implementation**

```typescript
/**
 * Currency conversion utilities for CybRisk results page.
 * FX rates sourced from Yahoo Finance (live) with hardcoded fallback.
 *
 * Yahoo Finance symbols used:
 *   GBPUSD=X  → regularMarketPrice = USD per 1 GBP  → GBP rate = 1/price
 *   EURUSD=X  → regularMarketPrice = USD per 1 EUR  → EUR rate = 1/price
 *   USDHKD=X  → regularMarketPrice = HKD per 1 USD  → HKD rate = price
 *   USDSGD=X  → regularMarketPrice = SGD per 1 USD  → SGD rate = price
 */

export type Currency = 'USD' | 'GBP' | 'EUR' | 'HKD' | 'SGD';

export const FALLBACK_RATES: Record<Currency, number> = {
  USD: 1.00,
  GBP: 0.79,
  EUR: 0.92,
  HKD: 7.78,
  SGD: 1.35,
};

export const CURRENCY_SYMBOLS: Record<Currency, string> = {
  USD: '$',
  GBP: '£',
  EUR: '€',
  HKD: 'HK$',
  SGD: 'S$',
};

/** Convert a USD amount to the target currency using the provided rates. */
export function convertAmount(
  usd: number,
  currency: Currency,
  rates: Record<Currency, number>,
): number {
  return usd * rates[currency];
}

/** Parse Yahoo Finance v7 /quote response into a rates Record. Returns FALLBACK_RATES on any error. */
export function parseYahooFxResponse(json: unknown): Record<Currency, number> {
  try {
    const results = (json as { quoteResponse?: { result?: unknown[] } })
      ?.quoteResponse?.result;
    if (!Array.isArray(results) || results.length === 0) return { ...FALLBACK_RATES };

    const rates: Record<Currency, number> = { ...FALLBACK_RATES };

    for (const item of results) {
      const r = item as { symbol?: string; regularMarketPrice?: number };
      if (typeof r.regularMarketPrice !== 'number') continue;
      const price = r.regularMarketPrice;
      switch (r.symbol) {
        case 'GBPUSD=X': rates.GBP = 1 / price; break;
        case 'EURUSD=X': rates.EUR = 1 / price; break;
        case 'USDHKD=X': rates.HKD = price;     break;
        case 'USDSGD=X': rates.SGD = price;      break;
      }
    }
    return rates;
  } catch {
    return { ...FALLBACK_RATES };
  }
}

/** Format a USD amount as a currency string (e.g. "$2.40M", "£1.90M", "HK$18.67M"). */
export function formatCurrency(
  usd: number,
  currency: Currency,
  rates: Record<Currency, number>,
): string {
  const converted = convertAmount(usd, currency, rates);
  const symbol = CURRENCY_SYMBOLS[currency];
  const abs = Math.abs(converted);
  if (abs >= 1_000_000) return `${symbol}${(converted / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000)     return `${symbol}${(converted / 1_000).toFixed(1)}K`;
  return `${symbol}${converted.toFixed(0)}`;
}
```

**Step 2: Run currency tests**

```bash
npx vitest run src/__tests__/currency.test.ts
```

Expected: **8 passed**

**Step 3: Run full suite**

```bash
npx vitest run
```

Expected: **188 passed**

**Step 4: Commit**

```bash
git add src/__tests__/currency.test.ts src/lib/currency.ts
git commit -m "feat(utils): add currency module with TDD (Yahoo Finance FX + fallback)"
```

---

## Task 4: Write failing tests for `history-utils.ts`

**Files:**
- Create: `src/__tests__/history-utils.test.ts`

**Step 1: Write the failing tests**

Create `src/__tests__/history-utils.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { saveToHistory, loadHistory, deleteFromHistory } from '@/lib/history-utils';

// In-memory mock for localStorage (no jsdom needed)
function makeMockStorage(): Storage {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
    key: () => null,
    length: 0,
  };
}

const SAMPLE_ENTRY = {
  label: 'financial · us',
  inputs: { company: { industry: 'financial', geography: 'us', revenue: '50m_100m', organizationName: 'Acme' }, data: { recordCount: 10000, dataClassification: 'pii', cloudPercentage: 50 }, controls: { mfa: true, edr: false, encryptionAtRest: true, waf: false, backups: true, patchCadence: 'monthly', soc: false, pentest: false }, threats: { insiderThreat: false, nationState: false, supplyChain: false, ransomwareTarget: false } },
  results: { ale: { mean: 2_400_000, p95: 6_100_000, p99: 9_800_000 }, riskRating: 'HIGH', gordonLoebSpend: 240_000, keyDrivers: [], recommendations: [], distributionBuckets: [], exceedanceCurve: [], industryBenchmark: { yourAle: 2_400_000, industryMedian: 4_000_000, percentileRank: 40 }, rawLosses: [] },
  currency: 'USD' as const,
};

describe('history-utils', () => {
  let storage: Storage;

  beforeEach(() => {
    storage = makeMockStorage();
  });

  it('loadHistory returns [] when storage is empty', () => {
    expect(loadHistory(storage)).toEqual([]);
  });

  it('saveToHistory adds an entry', () => {
    saveToHistory(SAMPLE_ENTRY, storage);
    expect(loadHistory(storage)).toHaveLength(1);
  });

  it('saveToHistory auto-assigns id and savedAt', () => {
    saveToHistory(SAMPLE_ENTRY, storage);
    const entries = loadHistory(storage);
    expect(typeof entries[0].id).toBe('string');
    expect(entries[0].id.length).toBeGreaterThan(0);
    expect(typeof entries[0].savedAt).toBe('string');
  });

  it('loadHistory returns entries newest first', () => {
    saveToHistory(SAMPLE_ENTRY, storage);
    saveToHistory({ ...SAMPLE_ENTRY, label: 'healthcare · uk' }, storage);
    const entries = loadHistory(storage);
    expect(entries[0].label).toBe('healthcare · uk');
    expect(entries[1].label).toBe('financial · us');
  });

  it('saveToHistory caps at 20 entries', () => {
    for (let i = 0; i < 25; i++) {
      saveToHistory({ ...SAMPLE_ENTRY, label: `entry-${i}` }, storage);
    }
    expect(loadHistory(storage)).toHaveLength(20);
  });

  it('saveToHistory deduplicates identical inputs within 24h', () => {
    saveToHistory(SAMPLE_ENTRY, storage);
    saveToHistory(SAMPLE_ENTRY, storage);
    expect(loadHistory(storage)).toHaveLength(1);
  });

  it('deleteFromHistory removes the correct entry', () => {
    saveToHistory(SAMPLE_ENTRY, storage);
    saveToHistory({ ...SAMPLE_ENTRY, label: 'other' }, storage);
    const before = loadHistory(storage);
    deleteFromHistory(before[1].id, storage);
    const after = loadHistory(storage);
    expect(after).toHaveLength(1);
    expect(after[0].label).toBe('other');
  });

  it('deleteFromHistory leaves other entries intact', () => {
    saveToHistory(SAMPLE_ENTRY, storage);
    const entries = loadHistory(storage);
    deleteFromHistory('nonexistent-id', storage);
    expect(loadHistory(storage)).toHaveLength(1);
    expect(loadHistory(storage)[0].id).toBe(entries[0].id);
  });
});
```

**Step 2: Run to verify they fail**

```bash
npx vitest run src/__tests__/history-utils.test.ts
```

Expected: FAIL — `Cannot find module '@/lib/history-utils'`

---

## Task 5: Implement `history-utils.ts`

**Files:**
- Create: `src/lib/history-utils.ts`

**Step 1: Write the implementation**

```typescript
import type { AssessmentInputs, SimulationResults } from '@/lib/types';
import type { Currency } from '@/lib/currency';

const STORAGE_KEY = 'cybrisk_history';
const MAX_ENTRIES = 20;
const DEDUP_WINDOW_MS = 24 * 60 * 60 * 1000;

export interface HistoryEntry {
  id: string;
  savedAt: string;       // ISO 8601
  label: string;
  inputs: AssessmentInputs;
  results: SimulationResults;
  currency: Currency;
}

type HistoryInput = Omit<HistoryEntry, 'id' | 'savedAt'>;

function getStorage(storage?: Storage): Storage {
  return storage ?? (typeof window !== 'undefined' ? localStorage : makeFallback());
}

function makeFallback(): Storage {
  const store: Record<string, string> = {};
  return {
    getItem: (k) => store[k] ?? null,
    setItem: (k, v) => { store[k] = v; },
    removeItem: (k) => { delete store[k]; },
    clear: () => { Object.keys(store).forEach(k => delete store[k]); },
    key: () => null,
    length: 0,
  };
}

export function loadHistory(storage?: Storage): HistoryEntry[] {
  try {
    const raw = getStorage(storage).getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as HistoryEntry[];
  } catch {
    return [];
  }
}

function persist(entries: HistoryEntry[], storage?: Storage): void {
  getStorage(storage).setItem(STORAGE_KEY, JSON.stringify(entries));
}

export function saveToHistory(entry: HistoryInput, storage?: Storage): void {
  const existing = loadHistory(storage);
  const inputsKey = JSON.stringify(entry.inputs);
  const now = Date.now();

  // Deduplication: skip if identical inputs exist within 24h
  const isDuplicate = existing.some(
    (e) =>
      JSON.stringify(e.inputs) === inputsKey &&
      now - new Date(e.savedAt).getTime() < DEDUP_WINDOW_MS,
  );
  if (isDuplicate) return;

  const newEntry: HistoryEntry = {
    ...entry,
    id: crypto.randomUUID(),
    savedAt: new Date().toISOString(),
  };

  // Newest first, cap at MAX_ENTRIES
  const updated = [newEntry, ...existing].slice(0, MAX_ENTRIES);
  persist(updated, storage);
}

export function deleteFromHistory(id: string, storage?: Storage): void {
  const entries = loadHistory(storage);
  persist(entries.filter((e) => e.id !== id), storage);
}
```

**Step 2: Run history-utils tests**

```bash
npx vitest run src/__tests__/history-utils.test.ts
```

Expected: **8 passed**

**Step 3: Run full suite**

```bash
npx vitest run
```

Expected: **196 passed**

**Step 4: Commit**

```bash
git add src/__tests__/history-utils.test.ts src/lib/history-utils.ts
git commit -m "feat(utils): add history-utils module with TDD (localStorage, dedup, 20-cap)"
```

---

## Task 6: Implement `GET /api/fx-rates`

**Files:**
- Create: `src/app/api/fx-rates/route.ts`

**Step 1: Write the route**

```typescript
import { NextResponse } from 'next/server';
import { parseYahooFxResponse, FALLBACK_RATES } from '@/lib/currency';

const YAHOO_URL =
  'https://query1.finance.yahoo.com/v7/finance/quote?symbols=GBPUSD=X,EURUSD=X,USDHKD=X,USDSGD=X';

export const revalidate = 3600; // cache 1 hour

export async function GET() {
  try {
    const res = await fetch(YAHOO_URL, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      next: { revalidate: 3600 },
    });
    if (!res.ok) throw new Error(`Yahoo Finance responded ${res.status}`);
    const json = await res.json();
    const rates = parseYahooFxResponse(json);
    return NextResponse.json({ rates });
  } catch {
    return NextResponse.json({ rates: FALLBACK_RATES });
  }
}
```

**Step 2: Type-check**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: no new errors

**Step 3: Run tests**

```bash
npx vitest run
```

Expected: **196 passed**

**Step 4: Commit**

```bash
git add src/app/api/fx-rates/route.ts
git commit -m "feat(api): add /api/fx-rates with Yahoo Finance + fallback"
```

---

## Task 7: Add `generateReportBuffer()` to `docx-report.ts`

**Files:**
- Modify: `src/lib/docx-report.ts`

The existing `downloadReport()` uses browser Canvas for charts — it cannot run server-side. `generateReportBuffer()` is a Node-safe version that uses `Packer.toBuffer()` and omits chart images.

**Step 1: Add the export at the bottom of `src/lib/docx-report.ts`**

Find the end of the file (after `downloadReport`) and add:

```typescript
/**
 * Server-safe report generator — returns a DOCX Buffer with all text/tables
 * but no canvas-rendered chart images. Used by the email delivery API route.
 */
export async function generateReportBuffer(
  inputs: AssessmentInputs,
  results: SimulationResults,
  narrative?: string,
): Promise<Buffer> {
  // Pass empty chart images — buildDocument gracefully handles missing image data
  // by skipping the image paragraphs (ImageRun with undefined src is omitted).
  const emptyCharts: ChartImages = {
    distribution: new Uint8Array(0),
    exceedance:   new Uint8Array(0),
    surface:      new Uint8Array(0),
    benchmark:    new Uint8Array(0),
  };

  const doc = buildDocument(inputs, results, emptyCharts, narrative);
  const buffer = await Packer.toBuffer(doc);
  return Buffer.from(buffer);
}
```

**Note on `buildDocument` signature:** You must also update the `buildDocument` function signature to accept an optional `narrative?: string` parameter and render it as the first paragraph after the title if provided. Find `function buildDocument(` (line ~890) and:

1. Add `narrative?: string` as the fourth parameter
2. After the title section (look for the first `sections` content block), add:

```typescript
...(narrative ? [
  new Paragraph({
    children: [new TextRun({ text: narrative, size: 22, color: '334155' })],
    spacing: { after: 300 },
  }),
] : []),
```

**Step 2: Type-check**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: no new errors (if `ChartImages` members are `Uint8Array`, the empty arrays will type-check; if they are typed as `string | Buffer`, adjust accordingly — check the interface definition at line ~883)

**Step 3: Run tests**

```bash
npx vitest run
```

Expected: **196 passed**

**Step 4: Commit**

```bash
git add src/lib/docx-report.ts
git commit -m "feat(docx): add generateReportBuffer() for server-side email delivery"
```

---

## Task 8: Set up Turso

**This task is manual configuration — no code files.**

**Step 1: Create the leads table**

In the Turso dashboard or CLI, run against your existing database:

```sql
CREATE TABLE IF NOT EXISTS leads (
  id          TEXT PRIMARY KEY,
  email       TEXT NOT NULL,
  geography   TEXT NOT NULL,
  industry    TEXT NOT NULL,
  revenue     TEXT NOT NULL,
  answers     TEXT NOT NULL,
  ale_mean    REAL NOT NULL,
  ale_p95     REAL NOT NULL,
  currency    TEXT NOT NULL,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
```

Via Turso CLI:
```bash
turso db shell <your-db-name>
```

**Step 2: Add env vars to Vercel**

In Vercel dashboard → Settings → Environment Variables, add:
```
TURSO_DATABASE_URL    libsql://your-db-name-username.turso.io
TURSO_AUTH_TOKEN      eyJ...
RESEND_API_KEY        re_...
ANTHROPIC_API_KEY     sk-ant-...
REPORT_RECIPIENT_EMAIL  albert@yourdomain.com
```

**Step 3: Add to local `.env.local`**

```bash
# .env.local (already gitignored)
TURSO_DATABASE_URL=libsql://your-db-name-username.turso.io
TURSO_AUTH_TOKEN=eyJ...
RESEND_API_KEY=re_...
ANTHROPIC_API_KEY=sk-ant-...
REPORT_RECIPIENT_EMAIL=albert@yourdomain.com
```

No commit needed for this task — `.env.local` is gitignored.

---

## Task 9: Implement `src/lib/turso.ts`

**Files:**
- Create: `src/lib/turso.ts`

**Step 1: Write the Turso client singleton**

```typescript
import { createClient } from '@libsql/client';

let client: ReturnType<typeof createClient> | null = null;

export function getTursoClient() {
  if (!client) {
    client = createClient({
      url: process.env.TURSO_DATABASE_URL!,
      authToken: process.env.TURSO_AUTH_TOKEN,
    });
  }
  return client;
}

export interface LeadRow {
  id: string;
  email: string;
  geography: string;
  industry: string;
  revenue: string;
  answers: string;       // JSON
  ale_mean: number;
  ale_p95: number;
  currency: string;
  created_at: string;
}

export async function insertLead(lead: Omit<LeadRow, 'created_at'>): Promise<void> {
  const db = getTursoClient();
  await db.execute({
    sql: `INSERT INTO leads (id, email, geography, industry, revenue, answers, ale_mean, ale_p95, currency)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      lead.id,
      lead.email,
      lead.geography,
      lead.industry,
      lead.revenue,
      lead.answers,
      lead.ale_mean,
      lead.ale_p95,
      lead.currency,
    ],
  });
}
```

**Step 2: Type-check**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: no new errors

**Step 3: Commit**

```bash
git add src/lib/turso.ts
git commit -m "feat(db): add Turso client singleton + insertLead helper"
```

---

## Task 10: Implement `POST /api/narrative`

**Files:**
- Create: `src/app/api/narrative/route.ts`

Uses Vercel AI Gateway with `perplexity/sonar-pro` via the `ai` SDK's `streamText`.
On Vercel, OIDC auth is injected automatically — no API key env var needed.
For local dev: `vercel env pull` (already linked) pulls the OIDC token into `.env.local`.
`toTextStreamResponse()` emits plain text chunks — the client (`NarrativePanel`) needs no changes.

**Step 1: Write the route**

```typescript
import { streamText } from 'ai';
import type { AssessmentInputs, SimulationResults } from '@/lib/types';
import type { Currency } from '@/lib/currency';
import { CURRENCY_SYMBOLS } from '@/lib/currency';

const MODEL = 'perplexity/sonar-pro';

const SYSTEM_PROMPT = `You are a senior cyber risk advisor writing a 3-4 sentence executive summary for a board audience. Be direct and financial. Cite the ALE figure in the user's selected currency, name the primary loss driver, and include one specific regulatory or industry context relevant to their geography and industry. Where relevant, reference a recent real-world breach or regulatory action to ground the figures. No jargon. No hedging. No bullet points. No em dashes. Plain prose only.`;

// Rate limiting (same pattern as /api/calculate)
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
- Revenue band: ${inputs.company.revenue}
- Controls: MFA=${inputs.controls.mfa}, EDR=${inputs.controls.edr}, SOC=${inputs.controls.soc}
- Threat profile: insider=${inputs.threats.insiderThreat}, nation-state=${inputs.threats.nationState}

Simulation results (100,000 Monte Carlo trials):
- Annual Loss Expectancy (mean): ${sym}${aleMean}M
- 95th percentile (tail risk): ${sym}${aleP95}M
- Gordon-Loeb optimal security spend: ${sym}${glSpend}K/year
- Risk rating: ${results.riskRating}
- Primary driver: ${results.keyDrivers[0]?.name ?? 'threat event frequency'}

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
    model: MODEL,
    system: SYSTEM_PROMPT,
    prompt: buildPrompt(body.inputs, body.results, body.currency),
    maxTokens: 256,
  });

  return result.toTextStreamResponse();
}
```

**Step 2: Type-check**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: no new errors

**Step 3: Run tests**

```bash
npx vitest run
```

Expected: **196 passed**

**Step 4: Commit**

```bash
git add src/app/api/narrative/route.ts
git commit -m "feat(api): add /api/narrative — streaming via Vercel AI Gateway + perplexity/sonar-pro"
```

---

## Task 11: Implement `POST /api/send-report`

**Files:**
- Create: `src/app/api/send-report/route.ts`

**Step 1: Write the route**

```typescript
import { Resend } from 'resend';
import { z } from 'zod';
import { generateReportBuffer } from '@/lib/docx-report';
import { insertLead } from '@/lib/turso';
import type { AssessmentInputs, SimulationResults } from '@/lib/types';
import type { Currency } from '@/lib/currency';

const resend = new Resend(process.env.RESEND_API_KEY);

const BodySchema = z.object({
  email:    z.string().email(),
  inputs:   z.object({}).passthrough(),
  results:  z.object({}).passthrough(),
  currency: z.enum(['USD', 'GBP', 'EUR', 'HKD', 'SGD']),
  shareUrl: z.string().url().optional(),
});

export async function POST(req: Request) {
  let body: unknown;
  try { body = await req.json(); } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: 'Validation failed', fieldErrors: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const { email, inputs, results, currency, shareUrl } = parsed.data as {
    email: string;
    inputs: AssessmentInputs;
    results: SimulationResults;
    currency: Currency;
    shareUrl?: string;
  };

  // Generate DOCX buffer (server-safe, no canvas)
  const docxBuffer = await generateReportBuffer(inputs, results);

  const industry = inputs.company.industry;
  const geography = inputs.company.geography;
  const subject = `Your CybRisk Report — ${industry} · ${geography}`;

  const aleMean = (results.ale.mean / 1_000_000).toFixed(2);
  const aleP95  = (results.ale.p95  / 1_000_000).toFixed(2);
  const bodyText = [
    `Your CybRisk assessment is attached.`,
    ``,
    `Key figures:`,
    `  Annual Loss Expectancy: $${aleMean}M`,
    `  95th-percentile tail risk: $${aleP95}M`,
    `  Risk rating: ${results.riskRating}`,
    shareUrl ? `\nShared results: ${shareUrl}` : '',
    ``,
    `— CybRisk by Security Ronin`,
  ].join('\n');

  const bccList = process.env.REPORT_RECIPIENT_EMAIL
    ? [process.env.REPORT_RECIPIENT_EMAIL]
    : [];

  // Send email
  await resend.emails.send({
    from: 'CybRisk <reports@cybrisk.vercel.app>',
    to:  [email],
    bcc: bccList,
    subject,
    text: bodyText,
    attachments: [{
      filename: `CybRisk-${industry}-${geography}.docx`,
      content:  docxBuffer,
    }],
  });

  // Capture lead in Turso
  await insertLead({
    id:        crypto.randomUUID(),
    email,
    geography,
    industry,
    revenue:   inputs.company.revenue,
    answers:   JSON.stringify(inputs),
    ale_mean:  results.ale.mean,
    ale_p95:   results.ale.p95,
    currency,
  });

  return Response.json({ ok: true });
}
```

**Step 2: Type-check**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: no new errors

**Step 3: Run tests**

```bash
npx vitest run
```

Expected: **196 passed**

**Step 4: Commit**

```bash
git add src/app/api/send-report/route.ts
git commit -m "feat(api): add /api/send-report — Resend email + Turso lead capture"
```

---

## Task 12: Build `CurrencySelector.tsx`

**Files:**
- Create: `src/components/results/CurrencySelector.tsx`

**Step 1: Write the component**

```tsx
'use client';
import React, { useEffect, useState } from 'react';
import type { Currency } from '@/lib/currency';
import { FALLBACK_RATES, parseYahooFxResponse } from '@/lib/currency';

const CURRENCIES: Currency[] = ['USD', 'GBP', 'EUR', 'HKD', 'SGD'];
const LS_KEY = 'cybrisk_currency';

interface CurrencySelectorProps {
  value: Currency;
  rates: Record<Currency, number>;
  onChange: (currency: Currency, rates: Record<Currency, number>) => void;
}

export default function CurrencySelector({ value, rates, onChange }: CurrencySelectorProps) {
  return (
    <div className="flex items-center gap-1">
      {CURRENCIES.map((c) => (
        <button
          key={c}
          onClick={() => onChange(c, rates)}
          className="px-2 py-0.5 rounded text-[11px] transition-all"
          style={{
            fontFamily: 'var(--font-geist-mono)',
            background: c === value ? 'rgba(0,180,255,0.15)' : 'transparent',
            border: `1px solid ${c === value ? 'rgba(0,180,255,0.4)' : 'rgba(0,180,255,0.1)'}`,
            color: c === value ? '#00d4ff' : '#4a6080',
          }}
        >
          {c}
        </button>
      ))}
    </div>
  );
}

/** Hook that manages currency state, fetches live FX rates, persists to localStorage. */
export function useCurrency(): {
  currency: Currency;
  rates: Record<Currency, number>;
  setCurrency: (c: Currency) => void;
} {
  const [currency, setCurrencyState] = useState<Currency>('USD');
  const [rates, setRates] = useState<Record<Currency, number>>(FALLBACK_RATES);

  useEffect(() => {
    const saved = localStorage.getItem(LS_KEY) as Currency | null;
    if (saved && CURRENCIES.includes(saved)) setCurrencyState(saved);

    fetch('/api/fx-rates')
      .then((r) => r.json())
      .then((data: { rates: Record<Currency, number> }) => {
        if (data.rates) setRates(data.rates);
      })
      .catch(() => { /* use fallback */ });
  }, []);

  const setCurrency = (c: Currency) => {
    setCurrencyState(c);
    localStorage.setItem(LS_KEY, c);
  };

  return { currency, rates, setCurrency };
}
```

**Step 2: Type-check**

```bash
npx tsc --noEmit 2>&1 | head -20
```

**Step 3: Run tests**

```bash
npx vitest run
```

Expected: **196 passed**

**Step 4: Commit**

```bash
git add src/components/results/CurrencySelector.tsx
git commit -m "feat(ui): add CurrencySelector + useCurrency hook (live Yahoo Finance FX)"
```

---

## Task 13: Build `NarrativePanel.tsx`

**Files:**
- Create: `src/components/results/NarrativePanel.tsx`

**Step 1: Write the component**

```tsx
'use client';
import React, { useEffect, useState, useRef } from 'react';
import type { AssessmentInputs, SimulationResults } from '@/lib/types';
import type { Currency } from '@/lib/currency';

interface NarrativePanelProps {
  inputs: AssessmentInputs;
  results: SimulationResults;
  currency: Currency;
}

export default function NarrativePanel({ inputs, results, currency }: NarrativePanelProps) {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setText('');
    setError(false);

    (async () => {
      try {
        const res = await fetch('/api/narrative', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ inputs, results, currency }),
          signal: controller.signal,
        });
        if (!res.ok || !res.body) throw new Error('Failed');

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let done = false;
        while (!done) {
          const { value, done: d } = await reader.read();
          done = d;
          if (value) setText((prev) => prev + decoder.decode(value, { stream: !done }));
        }
      } catch (e) {
        if ((e as Error).name !== 'AbortError') setError(true);
      } finally {
        setLoading(false);
      }
    })();

    return () => controller.abort();
  }, [inputs, results, currency]);

  return (
    <div
      style={{
        background: 'rgba(4,8,28,0.92)',
        border: '1px solid rgba(0,180,255,0.12)',
        borderLeft: '2px solid #00d4ff',
        borderRadius: 12,
        backdropFilter: 'blur(12px)',
        padding: 24,
      }}
    >
      <div
        className="text-[11px] tracking-[0.15em] uppercase mb-3"
        style={{ fontFamily: 'var(--font-geist-mono)', color: '#8899bb' }}
      >
        EXECUTIVE SUMMARY
      </div>

      {loading && !text && (
        <div className="space-y-2">
          {[80, 95, 70].map((w) => (
            <div
              key={w}
              className="h-3 rounded animate-pulse"
              style={{ width: `${w}%`, background: 'rgba(0,180,255,0.08)' }}
            />
          ))}
        </div>
      )}

      {error && (
        <p className="text-xs" style={{ color: '#4a6080', fontFamily: 'var(--font-geist-mono)' }}>
          Narrative unavailable. Check ANTHROPIC_API_KEY is set.
        </p>
      )}

      {text && (
        <p className="text-sm leading-relaxed" style={{ color: '#c8d8f0' }}>
          {text}
          {loading && <span className="animate-pulse">▌</span>}
        </p>
      )}

      {!loading && !error && (
        <p
          className="text-[10px] mt-3"
          style={{ fontFamily: 'var(--font-geist-mono)', color: '#2a4060' }}
        >
          Generated by Perplexity sonar-pro
        </p>
      )}
    </div>
  );
}
```

**Step 2: Type-check + tests**

```bash
npx tsc --noEmit 2>&1 | head -10 && npx vitest run 2>&1 | tail -5
```

Expected: no errors, 196 passed

**Step 3: Commit**

```bash
git add src/components/results/NarrativePanel.tsx
git commit -m "feat(ui): add NarrativePanel — streaming AI executive summary"
```

---

## Task 14: Build `EmailModal.tsx`

**Files:**
- Create: `src/components/results/EmailModal.tsx`

**Step 1: Write the component**

```tsx
'use client';
import React, { useState, useEffect } from 'react';
import type { AssessmentInputs, SimulationResults } from '@/lib/types';
import type { Currency } from '@/lib/currency';

type State = 'idle' | 'sending' | 'success' | 'error';

interface EmailModalProps {
  inputs: AssessmentInputs;
  results: SimulationResults;
  currency: Currency;
  shareUrl?: string;
  onClose: () => void;
}

export default function EmailModal({ inputs, results, currency, shareUrl, onClose }: EmailModalProps) {
  const [email, setEmail] = useState('');
  const [state, setState] = useState<State>('idle');

  useEffect(() => {
    if (state === 'success') {
      const t = setTimeout(onClose, 2000);
      return () => clearTimeout(t);
    }
  }, [state, onClose]);

  const handleSend = async () => {
    if (!email.includes('@')) return;
    setState('sending');
    try {
      const res = await fetch('/api/send-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, inputs, results, currency, shareUrl }),
      });
      setState(res.ok ? 'success' : 'error');
    } catch {
      setState('error');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.7)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm mx-4 p-6 rounded-xl"
        style={{
          background: 'rgba(4,8,28,0.97)',
          border: '1px solid rgba(0,180,255,0.2)',
          backdropFilter: 'blur(20px)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="text-[11px] tracking-[0.15em] uppercase mb-4"
          style={{ fontFamily: 'var(--font-geist-mono)', color: '#8899bb' }}
        >
          EMAIL REPORT
        </div>

        {state === 'success' ? (
          <p className="text-sm text-center py-4" style={{ color: '#22c55e', fontFamily: 'var(--font-geist-mono)' }}>
            Report sent — check your inbox.
          </p>
        ) : (
          <>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              disabled={state === 'sending'}
              className="w-full px-4 py-2.5 rounded-lg text-sm mb-3 outline-none"
              style={{
                fontFamily: 'var(--font-geist-mono)',
                background: 'rgba(0,180,255,0.05)',
                border: '1px solid rgba(0,180,255,0.2)',
                color: '#c8d8f0',
              }}
            />

            {state === 'error' && (
              <p className="text-xs mb-3" style={{ color: '#ef4444', fontFamily: 'var(--font-geist-mono)' }}>
                Failed to send. Please try again.
              </p>
            )}

            <button
              onClick={handleSend}
              disabled={state === 'sending' || !email.includes('@')}
              className="w-full py-2.5 rounded-lg text-sm font-medium transition-all disabled:opacity-50"
              style={{
                fontFamily: 'var(--font-geist-mono)',
                background: 'rgba(0,180,255,0.12)',
                border: '1px solid rgba(0,180,255,0.3)',
                color: '#00d4ff',
              }}
            >
              {state === 'sending' ? 'Sending...' : 'Send Report'}
            </button>

            <p
              className="text-[10px] text-center mt-3"
              style={{ fontFamily: 'var(--font-geist-mono)', color: '#2a4060' }}
            >
              Your email is used only to deliver this report.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
```

**Step 2: Type-check + tests**

```bash
npx tsc --noEmit 2>&1 | head -10 && npx vitest run 2>&1 | tail -5
```

Expected: no errors, 196 passed

**Step 3: Commit**

```bash
git add src/components/results/EmailModal.tsx
git commit -m "feat(ui): add EmailModal — Resend report delivery with lead capture"
```

---

## Task 15: Build `/history` page

**Files:**
- Create: `src/app/history/page.tsx`

**Step 1: Write the page**

```tsx
'use client';
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { loadHistory, deleteFromHistory, type HistoryEntry } from '@/lib/history-utils';
import { formatCurrency, FALLBACK_RATES } from '@/lib/currency';

const glassmorphism: React.CSSProperties = {
  background: 'rgba(4, 8, 28, 0.92)',
  border: '1px solid rgba(0, 180, 255, 0.12)',
  borderRadius: 12,
  backdropFilter: 'blur(12px)',
  padding: 24,
};

export default function HistoryPage() {
  const router = useRouter();
  const [entries, setEntries] = useState<HistoryEntry[]>([]);

  useEffect(() => {
    setEntries(loadHistory());
  }, []);

  const handleLoad = (entry: HistoryEntry) => {
    sessionStorage.setItem('assessment', JSON.stringify(entry.inputs));
    sessionStorage.setItem('results', JSON.stringify(entry.results));
    router.push('/results');
  };

  const handleDelete = (id: string) => {
    deleteFromHistory(id);
    setEntries(loadHistory());
  };

  const handleClearAll = () => {
    localStorage.removeItem('cybrisk_history');
    setEntries([]);
  };

  return (
    <main style={{ background: '#060a18', minHeight: '100vh' }}>
      <div className="max-w-3xl mx-auto px-4 py-10">
        <div className="flex items-center justify-between mb-6">
          <h1
            className="text-sm tracking-widest uppercase"
            style={{ fontFamily: 'var(--font-geist-mono)', color: '#8899bb' }}
          >
            Assessment History
          </h1>
          <a
            href="/assess"
            className="text-xs"
            style={{ fontFamily: 'var(--font-geist-mono)', color: '#4a6080' }}
          >
            ← New Assessment
          </a>
        </div>

        {entries.length === 0 ? (
          <div style={glassmorphism} className="text-center py-12">
            <p className="text-sm" style={{ fontFamily: 'var(--font-geist-mono)', color: '#4a6080' }}>
              No saved assessments yet.
            </p>
            <a
              href="/assess"
              className="text-xs mt-3 inline-block"
              style={{ fontFamily: 'var(--font-geist-mono)', color: '#00d4ff' }}
            >
              Start an assessment →
            </a>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {entries.map((entry) => (
              <div
                key={entry.id}
                className="flex items-center justify-between gap-4"
                style={glassmorphism}
              >
                <div>
                  <p
                    className="text-sm"
                    style={{ fontFamily: 'var(--font-geist-mono)', color: '#c8d8f0' }}
                  >
                    {entry.label}
                  </p>
                  <p
                    className="text-xs mt-1"
                    style={{ fontFamily: 'var(--font-geist-mono)', color: '#4a6080' }}
                  >
                    ALE {formatCurrency(entry.results.ale.mean, entry.currency, FALLBACK_RATES)} ·{' '}
                    {new Date(entry.savedAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => handleLoad(entry)}
                    className="px-3 py-1.5 rounded text-xs"
                    style={{
                      fontFamily: 'var(--font-geist-mono)',
                      background: 'rgba(0,180,255,0.08)',
                      border: '1px solid rgba(0,180,255,0.2)',
                      color: '#00d4ff',
                    }}
                  >
                    Load
                  </button>
                  <button
                    onClick={() => handleDelete(entry.id)}
                    className="px-3 py-1.5 rounded text-xs"
                    style={{
                      fontFamily: 'var(--font-geist-mono)',
                      background: 'rgba(239,68,68,0.06)',
                      border: '1px solid rgba(239,68,68,0.2)',
                      color: '#ef4444',
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}

            <button
              onClick={handleClearAll}
              className="text-xs mt-2 self-center"
              style={{ fontFamily: 'var(--font-geist-mono)', color: '#2a4060' }}
            >
              Clear all history
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
```

**Step 2: Type-check + tests**

```bash
npx tsc --noEmit 2>&1 | head -10 && npx vitest run 2>&1 | tail -5
```

Expected: no errors, 196 passed

**Step 3: Commit**

```bash
git add src/app/history/page.tsx
git commit -m "feat(page): add /history — saved assessment browser with load/delete"
```

---

## Task 16: Wire all components into `results/page.tsx`

**Files:**
- Modify: `src/app/results/page.tsx`

**Step 1: Add imports after the existing dynamic imports block**

After the `const RegulatoryMap = dynamic(...)` block, add:

```typescript
import { useCurrency } from '@/components/results/CurrencySelector';
import { saveToHistory } from '@/lib/history-utils';
const CurrencySelector = dynamic(
  () => import('@/components/results/CurrencySelector'),
  { ssr: false },
);
const NarrativePanel = dynamic(
  () => import('@/components/results/NarrativePanel'),
  { ssr: false },
);
const EmailModal = dynamic(
  () => import('@/components/results/EmailModal'),
  { ssr: false },
);
```

**Step 2: Add state inside `ResultsPage` function**

After the `const [copied, setCopied] = useState(false);` line, add:

```typescript
const [showEmailModal, setShowEmailModal] = useState(false);
const { currency, rates, setCurrency } = useCurrency();
```

**Step 3: Auto-save to history**

Inside the `useEffect` that loads results from sessionStorage, after `setResults(parsed)` and `setInputs(...)`, add:

```typescript
// Auto-save to history
if (rawInputs) {
  const histInputs = JSON.parse(rawInputs) as AssessmentInputs;
  saveToHistory({
    label: `${histInputs.company.industry} · ${histInputs.company.geography}`,
    inputs: histInputs,
    results: parsed,
    currency: 'USD',
  });
}
```

**Step 4: Add CurrencySelector to the TickerBar row**

Find the `{/* Ticker Bar */}` section and wrap it:

```tsx
{/* Ticker Bar + Currency Selector */}
<div className="flex items-center justify-between gap-4">
  <div className="flex-1">
    <TickerBar results={results} currency={currency} rates={rates} />
  </div>
  <CurrencySelector
    value={currency}
    rates={rates}
    onChange={(c) => setCurrency(c)}
  />
</div>
```

**Note:** `TickerBar` will need `currency` and `rates` props to format monetary values — add these props to its interface and update the formatting calls inside it. If this is too disruptive, pass the formatting via a callback or use a shared context. The simplest approach: update `TickerBar` to accept optional `currency` and `rates` props (default to USD/FALLBACK_RATES if omitted).

**Step 5: Add NarrativePanel below the ticker**

After the ticker section, before the charts grid:

```tsx
{/* AI Executive Summary */}
{inputs && (
  <div className="mt-6">
    <NarrativePanel inputs={inputs} results={results} currency={currency} />
  </div>
)}
```

**Step 6: Add "Email Report" button to Actions section**

In the Actions section, before the "Export Report" button, add:

```tsx
{inputs && (
  <button
    onClick={() => setShowEmailModal(true)}
    className="px-6 py-3 rounded-full text-sm font-medium transition-all duration-300 hover:scale-105"
    style={{
      fontFamily: 'var(--font-geist-mono)',
      background: 'rgba(0,180,255,0.08)',
      border: '1px solid rgba(0,180,255,0.25)',
      color: '#00d4ff',
    }}
  >
    Email Report
  </button>
)}
```

Also add a "History" link button in the actions area:

```tsx
<a
  href="/history"
  className="px-6 py-3 rounded-full text-sm font-medium transition-all duration-300 hover:scale-105"
  style={{
    fontFamily: 'var(--font-geist-mono)',
    background: 'rgba(0,180,255,0.04)',
    border: '1px solid rgba(0,180,255,0.15)',
    color: '#8899bb',
  }}
>
  History
</a>
```

**Step 7: Add EmailModal at the bottom of the JSX (inside `<main>`)**

Before the closing `</main>`:

```tsx
{showEmailModal && inputs && (
  <EmailModal
    inputs={inputs}
    results={results}
    currency={currency}
    shareUrl={
      typeof window !== 'undefined'
        ? `${window.location.origin}/results?s=${encodeInputs(inputs)}&seed=${deriveShareSeed(inputs)}`
        : undefined
    }
    onClose={() => setShowEmailModal(false)}
  />
)}
```

**Step 8: Type-check**

```bash
npx tsc --noEmit 2>&1 | head -30
```

Fix any errors before proceeding. Common issue: `TickerBar` props need updating if it doesn't accept `currency`/`rates` yet.

**Step 9: Run tests**

```bash
npx vitest run
```

Expected: **196 passed**

**Step 10: Build**

```bash
npm run build 2>&1 | tail -20
```

Expected: clean build

**Step 11: Commit**

```bash
git add src/app/results/page.tsx
git commit -m "feat(results): wire NarrativePanel, CurrencySelector, EmailModal, history auto-save"
```

---

## Task 17: Final verification and push

**Step 1: Full test suite**

```bash
npx vitest run
```

Expected: **196 passed (0 failed)**

**Step 2: TypeScript**

```bash
npx tsc --noEmit
```

Expected: no errors

**Step 3: Production build**

```bash
npm run build 2>&1 | tail -20
```

Expected: clean build

**Step 4: Lint new files only**

```bash
npx eslint src/app/api/narrative/route.ts src/app/api/fx-rates/route.ts src/app/api/send-report/route.ts src/lib/currency.ts src/lib/history-utils.ts src/lib/turso.ts src/components/results/NarrativePanel.tsx src/components/results/CurrencySelector.tsx src/components/results/EmailModal.tsx src/app/history/page.tsx 2>&1
```

Expected: exit 0

**Step 5: Push to preview**

```bash
git push origin preview
```

**Step 6: Verify Vercel deployment**

```bash
sleep 40 && vercel ls 2>&1 | head -6
```

Expected: latest deployment status `● Ready`

---

## Test count summary

| Task | New tests | Running total |
|------|-----------|---------------|
| Baseline | 180 | 180 |
| Task 3 (currency utils) | +8 | 188 |
| Task 5 (history-utils) | +8 | 196 |
| Tasks 6–17 (routes + UI) | +0 | 196 |

All 196 tests must be green at every commit.
