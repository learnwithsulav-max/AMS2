'use client';
import { useState } from 'react';
import { Btn, Card, Field } from '../ui';

type Review = { id: string; reviewer_name: string; rating: number; review: string | null; created_at: string };
export function PublicPortfolioEngagement({ slug, reviews }: { slug: string; reviews: Review[] }) {
  const [kind, setKind] = useState<'lead' | 'review'>('lead');
  const [name, setName] = useState(''); const [phone, setPhone] = useState(''); const [email, setEmail] = useState('');
  const [rating, setRating] = useState('5'); const [message, setMessage] = useState(''); const [consent, setConsent] = useState(false); const [status, setStatus] = useState(''); const [busy, setBusy] = useState(false);
  async function submit(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setStatus('');
    try {
      const response = await fetch(`/api/public/portfolio/${encodeURIComponent(slug)}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ kind, name, phone, email, rating, message, consent, website: '' }) });
      const data = await response.json(); if (!response.ok) throw new Error(data.error || 'Submission failed.');
      setStatus(data.message); setName(''); setPhone(''); setEmail(''); setMessage(''); setConsent(false);
    } catch (error) { setStatus(error instanceof Error ? error.message : 'Submission failed.'); }
    finally { setBusy(false); }
  }
  return <div className="mt-6 grid gap-6">
    <Card className="p-6"><h2 className="text-xl font-bold">Verified client reviews</h2>
      {!reviews.length ? <p className="mt-3 text-sm text-slate-600">No published reviews yet.</p> : <ul className="mt-4 grid gap-3">{reviews.map((review) => <li key={review.id} className="border-t pt-3"><div className="flex justify-between gap-3"><span className="font-semibold">{review.reviewer_name}</span><span aria-label={`${review.rating} out of 5 stars`} className="text-amber-600">{'★'.repeat(review.rating)}{'☆'.repeat(5-review.rating)}</span></div>{review.review && <p className="mt-1 text-sm text-slate-700">{review.review}</p>}</li>)}</ul>}
    </Card>
    <Card className="p-6"><div className="mb-4 flex gap-2"><button className={`rounded-lg px-3 py-2 text-sm font-semibold ${kind === 'lead' ? 'bg-navy text-white' : 'bg-slate-100'}`} onClick={() => setKind('lead')}>Book a consultation</button><button className={`rounded-lg px-3 py-2 text-sm font-semibold ${kind === 'review' ? 'bg-navy text-white' : 'bg-slate-100'}`} onClick={() => setKind('review')}>Leave a review</button></div>
      <form className="grid gap-3 sm:grid-cols-2" onSubmit={submit}><Field label="Your name" required maxLength={100} value={name} onChange={(e: any) => setName(e.target.value)} />
        {kind === 'lead' ? <><Field label="Phone" required type="tel" value={phone} onChange={(e: any) => setPhone(e.target.value)} /><Field label="Email (optional)" type="email" value={email} onChange={(e: any) => setEmail(e.target.value)} /></> : <Field label="Rating" as="select" value={rating} onChange={(e: any) => setRating(e.target.value)}><option value="5">5 stars</option><option value="4">4 stars</option><option value="3">3 stars</option><option value="2">2 stars</option><option value="1">1 star</option></Field>}
        <label className="grid gap-1 text-sm font-medium sm:col-span-2">{kind === 'lead' ? 'How can the advisor help?' : 'Review (optional)'}<textarea maxLength={1000} rows={3} value={message} onChange={(e) => setMessage(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 font-normal" /></label>
        {kind === 'lead' && <label className="flex gap-2 text-sm sm:col-span-2"><input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} required />I agree that this advisor may contact me about my request.</label>}
        {status && <p role="status" className="text-sm text-slate-700 sm:col-span-2">{status}</p>}<Btn type="submit" disabled={busy} className="sm:col-span-2">{busy ? 'Sending…' : kind === 'lead' ? 'Request consultation' : 'Submit review'}</Btn>
      </form>
    </Card>
  </div>;
}
