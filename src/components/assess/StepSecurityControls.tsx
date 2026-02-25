'use client';

import type { AssessmentInputs, SecurityControls } from '@/lib/types';

interface StepProps {
  data: Partial<AssessmentInputs>;
  onUpdate: (data: Partial<AssessmentInputs>) => void;
}

const CONTROL_QUESTIONS: {
  key: keyof SecurityControls;
  question: string;
  tag: string;
}[] = [
  {
    key: 'securityTeam',
    question: 'Do you have a dedicated security team or CISO?',
    tag: 'TEAM',
  },
  {
    key: 'irPlan',
    question: 'Do you have an incident response plan?',
    tag: 'IR',
  },
  {
    key: 'aiAutomation',
    question: 'Do you use security AI/automation tools?',
    tag: 'AI',
  },
  {
    key: 'mfa',
    question: 'Do you have MFA on all critical systems?',
    tag: 'MFA',
  },
  {
    key: 'pentest',
    question: 'Do you perform regular penetration testing?',
    tag: 'PEN',
  },
  {
    key: 'cyberInsurance',
    question: 'Do you have cyber insurance?',
    tag: 'INS',
  },
];

export default function StepSecurityControls({ data, onUpdate }: StepProps) {
  const controls: SecurityControls = data.controls ?? {
    securityTeam: false,
    irPlan: false,
    aiAutomation: false,
    mfa: false,
    pentest: false,
    cyberInsurance: false,
  };

  const toggle = (key: keyof SecurityControls) => {
    onUpdate({
      controls: {
        ...controls,
        [key]: !controls[key],
      },
    });
  };

  const enabledCount = Object.values(controls).filter(Boolean).length;

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h2
          className="text-xl font-semibold text-[#f0f4ff] mb-1"
          style={{ fontFamily: 'var(--font-playfair)' }}
        >
          Security Controls
        </h2>
        <p
          className="text-sm"
          style={{ fontFamily: 'var(--font-geist-mono)', color: '#4a6080' }}
        >
          // each control modifies breach probability & cost (IBM 2025)
        </p>
      </div>

      {/* Controls score indicator */}
      <div
        className="flex items-center gap-3 p-3 rounded-lg"
        style={{
          background: 'rgba(0,180,255,0.04)',
          border: '1px solid rgba(0,180,255,0.1)',
        }}
      >
        <span
          className="text-2xl font-bold"
          style={{
            fontFamily: 'var(--font-geist-mono)',
            color:
              enabledCount >= 5
                ? '#22c55e'
                : enabledCount >= 3
                  ? '#ffd060'
                  : '#ef4444',
          }}
        >
          {enabledCount}/6
        </span>
        <span
          className="text-xs"
          style={{ fontFamily: 'var(--font-geist-mono)', color: '#4a6080' }}
        >
          CONTROLS ACTIVE
        </span>
      </div>

      {/* Control toggles */}
      <div className="space-y-2">
        {CONTROL_QUESTIONS.map((ctrl) => {
          const isOn = controls[ctrl.key];
          return (
            <button
              key={ctrl.key}
              type="button"
              onClick={() => toggle(ctrl.key)}
              className="w-full flex items-center gap-4 p-4 rounded-lg text-left transition-all duration-200"
              style={{
                background: isOn
                  ? 'rgba(0,180,255,0.04)'
                  : 'rgba(4,8,28,0.4)',
                border: isOn
                  ? '1px solid rgba(0,180,255,0.2)'
                  : '1px solid rgba(0,180,255,0.06)',
              }}
            >
              {/* Tag */}
              <span
                className="text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 w-10 text-center"
                style={{
                  fontFamily: 'var(--font-geist-mono)',
                  background: isOn
                    ? 'rgba(0,212,255,0.12)'
                    : 'rgba(0,100,200,0.06)',
                  color: isOn ? '#00d4ff' : '#3a4560',
                }}
              >
                {ctrl.tag}
              </span>

              {/* Question */}
              <span
                className="flex-1 text-sm"
                style={{ color: isOn ? '#c0d0e8' : '#5a6a80' }}
              >
                {ctrl.question}
              </span>

              {/* Toggle */}
              <span
                className="text-xs font-bold px-2 py-1 rounded shrink-0"
                style={{
                  fontFamily: 'var(--font-geist-mono)',
                  background: isOn
                    ? 'rgba(0,212,255,0.15)'
                    : 'rgba(100,40,40,0.15)',
                  color: isOn ? '#00d4ff' : '#6a4040',
                  border: isOn
                    ? '1px solid rgba(0,212,255,0.3)'
                    : '1px solid rgba(100,40,40,0.2)',
                }}
              >
                {isOn ? '[ON]' : '[OFF]'}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
