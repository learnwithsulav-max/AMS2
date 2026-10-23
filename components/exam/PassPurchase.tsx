'use client';
import { useEffect, useState } from 'react';
import { Card, Btn, Field } from '../ui';

const CLAIM_KEY = 'lsw_exam_pass_claim';
type Claim = { orderId: string; claimToken: string };
export function PassPurchase({ onPassCode, onAvailability }: { onPassCode: (code: string) => void; onAvailability: (active: boolean, price: number, currency: string) => void }) {
  const [settings, setSettings] = useState<any>(null);
  const [claim, setClaim] = useState<Claim | null>(null);
  const [order, setOrder] = useState<any>(null);
  const [form, setForm] = useState({ name: '', phone: '', paymentMethod: '', receiptReference: '' });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  useEffect(() => {
    let alive = true;
    fetch('/api/exam/passes', { cache: 'no-store' }).then((r) => r.json()).then((data) => {
      if (!alive) return;
      setSettings(data);
      onAvailability(!!data.active, Number(data.price || 0), data.currency || 'NPR');
    }).catch(() => setMessage('Pass purchase is temporarily unavailable.'));
    try {
      const saved = sessionStorage.getItem(CLAIM_KEY);
      if (saved) setClaim(JSON.parse(saved));
    } catch {}
    return () => { alive = false; };
  }, [onAvailability]);
  useEffect(() => {
    if (!claim) return;
    let alive = true;
    fetch('/api/exam/passes', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(claim) }).then((r) => r.json()).then((data) => { if (alive && data.order) setOrder(data.order); }).catch(() => {});
    return () => { alive = false; };
  }, [claim]);
  async function submit(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setMessage('');
    const response = await fetch('/api/exam/passes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    const data = await response.json(); setBusy(false);
    if (!response.ok) return setMessage(data.error || 'Could not submit this receipt.');
    const next = { orderId: data.order.id, claimToken: data.claimToken };
    try { sessionStorage.setItem(CLAIM_KEY, JSON.stringify(next)); } catch {}
    setClaim(next); setOrder(data.order); setMessage('Receipt submitted. An administrator will review it before issuing a pass.');
  }
  async function refresh() {
    if (!claim) return;
    setBusy(true); setMessage('');
    const response = await fetch('/api/exam/passes', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(claim) });
    const data = await response.json(); setBusy(false);
    if (!response.ok) return setMessage(data.error || 'Could not check this receipt.');
    setOrder(data.order);
    if (data.order.passCode) onPassCode(data.order.passCode);
  }
  if (!settings) return <Card className="p-5"><p className="text-sm text-slate-500">Loading pass details…</p></Card>;
  if (!settings.active) return <Card className="p-5"><h2 className="font-bold">Exam access</h2><p className="mt-2 text-sm text-slate-600">Pass sales are not open yet. The exam is currently available without a pass.</p></Card>;
  return <Card className="p-5">
    <h2 className="text-lg font-bold">Exam pass · {settings.currency} {Number(settings.price).toLocaleString()}</h2>
    <p className="mt-2 whitespace-pre-wrap text-sm text-slate-600">{settings.paymentInstructions}</p>
    {claim ? <div className="mt-4 rounded-lg bg-slate-50 p-4">
      <p className="font-semibold">Receipt status: {order?.status || 'checking'}</p>
      {order?.status === 'approved' && order.passCode && <><p className="mt-2 text-sm">Your one-time pass code:</p><p className="my-2 select-all rounded bg-white p-2 font-mono font-bold">{order.passCode}</p><Btn onClick={() => onPassCode(order.passCode)}>Use this pass</Btn></>}
      {order?.status === 'pending' && <p className="mt-1 text-sm text-slate-600">Your receipt is waiting for review.</p>}
      {order?.status === 'rejected' && <p className="mt-1 text-sm text-red-700">This receipt was not approved. Contact support if you need help.</p>}
      {order?.status === 'redeemed' && <p className="mt-1 text-sm text-slate-600">This pass has already been used.</p>}
      <Btn variant="ghost" className="mt-3" disabled={busy} onClick={refresh}>Check receipt status</Btn>
    </div> : <form onSubmit={submit} className="mt-4 grid gap-3">
      <Field label="Full name" required maxLength={100} value={form.name} onChange={(e: any) => setForm({ ...form, name: e.target.value })} />
      <Field label="Phone" required type="tel" value={form.phone} onChange={(e: any) => setForm({ ...form, phone: e.target.value })} />
      <Field label="Payment method" required maxLength={40} placeholder="Wallet or bank" value={form.paymentMethod} onChange={(e: any) => setForm({ ...form, paymentMethod: e.target.value })} />
      <Field label="Receipt / transaction reference" required maxLength={120} value={form.receiptReference} onChange={(e: any) => setForm({ ...form, receiptReference: e.target.value })} />
      {message && <p role="status" className="text-sm text-slate-600">{message}</p>}
      <Btn type="submit" disabled={busy}>{busy ? 'Submitting…' : 'Submit receipt for review'}</Btn>
    </form>}
    {message && claim && <p role="status" className="mt-3 text-sm text-slate-600">{message}</p>}
  </Card>;
}
