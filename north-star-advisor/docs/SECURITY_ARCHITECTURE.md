# CybRisk: Security Architecture

> **Tier**: 2 — Implementation (see [INDEX.md](INDEX.md))
> **Created**: 2026-02-22
> **Status**: Active
> **Generation Step**: 8 of 13
> **Scope**: Input Validation, Data Protection, API Security, Privacy by Design

*Security architecture for a stateless cyber risk quantification calculator deployed on Vercel.*

---

## Executive Summary

CybRisk is a **stateless web calculator** — not an agentic AI system, not a multi-tenant SaaS, and not a data store. This fundamentally different architecture means most enterprise security concerns (authentication, persistent data protection, inter-service communication) **do not apply**.

The primary attack surface is the `/api/calculate` endpoint, which accepts user input, runs a Monte Carlo simulation, and returns JSON. There are no user accounts, no databases, no cookies, no sessions, and no stored data.

This security blueprint addresses the **OWASP API Security Top 10** (not the Agentic AI Top 10, which is inapplicable) and implements defense-in-depth appropriate to a stateless calculator.

---

## 1. Threat Model

### 1.1 Attack Surface Analysis

```
+------------------------------------------------------------------------+
|                    CybRisk ATTACK SURFACE MAP                          |
+------------------------------------------------------------------------+
|                                                                        |
|  EXTERNAL THREATS                    INTERNAL THREATS                  |
|  ----------------                    ----------------                  |
|  +-------------+                     +-------------+                   |
|  |   WIZARD    | ------------------> |  INPUT      |                   |
|  |   FORM      |   Malicious Values  |  INJECTION  |                   |
|  +-------------+                     +-------------+                   |
|         |                                   |                          |
|         |  Extreme parameters               v                          |
|         |  (huge numbers)            +-------------+                   |
|         +--------------------------> |  DoS via    |                   |
|                                      |  CPU ABUSE  |                   |
|  +-------------+                     +-------------+                   |
|  |  SESSION    | -----------------------------> |                      |
|  |  STORAGE    |   Tampered results            v                       |
|  |  TAMPERING  |                        +-------------+                |
|  +-------------+                        | MISLEADING  |                |
|                                         | OUTPUT      |                |
|  +-------------+                        +-------------+                |
|  |  DIRECT API | -----------------------------> |                      |
|  |  ABUSE      |   Bypass UI validation        v                       |
|  +-------------+                        +-------------+                |
|                                         | PROTOTYPE   |                |
|                                         | POLLUTION   |                |
|                                         +-------------+                |
|                                                                        |
|  SENSITIVE ASSETS AT RISK                                              |
|  ------------------------                                              |
|  * User's risk parameters (transient, never stored)                    |
|  * Calculation results (client-side only, sessionStorage)              |
|  * Lookup table integrity (hardcoded, read-only)                       |
|  * Vercel deployment credentials (out of scope, managed by Vercel)     |
|                                                                        |
+------------------------------------------------------------------------+
```

### 1.2 OWASP API Security Top 10 Risk Mapping

| OWASP ID | Risk Name | CybRisk Exposure | Severity | Priority |
|----------|-----------|-------------------|----------|----------|
| **API1** | Broken Object-Level Auth | **N/A** — No objects, no auth, no user data | N/A | N/A |
| **API2** | Broken Authentication | **N/A** — No authentication by design | N/A | N/A |
| **API3** | Broken Object Property-Level Auth | **N/A** — No mutable objects | N/A | N/A |
| **API4** | Unrestricted Resource Consumption | **High** — CPU-bound Monte Carlo could be abused | High | P0 |
| **API5** | Broken Function-Level Auth | **N/A** — Single public endpoint | N/A | N/A |
| **API6** | Unrestricted Access to Sensitive Business Flows | **Low** — Calculator has no sensitive flows | Low | P2 |
| **API7** | Server-Side Request Forgery | **N/A** — No outbound requests | N/A | N/A |
| **API8** | Security Misconfiguration | **Medium** — Default headers, CORS, error leakage | Medium | P1 |
| **API9** | Improper Inventory Management | **Low** — Single endpoint, simple surface | Low | P2 |
| **API10** | Unsafe Consumption of APIs | **N/A** — No external API consumption | N/A | N/A |

### 1.3 Trust Boundaries

