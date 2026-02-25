'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { AssessmentInputs, SimulationResults } from '@/lib/types';
import FluidCanvas from '@/components/simulate/FluidCanvas';
import SimConsole from '@/components/simulate/SimConsole';

export default function SimulatePage() {
  const router = useRouter();
  const [inputs, setInputs] = useState<AssessmentInputs | null>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const stored = sessionStorage.getItem('assessment');
    if (!stored) {
      router.replace('/assess');
      return;
    }
    try {
      setInputs(JSON.parse(stored) as AssessmentInputs);
    } catch {
      router.replace('/assess');
    }
  }, [router]);

  const handleComplete = (results: SimulationResults) => {
    sessionStorage.setItem('results', JSON.stringify(results));
    router.push('/results');
  };

  if (!inputs) return null;

  return (
    <main
      className="relative min-h-screen overflow-hidden"
      style={{ background: '#060a18' }}
    >
      <FluidCanvas progress={progress} />
      <div className="relative z-10 flex items-center justify-center min-h-screen p-4">
        <SimConsole
          inputs={inputs}
          onComplete={handleComplete}
          onProgress={setProgress}
        />
      </div>
    </main>
  );
}
