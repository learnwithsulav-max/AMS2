import { notFound } from 'next/navigation';
import { Shell } from '@/components/Shell';
import { Card } from '@/components/ui';
import { createClient } from '@/utils/supabase/server';
import { PublicPortfolioEngagement } from '@/components/agency/PublicPortfolioEngagement';

export const dynamic = 'force-dynamic';
export default async function PublicAgent({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data } = await supabase.from('public_profiles').select('user_id,slug,display_name,headline,bio,photo_url,public_phone,public_email,specialties,city').eq('slug', slug).eq('is_published', true).maybeSingle();
  if (!data) notFound();
  const { data: reviews } = await supabase.from('portfolio_reviews').select('id,reviewer_name,rating,review,created_at').eq('agent_id', data.user_id).eq('approved', true).order('created_at', { ascending: false }).limit(30);
  return <Shell site="root"><article className="mx-auto max-w-3xl px-4 py-10"><Card className="overflow-hidden p-0">
    <div className="bg-navy px-7 py-8 text-white sm:px-10">
      {data.photo_url && <img src={data.photo_url} alt={`${data.display_name} profile`} className="mb-5 h-28 w-28 rounded-full border-4 border-white/80 object-cover" />}
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-orange-200">Verified agent portfolio</p>
      <h1 className="mt-2 text-3xl font-extrabold">{data.display_name}</h1>{data.headline && <p className="mt-2 text-lg text-white/80">{data.headline}</p>}{data.city && <p className="mt-2 text-sm text-white/70">{data.city}</p>}
    </div>
    <div className="p-7 sm:p-10">
    {data.specialties?.length > 0 && <div className="mt-5 flex flex-wrap gap-2">{data.specialties.map((item: string) => <span key={item} className="rounded-full bg-slate-100 px-3 py-1 text-sm">{item}</span>)}</div>}
    {data.bio && <p className="mt-7 whitespace-pre-wrap leading-7 text-slate-700">{data.bio}</p>}
    {(data.public_phone || data.public_email) && <div className="mt-8 flex flex-wrap gap-3 border-t pt-6">{data.public_phone && <a className="rounded-lg bg-navy px-4 py-2 font-semibold text-white" href={`tel:${data.public_phone}`}>Call advisor</a>}{data.public_email && <a className="rounded-lg border px-4 py-2 font-semibold" href={`mailto:${data.public_email}`}>Email advisor</a>}</div>}
    </div>
  </Card><PublicPortfolioEngagement slug={data.slug} reviews={reviews || []} /></article></Shell>;
}