```
+-----------------------------------------------------------------------------+
|                          TRUST BOUNDARY MAP                                 |
+-----------------------------------------------------------------------------+
|                                                                             |
|  UNTRUSTED ZONE (TB0)               VALIDATED ZONE (TB1)                   |
|  --------------------                -------------------                    |
|  +---------------------+            +---------------------+                |
|  |                     |            |                     |                |
|  |  * Browser form     | ---------> |  * Zod validation   |                |
|  |  * Direct API calls |    TB0     |  * Type coercion    |                |
|  |  * sessionStorage   |            |  * Range clamping   |                |
|  |                     |            |                     |                |
|  +---------------------+            +----------+----------+                |
|                                                |                           |
|                                          ------+------ TB1                 |
|                                                v                           |
|  TRUSTED ZONE (TB2)                  COMPUTATION ZONE                      |
|  -------------------                +---------------------+                |
|  +---------------------+            |  * Monte Carlo      |                |
|  |                     | <--------- |  * Gordon-Loeb      |                |
|  |  * Lookup tables    |    TB2     |  * Percentile calc  |                |
|  |  * PERT parameters  |            +---------------------+                |
|  |  * Industry data    |                      |                            |
|  |  (hardcoded, RO)    |                      v                            |
|  +---------------------+            +---------------------+                |
|                                     |  * JSON response    |                |
|                                     |  * Client rendering |                |
|                                     +---------------------+                |
|                                                                            |
|  TRUST BOUNDARY ENFORCEMENT:                                               |
|  * TB0 to TB1: Zod schema validation, type coercion, range clamping       |
|  * TB1 to TB2: Only validated TypeScript types cross this boundary         |
|  * Lookup tables: Hardcoded constants, no runtime modification             |
|                                                                            |
+-----------------------------------------------------------------------------+
```

### 1.4 Threat Scenarios

#### Scenario 1: CPU Exhaustion via Extreme Parameters (API4)
**Attacker Goal**: Denial of service by triggering expensive computation
**Attack Vector**: POST to `/api/calculate` with parameters that maximize iteration cost (e.g., `revenue: Number.MAX_SAFE_INTEGER`)
**Example**: `{"industry": "healthcare", "revenue": 999999999999999, "employees": 999999}`
**Impact**: Vercel function timeout, degraded service for other users
**Mitigation**: Zod validation with hard `max` bounds on all numeric fields; fixed 10,000 iteration count (not user-configurable)

#### Scenario 2: Prototype Pollution via JSON Body
**Attacker Goal**: Inject properties into JavaScript object prototypes
**Attack Vector**: POST JSON with `__proto__` or `constructor` keys
**Example**: `{"__proto__": {"isAdmin": true}, "industry": "healthcare"}`
**Impact**: Potential code execution or logic bypass
**Mitigation**: Zod `.strict()` mode rejects unknown keys; destructure only expected fields from validated output

#### Scenario 3: sessionStorage Tampering
**Attacker Goal**: Display manipulated risk results to screenshot for social engineering
**Attack Vector**: Modify sessionStorage values in browser DevTools
**Example**: Change `annualLossExpectancy` from `$2.1M` to `$50` to show board a false "low risk" report
**Impact**: Misleading risk assessment used for business decisions
**Mitigation**: This is a **known and accepted risk** for a free calculator with no auth. Mitigation: display "For informational purposes only — not a certified risk assessment" disclaimer; results include a hash of input parameters for spot-verification

#### Scenario 4: Direct API Abuse (Bypass UI Validation)
**Attacker Goal**: Submit invalid data directly to API, bypassing client-side wizard validation
**Attack Vector**: `curl -X POST /api/calculate -d '{"garbage": true}'`
**Impact**: Server error, potential information leakage in error messages
**Mitigation**: Server-side Zod validation identical to client-side; generic error responses (never expose stack traces)

---

## 2. No-Auth Architecture (By Design)

### 2.1 Why No Authentication

CybRisk explicitly has **no user authentication** (documented in NORTHSTAR_EXTRACT.md as a non-goal). Rationale:

| Concern | Why Auth Is Not Needed |
|---------|------------------------|
| **Data protection** | No data is stored — calculations are stateless |
| **User isolation** | No multi-tenancy — each request is independent |
| **Audit trail** | No persistent actions to audit |
| **Rate limiting** | Can be IP-based without user identity |
| **Compliance** | No PII collected or stored |

