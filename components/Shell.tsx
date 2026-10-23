'use client';
import { useEffect, type ReactNode } from 'react';
import { Logo } from './Logo';
import { cx } from './ui';
import { LangToggle, useI18n } from '@/lib/i18n';
import { BRAND, siteUrl, type SiteKey } from '@/lib/brand';

const TITLES: Record<SiteKey, string> = { root: BRAND.name, agency: 'Agency Portal', exam: 'Exam Portal', admin: 'Admin' };
const NAV: [SiteKey, string][] = [['root', 'nav_home'], ['agency', 'nav_agency'], ['exam', 'nav_exam']];

// Same header, logo, colours and font on every portal.
export function Shell({ site, right, children }: { site: SiteKey; right?: ReactNode; children: ReactNode }) {
  const { t } = useI18n();
  useEffect(() => { document.title = site === 'root' ? BRAND.name : `${TITLES[site]} | ${BRAND.name}`; }, [site]);
  useEffect(() => {
    if ('serviceWorker' in navigator && window.isSecureContext) navigator.serviceWorker.register('/sw.js').catch((error) => console.warn('Offline support could not be enabled:', error));
  }, []);
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3">
          <a href={siteUrl('root')} aria-label={`${BRAND.name} home`}><Logo /></a>
          <nav className="hidden gap-1 md:flex" aria-label="Portals">
            {NAV.map(([k, l]) => (
              <a key={k} href={siteUrl(k)}
                className={cx('rounded-md px-3 py-2 text-sm font-medium', site === k ? 'bg-paper text-navy ring-1 ring-gold/40' : 'text-slate-600 hover:text-navy')}>
                {t(l)}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-3"><LangToggle />{right}</div>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t border-slate-200 bg-white px-4 py-5 text-center text-xs text-slate-500">
        <p>{BRAND.trustBadge}</p>
        <p className="mt-1">© {new Date().getFullYear()} {BRAND.name}.{' '}
          <a className="underline" href={siteUrl('admin')}>Admin</a>
        </p>
      </footer>
    </div>
  );
}
