'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { today, npr } from '@/lib/rules';
import { Badge, Btn, Card } from '../ui';

type Props = { profile: any; subscription: any; onNavigate: (tab: string) => void };

export function AgentDashboard({ profile, subscription, onNavigate }: Props) {
  const [policies, setPolicies] = useState<any[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  const [portfolio, setPortfolio] = useState<any>(null);

  useEffect(() => {
    let active = true;
    Promise.all([
      supabase.from('policies').select('id,client_name,plan_type,premium,issue_date,next_due_date').eq('agent_id', profile.id).order('issue_date', { ascending: false }).limit(30),
      supabase.from('leads').select('id,name,stage,follow_up_date,plan_interest,est_premium').eq('agent_id', profile.id).order('created_at', { ascending: false }).limit(30),
      supabase.from('public_profiles').select('slug,is_published').eq('user_id', profile.id).maybeSingle(),
    ]).then(([policyResult, leadResult, portfolioResult]) => {
      if (!active) return;
      setPolicies(policyResult.data || []);
      setLeads(leadResult.data || []);
      setPortfolio(portfolioResult.data || null);
    });
    return () => { active = false; };
  }, [profile.id]);

  const dueLeads = leads.filter((lead) => lead.follow_up_date && lead.follow_up_date <= today() && !String(lead.stage || '').startsWith('Closed'));
  const renewals = policies.filter((policy) => policy.next_due_date && policy.next_due_date <= today()).slice(0, 4);
  const premium = policies.reduce((sum, policy) => sum + Number(policy.premium || 0), 0);
  const activeLeads = leads.filter((lead) => !String(lead.stage || '').startsWith('Closed')).length;
  const tasks = [
    { label: 'Complete agent profile', done: !!(profile.name && profile.phone && profile.branch) },
    { label: 'Record a policy', done: policies.length > 0 },
    { label: 'Follow up with a lead', done: leads.length > 0 },
    { label: 'Publish public portfolio', done: !!portfolio?.is_published },
  ];
  const signals = useMemo(() => [
    dueLeads.length ? `${dueLeads.length} lead${dueLeads.length === 1 ? '' : 's'} need follow-up today.` : 'Your follow-up queue is clear today.',
    renewals.length ? `${renewals.length} policy renewal${renewals.length === 1 ? '' : 's'} need attention.` : 'No overdue renewals found in your ledger.',
    activeLeads >= 3 ? 'Your active pipeline is ready for a focused conversion sprint.' : 'Add more prospects to build a healthier pipeline.',
  ], [activeLeads, dueLeads.length, renewals.length]);

  const subscriptionStatus = String(subscription?.status || 'active').toLowerCase();
  const subscriptionEndsAt = subscription?.ends_at || subscription?.current_period_end || subscription?.expires_at;
  const daysRemaining = subscriptionEndsAt ? Math.ceil((new Date(subscriptionEndsAt).getTime() - Date.now()) / 86400000) : null;
  const isSuspended = ['suspended', 'expired', 'cancelled', 'canceled'].includes(subscriptionStatus) || daysRemaining !== null && daysRemaining < 0;
  const needsRenewal = !isSuspended && daysRemaining !== null && daysRemaining <= 7;

  return <section className="grid gap-5">
    {isSuspended && <Card className="border-rose-200 bg-rose-50 p-4" role="alert"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="font-bold text-rose-900">Your workspace is read-only</p><p className="mt-1 text-sm text-rose-800">Your subscription has ended. Renew to add policies, manage leads, and publish portfolio changes.</p></div><Btn onClick={() => onNavigate('billing')}>Renew subscription</Btn></div></Card>}
    {needsRenewal && <Card className="border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 p-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="font-bold text-amber-950">Renewal coming up{daysRemaining !== null ? ` in ${daysRemaining} day${daysRemaining === 1 ? '' : 's'}` : ''}</p><p className="mt-1 text-sm text-amber-900">Keep your client records and public portfolio active without interruption.</p></div><Btn onClick={() => onNavigate('billing')}>Review billing</Btn></div></Card>}
    <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-[#D39A26]">Agent workspace</p><h2 className="text-2xl font-extrabold text-[#0A4F8A]">Good to see you, {profile.name?.split(' ')[0] || 'Agent'}</h2><p className="mt-1 text-sm text-slate-600">A practical snapshot of your portfolio, pipeline, and next best actions.</p></div><Btn onClick={() => onNavigate('calculator')}>Open quote calculator</Btn></div>
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {[['Portfolio premium', npr(premium), 'Recorded policy value', 'blue'], ['Active policies', policies.length, 'Keep renewals close', 'green'], ['Follow-ups due', dueLeads.length, dueLeads.length ? 'Action needed today' : 'Queue is clear', dueLeads.length ? 'amber' : 'slate'], ['Pipeline leads', activeLeads, 'Open opportunities', 'purple']].map(([label, value, hint, tone]) => <Card key={String(label)} className="p-4"><div className="flex items-center justify-between"><p className="text-sm text-slate-500">{label}</p><Badge tone={tone as any}>Live</Badge></div><p className="mt-2 text-2xl font-extrabold text-slate-900">{value}</p><p className="mt-1 text-xs text-slate-500">{hint}</p></Card>)}
    </div>
    <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
      <Card className="p-5"><div className="flex items-start justify-between gap-3"><div><h3 className="font-bold">Today&apos;s opportunity signals</h3><p className="mt-1 text-sm text-slate-500">Rule-based prompts from your current records.</p></div><Badge tone="blue">Insights</Badge></div><div className="mt-4 grid gap-2">{signals.map((signal, index) => <div key={signal} className="flex gap-3 rounded-lg bg-slate-50 p-3 text-sm"><span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[#E7F1FA] text-xs font-bold text-[#0A4F8A]">{index + 1}</span><span>{signal}</span></div>)}</div></Card>
      <Card className="p-5"><div className="flex items-center justify-between"><h3 className="font-bold">Renewals due</h3><Badge tone={renewals.length ? 'amber' : 'green'}>{renewals.length}</Badge></div><div className="mt-3 grid gap-2">{renewals.map((policy) => <button key={policy.id} type="button" onClick={() => onNavigate('plans')} className="rounded-lg border border-slate-200 p-3 text-left text-sm hover:border-[#0A4F8A]"><b>{policy.client_name}</b><p className="text-slate-500">{policy.plan_type} · due {policy.next_due_date}</p></button>)}{!renewals.length && <p className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">No overdue renewals in the loaded ledger.</p>}</div></Card>
    </div>
    <div className="grid gap-4 xl:grid-cols-4">
      <Card className="min-h-64 bg-slate-50 p-4"><div className="flex items-center justify-between"><h3 className="font-bold">Active policies</h3><Badge tone="blue">{policies.length}</Badge></div><div className="mt-3 grid gap-2">{policies.slice(0, 5).map((policy) => <Card key={policy.id} className="p-3 text-sm"><b>{policy.client_name}</b><p className="text-slate-600">{policy.plan_type} · {npr(policy.premium)}</p><p className="text-xs text-slate-500">Issued {policy.issue_date || '—'}</p></Card>)}{!policies.length && <p className="text-sm text-slate-500">Your recorded policies will appear here.</p>}</div><Btn variant="ghost" onClick={() => onNavigate('plans')}>Open policy ledger</Btn></Card>
      <Card className="min-h-64 bg-slate-50 p-4"><div className="flex items-center justify-between"><h3 className="font-bold">Follow-up queue</h3><Badge tone={dueLeads.length ? 'amber' : 'slate'}>{dueLeads.length} due</Badge></div><div className="mt-3 grid gap-2">{dueLeads.slice(0, 5).map((lead) => <Card key={lead.id} className="p-3 text-sm"><b>{lead.name}</b><p className="text-slate-600">{lead.stage} · {lead.follow_up_date}</p></Card>)}{!dueLeads.length && <p className="text-sm text-slate-500">No follow-ups are due today.</p>}</div><Btn variant="ghost" onClick={() => onNavigate('leads')}>Open lead board</Btn></Card>
      <Card className="min-h-64 bg-slate-50 p-4"><div className="flex items-center justify-between"><h3 className="font-bold">Service desk</h3><Badge tone="slate">Ready</Badge></div><p className="mt-3 text-sm text-slate-600">Keep client service moving with quick access to your core tools.</p><div className="mt-4 grid gap-2"><Btn variant="ghost" onClick={() => onNavigate('calculator')}>Quote calculator</Btn><Btn variant="ghost" onClick={() => onNavigate('profile')}>Portfolio setup</Btn></div></Card>
      <Card className="min-h-64 bg-slate-50 p-4"><div className="flex items-center justify-between"><h3 className="font-bold">Setup progress</h3><Badge tone="green">{tasks.filter((task) => task.done).length}/{tasks.length}</Badge></div><div className="mt-3 grid gap-2">{tasks.map((task) => <div key={task.label} className="flex items-center gap-2 rounded-lg bg-white p-3 text-sm"><span aria-hidden="true" className={task.done ? 'text-emerald-700' : 'text-slate-400'}>{task.done ? '✓' : '○'}</span>{task.label}</div>)}</div>{portfolio?.slug && <p className="mt-3 break-all text-xs text-slate-500">Portfolio: agency.sulavs.com.np/{portfolio.slug}</p>}<Btn variant="ghost" onClick={() => onNavigate('profile')}>Continue setup</Btn></Card>
    </div>
  </section>;
}
