'use client';
import { useEffect, useState, type ReactNode } from 'react';
import { Logo } from './Logo';
import { cx } from './ui';
import { LangToggle, useI18n } from '@/lib/i18n';
import { BRAND, siteUrl, type SiteKey } from '@/lib/brand';
import { adToBs, getTodayGreeting } from '@/lib/nepali-date';

const TITLES: Record<SiteKey, string> = {
  root: BRAND.name,
  agency: 'Agency Portal',
  exam: 'Exam Portal',
  admin: 'Admin',
};

const NAV: [SiteKey, string][] = [
  ['root', 'nav_home'],
  ['agency', 'nav_agency'],
  ['exam', 'nav_exam'],
];

export function Shell({ site, right, children }: { site: SiteKey; right?: ReactNode; children: ReactNode }) {
  const { t } = useI18n();
  const [showNotification, setShowNotification] = useState(true);
  const [bsDate, setBsDate] = useState<any>(null);
  const [greeting, setGreeting] = useState<any>(null);

  useEffect(() => {
    document.title = site === 'root' ? BRAND.name : `${TITLES[site]} | ${BRAND.name}`;
    setBsDate(adToBs(new Date()));
    setGreeting(getTodayGreeting(new Date()));
  }, [site]);

  useEffect(() => {
    if ('serviceWorker' in navigator && window.isSecureContext) {
      navigator.serviceWorker.register('/sw.js').catch((error) => console.warn('Offline support could not be enabled:', error));
    }
  }, []);

  return (
    <div className="flex min-h-screen flex-col">
      {/* Top Notification Bar / Announcement Strip */}
      {showNotification && bsDate && greeting && (
        <aside
          aria-label="Daily Announcement"
          className={cx(
            'px-4 py-2 text-xs transition border-b flex items-center justify-between gap-3',
            greeting.isSpecialDay
              ? 'bg-[#F15A24] text-white font-medium border-orange-600'
              : 'bg-[#0A4F8A] text-white font-medium border-blue-900'
          )}
        >
          <div className="mx-auto flex max-w-7xl items-center justify-center gap-2 text-center flex-wrap">
            <span className="inline-flex items-center rounded bg-black/20 px-2 py-0.5 text-[11px] font-bold">
              🇳🇵 {bsDate.formattedBsNe}
            </span>
            <span>
              {greeting.isSpecialDay ? `✨ ${greeting.title} — ${greeting.occasion}` : `📢 ${greeting.title}`}
            </span>
            <span className="hidden sm:inline text-white/70">|</span>
            <a
              href={BRAND.links.whatsapp}
              target="_blank"
              rel="noopener noreferrer"
              className="underline font-bold hover:text-white/80 transition"
            >
              Join WhatsApp Community →
            </a>
          </div>
          <button
            type="button"
            onClick={() => setShowNotification(false)}
            className="text-white/70 hover:text-white text-base leading-none px-1"
            title="Dismiss notification"
            aria-label="Dismiss announcement"
          >
            ×
          </button>
        </aside>
      )}

      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3">
          <a href={siteUrl('root')} suppressHydrationWarning aria-label={`${BRAND.name} home`}>
            <Logo />
          </a>
          <nav className="hidden gap-1 md:flex" aria-label="Portals">
            {NAV.map(([k, l]) => (
              <a
                key={k}
                href={siteUrl(k)}
                suppressHydrationWarning
                className={cx(
                  'rounded-md px-3 py-2 text-sm font-medium transition',
                  site === k ? 'bg-paper text-navy ring-1 ring-gold/40' : 'text-slate-600 hover:text-navy'
                )}
              >
                {t(l)}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            <LangToggle />
            {right}
          </div>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-slate-200 bg-white px-4 py-5 text-center text-xs text-slate-500">
        <p>{BRAND.trustBadge}</p>
        <p className="mt-1">
          © {new Date().getFullYear()} {BRAND.name}.{' '}
          <a className="underline" href={siteUrl('admin')} suppressHydrationWarning>
            Admin
          </a>
        </p>
      </footer>
    </div>
  );
}
