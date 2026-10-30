'use client';

import { Shell } from '@/components/Shell';
import { useI18n } from '@/lib/i18n';
import { BRAND } from '@/lib/brand';

type LegalKind = 'privacy' | 'terms';

const content = {
  privacy: {
    en: {
      title: 'Privacy', intro: 'This notice explains the information Learn With Sulav uses to operate its agency tools and exam practice portals.',
      sections: [
        ['Information you provide', 'When you create an account, the service may collect your name, email address, phone number and account details. Exam activity and results are stored to provide attempts, review and certificates. Agent tools can store policy and lead details that agents enter. Payment requests include package details and a voucher image.'],
        ['Public profiles and contact', 'Agent profile information is public only when the agent publishes a profile. A visitor who submits a profile inquiry may provide their name, phone, email and message; the inquiry is sent to that agent.'],
        ['How information is used', 'Information is used to run accounts and portals, provide exam results and certificates, review payment requests, support agent workflows, and respond to requests. Email or WhatsApp messages may be sent where the service supports them; WhatsApp notices depend on your opt-in.'],
        ['Service providers', 'The portals use Supabase for account, database and file-storage services and Vercel for hosting. Information submitted to these services is processed to provide the portals.'],
        ['Your choices and questions', `For questions or requests about personal information, contact ${BRAND.contact.email}. Do not submit information about another person unless you are authorized to do so. Published portfolio details can be changed by the agent in the portal.`],
      ],
      updated: 'This notice describes the current portal features. Contact us if you have a privacy question.',
    },
    ne: {
      title: 'गोपनीयता', intro: 'यो सूचनाले एजेन्सी टुल र परीक्षा अभ्यास पोर्टल सञ्चालन गर्दा Learn With Sulav ले प्रयोग गर्ने जानकारीबारे बताउँछ।',
      sections: [
        ['तपाईंले दिने जानकारी', 'खाता बनाउँदा सेवाले तपाईंको नाम, इमेल, फोन नम्बर र खाता विवरण लिन सक्छ। परीक्षा प्रयास, समीक्षा र प्रमाणपत्र दिन परीक्षा गतिविधि तथा नतिजा राखिन्छ। एजेन्ट टुलमा एजेन्टले भरेका पोलिसी र लिडका विवरण रहन सक्छन्। भुक्तानी अनुरोधमा प्याकेज विवरण र भौचरको तस्वीर समावेश हुन्छ।'],
        ['सार्वजनिक प्रोफाइल र सम्पर्क', 'एजेन्टले प्रकाशित गरेपछि मात्र प्रोफाइल विवरण सार्वजनिक हुन्छ। प्रोफाइलबाट सोधपुछ पठाउने व्यक्तिले नाम, फोन, इमेल र सन्देश दिन सक्छन्; सोधपुछ सम्बन्धित एजेन्टलाई पठाइन्छ।'],
        ['जानकारीको प्रयोग', 'खाता तथा पोर्टल सञ्चालन, परीक्षा नतिजा र प्रमाणपत्र, भुक्तानी अनुरोध समीक्षा, एजेन्टको कार्यप्रवाह र अनुरोधको जवाफ दिन जानकारी प्रयोग हुन्छ। सेवाले उपलब्ध गराएका इमेल वा WhatsApp सन्देश पठाउन सकिन्छ; WhatsApp सूचनाका लागि तपाईंको सहमति आवश्यक हुन्छ।'],
        ['सेवा प्रदायक', 'पोर्टलले खाता, डाटाबेस र फाइल भण्डारणका लागि Supabase तथा होस्टिङका लागि Vercel प्रयोग गर्छ। पोर्टल उपलब्ध गराउन यी सेवामार्फत बुझाइएको जानकारी प्रशोधन हुन्छ।'],
        ['तपाईंका विकल्प र प्रश्न', `व्यक्तिगत जानकारीसम्बन्धी प्रश्न वा अनुरोधका लागि ${BRAND.contact.email} मा सम्पर्क गर्नुहोस्। अधिकार नभएसम्म अरू व्यक्तिको जानकारी नबुझाउनुहोस्। प्रकाशित पोर्टफोलियो विवरण एजेन्टले पोर्टलबाट परिवर्तन गर्न सक्छन्।`],
      ],
      updated: 'यो सूचनाले हालका पोर्टल सुविधाहरू वर्णन गर्छ। गोपनीयतासम्बन्धी प्रश्न भए हामीलाई सम्पर्क गर्नुहोस्।',
    },
  },
  terms: {
    en: {
      title: 'Terms of use', intro: 'By using Learn With Sulav, you agree to use the portals responsibly and in line with these terms.',
      sections: [
        ['Independent learning service', 'Learn With Sulav is an independently operated software and learning service. It is not affiliated with or endorsed by the Nepal Insurance Authority (NIA). Exam practice is educational preparation and does not guarantee a license, exam result or employment outcome.'],
        ['Accounts and portal access', 'Provide accurate account information and keep your sign-in details private. You are responsible for activity carried out through your account. Exam pass access may require a payment voucher review; access begins after approval.'],
        ['Agent-entered information', 'Agents are responsible for having appropriate authority to enter client, policy and lead information, and for using published profile details that they are willing to share publicly.'],
        ['Payments and availability', 'Available exam packages and prices are shown in the Exam Portal. Payment requests are reviewed before a pass is activated. For payment questions, contact us at the address below. Portal features may be updated as the service changes.'],
        ['Contact', `Questions about these terms: ${BRAND.contact.email}.`],
      ],
      updated: 'Use of the portals is also subject to applicable laws and service notices shown inside the portals.',
    },
    ne: {
      title: 'प्रयोगका सर्तहरू', intro: 'Learn With Sulav प्रयोग गर्दा तपाईं पोर्टल जिम्मेवारीपूर्वक र यी सर्तअनुसार प्रयोग गर्न सहमत हुनुहुन्छ।',
      sections: [
        ['स्वतन्त्र सिकाइ सेवा', 'Learn With Sulav स्वतन्त्र रूपमा सञ्चालित सफ्टवेयर तथा सिकाइ सेवा हो। यो नेपाल बीमा प्राधिकरण (NIA) सँग आबद्ध वा समर्थित छैन। परीक्षा अभ्यास शैक्षिक तयारीका लागि हो; यसले इजाजतपत्र, परीक्षा नतिजा वा रोजगारीको ग्यारेन्टी गर्दैन।'],
        ['खाता र पोर्टल पहुँच', 'खातामा सही जानकारी दिनुहोस् र साइन-इन विवरण गोप्य राख्नुहोस्। तपाईंको खाताबाट भएका गतिविधिको जिम्मेवारी तपाईंको हुन्छ। परीक्षा पास पहुँचका लागि भुक्तानी भौचर जाँच हुन सक्छ; स्वीकृतिपछि पहुँच खुल्छ।'],
        ['एजेन्टले भरेका जानकारी', 'ग्राहक, पोलिसी र लिडका विवरण राख्न आवश्यक अधिकार भएको सुनिश्चित गर्ने र सार्वजनिक गर्न चाहेको प्रोफाइल विवरण मात्र प्रकाशित गर्ने जिम्मेवारी एजेन्टको हो।'],
        ['भुक्तानी र उपलब्धता', 'उपलब्ध परीक्षा प्याकेज र मूल्य Exam Portal मा देखाइन्छ। पास सक्रिय गर्नुअघि भुक्तानी अनुरोध समीक्षा गरिन्छ। भुक्तानीसम्बन्धी प्रश्नका लागि तलको इमेलमा सम्पर्क गर्नुहोस्। सेवा परिवर्तनसँगै पोर्टलका सुविधा अद्यावधिक हुन सक्छन्।'],
        ['सम्पर्क', `यी सर्तबारे प्रश्न भए ${BRAND.contact.email} मा सम्पर्क गर्नुहोस्।`],
      ],
      updated: 'पोर्टलको प्रयोगमा लागू कानुन तथा पोर्टलभित्र देखाइएका सेवा सूचनाहरू पनि लागू हुन्छन्।',
    },
  },
} satisfies Record<LegalKind, Record<'en' | 'ne', { title: string; intro: string; sections: [string, string][]; updated: string }>>;

export function LegalPage({ kind }: { kind: LegalKind }) {
  const { lang } = useI18n();
  const page = content[kind][lang];
  return <Shell site="root"><article className="mx-auto max-w-3xl px-4 py-12 sm:py-16">
    <a href="/" className="text-sm font-semibold text-[#0A4F8A] underline underline-offset-4">{lang === 'en' ? '← Home' : '← गृहपृष्ठ'}</a>
    <h1 className="mt-6 text-3xl font-extrabold text-slate-950 sm:text-4xl">{page.title}</h1>
    <p className="mt-4 leading-relaxed text-slate-700">{page.intro}</p>
    <div className="mt-8 space-y-7">{page.sections.map(([title, body]) => <section key={title}><h2 className="text-lg font-bold text-slate-900">{title}</h2><p className="mt-2 leading-relaxed text-slate-700">{body}</p></section>)}</div>
    <p className="mt-10 border-t border-slate-200 pt-5 text-sm text-slate-600">{page.updated}</p>
  </article></Shell>;
}
