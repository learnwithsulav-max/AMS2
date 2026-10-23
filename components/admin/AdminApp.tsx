'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { adminGet, adminPost } from '@/lib/admin-api';
import { useAuth } from '@/lib/auth';
import { PLANS, calcIncentive, layersOf, monthEnd, monthStart, npr, planName, today, weightPct, weighted } from '@/lib/rules';
import { STAGES } from '../agency/Kanban';
import { schemeTone } from '../agency/Schemes';
import { AuthCard } from '../AuthCard';
import { MfaGate } from '../MfaGate';
import { Shell } from '../Shell';
import { Badge, Btn, Card, Field, cx } from '../ui';
import { DataPager, DataTable } from './DataTable';
import { QuestionImporter } from './QuestionImporter';
import { MaskedPhone, maskPhone } from '@/components/MaskedPhone';

const TABLES = ['profiles', 'exam_attempts', 'exam_pass_settings', 'exam_pass_orders', 'billing_orders', 'question_reports', 'agency_feedback', 'leads', 'policies', 'schemes', 'scheme_status', 'activity_log', 'agency_subscriptions', 'company_rules', 'coupons', 'portfolio_leads', 'portfolio_reviews'];
const PAGE_SIZE = 100;
const TABS = ['Overview', 'Agents', 'Subscriptions', 'Exams', 'Question bank', 'Feedback inbox', 'Broadcast', 'System health', 'Question reports', 'Agent feedback', 'Exam passes', 'Billing queue', 'Leads', 'Public leads', 'Reviews', 'Finance', 'Schemes', 'Configuration', 'Logs'];

export default function AdminApp() {
  const { session, profile, loading, signOut } = useAuth();
  const logout = async () => {
    if (session?.access_token) await fetch('/api/admin/session', { method: 'DELETE', headers: { Authorization: `Bearer ${session.access_token}` } }).catch(() => undefined);
    await signOut();
  };
  const out = <Btn variant="ghost" onClick={logout}>Log out</Btn>;
  if (loading) return <Shell site="admin"><p className="p-10 text-center text-slate-500">Loading...</p></Shell>;
  if (!session) return <Shell site="admin"><AuthCard title="Master admin" allowRegister={false} /></Shell>;
  if (profile?.role !== 'admin') return <Shell site="admin" right={out}><Card className="mx-auto my-16 max-w-md p-8 text-center"><h1 className="text-xl font-bold">Access restricted</h1><p className="mt-2 text-slate-600">This portal is for the master admin only.</p></Card></Shell>;
  return <Shell site="admin" right={out}><MfaGate><Dashboard /></MfaGate></Shell>;
}

