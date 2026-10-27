'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { uploadAvatar } from '@/lib/auth';
import { Badge, Btn, Card, Field } from '../ui';
import { calculateAgentTitle, npr } from '@/lib/rules';
import { POPULAR_NEPALI_BRANCHES } from '@/lib/nepali-companies';

export function Profile({ profile, reload }: { profile: any; reload: () => void }) {
  const [f, setF] = useState({
    name: profile.name || '',
    phone: profile.phone || '',
    license_no: profile.license_no || '',
    pan_number: profile.pan_number || '',
    address: profile.address || '',
    branch: profile.branch || '',
    whatsapp_opt_in: !!profile.whatsapp_opt_in,
  });
  const [msg, setMsg] = useState('');
  const [stats, setStats] = useState({ count: 0, premium: 0, downlineCount: 0 });

  const set = (k: string) => (e: any) => setF({ ...f, [k]: e.target.value });

  useEffect(() => {
    if (!profile?.id) return;
    Promise.all([
      supabase.from('policies').select('premium').eq('agent_id', profile.id),
      supabase.from('profiles').select('id').eq('upline_id', profile.id),
    ]).then(([polRes, teamRes]) => {
      const policies = polRes.data || [];
      const totalPrem = policies.reduce((s: number, p: any) => s + Number(p.premium || 0), 0);
      setStats({
        count: policies.length,
        premium: totalPrem,
        downlineCount: (teamRes.data || []).length,
      });
    });
  }, [profile?.id]);

  const titleInfo = calculateAgentTitle({
    ownPoliciesCount: stats.count,
    ownPremium: stats.premium,
    activeDownlineCount: stats.downlineCount,
    totalTeamBusiness: stats.premium,
  });

  async function save(e: any) {
    e.preventDefault();
    const { error } = await supabase.from('profiles').update(f).eq('id', profile.id);
    setMsg(error ? error.message : 'Profile updated successfully.');
    reload();
  }

  async function photo(e: any) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      await uploadAvatar(profile.id, file);
      setMsg('Photo updated.');
      reload();
    } catch (x: any) {
      setMsg(x.message);
    }
  }

  return (
    <Card className="mx-auto max-w-2xl p-6 sm:p-8">
      <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b pb-6">
        <div className="flex items-center gap-4">
          {profile.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={profile.avatar_url} alt="" className="h-20 w-20 rounded-full object-cover border-2 border-[#0A4F8A]" />
          ) : (
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[#0A4F8A] text-2xl font-bold text-white">
              {(profile.name || '?')[0]}
            </div>
          )}
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-slate-900">{profile.name}</h2>
              <Badge tone={profile.membership === 'premium' ? 'gold' : 'slate'}>{profile.membership}</Badge>
            </div>
            <p className="text-sm text-slate-600 mt-0.5">
              Referral Code: <b className="select-all text-[#0A4F8A] font-mono">{profile.referral_code}</b>
            </p>
            <p className="text-xs text-slate-500">
              Branch: {profile.branch || 'Not Set'} · {stats.count} Policies Issued
            </p>
          </div>
        </div>

        {/* Official Cadre Badge */}
        <div className="rounded-xl border border-blue-200 bg-blue-50/70 p-3.5 text-right w-full sm:w-auto">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Official Cadre</span>
          <p className="text-base font-black text-[#0A4F8A]">{titleInfo.name}</p>
          <p className="text-[11px] text-slate-600 max-w-xs">{titleInfo.description}</p>
        </div>
      </div>

      {titleInfo.nextTitle && (
        <div className="mb-6 rounded-lg bg-orange-50 border border-orange-200 p-3.5 text-xs text-slate-700">
          <span className="font-bold text-[#F15A24]">Next Title Milestone ({titleInfo.nextTitle.name}):</span>{' '}
          {titleInfo.nextTitle.requirement}
        </div>
      )}

      <form onSubmit={save} className="grid gap-4 sm:grid-cols-2">
        <Field label="Full Name" value={f.name} onChange={set('name')} />
        <Field label="Mobile Phone" value={f.phone} onChange={set('phone')} />

        <Field
          label="PAN (Permanent Account Number)"
          placeholder="e.g. 102938475"
          value={f.pan_number}
          onChange={set('pan_number')}
        />

        <Field label="Insurance License No" value={f.license_no} onChange={set('license_no')} />

        {/* Manual Branch Entry with Suggestions */}
        <div className="grid gap-1 text-sm font-medium">
          <label htmlFor="profile-branch">Branch (शाखा)</label>
          <input
            id="profile-branch"
            list="profile-branches"
            type="text"
            placeholder="Type branch name (e.g. Butwal)"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#0A4F8A] focus:outline-none"
            value={f.branch}
            onChange={set('branch')}
          />
          <datalist id="profile-branches">
            {POPULAR_NEPALI_BRANCHES.map((b) => (
              <option key={b} value={b} />
            ))}
          </datalist>
        </div>

        <Field label="Address / City" value={f.address} onChange={set('address')} />
        <label className="flex items-start gap-2 text-sm font-normal text-slate-700 sm:col-span-2">
          <input
            type="checkbox"
            checked={f.whatsapp_opt_in}
            onChange={(event) => setF({ ...f, whatsapp_opt_in: event.target.checked })}
            className="mt-1"
          />
          <span>Receive account, agency and exam notifications on WhatsApp. SMS remains limited to OTP and payment confirmation.</span>
        </label>
        <Field label="Update Profile Photo" type="file" accept="image/*" className="sm:col-span-2" onChange={photo} />

        {msg && (
          <p className="text-sm text-emerald-700 font-medium sm:col-span-2" role="status">
            {msg}
          </p>
        )}

        <Btn type="submit" className="sm:col-span-2">
          Save Profile Changes
        </Btn>
      </form>
    </Card>
  );
}
