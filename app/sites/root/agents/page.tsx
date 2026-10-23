import Link from 'next/link';
import { Shell } from '@/components/Shell';
import { Card } from '@/components/ui';
import { createClient } from '@/utils/supabase/server';

export const dynamic = 'force-dynamic';
export default async function PublicAgents() {
  const supabase = await createClient();
  const { data } = await supabase.from('public_profiles').select('slug,display_name,headline,photo_url,city,specialties').eq('is_published', true).order('display_name').limit(60);
  return <Shell site="root"><section className="mx-auto max-w-7xl px-4 py-10">
    <h1 className="text-3xl font-extrabold">Find an advisor</h1><p className="mt-2 text-slate-600">Browse public profiles from Learn With Sulav agents.</p>
    {data?.length ? <div className="mt-7 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{data.map((agent) => <Link key={agent.slug} href={`/agents/${agent.slug}`}><Card className="h-full p-5 hover:border-brand">
      {agent.photo_url && <img src={agent.photo_url} alt="" className="mb-4 h-20 w-20 rounded-full object-cover" />}
      <h2 className="font-bold">{agent.display_name}</h2>{agent.headline && <p className="mt-1 text-sm text-slate-600">{agent.headline}</p>}{agent.city && <p className="mt-2 text-xs text-slate-500">{agent.city}</p>}
      <div className="mt-3 flex flex-wrap gap-2">{(agent.specialties || []).map((item) => <span key={item} className="rounded-full bg-slate-100 px-2 py-1 text-xs">{item}</span>)}</div>
    </Card></Link>)}</div> : <p className="mt-8 rounded-xl bg-white p-6 text-slate-600">No agent portfolios have been published yet.</p>}
  </section></Shell>;
}
