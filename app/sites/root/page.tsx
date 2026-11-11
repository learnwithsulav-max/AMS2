'use client';

import Image from 'next/image';
import { Shell } from '@/components/Shell';
import { Card, LinkBtn } from '@/components/ui';
import { useI18n } from '@/lib/i18n';
import { BRAND, siteUrl } from '@/lib/brand';
import { ContactForm } from '@/components/ContactForm';
import { AGENCY_PACKAGES, EXAM_PACKAGES } from '@/lib/packages';

const agentTools = [
  { icon: '◫', title: { en: 'Lead and policy board', ne: 'लिड तथा पोलिसी बोर्ड' }, body: { en: 'Keep follow-ups, policy records and renewals organized in one workspace.', ne: 'फलोअप, पोलिसी र नवीकरणलाई एउटै कार्यक्षेत्रमा व्यवस्थित राख्नुहोस्।' } },
  { icon: '↗', title: { en: 'Agent calculators', ne: 'एजेन्ट क्याल्कुलेटर' }, body: { en: 'Use insurance planning tools, including TDI and BDI calculations.', ne: 'TDI र BDI गणनासहित बीमा योजनाका टुलहरू प्रयोग गर्नुहोस्।' } },
  { icon: '◎', title: { en: 'Public agent profile', ne: 'सार्वजनिक एजेन्ट प्रोफाइल' }, body: { en: 'Create a shareable profile and receive inquiries from prospective clients.', ne: 'साझा गर्न मिल्ने प्रोफाइल बनाएर सम्भावित ग्राहकका सोधपुछ प्राप्त गर्नुहोस्।' } },
];

const faq = [
  { q: { en: 'Who is the Agency Portal for?', ne: 'एजेन्सी पोर्टल कसका लागि हो?' }, a: { en: 'It is for insurance agents who want tools for leads, policies, follow-ups and professional profiles. Select Agency Portal to sign in or create an account.', ne: 'लिड, पोलिसी, फलोअप र व्यावसायिक प्रोफाइलका टुल चाहने बीमा अभिकर्ताका लागि हो। साइन इन वा खाता बनाउन एजेन्सी पोर्टल छान्नुहोस्।' } },
  { q: { en: 'How do I start exam practice?', ne: 'परीक्षा अभ्यास कसरी सुरु गर्ने?' }, a: { en: 'Open Exam Practice, create or sign in to your candidate account, then choose a pass. Pay through eSewa or Khalti for automatic activation, or use QR payment and submit the voucher for review.', ne: 'Exam Practice खोल्नुहोस्, उम्मेदवार खाता बनाउनुहोस् वा साइन इन गर्नुहोस्, अनि पास छान्नुहोस्। eSewa वा Khalti बाट भुक्तानी गर्दा पहुँच स्वतः खुल्छ; QR बाट तिरेमा भौचर जाँचपछि पहुँच खुल्छ।' } },
  { q: { en: 'How long is an exam attempt?', ne: 'परीक्षाको समय कति हो?' }, a: { en: 'Each attempt has 50 questions and a 90-minute time limit. If you leave and return, the attempt resumes with its remaining time.', ne: 'हरेक प्रयासमा ५० प्रश्न र ९० मिनेटको समय हुन्छ। बाहिरिएर फेरि फर्कँदा बाँकी समयबाट परीक्षा जारी हुन्छ।' } },
  { q: { en: 'Is Learn With Sulav affiliated with the Nepal Insurance Authority?', ne: 'Learn With Sulav नेपाल बीमा प्राधिकरणसँग आबद्ध छ?' }, a: { en: 'No. Learn With Sulav is an independent learning and software platform. It is not affiliated with or endorsed by the Nepal Insurance Authority (NIA).', ne: 'होइन। Learn With Sulav स्वतन्त्र सिकाइ तथा सफ्टवेयर प्लेटफर्म हो। यो नेपाल बीमा प्राधिकरण (NIA) सँग आबद्ध वा समर्थित छैन।' } },
];

