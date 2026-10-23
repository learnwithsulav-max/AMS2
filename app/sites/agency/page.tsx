'use client';
import { useState } from 'react';
import { Shell } from '@/components/Shell';
import { AuthCard } from '@/components/AuthCard';
import { Btn, Card, cx } from '@/components/ui';
import { Kanban } from '@/components/agency/Kanban';
import { Plans } from '@/components/agency/Plans';
import { Calculator } from '@/components/agency/Calculator';
import { Schemes } from '@/components/agency/Schemes';
import { Profile } from '@/components/agency/Profile';
import { useAuth } from '@/lib/auth';

const TABS = [
  { k: 'leads', l: 'Leads' }, { k: 'plans', l: 'Plans and policies' },
  { k: 'tdi', l: 'TDI and BDI', premium: true }, { k: 'scheme', l: 'Monthly scheme', premium: true }, { k: 'profile', l: 'Profile' },
];

export default function Agency() {
  const { session, profile, loading, signOut, reload } = useAuth();
  const [tab, setTab] = useState('leads');

  if (loading) return <Shell site="agency"><p className="p-10 text-center text-slate-500">Loading...</p></Shell>;
  if (!session) return <Shell site="agency"><AuthCard title="Agent portal" /></Shell>;
  if (!profile) return <Shell site="agency" right={<Btn variant="ghost" onClick={signOut}>Log out</Btn>}><p className="p-10 text-center text-slate-600">Setting up your profile. Refresh in a moment.</p></Shell>;

  const premium = profile.membership === 'premium' || profile.role === 'admin';
  const current = TABS.find((x) => x.k === tab)!;
  const locked = current.premium && !premium;

  return (
    <Shell site="agency" right={<div className="flex items-center gap-3"><span className="hidden text-sm font-medium sm:inline">{profile.name}</span><Btn variant="ghost" onClick={signOut}>Log out</Btn></div>}>
      <div className="mx-auto max-w-7xl px-4 py-6">
        <div className="mb-6 flex flex-wrap gap-2" role="tablist">
          {TABS.map((x) => (
            <button key={x.k} role="tab" aria-selected={tab === x.k} onClick={() => setTab(x.k)}
              className={cx('rounded-lg px-4 py-2 text-sm font-semibold', tab === x.k ? 'bg-navy text-white' : 'bg-white text-slate-700 hover:bg-slate-100')}>
              {x.l}{x.premium && !premium ? ' (premium)' : ''}
            </button>
          ))}
        </div>
        {locked ? (
          <Card className="mx-auto max-w-lg p-8 text-center">
            <h2 className="text-xl font-bold">Premium feature</h2>
            <p className="mt-2 text-slate-600">{current.l} is part of premium membership. Message Sulav on WhatsApp to activate your account.</p>
          </Card>
        ) : tab === 'leads' ? <Kanban uid={profile.id} />
          : tab === 'plans' ? <Plans uid={profile.id} />
          : tab === 'tdi' ? <Calculator uid={profile.id} />
          : tab === 'scheme' ? <Schemes uid={profile.id} />
          : <Profile profile={profile} reload={reload} />}
      </div>
    </Shell>
  );
}