### 2.2 What Replaces Auth

Instead of authentication, CybRisk uses:

| Traditional Control | CybRisk Alternative |
|--------------------|---------------------|
| User sessions | Stateless request/response |
| Database access control | No database — hardcoded lookup tables |
| API keys | Public endpoint with rate limiting |
| Role-based access | Single role: anonymous calculator user |
| Session tokens | sessionStorage (client-side only, auto-cleared) |

### 2.3 When to Add Auth (Future Trigger)

Add authentication if ANY of these become true:
- [ ] User data is persisted (saved reports, history)
- [ ] Multi-tenancy is introduced (org accounts)
- [ ] Premium features require gating
- [ ] API is offered as a service to third parties
- [ ] Regulatory requirement mandates it

---

## 3. Input Validation (Primary Defense)

### 3.1 Validation Schema

Zod is the **single source of truth** for input validation, shared between client wizard and server API route.

```typescript
// Shared validation schema (used by both client and server)
const CalculateInputSchema = z.object({
  // Step 1: Organization Profile
  industry: z.enum([
    'healthcare', 'financial', 'technology', 'retail',
    'manufacturing', 'education', 'government', 'professional_services'
  ]),
  revenue: z.number().min(100_000).max(50_000_000_000),
  employees: z.number().int().min(1).max(500_000),

  // Step 2: Threat Landscape
  dataRecords: z.number().int().min(0).max(1_000_000_000),
  dataTypes: z.array(z.enum([
    'pii', 'phi', 'financial', 'intellectual_property', 'credentials'
  ])).min(1).max(5),
  regulatoryFrameworks: z.array(z.enum([
    'hipaa', 'pci_dss', 'gdpr', 'sox', 'ccpa', 'none'
  ])).max(6),

  // Step 3: Security Controls
  controlMaturity: z.enum(['initial', 'developing', 'defined', 'managed', 'optimized']),
  hasIncidentResponse: z.boolean(),
  hasMFA: z.boolean(),
  hasBackups: z.boolean(),
  hasEncryption: z.boolean(),
  annualSecurityBudget: z.number().min(0).max(100_000_000),

  // Step 4: Loss Scenarios
  scenarioType: z.enum([
    'data_breach', 'ransomware', 'business_interruption',
    'third_party', 'insider_threat'
  ]),
  estimatedDowntimeHours: z.number().min(0).max(8760),

  // Step 5: Confidence
  confidenceLevel: z.enum(['low', 'medium', 'high']),
}).strict(); // Reject unknown keys
```

### 3.2 Validation Defense Layers

| Layer | What It Does | Where |
|-------|-------------|-------|
| **Client-side** | Immediate feedback, prevent obvious errors | Wizard form (React Hook Form + Zod) |
| **Server-side** | Authoritative validation, reject all invalid input | API route handler (Zod `.safeParse()`) |
| **Type narrowing** | TypeScript enforces validated types in computation | Monte Carlo engine accepts only `CalculateInput` type |
| **Range clamping** | Computation-level bounds on derived values | PERT parameters clamped to safe ranges |

### 3.3 Error Response Strategy

```typescript
// Server-side validation in API route
const result = CalculateInputSchema.safeParse(body);

if (!result.success) {
  return NextResponse.json(
    { error: 'Invalid input parameters', code: 'VALIDATION_ERROR' },
    { status: 400 }
  );
  // NEVER return: result.error.issues (leaks schema details)
  // NEVER return: stack traces
  // NEVER return: internal field names
}
```

---

## 4. Privacy by Design

### 4.1 Data Flow Audit

```
User Input -> [Browser] -> POST /api/calculate -> [Vercel Function]
                                                        |
                                                   Validate (Zod)
                                                        |
                                                   Compute (Monte Carlo)
                                                        |
                                                   Return JSON
                                                        |
                                               [Browser receives]
                                                        |
                                               Store in sessionStorage
                                                        |
                                               Render on /results
                                                        |
                                               Tab close = data gone
```

### 4.2 Privacy Guarantees

| Guarantee | How It's Enforced |
|-----------|-------------------|
| **No server-side storage** | API route is pure function: input in, JSON out, nothing persisted |
| **No cookies** | No `Set-Cookie` headers, no tracking |
| **No analytics PII** | If analytics added, exclude all form inputs |
| **No logging of inputs** | API route logs only: timestamp, status code, response time |
| **Client data auto-clears** | sessionStorage cleared on tab close; no localStorage |
| **No third-party data sharing** | No external API calls from the server |

