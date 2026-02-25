'use client';

import { Slider } from '@/components/ui/slider';
import type { AssessmentInputs, DataType } from '@/lib/types';

interface StepProps {
  data: Partial<AssessmentInputs>;
  onUpdate: (data: Partial<AssessmentInputs>) => void;
}

const DATA_TYPE_OPTIONS: { key: DataType; label: string; icon: string }[] = [
  { key: 'customer_pii', label: 'Customer PII', icon: 'USR' },
  { key: 'employee_pii', label: 'Employee PII', icon: 'EMP' },
  { key: 'payment_card', label: 'Payment Card (PCI)', icon: 'PCI' },
  { key: 'health_records', label: 'Health Records (PHI)', icon: 'PHI' },
  { key: 'ip', label: 'Intellectual Property', icon: 'IP\u2009' },
  { key: 'financial', label: 'Financial Records', icon: 'FIN' },
];

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return n.toString();
}

export default function StepDataProfile({ data, onUpdate }: StepProps) {
  const profile = data.data ?? {
    dataTypes: [],
    recordCount: 100000,
    cloudPercentage: 50,
  };

  const updateProfile = (updates: Partial<AssessmentInputs['data']>) => {
    onUpdate({
      data: {
        ...profile,
        ...updates,
      } as AssessmentInputs['data'],
    });
  };

  const toggleDataType = (dt: DataType) => {
    const current = profile.dataTypes ?? [];
    const next = current.includes(dt)
      ? current.filter((t) => t !== dt)
      : [...current, dt];
    updateProfile({ dataTypes: next });
  };

  const handleRecordCount = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^0-9]/g, '');
    const num = parseInt(raw, 10);
    if (!isNaN(num)) {
      updateProfile({ recordCount: num });
    } else if (raw === '') {
      updateProfile({ recordCount: 0 });
    }
  };

  return (
    <div className="space-y-8">
      <div className="mb-6">
        <h2
          className="text-xl font-semibold text-[#f0f4ff] mb-1"
          style={{ fontFamily: 'var(--font-playfair)' }}
        >
          Data Profile
        </h2>
        <p
          className="text-sm"
          style={{ fontFamily: 'var(--font-geist-mono)', color: '#4a6080' }}
        >
          // data types determine per-record breach cost multipliers
        </p>
      </div>

      {/* Data Types Grid */}
      <div className="space-y-3">
        <label
          className="text-xs uppercase tracking-wider"
          style={{ fontFamily: 'var(--font-geist-mono)', color: '#6888aa' }}
        >
          Data Types Held
        </label>
        <div className="grid grid-cols-2 gap-3">
          {DATA_TYPE_OPTIONS.map((dt) => {
            const selected = (profile.dataTypes ?? []).includes(dt.key);
            return (
              <button
                key={dt.key}
                type="button"
                onClick={() => toggleDataType(dt.key)}
                className="group relative p-4 rounded-lg text-left transition-all duration-200"
                style={{
                  background: selected
                    ? 'rgba(0,180,255,0.08)'
                    : 'rgba(4,8,28,0.6)',
                  border: selected
                    ? '1px solid rgba(0,212,255,0.5)'
                    : '1px solid rgba(0,180,255,0.1)',
                  boxShadow: selected
                    ? '0 0 20px -6px rgba(0,180,255,0.3)'
                    : 'none',
                }}
              >
                <div className="flex items-center gap-3">
                  <span
                    className="text-xs font-bold px-1.5 py-0.5 rounded"
                    style={{
                      fontFamily: 'var(--font-geist-mono)',
                      background: selected
                        ? 'rgba(0,212,255,0.15)'
                        : 'rgba(0,100,200,0.08)',
                      color: selected ? '#00d4ff' : '#4a6080',
                    }}
                  >
                    {dt.icon}
                  </span>
                  <span
                    className="text-sm font-medium"
                    style={{ color: selected ? '#e0ecff' : '#6888aa' }}
                  >
                    {dt.label}
                  </span>
                </div>
                {/* Toggle indicator */}
                <div
                  className="absolute top-2 right-2 w-2 h-2 rounded-full transition-all"
                  style={{
                    background: selected ? '#00d4ff' : 'rgba(0,100,200,0.15)',
                    boxShadow: selected
                      ? '0 0 8px rgba(0,212,255,0.5)'
                      : 'none',
                  }}
                />
              </button>
            );
          })}
        </div>
      </div>

      {/* Record Count */}
      <div className="space-y-2">
        <label
          className="text-xs uppercase tracking-wider"
          style={{ fontFamily: 'var(--font-geist-mono)', color: '#6888aa' }}
        >
          Approximate Records Held
        </label>
        <div className="relative">
          <input
            type="text"
            value={profile.recordCount?.toLocaleString() ?? '100,000'}
            onChange={handleRecordCount}
            className="w-full h-9 rounded-md px-3 py-1 text-sm bg-transparent outline-none transition-all"
            style={{
              fontFamily: 'var(--font-geist-mono)',
              color: '#f0f4ff',
              border: '1px solid rgba(0,180,255,0.2)',
            }}
          />
          <span
            className="absolute right-3 top-1/2 -translate-y-1/2 text-xs"
            style={{
              fontFamily: 'var(--font-geist-mono)',
              color: '#4a6080',
            }}
          >
            {formatNumber(profile.recordCount ?? 100000)} records
          </span>
        </div>
      </div>

      {/* Cloud Percentage */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label
            className="text-xs uppercase tracking-wider"
            style={{ fontFamily: 'var(--font-geist-mono)', color: '#6888aa' }}
          >
            Cloud vs. On-Premise
          </label>
          <span
            className="text-sm font-bold"
            style={{
              fontFamily: 'var(--font-geist-mono)',
              color: '#00d4ff',
            }}
          >
            {profile.cloudPercentage ?? 50}% cloud
          </span>
        </div>
        <Slider
          value={[profile.cloudPercentage ?? 50]}
          onValueChange={(v) => updateProfile({ cloudPercentage: v[0] })}
          min={0}
          max={100}
          step={5}
          className="[&_[data-slot=slider-track]]:bg-[rgba(0,100,200,0.15)] [&_[data-slot=slider-range]]:bg-[#00d4ff] [&_[data-slot=slider-thumb]]:border-[#00d4ff] [&_[data-slot=slider-thumb]]:bg-[#0a0f24]"
        />
        <div
          className="flex justify-between text-[10px]"
          style={{ fontFamily: 'var(--font-geist-mono)', color: '#3a4560' }}
        >
          <span>0% On-Prem Only</span>
          <span>100% Full Cloud</span>
        </div>
      </div>
    </div>
  );
}
