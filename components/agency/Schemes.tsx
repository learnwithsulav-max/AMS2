'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { npr } from '@/lib/rules';
import { Badge, Card } from '../ui';

export const schemeTone: Record<string, string> = { qualified: 'green', not_qualified: 'red', pending: 'amber' };

export function Schemes({ uid }: { uid: string }) {
  const [schemes, setSchemes] = useState<any[]>([]);
  const [st, setSt] = useState<Record<string, any>>({});
  useEffect(() => {
    (async () => {
      const [{ data: s }, { data: m }] = await Promise.all([
        supabase.from('schemes').select('*').eq('active', true).order('created_at', { ascending: false }),
        supabase.from('scheme_status').select('*').eq('agent_id', uid),
      ]);
      setSchemes(s || []);
      setSt(Object.fromEntries((m || []).map((x: any) => [x.scheme_id, x])));
    })();
  }, [uid]);

  if (!schemes.length) return <Card className="p-8 text-center text-slate-500">No active scheme yet. Your admin will post the monthly scheme here.</Card>;
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {schemes.map((s) => {
        const m = st[s.id]; const pct = Math.min(100, ((m?.achieved || 0) / (s.target || 1)) * 100);
        const status = m?.status || 'pending';
        return (
          <Card key={s.id} className="p-5">
            <div className="flex items-start justify-between gap-2">
              <div><h3 className="font-bold">{s.title}</h3><p className="text-sm text-slate-500">{s.month_label}</p></div>
              <Badge tone={schemeTone[status]}>{status.replace('_', ' ')}</Badge>
            </div>
            <p className="mt-3 text-sm text-slate-700">{s.criteria}</p>
            <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full bg-brand" style={{ width: `${pct}%` }} /></div>
            <p className="mt-2 text-sm text-slate-600">{npr(m?.achieved || 0)} of {npr(s.target)}</p>
            {m?.note && <p className="mt-2 text-sm text-slate-500">Note: {m.note}</p>}
          </Card>
        );
      })}
    </div>
  );
}