### 4.3 Privacy-Safe Logging

```typescript
// What we LOG (safe)
console.log({
  timestamp: new Date().toISOString(),
  endpoint: '/api/calculate',
  status: 200,
  duration_ms: 87,
  iterations: 10000,
});

// What we NEVER LOG
// - User's industry, revenue, employee count
// - Any form input values
// - Calculation results
// - IP addresses (unless rate limiting requires it)
```

---

## 5. API Security

### 5.1 Response Headers

```typescript
// next.config.js security headers
const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-XSS-Protection', value: '0' },  // Disabled; CSP is the modern approach
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  {
    key: 'Content-Security-Policy',
    value: "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self';"
  },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
];
```

### 5.2 CORS Configuration

```typescript
// Only needed if API is accessed from different origins
// For same-origin (Next.js serving both UI and API): CORS is not needed

// If CORS is needed later:
const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://cybrisk.vercel.app',
  'Access-Control-Allow-Methods': 'POST',
  'Access-Control-Allow-Headers': 'Content-Type',
};
```

### 5.3 Rate Limiting Strategy

| Approach | For Hackathon | For Production |
|----------|--------------|----------------|
| **Method** | None (accept risk) | Vercel Edge Middleware with IP-based limiting |
| **Limit** | N/A | 10 calculations per minute per IP |
| **Response** | N/A | 429 Too Many Requests |
| **Storage** | N/A | Vercel KV or in-memory Map with TTL |

### 5.4 Request Size Limits

```typescript
// API route configuration
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10kb', // Calculation input is ~500 bytes; 10KB is generous
    },
  },
};
```

---

## 6. Defense in Depth

```
+-----------------------------------------------------------------------------+
|                         DEFENSE IN DEPTH                                    |
+-----------------------------------------------------------------------------+
|                                                                             |
|  Layer 1: NETWORK (Vercel)                                                  |
|  +---------------------------------------------------------------------+   |
|  |  * Vercel's built-in DDoS protection                                 |   |
|  |  * Automatic HTTPS/TLS 1.3                                           |   |
|  |  * Edge network (global CDN)                                         |   |
|  +---------------------------------------------------------------------+   |
|                                                                             |
|  Layer 2: TRANSPORT                                                         |
|  +---------------------------------------------------------------------+   |
|  |  * HSTS header (force HTTPS)                                         |   |
|  |  * Security response headers (CSP, X-Frame-Options, etc.)            |   |
|  |  * Request size limits (10KB)                                        |   |
|  +---------------------------------------------------------------------+   |
|                                                                             |
|  Layer 3: INPUT VALIDATION                                                  |
|  +---------------------------------------------------------------------+   |
|  |  * Zod schema validation (strict mode)                               |   |
|  |  * Type coercion and range clamping                                  |   |
|  |  * Unknown key rejection                                             |   |
|  |  * Enum-only string fields (no free-text injection surface)          |   |
|  +---------------------------------------------------------------------+   |
|                                                                             |
|  Layer 4: COMPUTATION SAFETY                                                |
|  +---------------------------------------------------------------------+   |
|  |  * Fixed iteration count (10,000 -- not configurable)                |   |
|  |  * PERT parameter bounds (min < mode < max enforced)                 |   |
|  |  * No dynamic code generation or execution                           |   |
|  |  * Pure arithmetic only (no shell, no file I/O, no network)          |   |
|  +---------------------------------------------------------------------+   |
|                                                                             |
|  Layer 5: OUTPUT SAFETY                                                     |
|  +---------------------------------------------------------------------+   |
|  |  * Generic error responses (no stack traces, no schema leaks)        |   |
|  |  * JSON-only responses (no HTML injection surface)                   |   |
|  |  * Result bounds checking (reject NaN, Infinity)                     |   |
|  +---------------------------------------------------------------------+   |
|                                                                             |
|  Layer 6: CLIENT-SIDE                                                       |
|  +---------------------------------------------------------------------+   |
|  |  * sessionStorage (not localStorage -- auto-clears on tab close)     |   |
|  |  * React's built-in XSS protection (JSX auto-escaping)              |   |
|  |  * No raw HTML injection in rendered output                          |   |
|  |  * Disclaimer on all results ("informational purposes only")         |   |
|  +---------------------------------------------------------------------+   |
|                                                                             |
+-----------------------------------------------------------------------------+
```

