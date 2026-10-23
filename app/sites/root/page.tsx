'use client';
import { Shell } from '@/components/Shell';
import { LinkBtn, Card } from '@/components/ui';
import { useI18n } from '@/lib/i18n';
import { BRAND, siteUrl } from '@/lib/brand';

export default function Landing() {
  const { t } = useI18n();
  const portals = [
    { k: 'exam' as const, label: t('nav_exam'), host: 'exam.sulavs.com.np' },
    { k: 'agency' as const, label: t('nav_agency'), host: 'agency.sulavs.com.np' },
  ];
  const services = [
    { title: t('svc_exam_t'), body: t('svc_exam_d'), href: siteUrl('exam') },
    { title: t('svc_agency_t'), body: t('svc_agency_d'), href: siteUrl('agency') },
    { title: t('svc_comm_t'), body: t('svc_comm_d'), href: BRAND.links.whatsapp },
    { title: 'Find an advisor', body: 'Browse public profiles from Learn With Sulav agents.', href: '/agents' },
  ];
  const community = [
    { l: t('link_fb'), d: t('link_fb_d'), href: BRAND.links.facebook },
    { l: t('link_wa'), d: t('link_wa_d'), href: BRAND.links.whatsapp },
    { l: t('link_pass'), d: t('link_pass_d'), href: BRAND.links.pass },
    { l: t('link_fail'), d: t('link_fail_d'), href: BRAND.links.fail },
  ];
  return (
    <Shell site="root">
      <section className="bg-navy text-white">
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-16 lg:grid-cols-[1.4fr_1fr] lg:py-24">
          <div>
            <h1 className="max-w-2xl text-3xl font-extrabold leading-tight sm:text-5xl sm:leading-[1.1]">{t('hero_title')}</h1>
            <p className="mt-5 max-w-xl text-lg text-slate-300">{t('hero_sub')}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <LinkBtn href={siteUrl('exam')}>{t('cta_exam')}</LinkBtn>
              <LinkBtn href={siteUrl('agency')} variant="ghost">{t('cta_agency')}</LinkBtn>
              <LinkBtn href={BRAND.links.whatsapp} variant="gold" target="_blank" rel="noopener noreferrer">{t('cta_wa')}</LinkBtn>
            </div>
          </div>
          <Card className="p-6 text-navy">
            <div className="flex justify-center rounded-lg bg-slate-50 py-6">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo.png" alt="Learn With Sulav" className="h-36 w-auto" />
            </div>
            <p className="mt-4 rounded-lg bg-slate-50 px-3 py-2 text-center text-xs font-semibold text-slate-600">
              {t('trust_badge')}
            </p>
            <p className="mt-5 text-sm font-semibold text-slate-500">{t('portals')}</p>
            <ul className="mt-2 divide-y divide-slate-100">
              {portals.map((p) => (
                <li key={p.k}>
                  <a href={siteUrl(p.k)} className="flex items-center justify-between py-3 hover:text-brand">
                    <span className="font-semibold">{p.label}</span><span className="text-sm text-slate-500">{p.host}</span>
                  </a>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16">
        <h2 className="mb-8 text-2xl font-extrabold">{t('svc_title')}</h2>
        <div className="grid gap-5 md:grid-cols-3">
          {services.map((s) => (
            <a key={s.title} href={s.href} className="block">
              <Card className="h-full p-6 transition hover:border-brand">
                <h3 className="text-lg font-bold">{s.title}</h3>
                <p className="mt-2 text-slate-600">{s.body}</p>
              </Card>
            </a>
          ))}
        </div>
      </section>

      <section className="bg-white py-16">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 md:grid-cols-[auto_1fr]">
          <div className="flex h-40 w-40 items-center justify-center rounded-2xl bg-navy text-5xl font-extrabold text-white" aria-hidden>SS</div>
          <div>
            <h2 className="text-2xl font-extrabold">{t('about_title')}</h2>
            <p className="mt-3 max-w-2xl leading-relaxed text-slate-700">{t('about_body')}</p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16">
        <h2 className="mb-8 text-2xl font-extrabold">{t('comm_title')}</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {community.map((c) => (
            <a key={c.l} href={c.href} target="_blank" rel="noopener noreferrer" className="block">
              <Card className="h-full p-5 transition hover:border-brand">
                <h3 className="font-bold">{c.l}</h3>
                <p className="mt-1 text-sm text-slate-600">{c.d}</p>
              </Card>
            </a>
          ))}
        </div>
      </section>

      <section className="bg-navy py-12 text-white">
        <div className="mx-auto max-w-7xl px-4">
          <h2 className="text-xl font-extrabold">{t('contact_title')}</h2>
          <div className="mt-3 flex flex-wrap gap-x-8 gap-y-2 text-slate-300">
            <a className="hover:text-white" href={`mailto:${BRAND.contact.email}`}>{BRAND.contact.email}</a>
            {BRAND.contact.phones.map((p) => <a key={p} className="hover:text-white" href={`tel:${p}`}>{p}</a>)}
          </div>
        </div>
      </section>
    </Shell>
  );
}
