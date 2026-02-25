'use client';

import dynamic from 'next/dynamic';
import WizardShell from '@/components/assess/WizardShell';

const ScientistBg = dynamic(() => import('@/components/landing/ScientistBg'), {
  ssr: false,
});

export default function AssessPage() {
  return (
    <main className="relative min-h-screen" style={{ background: '#060a18' }}>
      <ScientistBg />
      <div className="relative z-10 flex items-center justify-center min-h-screen p-4">
        <WizardShell />
      </div>
    </main>
  );
}
