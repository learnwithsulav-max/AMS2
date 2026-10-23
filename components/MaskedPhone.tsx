'use client';

import { useState } from 'react';

export function maskPhone(value: unknown) {
  const phone = typeof value === 'string' ? value : '';
  if (!phone) return '-';
  if (phone.length <= 6) return `${phone.slice(0, 1)}${'*'.repeat(Math.max(3, phone.length - 2))}${phone.slice(-1)}`;
  return `${phone.slice(0, 4)}${'*'.repeat(Math.max(4, phone.length - 6))}${phone.slice(-2)}`;
}

export function MaskedPhone({ value }: { value: unknown }) {
  const [revealed, setRevealed] = useState(false);
  const phone = typeof value === 'string' ? value : '';
  if (!phone) return <span>-</span>;
  return <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
    <span>{revealed ? phone : maskPhone(phone)}</span>
    <button type="button" onClick={() => setRevealed((shown) => !shown)}
      className="rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-brand focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand"
      aria-label={`${revealed ? 'Hide' : 'Show'} phone number`} aria-pressed={revealed} title={revealed ? 'Hide phone number' : 'Show phone number'}>
      {revealed ? <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4 fill-none stroke-current" strokeWidth="1.8"><path d="M3 3l18 18M10.6 10.6a2 2 0 002.8 2.8M9.9 5.2A10.8 10.8 0 0112 5c5.2 0 8.7 4.8 9.5 6-.3.5-1.4 2.1-3.5 3.5M6.2 6.2C3.9 7.7 2.6 9.7 2.5 11c.8 1.2 4.3 6 9.5 6 1 0 2-.2 2.8-.5" /></svg>
        : <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4 fill-none stroke-current" strokeWidth="1.8"><path d="M2.5 12S6 6 12 6s9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6z" /><circle cx="12" cy="12" r="2.5" /></svg>}
    </button>
  </span>;
}
