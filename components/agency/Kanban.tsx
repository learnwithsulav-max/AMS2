'use client';
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { PLANS, npr, today } from '@/lib/rules';
import { Badge, Btn, Card, Field, Modal } from '../ui';
import { MaskedPhone } from '@/components/MaskedPhone';

export const STAGES = ['New Lead', 'Contacted', 'Proposal Sent', 'Follow-up', 'Closed Won', 'Closed Lost'];
const stageTone: Record<string, string> = { 'Closed Won': 'green', 'Closed Lost': 'red' };

function dueChip(d?: string, label = 'Follow-up') {
  if (!d) return null;
  const t = today();
  const tone = d < t ? 'red' : d === t ? 'amber' : 'slate';
  return <Badge tone={tone}>{label}: {d}{d < t ? ' (overdue)' : d === t ? ' (today)' : ''}</Badge>;
}

export function Kanban({ uid }: { uid: string }) {
  const [leads, setLeads] = useState<any[]>([]);
  const [edit, setEdit] = useState<any | null>(null);
  const [over, setOver] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data } = await supabase.from('leads').select('*').eq('agent_id', uid).order('created_at', { ascending: false });
    setLeads(data || []);
  }, [uid]);
  useEffect(() => { load(); }, [load]);

  async function move(id: string, stage: string) {
    setLeads((l) => l.map((x) => (x.id === id ? { ...x, stage } : x)));
    await supabase.from('leads').update({ stage }).eq('id', id);
  }
  async function save(e: any) {
    e.preventDefault();
    const { id, ...f } = edit;
    const row = {
      name: f.name, phone: f.phone || null, stage: f.stage || STAGES[0], plan_interest: f.plan_interest || null,
      est_premium: f.est_premium ? Number(f.est_premium) : null, follow_up_date: f.follow_up_date || null,
      renewal_date: f.renewal_date || null, notes: f.notes || null,
    };
    if (id) await supabase.from('leads').update(row).eq('id', id);
    else await supabase.from('leads').insert({ ...row, agent_id: uid });
    setEdit(null); load();
  }
  async function remove() {
    if (!confirm('Delete this lead?')) return;
    await supabase.from('leads').delete().eq('id', edit.id);
    setEdit(null); load();
  }

  const t = today();
  const dueNow = leads.filter((l) => l.follow_up_date && l.follow_up_date <= t && !l.stage.startsWith('Closed')).length;
  const soon = new Date(Date.now() + 30 * 864e5).toLocaleDateString('en-CA');
  const renewals = leads.filter((l) => l.renewal_date && l.renewal_date >= t && l.renewal_date <= soon).length;
  const set = (k: string) => (e: any) => setEdit({ ...edit, [k]: e.target.value });

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <Badge tone={dueNow ? 'red' : 'slate'}>{dueNow} follow-ups due</Badge>
          <Badge tone={renewals ? 'amber' : 'slate'}>{renewals} renewals in 30 days</Badge>
          <Badge tone="blue">{leads.length} leads</Badge>
        </div>
        <Btn onClick={() => setEdit({ stage: STAGES[0] })}>Add lead</Btn>
      </div>

      <div className="grid auto-cols-[280px] grid-flow-col gap-4 overflow-x-auto pb-4">
        {STAGES.map((s) => {
          const col = leads.filter((l) => l.stage === s);
          return (
            <section key={s}
              onDragOver={(e) => { e.preventDefault(); setOver(s); }} onDragLeave={() => setOver(null)}
              onDrop={(e) => { setOver(null); const id = e.dataTransfer.getData('text/plain'); if (id) move(id, s); }}
              className={`rounded-xl bg-slate-100 p-3 ${over === s ? 'ring-2 ring-brand' : ''}`} aria-label={s}>
              <h3 className="mb-3 flex items-center justify-between text-sm font-bold">{s}<Badge tone={stageTone[s] || 'blue'}>{col.length}</Badge></h3>
              <div className="grid gap-2">
                {col.map((l) => (
                  <Card key={l.id} draggable onDragStart={(e: any) => e.dataTransfer.setData('text/plain', l.id)}
                    onClick={() => setEdit(l)} className="cursor-grab p-3 text-sm hover:border-brand">
                    <p className="font-semibold">{l.name}</p>
                    {l.phone && <p className="text-slate-500"><MaskedPhone value={l.phone} /></p>}
                    {l.plan_interest && <p className="mt-1 text-slate-600">{PLANS.find((p) => p.id === l.plan_interest)?.name}</p>}
                    {l.est_premium && <p className="text-slate-600">{npr(l.est_premium)}</p>}
                    <div className="mt-2 flex flex-wrap gap-1">{dueChip(l.follow_up_date)}{dueChip(l.renewal_date, 'Renewal')}</div>
                  </Card>
                ))}
              </div>
            </section>
          );
        })}
      </div>

      {edit && (
        <Modal title={edit.id ? 'Edit lead' : 'Add lead'} onClose={() => setEdit(null)}>
          <form onSubmit={save} className="grid gap-3 sm:grid-cols-2">
            <Field label="Client name" required className="sm:col-span-2" value={edit.name || ''} onChange={set('name')} />
            <Field label="Phone" value={edit.phone || ''} onChange={set('phone')} />
            <Field label="Stage" as="select" value={edit.stage} onChange={set('stage')}>{STAGES.map((s) => <option key={s}>{s}</option>)}</Field>
            <Field label="Plan of interest" as="select" value={edit.plan_interest || ''} onChange={set('plan_interest')}>
              <option value="">Not chosen</option>{PLANS.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </Field>
            <Field label="Estimated premium (NPR)" type="number" min="0" value={edit.est_premium || ''} onChange={set('est_premium')} />
            <Field label="Next follow-up" type="date" value={edit.follow_up_date || ''} onChange={set('follow_up_date')} />
            <Field label="Renewal due" type="date" value={edit.renewal_date || ''} onChange={set('renewal_date')} />
            <Field label="Notes" as="textarea" rows={3} className="sm:col-span-2" value={edit.notes || ''} onChange={set('notes')} />
            <div className="flex justify-between sm:col-span-2">
              {edit.id ? <Btn type="button" variant="danger" onClick={remove}>Delete</Btn> : <span />}
              <Btn type="submit">Save lead</Btn>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
