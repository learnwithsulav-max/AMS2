'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { siteUrl } from '@/lib/brand';
import { Btn, Card, Field } from '../ui';
import { MarketingKit } from './MarketingKit';

type Portfolio = {
  user_id: string; slug: string; display_name: string; headline: string; bio: string;
  photo_url: string; public_phone: string; public_email: string; specialties: string[]; city: string; is_published: boolean;
};

export function PublicPortfolio({ profile }: { profile: any }) {
  const [value, setValue] = useState<Portfolio>({
    user_id: profile.id, slug: '', display_name: profile.name || '', headline: '', bio: '',
    photo_url: profile.avatar_url || '', public_phone: '', public_email: '', specialties: [], city: '', is_published: false,
  });
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  useEffect(() => {
    let active = true;
    supabase.from('public_profiles').select('*').eq('user_id', profile.id).maybeSingle().then(({ data, error }) => {
      if (!active) return;
      if (data) setValue({ ...data, specialties: data.specialties || [] });
      else if (error) setMessage('Could not load your public profile.');
      setLoaded(true);
    });
    return () => { active = false; };
  }, [profile.id]);

  function set<K extends keyof Portfolio>(key: K, next: Portfolio[K]) { setValue((current) => ({ ...current, [key]: next })); }
  async function save(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setMessage('');
    const payload = { ...value, slug: value.slug.trim().toLowerCase(), display_name: value.display_name.trim(), specialties: value.specialties.map((item) => item.trim()).filter(Boolean).slice(0, 12) };
    const { error } = await supabase.from('public_profiles').upsert(payload, { onConflict: 'user_id' });
    setBusy(false);
    setMessage(error ? (error.code === '23505' ? 'That portfolio link is already in use.' : error.message) : 'Public profile saved.');
  }
  const link = value.slug ? `${siteUrl('agency')}/${value.slug}` : '';
  if (!loaded) return <p className="p-8 text-center text-slate-500">Loading public profile…</p>;

  return <div className="mx-auto grid max-w-3xl gap-5"><Card className="p-6">
    <h2 className="text-xl font-bold">Public agent portfolio</h2>
    <p className="mb-5 mt-1 text-sm text-slate-600">Only information entered here appears in your public portfolio. Your account address, license number, referral code, and business records stay private.</p>
    <form onSubmit={save} className="grid gap-4 sm:grid-cols-2">
      <Field label="Public name" required maxLength={100} value={value.display_name} onChange={(e: React.ChangeEvent<HTMLInputElement>) => set('display_name', e.target.value)} />
      <Field label="Portfolio link" required maxLength={100} placeholder="your-name" value={value.slug} onChange={(e: React.ChangeEvent<HTMLInputElement>) => set('slug', e.target.value.replace(/[^a-zA-Z0-9-]/g, '').toLowerCase())} />
      <Field label="Headline" maxLength={160} className="sm:col-span-2" value={value.headline} onChange={(e: React.ChangeEvent<HTMLInputElement>) => set('headline', e.target.value)} />
      <label className="grid gap-1 text-sm font-medium sm:col-span-2">About you<textarea maxLength={2000} rows={5} className="rounded-lg border border-slate-300 px-3 py-2 font-normal" value={value.bio} onChange={(e) => set('bio', e.target.value)} /></label>
      <Field label="Public photo URL" type="url" className="sm:col-span-2" value={value.photo_url} onChange={(e: React.ChangeEvent<HTMLInputElement>) => set('photo_url', e.target.value)} />
      <Field label="Public phone (optional)" type="tel" value={value.public_phone} onChange={(e: React.ChangeEvent<HTMLInputElement>) => set('public_phone', e.target.value)} />
      <Field label="Public email (optional)" type="email" value={value.public_email} onChange={(e: React.ChangeEvent<HTMLInputElement>) => set('public_email', e.target.value)} />
      <Field label="City" maxLength={100} value={value.city} onChange={(e: React.ChangeEvent<HTMLInputElement>) => set('city', e.target.value)} />
      <Field label="Specialties (comma separated)" value={value.specialties.join(', ')} onChange={(e: React.ChangeEvent<HTMLInputElement>) => set('specialties', e.target.value.split(',').map((item) => item.trim()).filter(Boolean))} />
      <label className="flex items-center gap-2 text-sm sm:col-span-2"><input type="checkbox" checked={value.is_published} onChange={(e) => set('is_published', e.target.checked)} /> Publish my portfolio for anyone to view</label>
      {link && <p className="text-sm sm:col-span-2">Portfolio link: <a className="text-brand underline" href={link} target="_blank" rel="noreferrer">{link}</a></p>}
      {message && <p role="status" className="text-sm text-slate-600 sm:col-span-2">{message}</p>}
      <Btn type="submit" disabled={busy} className="sm:col-span-2">{busy ? 'Saving…' : 'Save public profile'}</Btn>
    </form>
  </Card>{value.slug && <MarketingKit profile={profile} url={link} />}</div>;
}
