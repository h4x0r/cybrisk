'use client';

import type { Currency } from '@/lib/currency';

const CURRENCIES: Currency[] = ['USD', 'GBP', 'EUR', 'HKD', 'SGD'];

interface Props {
  currency: Currency;
  onChange: (c: Currency) => void;
}

export function CurrencySelector({ currency, onChange }: Props) {
  return (
    <div className="flex items-center gap-1">
      {CURRENCIES.map(c => (
        <button
          key={c}
          onClick={() => onChange(c)}
          className={`px-2 py-0.5 text-xs font-mono rounded transition-colors ${
            c === currency
              ? 'bg-cyan-500 text-black font-bold'
              : 'bg-white/5 text-slate-400 hover:bg-white/10'
          }`}
        >
          {c}
        </button>
      ))}
    </div>
  );
}
