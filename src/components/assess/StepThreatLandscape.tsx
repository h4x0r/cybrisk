'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type {
  AssessmentInputs,
  ThreatType,
  IncidentHistory,
} from '@/lib/types';

interface StepProps {
  data: Partial<AssessmentInputs>;
  onUpdate: (data: Partial<AssessmentInputs>) => void;
}

const THREAT_OPTIONS: { key: ThreatType; label: string; icon: string }[] = [
  { key: 'ransomware', label: 'Ransomware', icon: 'RNS' },
  { key: 'bec_phishing', label: 'BEC / Phishing', icon: 'BEC' },
  { key: 'insider_threat', label: 'Insider Threat', icon: 'INS' },
  { key: 'third_party', label: 'Third-Party / Supply Chain', icon: '3RD' },
  { key: 'web_app_attack', label: 'Web Application Attack', icon: 'WEB' },
  { key: 'system_intrusion', label: 'System Intrusion', icon: 'SYS' },
  { key: 'lost_stolen', label: 'Lost / Stolen Assets', icon: 'LST' },
];

const INCIDENT_LABELS: Record<IncidentHistory, string> = {
  '0': 'None',
  '1': '1',
  '2_5': '2-5',
  '5_plus': '5+',
};

export default function StepThreatLandscape({ data, onUpdate }: StepProps) {
  const threats = data.threats ?? {
    topConcerns: [] as ThreatType[],
    previousIncidents: '0' as IncidentHistory,
  };

  const toggleThreat = (t: ThreatType) => {
    const current = threats.topConcerns ?? [];
    if (current.includes(t)) {
      onUpdate({
        threats: {
          ...threats,
          topConcerns: current.filter((x) => x !== t),
        },
      });
    } else if (current.length < 3) {
      onUpdate({
        threats: {
          ...threats,
          topConcerns: [...current, t],
        },
      });
    }
  };

  const selectedCount = (threats.topConcerns ?? []).length;

  return (
    <div className="space-y-8">
      <div className="mb-6">
        <h2
          className="text-xl font-semibold text-[#f0f4ff] mb-1"
          style={{ fontFamily: 'var(--font-playfair)' }}
        >
          Threat Landscape
        </h2>
        <p
          className="text-sm"
          style={{ fontFamily: 'var(--font-geist-mono)', color: '#4a6080' }}
        >
          // top concerns weight Monte Carlo threat event frequencies
        </p>
      </div>

      {/* Threat selection */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label
            className="text-xs uppercase tracking-wider"
            style={{ fontFamily: 'var(--font-geist-mono)', color: '#6888aa' }}
          >
            Select Your Top 3 Concerns
          </label>
          <span
            className="text-sm font-bold"
            style={{
              fontFamily: 'var(--font-geist-mono)',
              color:
                selectedCount === 3
                  ? '#22c55e'
                  : selectedCount > 0
                    ? '#ffd060'
                    : '#4a6080',
            }}
          >
            {selectedCount}/3 selected
          </span>
        </div>

        <div className="space-y-2">
          {THREAT_OPTIONS.map((threat) => {
            const selected = (threats.topConcerns ?? []).includes(threat.key);
            const atMax = selectedCount >= 3 && !selected;

            return (
              <button
                key={threat.key}
                type="button"
                onClick={() => toggleThreat(threat.key)}
                disabled={atMax}
                className="w-full flex items-center gap-4 p-4 rounded-lg text-left transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
                style={{
                  background: selected
                    ? 'rgba(0,180,255,0.08)'
                    : 'rgba(4,8,28,0.5)',
                  border: selected
                    ? '1px solid rgba(0,212,255,0.5)'
                    : '1px solid rgba(0,180,255,0.08)',
                  boxShadow: selected
                    ? '0 0 20px -6px rgba(0,180,255,0.25)'
                    : 'none',
                }}
              >
                {/* Tag */}
                <span
                  className="text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 w-10 text-center"
                  style={{
                    fontFamily: 'var(--font-geist-mono)',
                    background: selected
                      ? 'rgba(0,212,255,0.15)'
                      : 'rgba(0,100,200,0.06)',
                    color: selected ? '#00d4ff' : '#3a4560',
                  }}
                >
                  {threat.icon}
                </span>

                {/* Label */}
                <span
                  className="flex-1 text-sm font-medium"
                  style={{ color: selected ? '#e0ecff' : '#6888aa' }}
                >
                  {threat.label}
                </span>

                {/* Selection indicator */}
                <div
                  className="w-3 h-3 rounded-full transition-all shrink-0"
                  style={{
                    background: selected
                      ? '#00d4ff'
                      : 'rgba(0,100,200,0.1)',
                    boxShadow: selected
                      ? '0 0 10px rgba(0,212,255,0.5)'
                      : 'none',
                  }}
                />
              </button>
            );
          })}
        </div>
      </div>

      {/* Previous Incidents */}
      <div className="space-y-2">
        <label
          className="text-xs uppercase tracking-wider"
          style={{ fontFamily: 'var(--font-geist-mono)', color: '#6888aa' }}
        >
          Previous Security Incidents (Last 3 Years)
        </label>
        <Select
          value={threats.previousIncidents || '0'}
          onValueChange={(v) =>
            onUpdate({
              threats: {
                ...threats,
                previousIncidents: v as IncidentHistory,
              },
            })
          }
        >
          <SelectTrigger className="w-full bg-transparent text-[#f0f4ff] border-[rgba(0,180,255,0.2)] hover:border-[rgba(0,180,255,0.4)] [&_svg]:text-[#4a6080]">
            <SelectValue placeholder="Select incident history" />
          </SelectTrigger>
          <SelectContent className="bg-[#0a0f24] border-[rgba(0,180,255,0.2)] text-[#f0f4ff]">
            {(Object.keys(INCIDENT_LABELS) as IncidentHistory[]).map((key) => (
              <SelectItem
                key={key}
                value={key}
                className="focus:bg-[rgba(0,180,255,0.1)] focus:text-[#00d4ff] text-[#c0d0e8]"
              >
                {INCIDENT_LABELS[key]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
