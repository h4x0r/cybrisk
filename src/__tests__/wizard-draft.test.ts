import { describe, it, expect } from 'vitest';
import { saveDraft, loadDraft, clearDraft } from '@/lib/wizard-draft';
import type { AssessmentInputs } from '@/lib/types';

const makeStore = () => {
  let data: string | null = null;
  return {
    getItem: (_k: string) => data,
    setItem: (_k: string, v: string) => { data = v; },
    removeItem: (_k: string) => { data = null; },
  };
};

const DRAFT: Partial<AssessmentInputs> = {
  company: { industry: 'financial', revenueBand: '50m_250m', employees: '250_1000', geography: 'us' },
  data: { dataTypes: ['customer_pii'], recordCount: 100_000, cloudPercentage: 50 },
};

describe('wizard-draft', () => {
  it('saveDraft → loadDraft returns same data', () => {
    const store = makeStore();
    saveDraft(DRAFT, store);
    expect(loadDraft(store)).toEqual(DRAFT);
  });

  it('loadDraft returns null when storage is empty', () => {
    const store = makeStore();
    expect(loadDraft(store)).toBeNull();
  });

  it('loadDraft returns null when storage contains invalid JSON', () => {
    const store = makeStore();
    store.setItem('cybrisk_draft', '{ bad json');
    expect(loadDraft(store)).toBeNull();
  });

  it('clearDraft removes the entry', () => {
    const store = makeStore();
    saveDraft(DRAFT, store);
    clearDraft(store);
    expect(loadDraft(store)).toBeNull();
  });
});
