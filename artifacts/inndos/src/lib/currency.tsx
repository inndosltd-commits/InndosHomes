import React, { createContext, useContext, useState, useEffect } from 'react';

type Currency = 'KES' | 'USD' | 'EUR' | 'GBP';

interface CurrencyContextType {
  currency: Currency;
  setCurrency: (c: Currency) => void;
  convert: (amountInKes: number) => string;
}

// Mock exchange rates relative to KES
const rates: Record<Currency, number> = {
  KES: 1,
  USD: 0.0076,
  EUR: 0.0070,
  GBP: 0.0060,
};

const symbols: Record<Currency, string> = {
  KES: 'KSh ',
  USD: '$',
  EUR: '€',
  GBP: '£',
};

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [currency, setCurrency] = useState<Currency>(() => {
    return (localStorage.getItem('currency') as Currency) || 'KES';
  });

  useEffect(() => {
    localStorage.setItem('currency', currency);
  }, [currency]);

  const convert = (amountInKes: number) => {
    const converted = amountInKes * rates[currency];
    return `${symbols[currency]}${converted.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
  };

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency, convert }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const context = useContext(CurrencyContext);
  if (!context) throw new Error('useCurrency must be used within CurrencyProvider');
  return context;
}
