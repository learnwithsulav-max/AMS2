'use client';
import { useEffect, useState } from 'react';
import { Card, Btn, Field } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { jsPDF } from 'jspdf';
import { BRAND } from '@/lib/brand';

const packages = [
  {
    code: 'agency_basic',
    name: 'Agent Basic',
    price: 499,
    days: 180,
    features: ['Unlimited policies', 'Family policy grouping', 'TDS and commission tools', 'Offline sync', 'Private document vault'],
  },
  {
    code: 'agency_pro',
    name: 'Agent Pro',
    price: 899,
    days: 365,
    features: ['Everything in Basic', 'Downline hierarchy & titles', 'Installment calendar & projections', 'Festival banner generator', 'Priority coaching support'],
    best: true,
  },
];

export function Billing() {
  const { session, profile } = useAuth();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [chosen, setChosen] = useState('agency_basic');
  const [provider, setProvider] = useState('fonepay');
  const [couponCode, setCouponCode] = useState('');
  const [pan, setPan] = useState(profile?.pan_number || '');
  const [quote, setQuote] = useState<any>(null);
  const [status, setStatus] = useState<any>(null);

  useEffect(() => {
    const id = localStorage.getItem('lws_agency_billing_order');
    if (!id || !session) return;
    fetch(`/api/billing/orders?id=${encodeURIComponent(id)}`, {
      headers: { Authorization: `Bearer ${session.access_token}` },
      cache: 'no-store',
    })
      .then((r) => r.json())
      .then((j) => {
        if (j.order) setStatus(j.order);
      });
  }, [session]);

  async function refresh() {
    if (!status?.id) return;
    const r = await fetch(`/api/billing/orders?id=${encodeURIComponent(status.id)}`, {
      headers: { Authorization: `Bearer ${session?.access_token || ''}` },
      cache: 'no-store',
    });
    const j = await r.json();
    if (r.ok) setStatus(j.order);
    else setMessage(j.error || 'Could not refresh order.');
  }

  async function applyCoupon() {
    setMessage('');
    const r = await fetch('/api/billing/quote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ packageCode: chosen, couponCode }),
    });
    const j = await r.json();
    if (!r.ok) {
      setQuote(null);
      setMessage(j.error || 'Could not validate coupon.');
      return;
    }
    setQuote(j);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const file = (document.querySelector<HTMLInputElement>('#agency-voucher')?.files || [])[0];
    if (!file) {
      setMessage('Upload your payment voucher receipt first.');
      return;
    }
    setBusy(true);
    setMessage('');
    const fd = new FormData();
    fd.set('packageCode', chosen);
    fd.set('provider', provider);
    fd.set('couponCode', couponCode);
    if (pan) fd.set('pan', pan);
    fd.set('voucher', file);

    const r = await fetch('/api/billing/orders', {
      method: 'POST',
      headers: { Authorization: `Bearer ${session?.access_token || ''}` },
      body: fd,
    });
    const j = await r.json();
    setBusy(false);
    if (!r.ok) {
      setMessage(j.error || 'Could not submit payment.');
      return;
    }
    setStatus(j.order);
    localStorage.setItem('lws_agency_billing_order', j.order.id);
    setMessage('Voucher received. Access will activate after administrator verification.');
  }

  async function downloadReceipt() {
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

    pdf.setFillColor(10, 79, 138);
    pdf.rect(0, 0, 210, 32, 'F');
    pdf.setFillColor(241, 90, 36);
    pdf.rect(0, 32, 210, 2, 'F');

    const logoImg = await new Promise<HTMLImageElement | null>((res) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => res(img);
      img.onerror = () => res(null);
      img.src = '/logo.png';
    });

    if (logoImg) {
      pdf.addImage(logoImg, 'PNG', 14, 4, 24, 24);
    }

    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(16);
    pdf.setFont('helvetica', 'bold');
    pdf.text('LEARN WITH SULAV', logoImg ? 42 : 14, 16);
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    pdf.text('Agency Subscription · Official Payment Voucher Receipt', logoImg ? 42 : 14, 22);
    pdf.setFontSize(8);
    pdf.text('Smart Tools, Training Portals & Mentorship for Insurance Advisors', logoImg ? 42 : 14, 27);

    pdf.setTextColor(45, 55, 72);
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    pdf.text('PAYMENT RECEIPT & SUBSCRIPTION DETAILS', 14, 44);

    pdf.setFillColor(247, 250, 252);
    pdf.roundedRect(14, 48, 182, 58, 2, 2, 'F');
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');

    pdf.text(`Agent Name: ${profile?.name || ''}`, 20, 56);
    pdf.text(`Agent ID: ${profile?.id || ''}`, 120, 56);
    pdf.text(`Package: ${status?.packageCode === 'agency_pro' ? 'Agent Pro (365 Days)' : 'Agent Basic (180 Days)'}`, 20, 64);
    pdf.text(`Amount Paid: NPR ${status?.amount || 0}`, 120, 64);
    pdf.text(`Status: ${(status?.status || 'active').toUpperCase()}`, 20, 72);
    pdf.text(`Payment Gateway / Mode: ${(status?.provider || provider).toUpperCase()}`, 120, 72);
    if (pan || profile?.pan_number) {
      pdf.text(`PAN: ${pan || profile?.pan_number}`, 20, 80);
    }
    pdf.text(`Valid Until: ${status?.expiresAt ? new Date(status.expiresAt).toLocaleDateString('en-GB') : 'Active'}`, 120, 80);
    pdf.text(`Receipt Reference: ${status?.id || ''}`, 20, 88);
    pdf.text(`Receipt Date: ${new Date().toLocaleDateString('en-GB')}`, 120, 88);

    // Official Stamp
    pdf.setDrawColor(241, 90, 36);
    pdf.setLineWidth(0.8);
    pdf.circle(165, 128, 18, 'S');
    pdf.setTextColor(241, 90, 36);
    pdf.setFontSize(6);
    pdf.setFont('helvetica', 'bold');
    pdf.text('LEARN WITH SULAV', 152, 126);
    pdf.text('PAYMENT VERIFIED', 152, 130);
    pdf.text('OFFICIAL RECEIPT', 152, 133);

    pdf.setTextColor(113, 128, 150);
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'normal');
    pdf.text(
      'This receipt confirms active subscription to Learn With Sulav Agency Pro/Basic portal. Thank you for your continued commitment to excellence in insurance advisory.',
      14,
      150,
      { maxWidth: 182 }
    );
    pdf.text(BRAND.trustBadge, 14, 165);

    pdf.save(`LWS-Agency-Receipt-${status?.id || 'subscription'}.pdf`);
  }

  return (
    <div className="mx-auto grid max-w-5xl gap-6 px-4 py-8">
      <header>
        <h1 className="text-3xl font-extrabold text-[#0A4F8A]">Agency Subscription & Billing</h1>
        <p className="mt-2 text-slate-600">{profile?.name} · Upgrade or renew your agency portal access.</p>
      </header>

      <Card className="p-4 bg-blue-50/50 border border-blue-200">
        <h2 className="font-bold text-[#0A4F8A]">7-Day Free Trial Available</h2>
        <p className="mt-1 text-sm text-slate-600">
          Full agency dashboard, vCard tools, and commission calculator with up to five client policies. Upgrade any time to unlock unlimited policies and downline management.
        </p>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {packages.map((p) => (
          <button
            type="button"
            key={p.code}
            onClick={() => {
              setChosen(p.code);
              setQuote(null);
            }}
            className={`relative rounded-2xl border-2 bg-white p-5 text-left transition shadow-sm ${
              chosen === p.code ? 'border-[#F15A24] ring-1 ring-[#F15A24]' : 'border-slate-200 hover:border-slate-300'
            }`}
          >
            {p.best && (
              <span className="absolute right-4 top-4 rounded-full bg-[#F15A24] px-2.5 py-1 text-xs font-bold text-white">
                Best value
              </span>
            )}
            <h2 className="text-xl font-bold text-[#0A4F8A]">{p.name}</h2>
            <p className="mt-1 text-3xl font-black text-slate-900 tabular-nums">
              Rs {p.price}
              <span className="text-sm font-normal text-slate-500"> / {p.days} days</span>
            </p>
            <ul className="mt-3 list-inside list-disc text-sm text-slate-600 space-y-1">
              {p.features.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
          </button>
        ))}
      </div>

      <Card className="grid gap-4 p-6">
        <h2 className="font-bold text-[#0A4F8A] text-lg">Pay by QR and Upload Voucher</h2>
        <p className="text-sm text-slate-600">
          Pay the selected package fee using Fonepay or NepalPay. Upload a photo or screenshot of the transaction voucher.
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          {[
            ['fonepay', 'Fonepay', '/fonepay-qr.jpg'],
            ['nepalpay', 'NepalPay', '/nepalpay-qr.png'],
          ].map(([id, label, src]) => (
            <label key={id} className="rounded-xl border p-4 text-center text-sm cursor-pointer hover:border-slate-400">
              <input
                type="radio"
                name="provider"
                checked={provider === id}
                onChange={() => setProvider(id)}
              />{' '}
              <span className="font-semibold">{label}</span>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt={`${label} QR`} className="mx-auto mt-2 h-52 object-contain" />
            </label>
          ))}
        </div>

        {!status && (
          <form onSubmit={submit} className="grid gap-4 mt-2">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field
                label="PAN (Permanent Account Number - Optional)"
                placeholder="e.g. 102938475"
                value={pan}
                onChange={(e: any) => setPan(e.target.value)}
              />
              <Field
                label="Coupon Code (Optional)"
                value={couponCode}
                onChange={(e: any) => {
                  setCouponCode(e.target.value.toUpperCase());
                  setQuote(null);
                }}
              />
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Btn type="button" variant="ghost" onClick={applyCoupon}>
                Apply Coupon
              </Btn>
              {quote && (
                <p className="text-sm font-semibold text-emerald-700">
                  Discount applied: {quote.discountPercent}% · Pay <b>NPR {quote.amount.toLocaleString()}</b>
                </p>
              )}
            </div>

            <label className="grid gap-1 text-sm font-medium">
              Payment Voucher Screenshot (भौचर स्क्रिनसट)
              <input id="agency-voucher" type="file" accept="image/jpeg,image/png,image/webp" required className="rounded-lg border p-2 text-sm" />
            </label>

            <Btn disabled={busy || !session}>
              {busy ? 'Submitting…' : `Submit ${chosen === 'agency_basic' ? 'Basic' : 'Pro'} Voucher`}
            </Btn>
          </form>
        )}

        {status && (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm grid gap-3">
            <div className="flex items-center justify-between">
              <span>
                Order Ref: <b className="font-mono">{status.id}</b> · Status:{' '}
                <b className="capitalize text-[#0A4F8A]">{status.status}</b>
              </span>
            </div>

            {status.status === 'pending' && (
              <div className="space-y-2">
                <p className="text-slate-600 text-xs">
                  Your payment receipt is waiting for administrator approval. Once verified, all premium features activate automatically.
                </p>
                <Btn variant="ghost" disabled={busy} onClick={refresh}>
                  Refresh Payment Status
                </Btn>
              </div>
            )}

            {(status.status === 'paid' || status.status === 'active') && (
              <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-4 space-y-3">
                <p className="font-bold text-emerald-900">
                  ✓ Your Agency subscription is active until{' '}
                  {status.expiresAt ? new Date(status.expiresAt).toLocaleDateString() : 'the end of your subscription term'}.
                </p>
                <div className="flex flex-wrap gap-2.5">
                  <a
                    href="/"
                    className="inline-flex items-center rounded-lg bg-[#0A4F8A] px-4 py-2 text-xs font-bold text-white hover:bg-[#073B68] transition"
                  >
                    Proceed to Agent Dashboard →
                  </a>
                  <Btn variant="ghost" onClick={downloadReceipt}>
                    Download Payment Receipt (PDF)
                  </Btn>
                  <a
                    href={BRAND.links.whatsapp}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-lg border bg-white px-3 py-1.5 text-xs font-semibold text-slate-700"
                  >
                    WhatsApp Community
                  </a>
                </div>
              </div>
            )}
          </div>
        )}

        {message && <p role="status" className="text-sm font-medium text-slate-700">{message}</p>}
      </Card>
    </div>
  );
}
