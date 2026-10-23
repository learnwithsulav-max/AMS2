import { notFound } from 'next/navigation';
import { Shell } from '@/components/Shell';
import { Card } from '@/components/ui';
import { createClient } from '@/utils/supabase/server';

export const dynamic = 'force-dynamic';
export default async function PublicAgent({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data } = await supabase.from('public_profiles').select('slug,display_name,headline,bio,photo_url,public_phone,public_email,specialties,city').eq('slug', slug).eq('is_published', true).maybeSingle();
  if (!data) notFound();
  return <Shell site="root"><article className="mx-auto max-w-3xl px-4 py-10"><Card className="p-7 sm:p-10">
    {data.photo_url && <img src={data.photo_url} alt="" className="mb-5 h-28 w-28 rounded-full object-cover" />}
    <h1 className="text-3xl font-extrabold">{data.display_name}</h1>{data.headline && <p className="mt-2 text-lg text-slate-600">{data.headline}</p>}{data.city && <p className="mt-2 text-sm text-slate-500">{data.city}</p>}
    {data.specialties?.length > 0 && <div className="mt-5 flex flex-wrap gap-2">{data.specialties.map((item: string) => <span key={item} className="rounded-full bg-slate-100 px-3 py-1 text-sm">{item}</span>)}</div>}
    {data.bio && <p className="mt-7 whitespace-pre-wrap leading-7 text-slate-700">{data.bio}</p>}
    {(data.public_phone || data.public_email) && <div className="mt-8 flex flex-wrap gap-3 border-t pt-6">{data.public_phone && <a className="rounded-lg bg-navy px-4 py-2 font-semibold text-white" href={`tel:${data.public_phone}`}>Call advisor</a>}{data.public_email && <a className="rounded-lg border px-4 py-2 font-semibold" href={`mailto:${data.public_email}`}>Email advisor</a>}</div>}
  </Card></article></Shell>;
}
