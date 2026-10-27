'use client';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

type Lang = 'en' | 'ne';

const dict: Record<Lang, Record<string, string>> = {
  en: {
    nav_home: 'Home', nav_agency: 'Agency Portal', nav_exam: 'Exam Portal',
    hero_title: 'Empowering Insurance Agents & Professionals with Smart Tools, Training Portals & Expert Mentorship.',
    hero_sub: 'Sulav Sapkota, Financial Advisor, Insurance Mentor and Coach.',
    cta_exam: 'Exam passes from Rs 99', cta_agency: 'Start 7-day free trial', cta_wa: 'Join WhatsApp Community',
    trust_badge: 'Powered by Learn With Sulav | Managed & Developed by Sulav Sapkota',
    exam_disclaimer: 'Disclaimer: Learn With Sulav (Managed by Sulav Sapkota) is an independent educational preparation platform and is not directly affiliated with or endorsed by the Nepal Insurance Authority (NIA).',
    portals: 'Your portals',
    svc_title: 'Tools and portals',
    svc_exam_t: 'Agent exam practice',
    svc_exam_d: 'Practice the licensing exam with a live timer, 50 shuffled questions and an instant result. Pass and your certificate unlocks.',
    svc_agency_t: 'Agency dashboard',
    svc_agency_d: 'Track leads on a Kanban board, manage policies and renewals, and calculate TDI and BDI.',
    svc_comm_t: 'Community and mentoring',
    svc_comm_d: 'Ask questions, share results and learn with other agents in the WhatsApp community.',
    about_title: 'About Sulav',
    about_body: 'I am Sulav Sapkota, a dedicated Financial Advisor, Insurance Mentor, and Coach. Backed by a strong technical foundation with a Diploma in Computer Engineering, I build smart digital tools, agency management systems, and specialized training portals for insurance professionals under LearnWithSulav.',
    comm_title: 'Join the community',
    link_fb: 'Facebook Page', link_fb_d: 'News, tips and updates.',
    link_wa: 'WhatsApp Community', link_wa_d: 'The main group for all agents.',
    link_pass: 'Pass Group', link_pass_d: 'Passed the exam? Come celebrate and guide others.',
    link_fail: 'Fail Group', link_fail_d: 'Did not pass yet? Get support and try again.',
    contact_title: 'Contact',
    exam_login_title: 'Start your practice exam',
    exam_rules: '50 random questions, 10 pages of 5, 90 minutes. Each correct answer is 2 marks.',
    full_name: 'Full name', phone: 'Phone number', start: 'Start exam', resume: 'Resume your exam',
    time_left: 'Time left', page: 'Page', of: 'of', prev: 'Previous', next: 'Next',
    submit: 'Submit exam', answered: 'answered',
    pass: 'You passed', fail: 'Not passed yet', marks: 'Marks', correct: 'Correct', wrong: 'Wrong', skipped: 'Skipped',
    cert_title: 'Your certificate', cert_png: 'Download PNG', cert_pdf: 'Download PDF',
    cert_locked: 'Pass the exam to unlock your certificate.',
    retake: 'Take another exam', review: 'Review answers', history: 'Your recent attempts',
    pay_first_title: 'Payment required',
    pay_first_body: 'Please complete exam pass payment first. Access activates after your payment is approved and the admin enables your account.',
    pay_first_cta: 'Go to payment',
    pay_first_cancel: 'Not now',
  },
  ne: {
    nav_home: 'गृहपृष्ठ', nav_agency: 'एजेन्सी पोर्टल', nav_exam: 'परीक्षा पोर्टल',
    hero_title: 'स्मार्ट टुल्स, तालिम पोर्टल र विशेषज्ञ मेन्टरसिपमार्फत बीमा अभिकर्ता तथा पेशाकर्मीहरूलाई सशक्त बनाउँदै।',
    hero_sub: 'सुलाव सापकोटा, वित्तीय सल्लाहकार, बीमा मेन्टर तथा कोच।',
    cta_exam: 'परीक्षा पास रु ९९ देखि', cta_agency: '७ दिनको निःशुल्क परीक्षण सुरु गर्नुहोस्', cta_wa: 'व्हाट्सएप समुदायमा जोडिनुहोस्',
    trust_badge: 'Learn With Sulav द्वारा सञ्चालित | सुलाव सापकोटाद्वारा व्यवस्थापन तथा विकास',
    exam_disclaimer: 'अस्वीकरण: Learn With Sulav (सुलाव सापकोटाद्वारा व्यवस्थापित) एक स्वतन्त्र शैक्षिक तयारी प्लेटफर्म हो र नेपाल बीमा प्राधिकरण (NIA) सँग प्रत्यक्ष आबद्ध वा यसको समर्थन प्राप्त संस्था होइन।',
    portals: 'तपाईंका पोर्टलहरू',
    svc_title: 'टुल्स तथा पोर्टलहरू',
    svc_exam_t: 'एजेन्ट परीक्षा अभ्यास',
    svc_exam_d: 'लाइभ टाइमर, ५० अनियमित प्रश्न र तुरुन्तै नतिजासहित इजाजतपत्र परीक्षाको अभ्यास गर्नुहोस्। उत्तीर्ण हुनासाथ प्रमाणपत्र खुल्छ।',
    svc_agency_t: 'एजेन्सी ड्यासबोर्ड',
    svc_agency_d: 'कानबान बोर्डमा लिड ट्र्याक गर्नुहोस्, पोलिसी र नवीकरण व्यवस्थापन गर्नुहोस् र TDI तथा BDI गणना गर्नुहोस्।',
    svc_comm_t: 'समुदाय तथा मेन्टरिङ',
    svc_comm_d: 'व्हाट्सएप समुदायमा प्रश्न सोध्नुहोस्, नतिजा साझा गर्नुहोस् र अन्य अभिकर्ताहरूसँग सिक्नुहोस्।',
    about_title: 'सुलावको बारेमा',
    about_body: 'म सुलाव सापकोटा, एक समर्पित वित्तीय सल्लाहकार, बीमा मेन्टर र कोच हुँ। कम्प्युटर इन्जिनियरिङमा डिप्लोमाको बलियो प्राविधिक आधारसहित, म LearnWithSulav अन्तर्गत बीमा पेशाकर्मीहरूका लागि स्मार्ट डिजिटल टुल्स, एजेन्सी व्यवस्थापन प्रणाली र विशेष तालिम पोर्टलहरू बनाउँछु।',
    comm_title: 'समुदायमा जोडिनुहोस्',
    link_fb: 'फेसबुक पेज', link_fb_d: 'समाचार, सुझाव र अपडेट।',
    link_wa: 'व्हाट्सएप समुदाय', link_wa_d: 'सबै अभिकर्ताका लागि मुख्य समूह।',
    link_pass: 'पास समूह', link_pass_d: 'परीक्षा पास गर्नुभयो? अरूलाई मार्गदर्शन गर्नुहोस्।',
    link_fail: 'फेल समूह', link_fail_d: 'अहिले पास हुनुभएन? सहयोग लिएर फेरि प्रयास गर्नुहोस्।',
    contact_title: 'सम्पर्क',
    exam_login_title: 'आफ्नो अभ्यास परीक्षा सुरु गर्नुहोस्',
    exam_rules: '५० अनियमित प्रश्न, ५/५ वटाका १० पृष्ठ, ९० मिनेट। प्रत्येक सही उत्तरको २ अङ्क।',
    full_name: 'पूरा नाम', phone: 'फोन नम्बर', start: 'परीक्षा सुरु गर्नुहोस्', resume: 'परीक्षा जारी राख्नुहोस्',
    time_left: 'बाँकी समय', page: 'पृष्ठ', of: 'मध्ये', prev: 'अघिल्लो', next: 'अर्को',
    submit: 'परीक्षा बुझाउनुहोस्', answered: 'उत्तर दिइयो',
    pass: 'तपाईं उत्तीर्ण हुनुभयो', fail: 'तपाईं अनुत्तीर्ण हुनुभयो', marks: 'अङ्क', correct: 'सही', wrong: 'गलत', skipped: 'छुटेका',
    cert_title: 'तपाईंको प्रमाणपत्र', cert_png: 'PNG डाउनलोड', cert_pdf: 'PDF डाउनलोड',
    cert_locked: 'प्रमाणपत्र खोल्न परीक्षा उत्तीर्ण गर्नुहोस्।',
    retake: 'अर्को परीक्षा दिनुहोस्', review: 'उत्तरहरू समीक्षा', history: 'तपाईंका हालका प्रयास',
    pay_first_title: 'भुक्तानी आवश्यक छ',
    pay_first_body: 'पहिले परीक्षा पासको भुक्तानी पूरा गर्नुहोस्। तपाईंको भुक्तानी स्वीकृत भएपछि र एडमिनद्वारा खाता सक्षम भएपछि पहुँच सक्रिय हुन्छ।',
    pay_first_cta: 'भुक्तानी पृष्ठमा जानुहोस्',
    pay_first_cancel: 'अहिले होइन',
  },
};

