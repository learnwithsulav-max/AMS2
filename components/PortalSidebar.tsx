'use client';

import { useState } from 'react';
import { cx } from './ui';

export type PortalNavGroup = {
  label: string;
  items: { id: string; label: string; badge?: string }[];
};

export function PortalSidebar({
  name,
  email,
  photo,
  role,
  groups,
  active,
  onSelect,
}: {
  name?: string | null;
  email?: string | null;
  photo?: string | null;
  role: string;
  groups: PortalNavGroup[];
  active: string;
  onSelect: (id: string) => void;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const displayName = name || email || 'Account';
  const initials = displayName.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase();

  return (
    <aside className="w-full shrink-0 md:w-64">
      <button
        type="button"
        className="mb-2 flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 text-left font-semibold text-slate-800 shadow-sm md:hidden"
        aria-expanded={mobileOpen}
        onClick={() => setMobileOpen((open) => !open)}
      >
        <span>Workspace menu</span><span aria-hidden="true">{mobileOpen ? '−' : '+'}</span>
      </button>
      <div className={cx('rounded-2xl border border-slate-200 bg-white p-3 shadow-sm md:sticky md:top-4', !mobileOpen && 'hidden md:block')}>
        <div className="mb-3 flex items-center gap-3 rounded-xl bg-slate-50 p-3">
          {photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photo} alt="" className="h-11 w-11 rounded-full object-cover" />
          ) : (
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#0A4F8A] text-sm font-bold text-white">{initials || 'U'}</span>
          )}
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-slate-900">{displayName}</p>
            <p className="truncate text-xs text-slate-500">{role}</p>
          </div>
        </div>
        <nav aria-label={`${role} menu`} className="grid gap-2">
          {groups.map((group) => (
            <details key={group.label} open={group.items.some((item) => item.id === active) || group.label === 'Workspace'}>
              <summary className="cursor-pointer rounded-lg px-3 py-2 text-xs font-bold uppercase tracking-wide text-slate-500 hover:bg-slate-50">
                {group.label}
              </summary>
              <div className="mt-1 grid gap-1">
                {group.items.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    aria-current={active === item.id ? 'page' : undefined}
                    onClick={() => {
                      onSelect(item.id);
                      setMobileOpen(false);
                    }}
                    className={cx(
                      'flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm font-medium transition',
                      active === item.id ? 'bg-[#0A4F8A] text-white' : 'text-slate-700 hover:bg-blue-50 hover:text-[#0A4F8A]'
                    )}
                  >
                    <span>{item.label}</span>
                    {item.badge && <span className={cx('rounded-full px-2 py-0.5 text-[10px]', active === item.id ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600')}>{item.badge}</span>}
                  </button>
                ))}
              </div>
            </details>
          ))}
        </nav>
      </div>
    </aside>
  );
}
