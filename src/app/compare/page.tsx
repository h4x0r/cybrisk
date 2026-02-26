'use client';

import dynamic from 'next/dynamic';

const ScientistBg = dynamic(() => import('@/components/landing/ScientistBg'), { ssr: false });
const CompareShell = dynamic(() => import('@/components/compare/CompareShell'), { ssr: false });

export default function ComparePage() {
  return (
    <main className="relative min-h-screen" style={{ background: '#060a18' }}>
      <ScientistBg />
      <div className="relative z-10 py-8">
        <CompareShell />
      </div>
    </main>
  );
}