const Ctx = createContext<{ lang: Lang; setLang: (l: Lang) => void; t: (k: string) => string }>({
  lang: 'en', setLang: () => {}, t: (k) => k,
});

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setL] = useState<Lang>('en');
  useEffect(() => {
    try { const s = localStorage.getItem('lsw_lang'); if (s === 'en' || s === 'ne') setL(s); } catch {}
  }, []);
  const setLang = (l: Lang) => {
    setL(l);
    try { localStorage.setItem('lsw_lang', l); } catch {}
    document.documentElement.lang = l;
  };
  const t = (k: string) => dict[lang][k] ?? dict.en[k] ?? k;
  return <Ctx.Provider value={{ lang, setLang, t }}>{children}</Ctx.Provider>;
}

export const useI18n = () => useContext(Ctx);

export function LangToggle() {
  const { lang, setLang } = useI18n();
  return (
    <div className="inline-flex overflow-hidden rounded-lg border border-slate-300 text-xs font-semibold" role="group" aria-label="Language">
      {(['en', 'ne'] as Lang[]).map((l) => (
        <button key={l} onClick={() => setLang(l)} aria-pressed={lang === l}
          className={`px-3 py-1.5 ${lang === l ? 'bg-navy text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}>
          {l === 'en' ? 'English' : 'नेपाली'}
        </button>
      ))}
    </div>
  );
}