---

## 7. Security Checklist

### Pre-Launch Checklist

#### Input Validation
- [ ] Zod schema validates all API inputs server-side
- [ ] `.strict()` mode rejects unknown keys
- [ ] All numeric fields have min/max bounds
- [ ] All string fields use enum (no free-text)
- [ ] Client and server schemas are identical (shared module)

#### Transport Security
- [ ] HSTS header configured in next.config.js
- [ ] CSP header blocks unsafe sources
- [ ] X-Frame-Options set to DENY
- [ ] X-Content-Type-Options set to nosniff

#### API Security
- [ ] Error responses never expose internals
- [ ] No stack traces in production error responses
- [ ] Request body size limited to 10KB
- [ ] JSON-only response format

#### Computation Safety
- [ ] Iteration count is hardcoded (10,000)
- [ ] PERT parameters have safe bounds
- [ ] Results checked for NaN/Infinity before returning
- [ ] No dynamic code generation anywhere in codebase

#### Privacy
- [ ] No cookies set by application
- [ ] No form input values logged server-side
- [ ] sessionStorage used (not localStorage)
- [ ] "Informational purposes only" disclaimer displayed
- [ ] No third-party tracking scripts

#### Deployment
- [ ] Vercel environment variables reviewed (none needed for stateless app)
- [ ] No secrets in client-side bundle
- [ ] Source maps disabled in production
- [ ] next.config.js security headers verified

---

## 8. Incident Response

### 8.1 Severity Levels (Adapted for Stateless Calculator)

| Level | Description | Response Time | Examples |
|-------|-------------|---------------|----------|
| **SEV-1** | Service completely down | 1 hour | Vercel deployment failed, 500 on all requests |
| **SEV-2** | Calculation producing wrong results | 4 hours | Monte Carlo bug, lookup table error |
| **SEV-3** | Degraded performance | 24 hours | Slow responses, intermittent timeouts |
| **SEV-4** | Cosmetic / minor | Next business day | UI glitch, typo in results |

### 8.2 Response Procedures

#### SEV-1: Service Down
1. **Detect**: Vercel dashboard shows errors or user reports
2. **Triage**: Check Vercel function logs for error pattern
3. **Mitigate**: Redeploy last known good commit via `vercel --prod`
4. **Fix**: Identify root cause, fix, test, redeploy
5. **Document**: Create ADR if architecture change needed

#### SEV-2: Wrong Results
1. **Detect**: User reports implausible numbers, or spot-check reveals errors
2. **Triage**: Identify which calculation component is wrong (Monte Carlo, Gordon-Loeb, lookup table)
3. **Mitigate**: Add banner: "Results may be inaccurate, investigating"
4. **Fix**: Unit test the failing case, fix, verify against known-good values
5. **Validate**: Run full test suite including edge cases

### 8.3 No-Auth Incident Considerations

Since there's no authentication:
- **No credential breach possible** (no credentials exist)
- **No user data breach possible** (no user data stored)
- **No session hijacking possible** (no sessions)
- **Primary incident types**: service availability, calculation accuracy, XSS

---

## 9. Security Architecture Summary

### Key Security Principles

| Principle | CybRisk Implementation |
|-----------|------------------------|
| **Minimal Attack Surface** | Single POST endpoint, enum-only inputs, no free text |
| **Defense in Depth** | 6 layers from network to client (see diagram above) |
| **Privacy by Design** | Zero data storage, no cookies, no tracking |
| **Fail Secure** | Invalid input returns 400; computation errors return 500 with generic message |
| **Least Privilege** | Vercel function has no database access, no secrets, no outbound network |
| **Input Validation as Primary Defense** | Zod strict schema is the main security control |

### What's Intentionally Out of Scope

| Control | Why It's Out of Scope |
|---------|----------------------|
| Authentication | No user data to protect; explicitly a non-goal |
| Encryption at rest | No data at rest |
| Audit logging | No persistent actions to audit |
| RBAC | Single anonymous role |
| Kill switches | No persistent processes to kill |
| Agent security | Not an agentic system |

---

*Document generated by North Star Advisor*
