'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { loadHistory, deleteFromHistory, type HistoryEntry } from '@/lib/history-utils';
import { formatCurrency, FALLBACK_RATES } from '@/lib/currency';

export default function HistoryPage() {
  const router = useRouter();
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setEntries(loadHistory());
    setMounted(true);
  }, []);

  const handleLoad = (entry: HistoryEntry) => {
    sessionStorage.setItem('cybrisk_restore', JSON.stringify(entry));
    router.push('/results');
  };

  const handleDelete = (id: string) => {
    deleteFromHistory(id);
    setEntries(loadHistory());
  };

  const handleClearAll = () => {
    entries.forEach(e => deleteFromHistory(e.id));
    setEntries([]);
  };

  if (!mounted) return null;

  return (
    <main className="min-h-screen bg-[#0a0e14] text-white px-4 py-8 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-white">Assessment History</h1>
        {entries.length > 0 && (
          <button
            onClick={handleClearAll}
            className="text-xs text-slate-500 hover:text-red-400 transition-colors"
          >
            Clear all
          </button>
        )}
      </div>

      {entries.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-slate-500 mb-4">No saved assessments yet.</p>
          <a href="/assess" className="text-cyan-400 text-sm hover:underline">
            Run your first assessment →
          </a>
        </div>
      ) : (
        <div className="space-y-2">
          {entries.map(entry => (
            <div
              key={entry.id}
              className="flex items-center justify-between rounded-lg px-4 py-3"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white truncate">{entry.label}</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  ALE {formatCurrency(entry.results.ale.mean, entry.currency, FALLBACK_RATES)}
                  {' · '}
                  {new Date(entry.savedAt).toLocaleDateString('en-GB')}
                </p>
              </div>
              <div className="flex items-center gap-2 ml-4 shrink-0">
                <button
                  onClick={() => handleLoad(entry)}
                  className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
                >
                  Load
                </button>
                <button
                  onClick={() => handleDelete(entry.id)}
                  className="text-xs text-slate-600 hover:text-red-400 transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
