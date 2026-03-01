import type { AssessmentInputs } from '@/lib/types';

/**
 * Return a copy of inputs with cloudPercentage overridden.
 * Clamps to [0, 100].
 */
export function applyCloudOverride(
  inputs: AssessmentInputs,
  cloudPercentage: number,
): AssessmentInputs {
  return {
    ...inputs,
    data: {
      ...inputs.data,
      cloudPercentage: Math.max(0, Math.min(100, cloudPercentage)),
    },
  };
}
