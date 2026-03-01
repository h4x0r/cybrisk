'use client';

import { useState } from 'react';
import type { AssessmentInputs, SimulationResults } from '@/lib/types';
import type { Currency } from '@/lib/currency';

interface Props {
  inputs: AssessmentInputs;
  results: SimulationResults;
  currency: Currency;
  rates: Record<Currency, number>;
  narrative?: string;
  onClose: () => void;
}

type Status = 'idle' | 'sending' | 'success' | 'error';

export function EmailModal({ inputs, results, currency, rates, narrative, onClose }: Props) {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const handleSend = async () => {
    if (!email) return;
    setStatus('sending');
    setErrorMsg('');

    try {
      const res = await fetch('/api/send-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, inputs, results, currency, rates, narrative }),
      });

      const data = await res.json() as { ok: boolean; error?: string };

      if (!res.ok || !data.ok) {
        setStatus('error');
        setErrorMsg(data.error ?? 'Something went wrong. Please try again.');
        return;
      }

      setStatus('success');
      setTimeout(onClose, 2000);
    } catch {
      setStatus('error');
      setErrorMsg('Network error. Please check your connection.');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.7)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="rounded-xl p-6 w-full max-w-sm mx-4"
        style={{ background: '#0d1117', border: '1px solid rgba(255,255,255,0.1)' }}
      >
        <h2 className="text-white font-semibold mb-4">Email Report</h2>

        {status === 'success' ? (
          <p className="text-cyan-400 text-sm text-center py-4">
            Report sent — check your inbox
          </p>
        ) : (
          <>
            <input
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleSend(); }}
              disabled={status === 'sending'}
              className="w-full rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 mb-3 outline-none focus:ring-1 focus:ring-cyan-500"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
            />

            {status === 'error' && (
              <p className="text-red-400 text-xs mb-3">{errorMsg}</p>
            )}

            <button
              onClick={handleSend}
              disabled={status === 'sending' || !email}
              className="w-full py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
              style={{
                background: status === 'sending' ? 'rgba(6,182,212,0.4)' : '#06b6d4',
                color: '#000',
              }}
            >
              {status === 'sending' ? 'Sending…' : 'Send Report'}
            </button>

            <p className="text-slate-600 text-xs text-center mt-3">
              Your email is used only to deliver this report.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
