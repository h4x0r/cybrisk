'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { AssessmentInputs } from '@/lib/types';

import StepCompanyProfile from './StepCompanyProfile';
import StepDataProfile from './StepDataProfile';
import StepSecurityControls from './StepSecurityControls';
import StepThreatLandscape from './StepThreatLandscape';
import StepReview from './StepReview';

const STEPS = [
  { label: 'COMPANY PROFILE', component: StepCompanyProfile },
  { label: 'DATA PROFILE', component: StepDataProfile },
  { label: 'SECURITY CONTROLS', component: StepSecurityControls },
  { label: 'THREAT LANDSCAPE', component: StepThreatLandscape },
  { label: 'REVIEW & CALCULATE', component: StepReview },
] as const;

function buildProgressBar(current: number, total: number): string {
  const filled = Math.round((current + 1) / total * 10);
  const empty = 10 - filled;
  return '\u2588'.repeat(filled) + '\u2591'.repeat(empty);
}

export default function WizardShell() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [data, setData] = useState<Partial<AssessmentInputs>>({
    data: { dataTypes: [], recordCount: 100000, cloudPercentage: 50 },
    controls: {
      securityTeam: false,
      irPlan: false,
      aiAutomation: false,
      mfa: false,
      pentest: false,
      cyberInsurance: false,
    },
    threats: { topConcerns: [], previousIncidents: '0' },
  });
  const [error, setError] = useState<string | null>(null);
  const [direction, setDirection] = useState<'forward' | 'back'>('forward');

  const onUpdate = useCallback(
    (partial: Partial<AssessmentInputs>) => {
      setData((prev) => {
        const merged = { ...prev };
        if (partial.company) {
          merged.company = { ...prev.company, ...partial.company } as AssessmentInputs['company'];
        }
        if (partial.data) {
          merged.data = { ...prev.data, ...partial.data } as AssessmentInputs['data'];
        }
        if (partial.controls) {
          merged.controls = { ...prev.controls, ...partial.controls } as AssessmentInputs['controls'];
        }
        if (partial.threats) {
          merged.threats = { ...prev.threats, ...partial.threats } as AssessmentInputs['threats'];
        }
        return merged;
      });
      setError(null);
    },
    []
  );

  const validate = (): string | null => {
    switch (step) {
      case 0: {
        const c = data.company;
        if (!c?.industry) return 'Please select an industry.';
        if (!c?.revenueBand) return 'Please select a revenue band.';
        if (!c?.employees) return 'Please select an employee count.';
        if (!c?.geography) return 'Please select a geography.';
        return null;
      }
      case 1: {
        const d = data.data;
        if (!d?.dataTypes || d.dataTypes.length === 0)
          return 'Please select at least one data type.';
        return null;
      }
      case 2:
        return null; // Controls are all optional (defaults to false)
      case 3: {
        const t = data.threats;
        if (!t?.topConcerns || t.topConcerns.length === 0)
          return 'Please select at least one threat concern.';
        return null;
      }
      default:
        return null;
    }
  };

  const handleNext = () => {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);

    if (step === STEPS.length - 1) {
      // Final submit
      sessionStorage.setItem('assessment', JSON.stringify(data));
      router.push('/simulate');
      return;
    }

    setDirection('forward');
    setStep((s) => s + 1);
  };

  const handleBack = () => {
    setError(null);
    setDirection('back');
    setStep((s) => Math.max(0, s - 1));
  };

  const CurrentStep = STEPS[step].component;
  const isFinalStep = step === STEPS.length - 1;

  return (
    <div className="w-full max-w-2xl animate-fade-up" style={{ animationDelay: '100ms' }}>
      {/* Terminal card */}
      <div
        className="rounded-2xl relative animate-border-glow overflow-hidden"
        style={{
          background: 'rgba(4, 8, 28, 0.92)',
          border: '1px solid rgba(0,180,255,0.18)',
          backdropFilter: 'blur(18px)',
        }}
      >
        {/* Top gradient wash */}
        <div
          className="absolute inset-0 rounded-2xl pointer-events-none"
          style={{
            background:
              'linear-gradient(180deg, rgba(0,140,255,0.04) 0%, transparent 35%)',
          }}
        />

        <div className="relative z-10">
          {/* Progress header */}
          <div
            className="px-6 pt-6 pb-4"
            style={{ borderBottom: '1px solid rgba(0,180,255,0.08)' }}
          >
            <div
              className="text-sm tracking-wide"
              style={{ fontFamily: 'var(--font-geist-mono)', color: '#4a6080' }}
            >
              <span style={{ color: '#00d4ff' }}>
                {buildProgressBar(step, STEPS.length)}
              </span>{' '}
              <span style={{ color: '#6888aa' }}>
                {step + 1}/{STEPS.length}
              </span>{' '}
              <span style={{ color: 'rgba(0,180,255,0.2)' }}>{'──'}</span>{' '}
              <span style={{ color: '#8899bb' }}>{STEPS[step].label}</span>
            </div>
          </div>

          {/* Step content */}
          <div
            key={step}
            className="px-6 py-6"
            style={{
              animation: `${direction === 'forward' ? 'slideInRight' : 'slideInLeft'} 0.3s ease-out`,
            }}
          >
            <CurrentStep data={data} onUpdate={onUpdate} />
          </div>

          {/* Error message */}
          {error && (
            <div
              className="mx-6 mb-2 px-4 py-2 rounded-lg text-xs"
              style={{
                fontFamily: 'var(--font-geist-mono)',
                background: 'rgba(239,68,68,0.08)',
                border: '1px solid rgba(239,68,68,0.2)',
                color: '#ef4444',
              }}
            >
              {error}
            </div>
          )}

          {/* Navigation */}
          <div
            className="px-6 pb-6 pt-4 flex items-center justify-between"
            style={{ borderTop: '1px solid rgba(0,180,255,0.08)' }}
          >
            <Button
              variant="ghost"
              onClick={handleBack}
              disabled={step === 0}
              className="text-[#6888aa] hover:text-[#00d4ff] hover:bg-[rgba(0,180,255,0.06)] disabled:opacity-30"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back
            </Button>

            <Button
              onClick={handleNext}
              className={`px-6 transition-all ${
                isFinalStep
                  ? 'animate-glow-pulse bg-gradient-to-r from-[#0060d0] to-[#00b0f0] text-white hover:scale-[1.03]'
                  : 'bg-[rgba(0,180,255,0.12)] text-[#00d4ff] border border-[rgba(0,180,255,0.3)] hover:bg-[rgba(0,180,255,0.2)]'
              }`}
              style={
                isFinalStep
                  ? {
                      fontFamily: 'var(--font-geist-mono)',
                      fontWeight: 700,
                      letterSpacing: '0.05em',
                    }
                  : {}
              }
            >
              {isFinalStep ? (
                <>
                  RUN SIMULATION
                  <ArrowRight className="w-4 h-4 ml-1" />
                </>
              ) : (
                <>
                  Next
                  <ArrowRight className="w-4 h-4 ml-1" />
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Inline animation keyframes */}
      <style jsx>{`
        @keyframes slideInRight {
          from {
            opacity: 0;
            transform: translateX(24px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        @keyframes slideInLeft {
          from {
            opacity: 0;
            transform: translateX(-24px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
      `}</style>
    </div>
  );
}