function Dashboard() {
  const [tab, setTab] = useState('Overview');
  const [d, setD] = useState<Record<string, any[]>>({});
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [pages, setPages] = useState<Record<string, number>>({});
  const [searches, setSearches] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [from, setFrom] = useState(monthStart());
  const [to, setTo] = useState(monthEnd());

  const loadPage = useCallback(async (table: string, page = 1, search = '') => {
    const params = new URLSearchParams({ table, page: String(page), pageSize: String(PAGE_SIZE) });
    if (search) params.set('search', search);
    if (table === 'profiles') params.set('role', 'agent');
    const result = await adminGet<{ data: any[]; count: number; page: number }>(`/api/admin/data?${params}`);
    setD((current) => ({ ...current, [table]: result.data }));
    setCounts((current) => ({ ...current, [table]: result.count }));
    setPages((current) => ({ ...current, [table]: result.page }));
    setSearches((current) => ({ ...current, [table]: search }));
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      await Promise.all(TABLES.map((table) => loadPage(table, 1)));
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load admin data.');
    } finally {
      setLoading(false);
    }
  }, [loadPage]);

  const changePage = useCallback((table: string, page: number, search = searches[table] || '') => {
    loadPage(table, page, search).catch((err) => setError(err instanceof Error ? err.message : 'Could not load this page.'));
  }, [loadPage, searches]);

  const searchTable = useCallback((table: string, search: string) => {
    changePage(table, 1, search);
  }, [changePage]);

  const mutate = useCallback(async (payload: Record<string, unknown>) => {
    setError('');
    try {
      await adminPost('/api/admin/mutations', payload);
      await load();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save this change.');
      return false;
    }
  }, [load]);

  // Real-time: any change in these tables refreshes the dashboard.
  useEffect(() => {
    load();
    const ch = supabase.channel('admin-live');
    TABLES.forEach((t) => ch.on('postgres_changes', { event: '*', schema: 'public', table: t }, () => load()));
    ch.subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [load]);

  const P = d.profiles || [], A = d.exam_attempts || [], L = d.leads || [], POL = d.policies || [];
  const name = useMemo(() => Object.fromEntries(P.map((p) => [p.id, p.name || p.email])), [P]);
  const done = A.filter((a) => a.submitted_at);
  const passRate = done.length ? Math.round((done.filter((a) => a.passed).length / done.length) * 100) : 0;
  const inRange = POL.filter((p) => p.issue_date >= from && p.issue_date <= to);
  const partialTables = TABLES.filter((table) => (counts[table] || 0) > (d[table] || []).length);

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      {error && <div role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>}
      {partialTables.length > 0 && <p role="status" className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        Showing the first {PAGE_SIZE} records for large datasets. Use search and pagination in the relevant tables; overview totals use the loaded records.
      </p>}
      {loading && !Object.keys(d).length && <p role="status" className="mb-4 text-sm text-slate-500">Loading admin data...</p>}
      <div className="no-print mb-6 flex flex-wrap gap-2" role="tablist">
        {TABS.map((t) => (
          <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)}
            className={cx('rounded-lg px-4 py-2 text-sm font-semibold', tab === t ? 'bg-gold text-white' : 'bg-white text-slate-700 hover:bg-slate-100')}>{t}</button>
        ))}
      </div>

      {tab === 'Overview' && (
        <div className="grid gap-6">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {[
              ['Agents', counts.profiles || 0], ['Premium members', P.filter((p) => p.membership === 'premium').length],
              ['Exam attempts', counts.exam_attempts || 0], ['Exam pass rate', `${passRate}%`],
              ['Leads', counts.leads || 0], ['Closed won', L.filter((l) => l.stage === 'Closed Won').length],
              ['Premium collected', npr(POL.reduce((s, p) => s + Number(p.premium || 0), 0))], ['Weighted premium', npr(POL.reduce((s, p) => s + weighted(p), 0))],
            ].map(([k, v]) => <Card key={String(k)} className="p-4"><p className="text-sm text-slate-500">{k}</p><p className="mt-1 text-2xl font-extrabold">{v}</p></Card>)}
          </div>
          <div>
            <h2 className="mb-3 font-bold">Latest exam results</h2>
            <DataTable name="latest-exams" rows={A.slice(0, 8)} cols={examCols} />
          </div>
        </div>
      )}

      {tab === 'Agents' && (
        <DataTable name="agents" rows={P} page={pages.profiles || 1} total={counts.profiles || 0} pageSize={PAGE_SIZE}
          onPageChange={(page) => changePage('profiles', page)} onSearch={(search) => searchTable('profiles', search)} cols={[
          { k: 'name', h: 'Name' }, { k: 'phone', h: 'Phone', render: (r) => <MaskedPhone value={r.phone} />, csv: (r) => maskPhone(r.phone) }, { k: 'license_no', h: 'License' }, { k: 'branch', h: 'Branch' },
          { k: 'referral_code', h: 'Referral code' }, { k: 'upline', h: 'Upline', render: (r) => name[r.upline_id] || '-', csv: (r) => name[r.upline_id] || '' },
          { k: 'membership', h: 'Membership', render: (r) => <Sel v={r.membership} opts={['free', 'premium']} on={(v) => mutate({ action: 'update_agent', id: r.id, membership: v })} /> },
          { k: 'status', h: 'Status', render: (r) => <Sel v={r.status} opts={['active', 'suspended']} on={(v) => mutate({ action: 'update_agent', id: r.id, status: v })} /> },
          { k: 'created_at', h: 'Joined', render: (r) => r.created_at?.slice(0, 10) },
        ]} />
      )}

      {tab === 'Exam passes' && <ExamPassAdmin settings={(d.exam_pass_settings || [])[0]} orders={d.exam_pass_orders || []} mutate={mutate} onRefresh={load} />}
      {tab === 'Billing queue' && <BillingQueue orders={d.billing_orders || []} mutate={mutate} />}
      {tab === 'Feedback inbox' && <FeedbackInbox reports={d.question_reports||[]} feedback={d.agency_feedback||[]} leads={d.portfolio_leads||[]} reviews={d.portfolio_reviews||[]} mutate={mutate} />}
      {tab === 'Broadcast' && <BroadcastCenter />}
      {tab === 'System health' && <HealthPanel />}
      {tab === 'Question reports' && <DataTable name="question-reports" rows={d.question_reports || []} page={pages.question_reports || 1} total={counts.question_reports || 0} pageSize={PAGE_SIZE} onPageChange={(page)=>changePage('question_reports',page)} cols={[
        {k:'question_id',h:'Question ID'},{k:'report_type',h:'Issue'},{k:'details',h:'Details'},{k:'attempt_id',h:'Attempt'},{k:'created_at',h:'Reported',render:(r)=>r.created_at?.slice(0,16).replace('T',' ')},
      ]} />}
      {tab === 'Agent feedback' && <DataTable name="agent-feedback" rows={d.agency_feedback || []} page={pages.agency_feedback || 1} total={counts.agency_feedback || 0} pageSize={PAGE_SIZE} onPageChange={(page)=>changePage('agency_feedback',page)} onSearch={(search)=>searchTable('agency_feedback',search)} cols={[
        {k:'title',h:'Title'},{k:'kind',h:'Type'},{k:'category',h:'Category'},{k:'details',h:'Details'},{k:'status',h:'Status',render:(r)=><Sel v={r.status} opts={['new','reviewing','planned','completed','closed']} on={(v)=>mutate({action:'update_agency_feedback',id:r.id,status:v})}/>},{k:'created_at',h:'Submitted',render:(r)=>r.created_at?.slice(0,10)},
      ]} />}

      {tab === 'Subscriptions' && <DataTable name="agency-subscriptions" rows={d.agency_subscriptions || []} page={pages.agency_subscriptions || 1} total={counts.agency_subscriptions || 0} pageSize={PAGE_SIZE}
        onPageChange={(page) => changePage('agency_subscriptions', page)} cols={[
          { k: 'agent_id', h: 'Agent', render: (r) => name[r.agent_id] || r.agent_id, csv: (r) => name[r.agent_id] || r.agent_id },
          { k: 'trial_ends_at', h: 'Trial ends', render: (r) => r.trial_ends_at?.slice(0, 10) || '-' },
          { k: 'plan', h: 'Plan', render: (r) => <Sel v={r.plan} opts={['trial','basic','pro']} on={(v) => mutate({ action: 'update_subscription', id: r.id, plan: v, status: v === 'trial' ? 'trial' : 'active' })} /> },
          { k: 'status', h: 'Status', render: (r) => <Sel v={r.status} opts={['trial','active','expired','cancelled']} on={(v) => mutate({ action: 'update_subscription', id: r.id, plan: r.plan, status: v })} /> },
          { k: 'period_ends_at', h: 'Paid through', render: (r) => r.period_ends_at?.slice(0, 10) || '-' },
        ]} />}

      {tab === 'Configuration' && <Configuration companies={d.company_rules || []} coupons={d.coupons || []} mutate={mutate} />}

      {tab === 'Exams' && <DataTable name="exam-results" rows={A} page={pages.exam_attempts || 1} total={counts.exam_attempts || 0} pageSize={PAGE_SIZE}
        onPageChange={(page) => changePage('exam_attempts', page)} onSearch={(search) => searchTable('exam_attempts', search)} cols={examCols} />}

      {tab === 'Question bank' && <QuestionImporter />}

      {tab === 'Leads' && (
        <div className="grid gap-3">
          <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); searchTable('leads', new FormData(e.currentTarget).get('search')?.toString() || ''); }}>
            <input name="search" defaultValue={searches.leads || ''} aria-label="Search leads" placeholder="Search leads..." className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            <Btn type="submit" variant="ghost">Search</Btn>
          </form>
          <div className="grid auto-cols-[260px] grid-flow-col gap-4 overflow-x-auto pb-4">
            {STAGES.map((s) => {
              const col = L.filter((l) => l.stage === s);
              return (
                <section key={s} className="rounded-xl bg-slate-100 p-3">
                  <h3 className="mb-1 flex items-center justify-between text-sm font-bold">{s}<Badge tone="blue">{col.length}</Badge></h3>
                  <p className="mb-3 text-xs text-slate-500">{npr(col.reduce((t, l) => t + Number(l.est_premium || 0), 0))}</p>
                  <div className="grid gap-2">
                    {col.slice(0, 40).map((l) => (
                      <Card key={l.id} className="p-3 text-sm"><p className="font-semibold">{l.name}</p><p className="text-slate-500">{name[l.agent_id]}</p>
                        {l.follow_up_date && <p className="text-xs text-slate-500">Follow-up {l.follow_up_date}</p>}</Card>
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
          <DataPager page={pages.leads || 1} total={counts.leads || 0} pageSize={PAGE_SIZE} onPageChange={(page) => changePage('leads', page)} />
        </div>
      )}

      {tab === 'Public leads' && <DataTable name="portfolio-leads" rows={d.portfolio_leads || []} page={pages.portfolio_leads || 1} total={counts.portfolio_leads || 0} pageSize={PAGE_SIZE}
        onPageChange={(page) => changePage('portfolio_leads', page)} onSearch={(search) => searchTable('portfolio_leads', search)} cols={[
          { k: 'name', h: 'Name' }, { k: 'phone', h: 'Phone', render: (r) => <MaskedPhone value={r.phone} />, csv: (r) => maskPhone(r.phone) }, { k: 'email', h: 'Email' }, { k: 'message', h: 'Request' }, { k: 'agent_id', h: 'Agent', render: (r) => name[r.agent_id] || r.agent_id }, { k: 'created_at', h: 'Received', render: (r) => new Date(r.created_at).toLocaleString() },
        ]} />}

      {tab === 'Reviews' && <DataTable name="portfolio-reviews" rows={d.portfolio_reviews || []} page={pages.portfolio_reviews || 1} total={counts.portfolio_reviews || 0} pageSize={PAGE_SIZE}
        onPageChange={(page) => changePage('portfolio_reviews', page)} cols={[
          { k: 'reviewer_name', h: 'Reviewer' }, { k: 'rating', h: 'Rating' }, { k: 'review', h: 'Review' }, { k: 'agent_id', h: 'Agent', render: (r) => name[r.agent_id] || r.agent_id },
          { k: 'approved', h: 'Status', render: (r) => r.approved ? <Btn variant="ghost" onClick={() => mutate({ action: 'moderate_review', id: r.id, approved: false })}>Published · hide</Btn> : <Btn onClick={() => mutate({ action: 'moderate_review', id: r.id, approved: true })}>Approve</Btn> },
        ]} />}

      {tab === 'Finance' && <Finance P={P} POL={POL} inRange={inRange} name={name} from={from} to={to} setFrom={setFrom} setTo={setTo} reload={load} mutate={mutate} />}
      {tab === 'Schemes' && <Schemes P={P} schemes={d.schemes || []} status={d.scheme_status || []} mutate={mutate} />}
      {tab === 'Logs' && <DataTable name="activity-log" rows={d.activity_log || []} page={pages.activity_log || 1} total={counts.activity_log || 0} pageSize={PAGE_SIZE}
        onPageChange={(page) => changePage('activity_log', page)} onSearch={(search) => searchTable('activity_log', search)} cols={[
        { k: 'created_at', h: 'Time', render: (r) => new Date(r.created_at).toLocaleString() }, { k: 'actor', h: 'Who' }, { k: 'actor_id', h: 'Admin ID' }, { k: 'action', h: 'Action' },
        { k: 'meta', h: 'Details', render: (r) => JSON.stringify(r.meta || {}) },
      ]} />}
    </div>
  );
}

function BillingQueue({orders,mutate}:{orders:any[];mutate:(payload:Record<string,unknown>)=>Promise<boolean>}) {
  const [error,setError]=useState('');
  async function openVoucher(id:string){try{const r=await adminGet<{url:string}>(`/api/admin/billing/${id}/voucher`);window.open(r.url,'_blank','noopener,noreferrer');}catch(e){setError(e instanceof Error?e.message:'Could not open voucher.');}}
  return <div className="grid gap-3"><h2 className="text-lg font-bold">Manual QR payment reviews</h2>{error&&<p role="alert" className="text-sm text-red-700">{error}</p>}{orders.length===0&&<Card className="p-5 text-sm">No payments submitted.</Card>}{orders.map(o=><Card key={o.id} className="grid gap-3 p-4 md:grid-cols-[1fr_1fr_auto]"><div><b>{o.package_code||o.product}</b><p className="text-sm text-slate-600">NPR {Number(o.amount).toLocaleString()} · {o.provider}</p><p className="text-xs text-slate-500">{o.metadata?.name||o.user_id||'Student'} · {o.metadata?.phone?<MaskedPhone value={o.metadata.phone}/>:''}</p></div><div><p className="text-sm">{o.status} · {new Date(o.created_at).toLocaleString()}</p><Btn variant="ghost" className="mt-2" onClick={()=>openVoucher(o.id)}>View watermarked voucher</Btn></div>{o.status==='pending'?<div className="flex items-center gap-2"><Btn onClick={()=>mutate({action:'review_billing_order',id:o.id,decision:'approve'})}>Approve</Btn><Btn variant="ghost" onClick={()=>mutate({action:'review_billing_order',id:o.id,decision:'reject'})}>Reject</Btn></div>:<span className="text-sm text-slate-500">Reviewed {o.reviewed_at?.slice(0,10)||''}</span>}</Card>)}</div>;
}

function FeedbackInbox({reports,feedback,leads,reviews,mutate}:{reports:any[];feedback:any[];leads:any[];reviews:any[];mutate:(payload:Record<string,unknown>)=>Promise<boolean>}){
  const rows=[...feedback.map(r=>({...r,source:'Agent portal'})),...reports.map(r=>({...r,source:'Exam question report',title:r.report_type,details:r.details||'',status:r.status||'pending'})),...leads.map(r=>({...r,source:'Public portfolio inquiry',title:r.name,details:r.message||'',status:'new'})),...reviews.map(r=>({...r,source:'Portfolio review',title:`${r.reviewer_name} · ${r.rating}/5`,details:r.review||'',status:r.approved?'published':'awaiting review'}))].sort((a,b)=>String(b.created_at).localeCompare(String(a.created_at)));
  return <div className="grid gap-3"><header><h2 className="text-xl font-bold">Multi-portal feedback inbox</h2><p className="text-sm text-slate-600">Agent requests, exam question reports, portfolio inquiries, and reviews. Personal contact data is omitted here.</p></header>{rows.slice(0,300).map((r,i)=><Card key={`${r.source}-${r.id||i}`} className="grid gap-2 p-4"><div className="flex flex-wrap items-center justify-between gap-2"><div><span className="mr-2 rounded-full bg-blue-50 px-2 py-1 text-xs font-semibold text-[#0A4F8A]">{r.source}</span><b>{r.title||'Submission'}</b></div><div className="flex items-center gap-2 text-xs text-slate-500">{r.created_at?.slice(0,16).replace('T',' ')}{r.source==='Agent portal'?<Sel v={r.status} opts={['new','reviewing','planned','completed','closed']} on={v=>mutate({action:'update_agency_feedback',id:r.id,status:v})}/>:r.source==='Exam question report'?<Sel v={r.status} opts={['pending','in_progress','resolved']} on={v=>mutate({action:'update_question_report',id:r.id,status:v})}/>:<span>{r.status}</span>}</div></div><p className="whitespace-pre-wrap text-sm text-slate-700">{r.details||'No message provided.'}</p></Card>)}{!rows.length&&<Card className="p-5 text-sm text-slate-600">No feedback or inquiries yet.</Card>}</div>;
}

function BroadcastCenter(){
  const [audience,setAudience]=useState('all_registered');const [subject,setSubject]=useState('');const [message,setMessage]=useState('');const [confirm,setConfirm]=useState(false);const [busy,setBusy]=useState(false);const [result,setResult]=useState('');
  async function send(e:React.FormEvent){e.preventDefault();if(!confirm)return;setBusy(true);setResult('');try{const r=await adminPost<{queued:number}>('/api/admin/broadcast',{audience,subject,message});setResult(`Announcement queued for ${r.queued} email recipient(s). Delivery will follow configured notification providers.`);setSubject('');setMessage('');setConfirm(false);}catch(e){setResult(e instanceof Error?e.message:'Could not queue announcement.');}finally{setBusy(false);}}
  return <Card className="mx-auto grid max-w-3xl gap-4 p-5"><div><h2 className="text-xl font-bold">Email announcement</h2><p className="mt-1 text-sm text-slate-600">Queues one email per account with an available email address through the existing notification worker. Use this for important service updates. WhatsApp broadcast requires an approved WhatsApp Business provider configuration.</p></div><form onSubmit={send} className="grid gap-3"><Field label="Audience" as="select" value={audience} onChange={(e:any)=>setAudience(e.target.value)}><option value="all_registered">All registered portal users</option><option value="agents">Agency agents</option></Field><Field label="Subject" required maxLength={120} value={subject} onChange={(e:any)=>setSubject(e.target.value)}/><label className="grid gap-1 text-sm font-medium">Message<textarea required minLength={5} maxLength={3000} rows={7} value={message} onChange={e=>setMessage(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 font-normal"/></label><label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={confirm} onChange={e=>setConfirm(e.target.checked)}/>I reviewed this announcement and want to queue it for the selected audience.</label><Btn type="submit" disabled={busy||!confirm}>{busy?'Queueing…':'Queue announcement'}</Btn></form>{result&&<p role="status" className="text-sm text-slate-700">{result}</p>}</Card>
}

function HealthPanel(){
  const [stats,setStats]=useState<Record<string,number>|null>(null);const [error,setError]=useState('');const [busy,setBusy]=useState(false);
  const load=useCallback(async()=>{setBusy(true);try{const result=await adminGet<{stats:Record<string,number>}>('/api/admin/health');setStats(result.stats);setError('');}catch(e){setError(e instanceof Error?e.message:'Could not load system health.');}finally{setBusy(false);}},[]);
  useEffect(()=>{void load();},[load]);
  const values:Record<string,string>={agents:'Registered agents',active_tenants:'Active agency subscriptions',pending_vouchers:'Pending payment reviews',storage_objects:'Stored objects',storage_bytes:'Storage used',sessions_started_today:'Sessions started today',admin_sessions_active:'Admin sessions active'};
  return <div className="grid gap-4"><div className="flex flex-wrap items-center justify-between gap-2"><div><h2 className="text-xl font-bold">Database health</h2><p className="text-sm text-slate-600">Live aggregate counts from Supabase. No client records or file names are exposed here.</p></div><Btn variant="ghost" disabled={busy} onClick={()=>void load()}>{busy?'Refreshing…':'Refresh'}</Btn></div>{error&&<p role="alert" className="text-sm text-red-700">{error}</p>}<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{Object.entries(values).map(([key,label])=><Card key={key} className="p-4"><p className="text-sm text-slate-500">{label}</p><p className="mt-1 text-2xl font-extrabold">{stats?key==='storage_bytes'?`${(stats[key]/1024/1024).toFixed(2)} MB`:(stats[key]||0).toLocaleString():'—'}</p>{key==='storage_bytes'&&stats&&<p className="text-xs text-slate-500">{(stats[key]||0).toLocaleString()} bytes</p>}</Card>)}</div><p className="text-xs text-slate-500">Sessions started today counts Supabase Auth sessions created since midnight UTC; it is an activity indicator and may include expired tokens.</p></div>
}

function ExamPassAdmin({ settings, orders, mutate, onRefresh }: { settings: any; orders: any[]; mutate: (payload: Record<string, unknown>) => Promise<boolean>; onRefresh: () => Promise<void> }) {
  const [price, setPrice] = useState(settings?.price ?? 0);
  const [instructions, setInstructions] = useState(settings?.payment_instructions || '');
  const [saving, setSaving] = useState(false);
  useEffect(() => { setPrice(settings?.price ?? 0); setInstructions(settings?.payment_instructions || ''); }, [settings?.price, settings?.payment_instructions]);
  async function save(e: any) {
    e.preventDefault(); setSaving(true);
    await mutate({ action: 'update_exam_pass_settings', price: Number(price), payment_instructions: instructions });
    setSaving(false);
  }
  return <div className="grid gap-6">
    <form onSubmit={save} className="grid gap-4 rounded-xl border border-slate-200 bg-white p-5">
      <div><h2 className="font-bold">Exam pass settings</h2><p className="mt-1 text-sm text-slate-600">Set a price in NPR to enable paid passes. A zero price disables sales and keeps the current exam access behavior.</p></div>
      <Field label="Price per attempt (NPR)" required type="number" min="0" max="1000000" step="0.01" value={price} onChange={(e: any) => setPrice(e.target.value)} />
      <label className="grid gap-1 text-sm font-medium">Payment instructions for customers<textarea maxLength={2000} rows={3} value={instructions} onChange={(e) => setInstructions(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 font-normal" placeholder="Wallet ID, bank details, or contact instructions" /></label>
      <Btn type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save pass settings'}</Btn>
    </form>
    <section><div className="mb-3 flex items-center justify-between"><h2 className="font-bold">Receipt requests</h2><Btn variant="ghost" onClick={onRefresh}>Refresh receipts</Btn></div>
      {!orders.length ? <Card className="p-5 text-sm text-slate-600">No receipt requests yet.</Card> : <div className="grid gap-3">{orders.map((order) => <Card key={order.id} className="grid gap-3 p-4 md:grid-cols-[1fr_1fr_auto] md:items-center">
        <div><p className="font-semibold">{order.name} · <MaskedPhone value={order.phone} /></p><p className="text-sm text-slate-600">{order.currency} {Number(order.amount).toLocaleString()} · {order.payment_method}</p></div>
        <div><p className="text-sm">Reference: <span className="font-mono">{order.receipt_reference}</span></p><p className="text-xs capitalize text-slate-500">{order.status} · {new Date(order.created_at).toLocaleString()}</p></div>
        {order.status === 'pending' ? <div className="flex gap-2"><Btn onClick={() => mutate({ action: 'review_exam_pass', id: order.id, decision: 'approve' })}>Approve</Btn><Btn variant="ghost" onClick={() => mutate({ action: 'review_exam_pass', id: order.id, decision: 'reject' })}>Reject</Btn></div> : <span className="text-sm text-slate-500">{order.status === 'approved' ? 'Pass issued' : order.status === 'redeemed' ? 'Pass used' : 'Reviewed'}</span>}
      </Card>)}</div>}
    </section>
  </div>;
}

function Configuration({ companies, coupons, mutate }: { companies: any[]; coupons: any[]; mutate: (payload: Record<string, unknown>) => Promise<boolean> }) {
  const [company, setCompany] = useState(''); const [tds, setTds] = useState('20');
  const [tdi, setTdi] = useState('{"A":100,"B":4,"C":2,"D":1}'); const [bdi, setBdi] = useState('{"A":100,"B":4,"C":2,"D":1}');
  const [code, setCode] = useState(''); const [discount, setDiscount] = useState(''); const [until, setUntil] = useState('');
  const [error, setError] = useState('');
  return <div className="grid gap-6 lg:grid-cols-2">
    <Card className="grid content-start gap-4 p-5"><div><h2 className="font-bold">Company tax rules</h2><p className="mt-1 text-sm text-slate-600">TDS is applied to the gross commission when a policy is saved.</p></div>
      <form className="grid gap-3" onSubmit={async (e) => { e.preventDefault(); setError(''); try { const tdiRules = JSON.parse(tdi); const bdiRules = JSON.parse(bdi); if (await mutate({ action: 'save_company_rule', company, tds_rate: Number(tds), tdi_rules: tdiRules, bdi_rules: bdiRules })) { setCompany(''); setTds('20'); } } catch { setError('Enter valid JSON for the TDI and BDI layer percentages.'); } }}>
        <Field label="Insurance company" required value={company} onChange={(e: any) => setCompany(e.target.value)} />
        <Field label="TDS rate (%)" type="number" min="0" max="100" step="0.01" required value={tds} onChange={(e: any) => setTds(e.target.value)} />
        <label className="grid gap-1 text-sm font-medium">TDI layer rates (%)<textarea rows={2} value={tdi} onChange={(e) => setTdi(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 font-mono text-xs font-normal" /></label>
        <label className="grid gap-1 text-sm font-medium">BDI layer rates (%)<textarea rows={2} value={bdi} onChange={(e) => setBdi(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 font-mono text-xs font-normal" /></label>
        <p className="text-xs text-slate-500">Use JSON such as {'{"A":100,"B":4,"C":2,"D":1}'}; rates are percentages.</p>
        {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
        <Btn type="submit">Save company rule</Btn>
      </form>
      <DataTable name="company-rules" rows={companies} cols={[{ k: 'company', h: 'Company' }, { k: 'tds_rate', h: 'TDS %' }, { k: 'updated_at', h: 'Updated', render: (r) => r.updated_at?.slice(0, 10) }]} />
    </Card>
    <Card className="grid content-start gap-4 p-5"><div><h2 className="font-bold">Coupon codes</h2><p className="mt-1 text-sm text-slate-600">Coupons are stored for subscription and checkout validation.</p></div>
      <form className="grid gap-3" onSubmit={async (e) => { e.preventDefault(); if (await mutate({ action: 'create_coupon', code, discount_percent: Number(discount), valid_until: until || null })) { setCode(''); setDiscount(''); setUntil(''); } }}>
        <Field label="Code" required value={code} onChange={(e: any) => setCode(e.target.value.toUpperCase())} />
        <Field label="Discount (%)" type="number" min="1" max="100" required value={discount} onChange={(e: any) => setDiscount(e.target.value)} />
        <Field label="Expires (optional)" type="date" value={until} onChange={(e: any) => setUntil(e.target.value)} />
        <Btn type="submit">Create coupon</Btn>
      </form>
      <DataTable name="coupons" rows={coupons} cols={[{ k: 'code', h: 'Code' }, { k: 'discount_percent', h: 'Discount %' }, { k: 'redemption_count', h: 'Used' }, { k: 'valid_until', h: 'Expires', render: (r) => r.valid_until?.slice(0, 10) || 'Never' }]} />
    </Card>
  </div>;
}

const examCols = [
  { k: 'name', h: 'Name' }, { k: 'phone', h: 'Phone', render: (r: any) => <MaskedPhone value={r.phone} />, csv: (r: any) => maskPhone(r.phone) },
  { k: 'score', h: 'Marks', render: (r: any) => (r.submitted_at ? `${r.score}/${r.max_marks}` : 'In progress'), csv: (r: any) => (r.submitted_at ? r.score : '') },
  { k: 'passed', h: 'Result', render: (r: any) => (r.submitted_at ? <Badge tone={r.passed ? 'green' : 'red'}>{r.passed ? 'Pass' : 'Fail'}</Badge> : '-'), csv: (r: any) => (r.submitted_at ? (r.passed ? 'Pass' : 'Fail') : '') },
  { k: 'cert_id', h: 'Certificate' }, { k: 'created_at', h: 'Started', render: (r: any) => new Date(r.created_at).toLocaleString() },
];

function Sel({ v, opts, on }: { v: string; opts: string[]; on: (v: string) => void }) {
  return <select value={v} onChange={(e) => on(e.target.value)} className="rounded-md border border-slate-300 bg-white px-2 py-1 text-sm">{opts.map((o) => <option key={o}>{o}</option>)}</select>;
}

function Finance({ P, POL, inRange, name, from, to, setFrom, setTo, mutate }: any) {
  const [f, setF] = useState<any>({ plan_type: 'endowment', premium_mode: 'regular', term_years: 15, issue_date: today() });
  const set = (k: string) => (e: any) => setF({ ...f, [k]: e.target.value });
  const agents = P.filter((p: any) => p.role === 'agent');

  const rows = agents.map((a: any) => {
    const L = layersOf(a.id, P);
    const prod = (['A', 'B', 'C', 'D'] as const).flatMap((l) => inRange.filter((p: any) => L[l].includes(p.agent_id)).map((p: any) => ({ ...p, layer: l })));
    const tdi = calcIncentive(prod, 'TDI'), bdi = calcIncentive(prod, 'BDI');
    const self = inRange.filter((p: any) => p.agent_id === a.id);
    return { id: a.id, name: a.name, count: self.length, premium: self.reduce((s: number, p: any) => s + Number(p.premium), 0), weighted: self.reduce((s: number, p: any) => s + weighted(p), 0), tdi: tdi.totalCredit, bdi: bdi.totalCredit };
  });

  async function add(e: any) {
    e.preventDefault();
    const saved = await mutate({ action: 'create_policy', ...f });
    if (saved) setF({ ...f, client_name: '', premium: '' });
  }

  return (
    <div className="grid gap-8">
      <Card className="no-print flex flex-wrap items-end gap-3 p-4">
        <Field label="From" type="date" value={from} onChange={(e: any) => setFrom(e.target.value)} />
        <Field label="To" type="date" value={to} onChange={(e: any) => setTo(e.target.value)} />
      </Card>
      <div>
        <h2 className="mb-3 font-bold">Agent performance and incentive credit</h2>
        <DataTable name="agent-performance" rows={rows} cols={[
          { k: 'name', h: 'Agent' }, { k: 'count', h: 'Policies' },
          { k: 'premium', h: 'Premium', render: (r: any) => npr(r.premium), csv: (r: any) => r.premium },
          { k: 'weighted', h: 'Weighted', render: (r: any) => npr(r.weighted), csv: (r: any) => r.weighted },
          { k: 'tdi', h: 'TDI credit', render: (r: any) => npr(r.tdi), csv: (r: any) => r.tdi },
          { k: 'bdi', h: 'BDI credit', render: (r: any) => npr(r.bdi), csv: (r: any) => r.bdi },
        ]} />
      </div>
      <form onSubmit={add} className="no-print grid gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-4">
        <h2 className="font-bold sm:col-span-4">Record a policy for an agent</h2>
        <Field label="Agent" as="select" required value={f.agent_id || ''} onChange={set('agent_id')}><option value="">Choose</option>{agents.map((a: any) => <option key={a.id} value={a.id}>{a.name}</option>)}</Field>
        <Field label="Client" required value={f.client_name || ''} onChange={set('client_name')} />
        <Field label="Plan" as="select" value={f.plan_type} onChange={set('plan_type')}>{PLANS.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</Field>
        <Field label="Mode" as="select" value={f.premium_mode} onChange={set('premium_mode')}><option value="regular">Regular</option><option value="single">Single</option></Field>
        <Field label="Term (years)" type="number" min="1" value={f.term_years} onChange={set('term_years')} />
        <Field label="Premium (NPR)" type="number" required value={f.premium || ''} onChange={set('premium')} />
        <Field label="Issue date" type="date" required value={f.issue_date} onChange={set('issue_date')} />
        <Btn type="submit" className="self-end">Add policy</Btn>
      </form>
      <div>
        <h2 className="mb-3 font-bold">Policy ledger</h2>
        <DataTable name="policies" rows={inRange} cols={[
          { k: 'issue_date', h: 'Issued' }, { k: 'agent', h: 'Agent', render: (r: any) => name[r.agent_id], csv: (r: any) => name[r.agent_id] },
          { k: 'client_name', h: 'Client' }, { k: 'plan', h: 'Plan', render: (r: any) => planName(r.plan_type), csv: (r: any) => planName(r.plan_type) },
          { k: 'premium_mode', h: 'Mode' }, { k: 'term_years', h: 'Term' },
          { k: 'premium', h: 'Premium', render: (r: any) => npr(r.premium), csv: (r: any) => r.premium },
          { k: 'count', h: 'Counts', render: (r: any) => `${weightPct(r.premium_mode, r.term_years) * 100}%`, csv: (r: any) => weightPct(r.premium_mode, r.term_years) * 100 },
        ]} />
      </div>
    </div>
  );
}

function Schemes({ P, schemes, status, mutate }: any) {
  const [n, setN] = useState<any>({});
  const [sel, setSel] = useState('');
  const [edits, setEdits] = useState<Record<string, any>>({});
  const cur = schemes.find((s: any) => s.id === sel);
  const statusOf = (aid: string) => ({ ...(status.find((x: any) => x.scheme_id === sel && x.agent_id === aid) || { achieved: 0, status: 'pending', note: '' }), ...(edits[aid] || {}) });

  async function create(e: any) {
    e.preventDefault();
    const saved = await mutate({ action: 'create_scheme', ...n });
    if (saved) setN({});
  }
  async function saveRow(aid: string) {
    const s = statusOf(aid);
    const saved = await mutate({ action: 'save_scheme_status', scheme_id: sel, agent_id: aid, achieved: Number(s.achieved || 0), status: s.status, note: s.note || null });
    if (saved) setEdits({ ...edits, [aid]: undefined });
  }
  const upd = (aid: string, k: string, v: any) => setEdits({ ...edits, [aid]: { ...(edits[aid] || {}), [k]: v } });

  return (
    <div className="grid gap-6">
      <form onSubmit={create} className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-4">
        <h2 className="font-bold sm:col-span-4">New monthly scheme</h2>
        <Field label="Title" required value={n.title || ''} onChange={(e: any) => setN({ ...n, title: e.target.value })} />
        <Field label="Month" placeholder="Kartik 2083" value={n.month_label || ''} onChange={(e: any) => setN({ ...n, month_label: e.target.value })} />
        <Field label="Target (NPR)" type="number" value={n.target || ''} onChange={(e: any) => setN({ ...n, target: e.target.value })} />
        <Field label="Criteria" value={n.criteria || ''} onChange={(e: any) => setN({ ...n, criteria: e.target.value })} />
        <Btn type="submit">Create scheme</Btn>
      </form>
      <div className="flex flex-wrap items-end gap-3">
        <Field label="Update qualification for" as="select" value={sel} onChange={(e: any) => { setSel(e.target.value); setEdits({}); }}>
          <option value="">Choose a scheme</option>{schemes.map((s: any) => <option key={s.id} value={s.id}>{s.title} ({s.month_label})</option>)}
        </Field>
        {cur && <Btn variant="ghost" onClick={() => mutate({ action: 'update_scheme', id: cur.id, active: !cur.active })}>{cur.active ? 'Hide from agents' : 'Show to agents'}</Btn>}
      </div>
      {cur && (
        <Card className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-600"><tr><th className="px-3 py-2">Agent</th><th>Achieved (NPR)</th><th>Status</th><th>Note</th><th /></tr></thead>
            <tbody>
              {P.map((a: any) => { const s = statusOf(a.id); return (
                <tr key={a.id} className="border-t border-slate-100">
                  <td className="px-3 py-2 font-medium">{a.name}</td>
                  <td><input type="number" value={s.achieved} onChange={(e) => upd(a.id, 'achieved', e.target.value)} className="w-32 rounded-md border border-slate-300 px-2 py-1" /></td>
                  <td><Sel v={s.status} opts={['pending', 'qualified', 'not_qualified']} on={(v) => upd(a.id, 'status', v)} /> <Badge tone={schemeTone[s.status]}>{s.status.replace('_', ' ')}</Badge></td>
                  <td><input value={s.note || ''} onChange={(e) => upd(a.id, 'note', e.target.value)} className="w-56 rounded-md border border-slate-300 px-2 py-1" /></td>
                  <td className="px-3"><Btn variant="dark" onClick={() => saveRow(a.id)}>Save</Btn></td>
                </tr>); })}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}

