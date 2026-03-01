import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('NarrativePanel accessibility', () => {
  it('source contains aria-live="polite" on the container div', () => {
    const src = readFileSync(
      resolve(process.cwd(), 'src/components/results/NarrativePanel.tsx'),
      'utf-8',
    );
    expect(src).toContain('aria-live="polite"');
  });

  it('source contains aria-busy', () => {
    const src = readFileSync(
      resolve(process.cwd(), 'src/components/results/NarrativePanel.tsx'),
      'utf-8',
    );
    expect(src).toContain('aria-busy');
  });
});
