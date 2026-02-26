/**
 * TDD for src/lib/share-url.ts
 *
 * encodeInputs  → URL-safe base64 string of AssessmentInputs
 * decodeInputs  → AssessmentInputs | null (null on bad input)
 * deriveShareSeed → deterministic integer seed from inputs
 */

import { describe, it, expect } from 'vitest';
import { encodeInputs, decodeInputs, deriveShareSeed } from '@/lib/share-url';
import type { AssessmentInputs } from '@/lib/types';

const INPUTS: AssessmentInputs = {
  company: {
    industry: 'healthcare',
    revenueBand: '250m_1b',
    employees: '1000_5000',
    geography: 'eu',
  },
  data: {
    dataTypes: ['health_records', 'customer_pii'],
    recordCount: 1_000_000,
    cloudPercentage: 30,
  },
  controls: {
    securityTeam: true,
    irPlan: false,
    aiAutomation: false,
    mfa: true,
    pentest: false,
    cyberInsurance: true,
  },
  threats: {
    topConcerns: ['ransomware'],
    previousIncidents: '1',
  },
};

describe('encodeInputs', () => {
  it('returns a non-empty string', () => {
    expect(encodeInputs(INPUTS).length).toBeGreaterThan(0);
  });

  it('returns a URL-safe string (no +, /, or = characters)', () => {
    const encoded = encodeInputs(INPUTS);
    expect(encoded).not.toContain('+');
    expect(encoded).not.toContain('/');
    expect(encoded).not.toContain('=');
  });

  it('is deterministic — same inputs produce same encoded string', () => {
    expect(encodeInputs(INPUTS)).toBe(encodeInputs(INPUTS));
  });
});

describe('decodeInputs', () => {
  it('round-trips correctly through encode → decode', () => {
    const encoded = encodeInputs(INPUTS);
    const decoded = decodeInputs(encoded);
    expect(decoded).toEqual(INPUTS);
  });

  it('returns null for empty string', () => {
    expect(decodeInputs('')).toBeNull();
  });

  it('returns null for invalid base64', () => {
    expect(decodeInputs('!!!not-valid!!!')).toBeNull();
  });

  it('returns null for valid base64 but invalid JSON', () => {
    // base64 of "not json"
    const bad = btoa('not json').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
    expect(decodeInputs(bad)).toBeNull();
  });

  it('returns null for valid JSON that fails AssessmentInputs schema', () => {
    const badData = { company: { industry: 'not_a_real_industry' } };
    const encoded = btoa(JSON.stringify(badData))
      .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
    expect(decodeInputs(encoded)).toBeNull();
  });
});

describe('deriveShareSeed', () => {
  it('returns a positive integer', () => {
    const seed = deriveShareSeed(INPUTS);
    expect(Number.isInteger(seed)).toBe(true);
    expect(seed).toBeGreaterThan(0);
  });

  it('is deterministic — same inputs produce same seed', () => {
    expect(deriveShareSeed(INPUTS)).toBe(deriveShareSeed(INPUTS));
  });

  it('produces different seeds for different inputs', () => {
    const modified = { ...INPUTS, data: { ...INPUTS.data, recordCount: 999 } };
    expect(deriveShareSeed(INPUTS)).not.toBe(deriveShareSeed(modified));
  });
});