export default function Landing() {
  const { lang, t } = useI18n();
  const text = (value: { en: string; ne: string }) => value[lang];

  return (
    <Shell site="root">
      <section className="overflow-hidden bg-navy text-white">
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 py-16 sm:py-20 lg:grid-cols-[1.12fr_.88fr] lg:py-24">
          <div>
            <p className="mb-5 inline-flex rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-sm font-semibold text-orange-200">
              {lang === 'en' ? 'Built for insurance agents in Nepal' : 'नेपालका बीमा अभिकर्ताका लागि निर्मित'}
            </p>
            <h1 className="max-w-3xl text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl lg:text-[3.5rem]">
              {lang === 'en' ? 'A clearer way to manage your insurance work.' : 'बीमासम्बन्धी काम व्यवस्थापन गर्ने सजिलो तरिका।'}
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-relaxed text-slate-200">
              {lang === 'en' ? 'Organize leads, policies and follow-ups with practical tools made for insurance agents. Use the separate Exam Practice portal when you are preparing for a licensing exam.' : 'बीमा अभिकर्ताका लागि बनेका उपयोगी टुलबाट लिड, पोलिसी र फलोअप व्यवस्थित गर्नुहोस्। इजाजतपत्र परीक्षाको तयारीका लागि छुट्टै Exam Practice पोर्टल प्रयोग गर्नुहोस्।'}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <LinkBtn href={siteUrl('agency')} variant="cta">{lang === 'en' ? 'Open Agency Portal' : 'एजेन्सी पोर्टल खोल्नुहोस्'}</LinkBtn>
              <LinkBtn href={siteUrl('exam')} variant="ghost">{lang === 'en' ? 'Explore Exam Practice' : 'परीक्षा अभ्यास हेर्नुहोस्'}</LinkBtn>
            </div>
            <p className="mt-4 text-sm text-slate-300">
              {lang === 'en' ? 'New to the agency tools? Create an account to start the 7-day trial (up to 5 policies).' : 'एजेन्सी टुलमा नयाँ हुनुहुन्छ? ७-दिने परीक्षण (५ पोलिसीसम्म) सुरु गर्न खाता बनाउनुहोस्।'}
            </p>
          </div>

          <div className="relative mx-auto w-full max-w-xl">
            <div className="absolute -inset-8 rounded-full bg-[#F15A24]/20 blur-3xl" aria-hidden="true" />
            <Card className="relative overflow-hidden border-white/30 bg-white p-5 text-navy shadow-2xl sm:p-7">
              <div className="flex items-center gap-3 border-b border-slate-200 pb-4">
                <Image src="/logo.png" alt="Learn With Sulav" width={52} height={52} className="h-12 w-12 object-contain" priority />
                <div><p className="font-extrabold">{lang === 'en' ? 'Agency workspace' : 'एजेन्सी कार्यक्षेत्र'}</p><p className="text-xs text-slate-500">{lang === 'en' ? 'Tools for everyday agent work' : 'दैनिक एजेन्ट कामका टुलहरू'}</p></div>
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {agentTools.slice(0, 2).map((tool) => <div key={tool.title.en} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#0A4F8A] text-lg font-bold text-white" aria-hidden="true">{tool.icon}</span>
                  <p className="mt-3 text-sm font-bold">{text(tool.title)}</p><p className="mt-1 text-xs leading-relaxed text-slate-600">{text(tool.body)}</p>
                </div>)}
              </div>
              <div className="mt-3 rounded-xl bg-[#0A4F8A] p-4 text-white">
                <p className="text-sm font-bold">{text(agentTools[2].title)}</p><p className="mt-1 text-xs leading-relaxed text-blue-100">{text(agentTools[2].body)}</p>
              </div>
              <p className="mt-4 text-center text-xs text-slate-500">{lang === 'en' ? 'Illustration of available portal tools' : 'पोर्टलमा उपलब्ध टुलहरूको चित्रण'}</p>
            </Card>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:py-20">
        <div className="max-w-2xl"><p className="text-sm font-bold uppercase tracking-wide text-[#0A4F8A]">{lang === 'en' ? 'Agency tools' : 'एजेन्सी टुलहरू'}</p><h2 className="mt-2 text-3xl font-extrabold">{lang === 'en' ? 'Spend less time keeping track.' : 'रेकर्ड मिलाउन कम समय खर्च गर्नुहोस्।'}</h2><p className="mt-3 leading-relaxed text-slate-600">{lang === 'en' ? 'A practical workspace for your client and policy workflow, with account-based access.' : 'ग्राहक र पोलिसी कार्यप्रवाहका लागि उपयोगी, खाता-आधारित कार्यक्षेत्र।'}</p></div>
        <div className="mt-8 grid gap-5 md:grid-cols-3">{agentTools.map((tool) => <Card key={tool.title.en} className="h-full border-slate-200 p-6"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-xl font-bold text-[#0A4F8A]" aria-hidden="true">{tool.icon}</span><h3 className="mt-4 text-lg font-bold">{text(tool.title)}</h3><p className="mt-2 leading-relaxed text-slate-600">{text(tool.body)}</p></Card>)}</div>
        <a className="mt-6 inline-flex font-bold text-[#0A4F8A] underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-4" href={siteUrl('agency')}>{lang === 'en' ? 'See the Agency Portal and create an account →' : 'एजेन्सी पोर्टल हेर्नुहोस् र खाता बनाउनुहोस् →'}</a>
      </section>

      <section id="packages" className="bg-[#F4F8FC] py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4">
          <div className="max-w-3xl">
            <p className="text-sm font-bold uppercase tracking-wide text-[#0A4F8A]">{lang === 'en' ? 'Plans and access' : 'योजना र पहुँच'}</p>
            <h2 className="mt-2 text-3xl font-extrabold">{lang === 'en' ? 'Choose the package that fits your goals.' : 'तपाईंको लक्ष्यअनुसार प्याकेज छान्नुहोस्।'}</h2>
            <p className="mt-3 leading-relaxed text-slate-600">{lang === 'en' ? 'See what is included and how long each package keeps your access active.' : 'हरेक प्याकेजमा के समावेश छ र कति समय पहुँच सक्रिय रहन्छ हेर्नुहोस्।'}</p>
          </div>

          <h3 className="mt-10 text-xl font-bold text-navy">{lang === 'en' ? 'Agency Portal' : 'एजेन्सी पोर्टल'}</h3>
          <div className="mt-4 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {AGENCY_PACKAGES.map((plan) => (
              <Card key={plan.code} className={`relative flex h-full flex-col border p-6 ${plan.featured ? 'border-[#F15A24] shadow-lg ring-1 ring-[#F15A24]' : 'border-slate-200'}`}>
                {plan.featured && <span className="absolute right-4 top-4 rounded-full bg-[#F15A24] px-3 py-1 text-xs font-bold text-white">{lang === 'en' ? 'Best value' : 'उत्तम मूल्य'}</span>}
                <h4 className="pr-20 text-xl font-extrabold text-[#0A4F8A]">{text(plan.name)}</h4>
                <p className="mt-2 text-3xl font-black text-slate-900">{plan.amount ? `Rs ${plan.amount}` : (lang === 'en' ? 'Free' : 'निःशुल्क')}<span className="ml-2 text-sm font-medium text-slate-500">/ {plan.days} {lang === 'en' ? 'days' : 'दिन'}</span></p>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{text(plan.summary)}</p>
                <ul className="mt-4 flex-1 space-y-2 text-sm text-slate-700">
                  {plan.features.map((feature) => <li key={feature.en} className="flex gap-2"><span className="font-bold text-emerald-700" aria-hidden="true">✓</span><span>{text(feature)}</span></li>)}
                </ul>
                <a href={plan.code === 'agency_trial' ? siteUrl('agency') : `${siteUrl('agency')}/billing?package=${plan.code}`} className="mt-6 inline-flex min-h-11 items-center justify-center rounded-lg bg-[#0A4F8A] px-4 py-2.5 text-center text-sm font-bold text-white transition hover:bg-[#083d6b] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0A4F8A]">
                  {plan.code === 'agency_trial' ? (lang === 'en' ? 'Start free trial' : 'निःशुल्क परीक्षण सुरु गर्नुहोस्') : (lang === 'en' ? `Choose ${text(plan.name)}` : `${text(plan.name)} छान्नुहोस्`)}
                </a>
              </Card>
            ))}
          </div>

          <div className="mt-14 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="max-w-3xl">
              <h3 className="text-xl font-bold text-navy">{lang === 'en' ? 'Exam Practice' : 'परीक्षा अभ्यास'}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{lang === 'en' ? 'Each attempt has 50 questions and a 90-minute time limit. Approved payment activates the selected pass.' : 'हरेक प्रयासमा ५० प्रश्न र ९० मिनेटको समय हुन्छ। भुक्तानी स्वीकृत भएपछि छानिएको पास सक्रिय हुन्छ।'}</p>
            </div>
            <LinkBtn href={siteUrl('exam')} variant="cta">{lang === 'en' ? 'Open Exam Practice' : 'परीक्षा अभ्यास खोल्नुहोस्'}</LinkBtn>
          </div>
          <div className="mt-4 grid gap-5 md:grid-cols-3">
            {EXAM_PACKAGES.map((plan) => (
              <Card key={plan.code} className={`relative flex h-full flex-col border p-6 ${plan.featured ? 'border-[#F15A24] shadow-lg ring-1 ring-[#F15A24]' : 'border-slate-200'}`}>
                {plan.featured && <span className="absolute right-4 top-4 rounded-full bg-[#F15A24] px-3 py-1 text-xs font-bold text-white">{lang === 'en' ? 'Best value' : 'उत्तम मूल्य'}</span>}
                <h4 className="pr-20 text-xl font-extrabold text-[#0A4F8A]">{text(plan.name)}</h4>
                <p className="mt-2 text-3xl font-black text-slate-900">Rs {plan.amount}<span className="ml-2 text-sm font-medium text-slate-500">/ {plan.days} {lang === 'en' ? 'days' : 'दिन'}</span></p>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{text(plan.summary)}</p>
                <ul className="mt-4 flex-1 space-y-2 text-sm text-slate-700">
                  {plan.features.map((feature) => <li key={feature.en} className="flex gap-2"><span className="font-bold text-emerald-700" aria-hidden="true">✓</span><span>{text(feature)}</span></li>)}
                </ul>
                <a href={`${siteUrl('exam')}?package=${plan.code}`} className="mt-6 inline-flex min-h-11 items-center justify-center rounded-lg bg-[#0A4F8A] px-4 py-2.5 text-center text-sm font-bold text-white transition hover:bg-[#083d6b] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0A4F8A]">
                  {lang === 'en' ? 'Choose this pass' : 'यो पास छान्नुहोस्'}
                </a>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white py-16">
        <div className="mx-auto grid max-w-7xl items-center gap-8 px-4 md:grid-cols-[180px_1fr]">
          <Image src="/sulav-sapkota-photo.jpeg" alt="Sulav Sapkota" width={180} height={180} className="h-40 w-40 rounded-2xl object-cover object-center" />
          <div><p className="text-sm font-bold uppercase tracking-wide text-[#0A4F8A]">{lang === 'en' ? 'About the founder' : 'संस्थापकको बारेमा'}</p><h2 className="mt-2 text-2xl font-extrabold">Sulav Sapkota</h2><p className="mt-3 max-w-3xl leading-relaxed text-slate-700">{lang === 'en' ? 'Financial Advisor, Insurance Mentor and Coach. Learn With Sulav brings together insurance tools and exam preparation resources for agents and students.' : 'वित्तीय सल्लाहकार, बीमा मेन्टर तथा कोच। Learn With Sulav ले अभिकर्ता र विद्यार्थीका लागि बीमा टुल तथा परीक्षा तयारी स्रोतहरू उपलब्ध गराउँछ।'}</p><p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-600">{t('exam_disclaimer')}</p></div>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-4 py-16">
        <h2 className="text-3xl font-extrabold">{lang === 'en' ? 'Common questions' : 'सामान्य प्रश्नहरू'}</h2>
        <div className="mt-6 divide-y divide-slate-200 border-y border-slate-200">{faq.map((item) => <details key={item.q.en} className="group py-5"><summary className="cursor-pointer list-none pr-8 font-bold text-slate-900 marker:hidden focus-visible:outline-2 focus-visible:outline-offset-4"><span className="flex items-center justify-between gap-4">{text(item.q)}<span aria-hidden="true" className="text-xl text-[#0A4F8A] group-open:rotate-45">+</span></span></summary><p className="mt-3 max-w-3xl leading-relaxed text-slate-600">{text(item.a)}</p></details>)}</div>
      </section>

      <section className="bg-navy py-16 text-white" id="contact">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 lg:grid-cols-[.8fr_1.2fr] lg:items-center">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-orange-200">{lang === 'en' ? 'Get in touch' : 'सम्पर्क गर्नुहोस्'}</p>
            <h2 className="mt-3 text-3xl font-extrabold sm:text-4xl">{lang === 'en' ? 'Let’s make your next step clearer.' : 'तपाईंको अर्को कदम स्पष्ट बनाऔँ।'}</h2>
            <p className="mt-4 max-w-md leading-relaxed text-blue-100">{lang === 'en' ? 'Have a question about a portal, exam practice, or your account? Send a note and we’ll get back to you.' : 'पोर्टल, परीक्षा अभ्यास वा खाताबारे प्रश्न छ? सन्देश पठाउनुहोस्, हामी जवाफ दिनेछौँ।'}</p>
            <a className="mt-5 inline-block font-semibold text-white underline underline-offset-4" href={`mailto:${BRAND.contact.email}`}>{BRAND.contact.email}</a>
            <div className="mt-7 flex flex-wrap gap-3"><LinkBtn href={BRAND.links.whatsapp} variant="ghost" target="_blank" rel="noopener noreferrer">{lang === 'en' ? 'WhatsApp Community' : 'WhatsApp समुदाय'}</LinkBtn><LinkBtn href={BRAND.links.facebook} variant="ghost" target="_blank" rel="noopener noreferrer">Facebook</LinkBtn></div>
          </div>
          <ContactForm />
        </div>
      </section>
    </Shell>
  );
}
