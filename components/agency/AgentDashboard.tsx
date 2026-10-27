'use client';

import { useEffect, useState } from 'react';
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
      supabase.from('policies').select('id,client_name,plan_type,premium,issue_date,next_due_date').eq('agent_id', profile.id).order('issue_date', { ascending: false }).limit(6),
      supabase.from('leads').select('id,name,stage,follow_up_date,plan_interest').eq('agent_id', profile.id).order('created_at', { ascending: false }).limit(30),
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
  const tasks = [
    { label: 'Complete agent profile', done: !!(profile.name && profile.phone && profile.branch) },
    { label: 'Record a policy', done: policies.length > 0 },
    { label: 'Follow up with a lead', done: leads.length > 0 },
    { label: 'Publish public portfolio', done: !!portfolio?.is_published },
  ];

  const columns = [
    <div key="policies" className="grid content-start gap-2">
      <div className="flex items-center justify-between"><h3 className="font-bold">Active Policies</h3><Badge tone="blue">{policies.length}</Badge></div>
      {subscription?.status === 'pending' && <Card className="p-3 text-sm"><b>Pending approval</b><p className="text-slate-600">Your agency subscription is awaiting review.</p></Card>}
      {policies.map((policy) => <Card key={policy.id} className="p-3 text-sm"><b>{policy.client_name}</b><p className="text-slate-600">{policy.plan_type} · {npr(policy.premium)}</p><p className="text-xs text-slate-500">Issued {policy.issue_date || '—'}</p></Card>)}
      {!policies.length && <p className="text-sm text-slate-500">Your recorded policies will appear here.</p>}
      <Btn variant="ghost" onClick={() => onNavigate('plans')}>Open policy ledger</Btn>
    </div>,
    <div key="leads" className="grid content-start gap-2">
      <div className="flex items-center justify-between"><h3 className="font-bold">Follow-up Leads</h3><Badge tone={dueLeads.length ? 'amber' : 'slate'}>{dueLeads.length} due</Badge></div>
      {dueLeads.slice(0, 5).map((lead) => <Card key={lead.id} className="p-3 text-sm"><b>{lead.name}</b><p className="text-slate-600">{lead.stage} · follow up {lead.follow_up_date}</p></Card>)}
      {!dueLeads.length && <p className="text-sm text-slate-500">No follow-ups are due today.</p>}
      <Btn variant="ghost" onClick={() => onNavigate('leads')}>Open lead board</Btn>
    </div>,
    <div key="vouchers" className="grid content-start gap-2">
      <div className="flex items-center justify-between"><h3 className="font-bold">Exam Vouchers Queue</h3><Badge tone="slate">Private</Badge></div>
      <Card className="p-3 text-sm text-slate-600">Student payment vouchers are restricted to SuperAdmin reviewers. They are not visible in agent accounts.</Card>
    </div>,
    <div key="tasks" className="grid content-start gap-2">
      <div className="flex items-center justify-between"><h3 className="font-bold">Task Progress</h3><Badge tone="green">{tasks.filter((task) => task.done).length}/{tasks.length}</Badge></div>
      {tasks.map((task) => <Card key={task.label} className="flex items-center gap-2 p-3 text-sm"><span aria-hidden="true" className={task.done ? 'text-emerald-700' : 'text-slate-400'}>{task.done ? '✓' : '○'}</span><span>{task.label}</span></Card>)}
      {portfolio?.slug && <p className="break-all text-xs text-slate-500">Portfolio: agency.sulavs.com.np/{portfolio.slug}</p>}
      <Btn variant="ghost" onClick={() => onNavigate('profile')}>Continue setup</Btn>
    </div>,
  ];

  return <section className="grid gap-4">
    <div><h2 className="text-2xl font-extrabold text-[#0A4F8A]">Agent command center</h2><p className="mt-1 text-sm text-slate-600">Your policy activity, follow-ups and setup progress in one view.</p></div>
    <div className="grid gap-4 xl:grid-cols-4">{columns.map((column, index) => <Card key={index} className="min-h-64 content-start gap-3 bg-slate-50 p-4">{column}</Card>)}</div>
  </section>;
}
