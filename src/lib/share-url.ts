/**
 * Shareable URL encoding/decoding for AssessmentInputs.
 *
 * Uses URL-safe base64 (RFC 4648 §5) so the result can be placed
 * directly in a query parameter without percent-encoding.
 *
 * deriveShareSeed produces a deterministic integer seed from the inputs
 * so that a shared URL always produces the same Monte Carlo results.
 */

import { z } from 'zod';

// ---------------------------------------------------------------------------
// Zod schema — mirrors AssessmentInputsSchema in the API route
// ---------------------------------------------------------------------------
const AssessmentInputsSchema = z.object({
  company: z.object({
    organizationName: z.string().optional(),
    industry: z.enum([
      'healthcare', 'financial', 'pharmaceuticals', 'technology', 'energy',
      'industrial', 'services', 'retail', 'education', 'entertainment',
      'communications', 'consumer', 'media', 'research', 'transportation',
      'hospitality', 'public_sector',
    ]),
    revenueBand: z.enum(['under_50m', '50m_250m', '250m_1b', '1b_5b', 'over_5b']),
    employees: z.enum(['under_250', '250_1000', '1000_5000', '5000_25000', 'over_25000']),
    geography: z.enum(['us', 'uk', 'eu', 'hk', 'sg', 'other']),
  }),
  data: z.object({
    dataTypes: z.array(z.enum([
      'customer_pii', 'employee_pii', 'payment_card', 'health_records', 'ip', 'financial',
    ])).min(1),
    recordCount: z.number().int().positive(),
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
    topConcerns: z.array(z.enum([
      'ransomware', 'bec_phishing', 'insider_threat', 'third_party',
      'web_app_attack', 'system_intrusion', 'lost_stolen',
    ])).min(1),
    previousIncidents: z.enum(['0', '1', '2_5', '5_plus']),
  }),
});

// ---------------------------------------------------------------------------
// URL-safe base64 helpers (RFC 4648 §5)
// ---------------------------------------------------------------------------
function toBase64Url(str: string): string {
  return btoa(str)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

function fromBase64Url(encoded: string): string {
  const padded = encoded.replace(/-/g, '+').replace(/_/g, '/');
  const padding = padded.length % 4 === 0 ? '' : '='.repeat(4 - (padded.length % 4));
  return atob(padded + padding);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Encode AssessmentInputs to a URL-safe base64 string.
 */
export function encodeInputs(inputs: object): string {
  return toBase64Url(JSON.stringify(inputs));
}

/**
 * Decode a URL-safe base64 string back to AssessmentInputs.
 * Returns null if the string is empty, malformed, or fails schema validation.
 */
export function decodeInputs(encoded: string): ReturnType<typeof AssessmentInputsSchema.parse> | null {
  if (!encoded) return null;
  try {
    const json = fromBase64Url(encoded);
    const parsed = JSON.parse(json);
    return AssessmentInputsSchema.parse(parsed);
  } catch {
    return null;
  }
}

/**
 * Derive a deterministic integer seed from AssessmentInputs using djb2 hash.
 * Same inputs → same seed → same Monte Carlo results.
 */
export function deriveShareSeed(inputs: object): number {
  const str = JSON.stringify(inputs);
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) ^ str.charCodeAt(i);
    hash = hash & 0x7fffffff; // keep positive 31-bit int
  }
  return hash || 1; // never 0
}
