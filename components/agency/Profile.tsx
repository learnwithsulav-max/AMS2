'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { uploadAvatar } from '@/lib/auth';
import { Badge, Btn, Card, Field } from '../ui';

export function Profile({ profile, reload }: { profile: any; reload: () => void }) {
  const [f, setF] = useState({ name: profile.name || '', phone: profile.phone || '', license_no: profile.license_no || '', address: profile.address || '', branch: profile.branch || '' });
  const [msg, setMsg] = useState('');
  const set = (k: string) => (e: any) => setF({ ...f, [k]: e.target.value });
  async function save(e: any) {
    e.preventDefault();
    const { error } = await supabase.from('profiles').update(f).eq('id', profile.id);
    setMsg(error ? error.message : 'Profile saved.'); reload();
  }
  async function photo(e: any) {
    const file = e.target.files?.[0]; if (!file) return;
    try { await uploadAvatar(profile.id, file); setMsg('Photo updated.'); reload(); } catch (x: any) { setMsg(x.message); }
  }
  return (
    <Card className="mx-auto max-w-2xl p-6">
      <div className="mb-5 flex items-center gap-4">
        {profile.avatar_url
          // eslint-disable-next-line @next/next/no-img-element
          ? <img src={profile.avatar_url} alt="" className="h-20 w-20 rounded-full object-cover" />
          : <div className="flex h-20 w-20 items-center justify-center rounded-full bg-navy text-2xl font-bold text-white">{(profile.name || '?')[0]}</div>}
        <div>
          <p className="font-bold">{profile.name}</p>
          <p className="text-sm text-slate-600">Your referral code: <b className="select-all">{profile.referral_code}</b></p>
          <Badge tone={profile.membership === 'premium' ? 'gold' : 'slate'}>{profile.membership}</Badge>
        </div>
      </div>
      <form onSubmit={save} className="grid gap-3 sm:grid-cols-2">
        <Field label="Full name" value={f.name} onChange={set('name')} />
        <Field label="Phone" value={f.phone} onChange={set('phone')} />
        <Field label="License number" value={f.license_no} onChange={set('license_no')} />
        <Field label="Branch" value={f.branch} onChange={set('branch')} />
        <Field label="Address" className="sm:col-span-2" value={f.address} onChange={set('address')} />
        <Field label="Change photo" type="file" accept="image/*" className="sm:col-span-2" onChange={photo} />
        {msg && <p className="text-sm text-slate-600 sm:col-span-2" role="status">{msg}</p>}
        <Btn type="submit" className="sm:col-span-2">Save profile</Btn>
      </form>
    </Card>
  );
}
