'use client';
import { useEffect, useState } from 'react';
import { Shell } from '@/components/Shell';
import { LinkBtn, Card } from '@/components/ui';
import { useI18n } from '@/lib/i18n';
import { BRAND, siteUrl } from '@/lib/brand';
import { adToBs, getTodayGreeting } from '@/lib/nepali-date';

export default function Landing() {
  const { t } = useI18n();
  const [today, setToday] = useState<{ bs: ReturnType<typeof adToBs>; greeting: ReturnType<typeof getTodayGreeting> } | null>(null);

  useEffect(() => {
    const now = new Date();
    setToday({ bs: adToBs(now), greeting: getTodayGreeting(now) });
  }, []);

  const bs = today?.bs;
  const greeting = today?.greeting;

  const portals = [
    { k: 'exam' as const, label: t('nav_exam'), host: 'exam.sulavs.com.np', desc: 'Mock tests, questions, and instant certificate' },
    { k: 'agency' as const, label: t('nav_agency'), host: 'agency.sulavs.com.np', desc: 'Policy ledger, team network, BDI weightage & title ladder' },
  ];
  const services = [
    { title: t('svc_exam_t'), body: t('svc_exam_d'), href: siteUrl('exam') },
    { title: t('svc_agency_t'), body: t('svc_agency_d'), href: siteUrl('agency') },
    { title: 'नेपाली पात्रो & Date Converter', body: 'Bikram Sambat calendar, AD ↔ BS two-way date conversion and insurance underwriting age calculation.', href: `${siteUrl('agency')}` },
    { title: 'BDI & MDRT Weightage Engine', body: 'Exact Nepal insurance rules: Single premium 0–9y (20%), 10–14y (40%), 15+y (60%) across TDI, BDI, and club qualifications.', href: `${siteUrl('agency')}` },
    { title: 'Agent Career Hierarchy', body: 'From Ordinary Agent, Field Representative, Insurance Advisor to Agency Manager (AM), SAM, Star AM, and Chief Agency Manager.', href: `${siteUrl('agency')}` },
    { title: 'Find an advisor', body: 'Browse public verified agent portfolios and profiles across Nepal.', href: '/agents' },
  ];
  const community = [
    { l: t('link_fb'), d: t('link_fb_d'), href: BRAND.links.facebook, icon: '/facebook-logo.jpeg', alt: 'Facebook' },
    { l: t('link_wa'), d: t('link_wa_d'), href: BRAND.links.whatsapp, icon: '/whatsapp-logo.png', alt: 'WhatsApp' },
    { l: t('link_pass'), d: t('link_pass_d'), href: BRAND.links.pass, icon: '/whatsapp-logo.png', alt: 'WhatsApp' },
    { l: t('link_fail'), d: t('link_fail_d'), href: BRAND.links.fail, icon: '/whatsapp-logo.png', alt: 'WhatsApp' },
  ];
  return (
    <Shell site="root">
      {/* Live Nepal BS Date & Today's Occasion Banner */}
      {bs && greeting && <div className="border-b border-amber-200 bg-gradient-to-r from-amber-50 via-orange-50 to-amber-50 px-4 py-3 text-slate-800">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 text-xs sm:text-sm">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center rounded-full bg-[#F15A24] px-2.5 py-0.5 text-[11px] font-bold text-white shadow-xs">
              🇳🇵 {greeting.badge}
            </span>
            <span className="font-bold text-[#0A4F8A]">{bs.formattedBsNe}</span>
            <span className="hidden text-slate-500 sm:inline">({bs.formattedBs} / {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })})</span>
            <span className="hidden text-slate-700 md:inline">· {greeting.title}</span>
          </div>
          <div className="flex items-center gap-3">
            <a
              href={`https://wa.me/977${BRAND.contact.phones[0].replace(/\D/g, '')}?text=${encodeURIComponent('नमस्ते Sulav Sir, Learn With Sulav बिमा पोर्टल सम्बन्धी जानकारी लिन चाहन्थें।')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 font-bold text-[#0A4F8A] hover:underline"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/whatsapp-logo.png" alt="WhatsApp" className="h-4 w-4 rounded-full" />
              <span>परामर्श लिनुहोस्</span>
            </a>
          </div>
        </div>
      </div>}

      <section className="bg-navy text-white">
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-16 lg:grid-cols-[1.4fr_1fr] lg:py-24">
          <div>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-orange-300 backdrop-blur-xs">
              <span>🌟</span>
              <span>नेपालका सबै १४ जीवन तथा निर्जीवन बिमा कम्पनीहरूका लागि प्रमाणित प्लेटफर्म</span>
            </div>
            <h1 className="max-w-2xl text-3xl font-extrabold leading-tight sm:text-5xl sm:leading-[1.1]">{t('hero_title')}</h1>
            <p className="mt-5 max-w-xl text-lg text-slate-300">{t('hero_sub')}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <LinkBtn href={siteUrl('exam')} variant="cta">{t('cta_exam')}</LinkBtn>
              <LinkBtn href={siteUrl('agency')} variant="ghost">{t('cta_agency')}</LinkBtn>
              <LinkBtn href={BRAND.links.whatsapp} variant="cta" target="_blank" rel="noopener noreferrer">{t('cta_wa')}</LinkBtn>
            </div>
          </div>
          <Card className="p-6 text-navy">
            <div className="flex justify-center rounded-lg bg-slate-50 py-6">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo.png" alt="Learn With Sulav" className="h-36 w-auto" />
            </div>
            <p className="mt-4 rounded-lg bg-slate-50 px-3 py-2 text-center text-xs font-semibold text-slate-600">
              {BRAND.trustBadge}
            </p>
            <p className="mt-5 text-sm font-semibold text-slate-500">{t('portals')}</p>
            <ul className="mt-2 divide-y divide-slate-100">
              {portals.map((p) => (
                <li key={p.k}>
                  <a href={siteUrl(p.k)} className="flex items-center justify-between py-3 hover:text-brand">
                    <div>
                      <p className="font-semibold">{p.label}</p>
                      <p className="text-xs text-slate-500">{p.desc}</p>
                    </div>
                    <span className="text-xs font-mono font-medium text-slate-400">{p.host}</span>
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
          <div className="h-40 w-40 overflow-hidden rounded-2xl bg-slate-100">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/sulav-sapkota-photo.jpeg" alt="Sulav Sapkota" className="h-full w-full object-cover object-center" />
          </div>
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
                <div className="mb-3 flex items-center gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={c.icon} alt={c.alt} className="h-9 w-9 rounded-lg object-contain" />
                  <h3 className="font-bold">{c.l}</h3>
                </div>
                <p className="mt-1 text-sm text-slate-600">{c.d}</p>
              </Card>
            </a>
          ))}
        </div>
      </section>

      <section className="bg-white py-16">
        <div className="mx-auto max-w-7xl px-4">
          <h2 className="mb-2 text-2xl font-extrabold">Payment</h2>
          <p className="mb-8 text-slate-600">Scan either QR code using your payment app.</p>
          <div className="grid gap-6 md:grid-cols-2">
            {[
              { name: 'Fonepay', src: '/fonepay-qr.jpg', alt: 'Fonepay QR code for Sulav Sapkota' },
              { name: 'NepalPay', src: '/nepalpay-qr.png', alt: 'NepalPay QR code for Sulav Sapkota' },
            ].map((payment) => (
              <Card key={payment.name} className="grid justify-items-center gap-3 p-5">
                <h3 className="text-lg font-bold">{payment.name}</h3>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={payment.src} alt={payment.alt} className="h-auto max-h-[34rem] w-full max-w-sm object-contain" />
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-navy py-12 text-white">
        <div className="mx-auto max-w-7xl px-4">
          <h2 className="text-xl font-extrabold">{t('contact_title')}</h2>
          <div className="mt-3 flex flex-wrap gap-x-8 gap-y-2 text-slate-300">
            <a className="hover:text-white" href={`mailto:${BRAND.contact.email}`}>{BRAND.contact.email}</a>
            {BRAND.contact.phones.map((p) => <a key={p} className="inline-flex items-center gap-2 hover:text-white" href={`tel:${p}`} aria-label={`Call ${p}`}>
              <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5 fill-current"><path d="M6.62 10.79a15.05 15.05 0 0 0 6.59 6.59l2.2-2.2a1 1 0 0 1 1.02-.24c1.12.37 2.33.56 3.57.56.55 0 1 .45 1 1V20c0 .55-.45 1-1 1C10.61 21 3 13.39 3 4c0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.24.19 2.45.56 3.57a1 1 0 0 1-.25 1.02l-2.19 2.2z" /></svg>
              <span>{p}</span>
            </a>)}
          </div>
        </div>
      </section>
    </Shell>
  );
}
