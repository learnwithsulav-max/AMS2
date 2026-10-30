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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [bsDate, setBsDate] = useState<any>(null);
  const [greeting, setGreeting] = useState<any>(null);

  useEffect(() => {
    if (site !== 'root') document.title = `${TITLES[site]} | ${BRAND.name}`;
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
            className="rounded px-2 py-1 text-base leading-none text-white hover:bg-white/15 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
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
            <button
              type="button"
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-300 text-navy hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy md:hidden"
              aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-portal-navigation"
              onClick={() => setMobileMenuOpen((open) => !open)}
            >
              <span aria-hidden="true" className="text-xl leading-none">{mobileMenuOpen ? '×' : '☰'}</span>
            </button>
            {right}
          </div>
        </div>
        {mobileMenuOpen && <nav id="mobile-portal-navigation" className="border-t border-slate-200 px-4 py-2 md:hidden" aria-label="Mobile portals">
          <div className="mx-auto flex max-w-7xl flex-col gap-1">
            {NAV.map(([k, l]) => <a key={k} href={siteUrl(k)} suppressHydrationWarning onClick={() => setMobileMenuOpen(false)} className={cx('rounded-md px-3 py-3 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy', site === k ? 'bg-blue-50 text-navy' : 'text-slate-700 hover:bg-slate-50')}>
              {t(l)}
            </a>)}
          </div>
        </nav>}
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-slate-200 bg-white px-4 py-5 text-center text-xs text-slate-600">
        <p>{BRAND.trustBadge}</p>
        {site === 'root' && <nav aria-label="Legal and contact" className="mt-3 flex flex-wrap justify-center gap-x-5 gap-y-2">
          <a className="underline underline-offset-2 hover:text-navy focus-visible:outline-2" href="/privacy">Privacy</a>
          <a className="underline underline-offset-2 hover:text-navy focus-visible:outline-2" href="/terms">Terms</a>
          <a className="underline underline-offset-2 hover:text-navy focus-visible:outline-2" href="/#contact">Contact</a>
        </nav>}
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
