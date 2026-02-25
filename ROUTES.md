# CybRisk — Next.js Route Manifest

## App Router Routes (`src/app/`)

| Route | File | Type | Description |
|-------|------|------|-------------|
| `/` | `app/page.tsx` | Page (Client) | Landing page — hero, trust strip, pain points |
| `/assess` | `app/assess/page.tsx` | Page (Client) | 5-step risk assessment wizard |
| `/simulate` | `app/simulate/page.tsx` | Page (Client) | Bloomberg-style Monte Carlo simulation console |
| `/results` | `app/results/page.tsx` | Page (Client) | Results dashboard with charts, benchmarks, DOCX export |
| `/api/calculate` | `app/api/calculate/route.ts` | API Route (POST) | Monte Carlo simulation endpoint (Zod-validated) |

## User Flow

```
/ (landing)
  └─► /assess (5-step wizard)
        └─► /simulate (live simulation console)
              └─► /results (dashboard + export)
```

## API Routes

### POST /api/calculate

Accepts a Zod-validated `AssessmentInputs` payload and returns `SimulationResults` (minus raw losses).

**Rate limit:** 10 requests / IP / minute

**Request body:** `AssessmentInputs` (see `src/lib/types.ts`)

**Response:** `SimulationResults` without `rawLosses`

**Errors:**
- `400` — Zod validation failure (field-level errors)
- `429` — Rate limit exceeded
- `500` — Simulation error
