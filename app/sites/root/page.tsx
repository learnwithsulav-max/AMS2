'use client';

import Image from 'next/image';
import { Shell } from '@/components/Shell';
import { Card, LinkBtn } from '@/components/ui';
import { useI18n } from '@/lib/i18n';
import { BRAND, siteUrl } from '@/lib/brand';

const agentTools = [
  { icon: '◫', title: { en: 'Lead and policy board', ne: 'लिड तथा पोलिसी बोर्ड' }, body: { en: 'Keep follow-ups, policy records and renewals organized in one workspace.', ne: 'फलोअप, पोलिसी र नवीकरणलाई एउटै कार्यक्षेत्रमा व्यवस्थित राख्नुहोस्।' } },
  { icon: '↗', title: { en: 'Agent calculators', ne: 'एजेन्ट क्याल्कुलेटर' }, body: { en: 'Use insurance planning tools, including TDI and BDI calculations.', ne: 'TDI र BDI गणनासहित बीमा योजनाका टुलहरू प्रयोग गर्नुहोस्।' } },
  { icon: '◎', title: { en: 'Public agent profile', ne: 'सार्वजनिक एजेन्ट प्रोफाइल' }, body: { en: 'Create a shareable profile and receive inquiries from prospective clients.', ne: 'साझा गर्न मिल्ने प्रोफाइल बनाएर सम्भावित ग्राहकका सोधपुछ प्राप्त गर्नुहोस्।' } },
];

const faq = [
  { q: { en: 'Who is the Agency Portal for?', ne: 'एजेन्सी पोर्टल कसका लागि हो?' }, a: { en: 'It is for insurance agents who want tools for leads, policies, follow-ups and professional profiles. Select Agency Portal to sign in or create an account.', ne: 'लिड, पोलिसी, फलोअप र व्यावसायिक प्रोफाइलका टुल चाहने बीमा अभिकर्ताका लागि हो। साइन इन वा खाता बनाउन एजेन्सी पोर्टल छान्नुहोस्।' } },
  { q: { en: 'How do I start exam practice?', ne: 'परीक्षा अभ्यास कसरी सुरु गर्ने?' }, a: { en: 'Open Exam Practice, create or sign in to your student account, then choose an available pass. Submit your payment voucher for review; access opens after approval.', ne: 'Exam Practice खोल्नुहोस्, विद्यार्थी खाता बनाउनुहोस् वा साइन इन गर्नुहोस्, अनि उपलब्ध पास छान्नुहोस्। भुक्तानी भौचर जाँचका लागि बुझाउनुहोस्; स्वीकृत भएपछि पहुँच खुल्छ।' } },
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

      <section className="bg-[#F4F8FC] py-14 sm:py-16">
        <div className="mx-auto flex max-w-7xl flex-col gap-8 px-4 md:flex-row md:items-center md:justify-between">
          <div className="max-w-2xl"><p className="text-sm font-bold uppercase tracking-wide text-[#0A4F8A]">{lang === 'en' ? 'For exam candidates' : 'परीक्षार्थीका लागि'}</p><h2 className="mt-2 text-3xl font-extrabold">{lang === 'en' ? 'Prepare at your own pace.' : 'आफ्नो गतिमा तयारी गर्नुहोस्।'}</h2><p className="mt-3 leading-relaxed text-slate-600">{lang === 'en' ? 'Practice with a timed 50-question exam. Passes start from Rs 99; choose a package and submit the payment voucher inside the portal. Your exam unlocks after approval.' : 'समय सीमासहितको ५० प्रश्नको परीक्षामा अभ्यास गर्नुहोस्। पास रु ९९ देखि सुरु हुन्छ; पोर्टलभित्र प्याकेज छानेर भुक्तानी भौचर बुझाउनुहोस्। स्वीकृतिपछि परीक्षा खुल्छ।'}</p><p className="mt-2 text-sm font-semibold text-slate-700">{lang === 'en' ? '90 minutes per attempt · 50 questions' : 'प्रति प्रयास ९० मिनेट · ५० प्रश्न'}</p></div>
          <LinkBtn href={siteUrl('exam')} variant="cta">{lang === 'en' ? 'Open Exam Practice' : 'परीक्षा अभ्यास खोल्नुहोस्'}</LinkBtn>
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

      <section className="bg-navy py-12 text-white" id="contact">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-4 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="text-2xl font-extrabold">{lang === 'en' ? 'Need help choosing a portal?' : 'कुन पोर्टल छान्ने भन्नेमा सहयोग चाहिन्छ?'}</h2><p className="mt-2 text-slate-200">{lang === 'en' ? 'Contact us or join the Learn With Sulav community.' : 'हामीलाई सम्पर्क गर्नुहोस् वा Learn With Sulav समुदायमा जोडिनुहोस्।'}</p><a className="mt-3 inline-block font-semibold text-white underline underline-offset-4" href={`mailto:${BRAND.contact.email}`}>{BRAND.contact.email}</a></div><div className="flex flex-wrap gap-3"><LinkBtn href={BRAND.links.whatsapp} variant="ghost" target="_blank" rel="noopener noreferrer">{lang === 'en' ? 'WhatsApp Community' : 'WhatsApp समुदाय'}</LinkBtn><LinkBtn href={BRAND.links.facebook} variant="ghost" target="_blank" rel="noopener noreferrer">Facebook</LinkBtn></div></div>
      </section>
    </Shell>
  );
}
