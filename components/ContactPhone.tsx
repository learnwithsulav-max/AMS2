'use client';

import { useState } from 'react';
import { cx } from '@/components/ui';

interface ContactPhoneProps {
  phone?: string | null;
  name?: string;
  className?: string;
  showText?: boolean;
}

export function ContactPhone({ phone, name = 'Client', className, showText = true }: ContactPhoneProps) {
  const [copied, setCopied] = useState(false);

  if (!phone || !phone.trim()) {
    return <span className="text-slate-400 text-xs italic">No phone provided</span>;
  }

  const rawDigits = phone.replace(/\D/g, '');
  // Format for WhatsApp: if 10 digits starting with 9, prefix with 977 (Nepal)
  const waNumber = rawDigits.length === 10 && rawDigits.startsWith('9') ? `977${rawDigits}` : rawDigits;
  const isMobile = rawDigits.length >= 9;

  const defaultMsg = encodeURIComponent(
    `नमस्ते ${name} ज्यू, Learn With Sulav (Financial Advisor & Life Insurance Coach) बाट सन्देश। हजुरको बिमासम्बन्धी कुनै जिज्ञासा भएमा जानकारी गराउनुहोला।`
  );

  const copyNumber = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard?.writeText(phone);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={cx('inline-flex items-center gap-1.5 flex-wrap', className)}>
      {showText && (
        <span className="font-mono text-sm tabular-nums text-slate-800 font-medium">
          {phone}
        </span>
      )}

      {/* WhatsApp Link with Official Logo */}
      {isMobile && (
        <a
          href={`https://wa.me/${waNumber}?text=${defaultMsg}`}
          target="_blank"
          rel="noopener noreferrer"
          title={`WhatsApp chat with ${name}`}
          className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white transition shadow-sm p-1"
          onClick={(e) => e.stopPropagation()}
        >
          <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
            <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.711 2.599 2.67-.7c.974.553 1.769.814 2.79.814 3.18 0 5.767-2.587 5.768-5.766.001-3.181-2.587-5.766-5.768-5.766zm3.385 8.169c-.144.405-.837.774-1.17.824-.312.045-.634.053-1.045-.067-.481-.141-1.103-.393-1.897-.887-1.378-.857-2.27-2.28-2.338-2.373-.069-.092-.563-.75-.563-1.429 0-.678.354-1.012.481-1.149.127-.138.277-.173.37-.173.092 0 .185.001.265.006.085.004.198-.032.309.235.115.277.393.96.427 1.031.034.069.058.15.011.242-.046.092-.07.15-.138.231-.069.081-.144.179-.207.242-.069.069-.142.144-.06.287.081.144.36 1.189.774 1.558.534.475 1.085.642 1.238.718.154.076.246.069.338-.038.092-.107.393-.456.498-.613.104-.156.208-.13.348-.077.138.053.882.416 1.033.491.15.076.251.113.288.176.037.063.037.367-.107.772zM12 2C6.477 2 2 6.477 2 12c0 1.891.524 3.66 1.434 5.176L2 22l4.981-1.396A9.957 9.957 0 0012 22c5.523 0 10-4.477 10-10S17.523 2 12 2z" />
          </svg>
        </a>
      )}

      {/* Phone Call Link with 📞 Icon */}
      <a
        href={`tel:${rawDigits}`}
        title={`Call ${name}`}
        className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-[#0A4F8A] hover:bg-[#073B68] text-white transition shadow-sm p-1"
        onClick={(e) => e.stopPropagation()}
      >
        <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
          <path d="M6.62 10.79a15.05 15.05 0 006.59 6.59l2.2-2.2a1 1 0 011.02-.24c1.12.37 2.33.56 3.57.56.55 0 1 .45 1 1V20c0 .55-.45 1-1 1C10.61 21 3 13.39 3 4c0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.24.19 2.45.56 3.57a1 1 0 01-.25 1.02l-2.19 2.2z" />
        </svg>
      </a>

      {/* Copy button */}
      <button
        type="button"
        onClick={copyNumber}
        title="Copy phone number"
        className="text-[11px] text-slate-400 hover:text-slate-600 transition px-1"
      >
        {copied ? '✓' : 'Copy'}
      </button>
    </div>
  );
}
