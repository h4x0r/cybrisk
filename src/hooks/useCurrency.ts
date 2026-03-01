'use client';

import { useState, useEffect } from 'react';
import { type Currency, FALLBACK_RATES } from '@/lib/currency';

const STORAGE_KEY = 'cybrisk_currency';

export function useCurrency() {
  const [currency, setCurrencyState] = useState<Currency>('USD');
  const [rates, setRates] = useState(FALLBACK_RATES);

  // Restore persisted currency on mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY) as Currency | null;
    if (saved && ['USD', 'GBP', 'EUR', 'HKD', 'SGD'].includes(saved)) {
      setCurrencyState(saved);
    }
  }, []);

  // Fetch live FX rates on mount
  useEffect(() => {
    fetch('/api/fx-rates')
      .then(r => r.json())
      .then(data => {
        if (data && typeof data.USD === 'number') {
          setRates(data);
        }
      })
      .catch(() => {}); // silently use fallback rates
  }, []);

  const setCurrency = (c: Currency) => {
    setCurrencyState(c);
    localStorage.setItem(STORAGE_KEY, c);
  };

  return { currency, setCurrency, rates };
}
