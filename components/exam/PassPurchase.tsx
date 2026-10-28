'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, Btn, Field } from '../ui';
import { jsPDF } from 'jspdf';
import { BRAND } from '@/lib/brand';

const CLAIM_KEY = 'lws_exam_package_claim';
const PAYMENTS = [
  { code: 'exam_weekly', name: 'Weekly Pass', amount: 99, days: 7, detail: 'Quick revision and unlimited mock practice.' },
  { code: 'exam_half_month', name: 'Half-Month Pass', amount: 199, days: 15, detail: 'Full question bank with bilingual support.' },
  { code: 'exam_pro_month', name: 'Pro Monthly Pass', amount: 250, days: 30, detail: 'Analytics, answer explanations and priority updates.', best: true },
];

type Claim = { orderId: string };

export function PassPurchase({
  accessToken,
  candidateName,
  candidatePhone,
}: {
  accessToken: string;
  candidateName: string;
  candidatePhone: string;
}) {
  const router = useRouter();
  const [claim, setClaim] = useState<Claim | null>(null);
  const [order, setOrder] = useState<any>(null);
  const [form, setForm] = useState({ packageCode: 'exam_pro_month', provider: 'fonepay', couponCode: '' });
  const [quote, setQuote] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [orderError, setOrderError] = useState('');
  const paymentForm = useRef<HTMLFormElement>(null);

  const sync = useCallback(
    async (c: Claim) => {
      try {
        const r = await fetch(`/api/billing/orders?id=${encodeURIComponent(c.orderId)}`, {
          cache: 'no-store',
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        const j = await r.json();
        if (r.status === 404) {
          sessionStorage.removeItem(CLAIM_KEY);
          setClaim(null);
          setOrder(null);
          setOrderError('');
          setMessage('The saved payment request was not found. You can choose a package and submit a new voucher. Check that no previous payment is still awaiting review before paying again.');
          return;
        }
        if (!r.ok) {
          setOrderError(j.error || 'Could not check the saved payment request. Try refreshing its status.');
          return;
        }
        setOrder(j.order);
        setOrderError('');
      } catch {
        setOrderError('Could not check the saved payment request. Try refreshing its status.');
      }
    },
    [accessToken]
  );

  useEffect(() => {
    try {
      const c = sessionStorage.getItem(CLAIM_KEY);
      if (c) {
        const parsed = JSON.parse(c);
        if (typeof parsed.orderId === 'string') {
          setClaim(parsed);
          void sync(parsed);
        }
      }
    } catch {}
  }, [sync]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage('');
    const fd = new FormData();
    fd.set('packageCode', form.packageCode);
    fd.set('provider', form.provider);
    fd.set('couponCode', form.couponCode);

    const input = document.querySelector<HTMLInputElement>('#exam-voucher');
    if (input?.files?.[0]) {
      fd.set('voucher', input.files[0]);
    } else {
      setBusy(false);
      setMessage('Upload your payment voucher receipt first.');
      return;
    }

    const r = await fetch('/api/billing/orders', {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
      body: fd,
    });
    const j = await r.json();
    setBusy(false);
    if (!r.ok) {
      setMessage(j.error || 'Could not submit payment.');
      return;
    }

    const next = { orderId: j.order.id };
    sessionStorage.setItem(CLAIM_KEY, JSON.stringify(next));
    setClaim(next);
    setOrder(j.order);
    setOrderError('');
    setMessage('Payment voucher submitted. Refreshing exam pass status...');
    setTimeout(() => {
      router.replace('/');
      router.refresh();
    }, 1500);
  }

  async function applyCoupon() {
    setMessage('');
    const r = await fetch('/api/billing/quote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ packageCode: form.packageCode, couponCode: form.couponCode }),
    });
    const j = await r.json();
    if (!r.ok) {
      setQuote(null);
      setMessage(j.error || 'Could not validate coupon.');
      return;
    }
    setQuote(j);
  }

  async function refresh() {
    if (!claim) return;
    setBusy(true);
    await sync(claim);
    setBusy(false);
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
    pdf.text('Official Exam Practice Pass · Payment Voucher Receipt', logoImg ? 42 : 14, 22);
    pdf.setFontSize(8);
    pdf.text('Smart Tools, Training Portals & Mentorship for Insurance Professionals', logoImg ? 42 : 14, 27);

    pdf.setTextColor(45, 55, 72);
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    pdf.text('PAYMENT RECEIPT DETAILS', 14, 44);

    pdf.setFillColor(247, 250, 252);
    pdf.roundedRect(14, 48, 182, 54, 2, 2, 'F');
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');

    pdf.text(`Candidate Name: ${candidateName || 'Candidate'}`, 20, 56);
    pdf.text(`Phone: ${candidatePhone || ''}`, 120, 56);
    pdf.text(`Package: ${order?.packageCode || 'Exam Practice Pass'}`, 20, 64);
    pdf.text(`Amount Paid: NPR ${order?.amount || quote?.amount || selected.amount}`, 120, 64);
    pdf.text(`Status: ${(order?.status || 'approved').toUpperCase()}`, 20, 72);
    pdf.text(`Payment Gateway / Mode: ${(order?.provider || form.provider).toUpperCase()}`, 120, 72);
    pdf.text(`Pass Code: ${order?.passCode || 'Pending Verification'}`, 20, 80);
    pdf.text(`Valid Until: ${order?.expiresAt ? new Date(order.expiresAt).toLocaleDateString('en-GB') : 'Active'}`, 120, 80);
    pdf.text(`Receipt Reference: ${order?.id || claim?.orderId || ''}`, 20, 88);
    pdf.text(`Receipt Date: ${new Date().toLocaleDateString('en-GB')}`, 120, 88);

    // Official Stamp
    pdf.setDrawColor(241, 90, 36);
    pdf.setLineWidth(0.8);
    pdf.circle(165, 126, 18, 'S');
    pdf.setTextColor(241, 90, 36);
    pdf.setFontSize(6);
    pdf.setFont('helvetica', 'bold');
    pdf.text('LEARN WITH SULAV', 152, 124);
    pdf.text('PAYMENT VERIFIED', 152, 128);
    pdf.text('OFFICIAL RECEIPT', 152, 131);

    pdf.setTextColor(113, 128, 150);
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'normal');
    pdf.text(
      'This receipt confirms access activation to the Learn With Sulav Exam Preparation Portal. Access is non-transferable and valid for the subscribed practice duration.',
      14,
      145,
      { maxWidth: 182 }
    );
    pdf.text(BRAND.trustBadge, 14, 160);

    pdf.save(`LWS-Exam-Pass-Receipt-${order?.id || 'pass'}.pdf`);
  }

  const selected = PAYMENTS.find((p) => p.code === form.packageCode)!;
  const canSubmitNewVoucher = !claim || order?.status === 'rejected';

  function selectPackage(packageCode: string) {
    setForm((current) => ({ ...current, packageCode }));
    setQuote(null);
    if (claim && orderError) {
      sessionStorage.removeItem(CLAIM_KEY);
      setClaim(null);
      setOrder(null);
      setOrderError('');
      setMessage('The previous payment status could not be confirmed. Its request remains on record; do not pay twice if you already submitted or paid it.');
    }
    requestAnimationFrame(() => paymentForm.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  }

  return (
    <section className="grid gap-4 md:col-span-2" aria-label="Exam practice pass packages">
      <div className="grid gap-3 md:grid-cols-3">
        {PAYMENTS.map((p) => (
          <button
            type="button"
            key={p.code}
            onClick={() => selectPackage(p.code)}
            className={`relative rounded-2xl border-2 bg-white p-4 text-left shadow-sm transition ${
              form.packageCode === p.code ? 'border-[#F15A24] ring-1 ring-[#F15A24]' : 'border-slate-200 hover:border-slate-300'
            }`}
          >
            {p.best && (
              <span className="absolute right-3 top-3 rounded-full bg-[#F15A24] px-2 py-0.5 text-xs font-bold text-white">
                Best value
              </span>
            )}
            <h3 className="font-bold text-[#0A4F8A]">{p.name}</h3>
            <p className="mt-1 text-2xl font-extrabold text-[#2D3748]">Rs {p.amount}</p>
            <p className="text-xs text-slate-500">{p.days} days access</p>
            <p className="mt-2 text-sm text-slate-600">{p.detail}</p>
          </button>
        ))}
      </div>

      <Card className="p-5">
        <h2 className="text-lg font-bold text-[#0A4F8A]">Activate {selected.name}</h2>
        <p className="mt-1 text-sm text-slate-600">
          Scan either QR code, then upload the payment voucher screenshot for your registered candidate account.
        </p>

        {claim && (
          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm">
            <div className="flex items-center justify-between">
              <span>
                Status: <b className="capitalize text-[#0A4F8A]">{order?.status || 'Checking...'}</b>
              </span>
              {order?.expiresAt && (
                <span className="text-xs text-slate-500">
                  Valid until: {new Date(order.expiresAt).toLocaleDateString()}
                </span>
              )}
            </div>

            {order?.passCode && (
              <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                <p className="text-xs font-bold text-emerald-800 uppercase">Your Approved Pass Code:</p>
                <p className="mt-1 text-xl font-black font-mono tracking-wider text-emerald-900 select-all">
                  {order.passCode}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Btn variant="ghost" onClick={downloadReceipt}>
                    Download Payment Receipt (PDF)
                  </Btn>
                  <a href={BRAND.links.whatsapp} target="_blank" rel="noreferrer" className="rounded-lg border bg-white px-3 py-1.5 text-xs font-semibold text-slate-700">
                    WhatsApp Group
                  </a>
                </div>
              </div>
            )}

            {order?.status === 'pending' && (
              <p className="mt-2 text-slate-600 text-xs">
                Your payment voucher is currently under review. Click &quot;Refresh Status&quot; once reviewed or message Sulav on WhatsApp.
              </p>
            )}

            <div className="mt-3">
              <Btn variant="ghost" disabled={busy} onClick={refresh}>
                {busy ? 'Refreshing...' : 'Refresh Status'}
              </Btn>
            </div>
          </div>
        )}

        {orderError && (
          <p role="alert" className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">{orderError}</p>
        )}

        {!canSubmitNewVoucher && order?.status === 'pending' && (
          <p className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">Your voucher is awaiting review. The payment form stays paused until this request is approved or rejected, to help prevent duplicate payments.</p>
        )}

        {!canSubmitNewVoucher && order?.status === 'paid' && (
          <p className="mt-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">This payment is verified. No further payment is needed for this request.</p>
        )}

        {canSubmitNewVoucher && (
          <form ref={paymentForm} onSubmit={submit} className="mt-4 grid scroll-mt-6 gap-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="rounded-lg border p-3 text-center text-sm cursor-pointer hover:border-slate-400">
                <input
                  type="radio"
                  name="provider"
                  checked={form.provider === 'fonepay'}
                  onChange={() => setForm({ ...form, provider: 'fonepay' })}
                />{' '}
                Fonepay
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/fonepay-qr.jpg" alt="Fonepay payment QR" className="mx-auto mt-2 h-44 w-full object-contain" />
              </label>
              <label className="rounded-lg border p-3 text-center text-sm cursor-pointer hover:border-slate-400">
                <input
                  type="radio"
                  name="provider"
                  checked={form.provider === 'nepalpay'}
                  onChange={() => setForm({ ...form, provider: 'nepalpay' })}
                />{' '}
                NepalPay
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/nepalpay-qr.png" alt="NepalPay payment QR" className="mx-auto mt-2 h-44 w-full object-contain" />
              </label>
            </div>

            <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
              <Field
                label="Coupon Code (Optional)"
                value={form.couponCode}
                onChange={(e: any) => {
                  setForm({ ...form, couponCode: e.target.value.toUpperCase() });
                  setQuote(null);
                }}
              />
              <Btn type="button" variant="ghost" className="self-end" onClick={applyCoupon}>
                Apply Coupon
              </Btn>
            </div>

            {quote && (
              <p className="text-sm font-semibold text-emerald-700">
                Discount applied: {quote.discountPercent}% · Amount to Pay: <b>Rs {quote.amount.toLocaleString()}</b>
              </p>
            )}

            <p className="text-sm text-slate-600">
              Paying as <b>{candidateName}</b> · {candidatePhone}
            </p>

            <label className="grid gap-1 text-sm font-medium">
              Payment Voucher Screenshot (भौचर / ट्रान्सफर स्क्रिनसट)
              <input id="exam-voucher" type="file" accept="image/jpeg,image/png,image/webp" required className="rounded-lg border p-2 text-sm" />
            </label>
            <p className="text-xs text-slate-500">The uploaded image is watermarked and stored privately for review.</p>

            <Btn type="submit" disabled={busy}>
              {busy ? 'Submitting...' : `Submit Voucher · Rs ${quote?.amount ?? selected.amount}`}
            </Btn>
          </form>
        )}

        {message && (
          <p role="status" className="mt-3 text-sm text-slate-700">
            {message}
          </p>
        )}
      </Card>
    </section>
  );
}
