export type LocalizedText = { en: string; ne: string };

export const AGENCY_PACKAGES = [
  {
    code: 'agency_trial',
    name: { en: '7-Day Free Trial', ne: '७-दिने निःशुल्क परीक्षण' },
    amount: 0,
    days: 7,
    summary: { en: 'Try the full agency dashboard before choosing a paid plan.', ne: 'सशुल्क योजना रोज्नुअघि पूर्ण एजेन्सी ड्यासबोर्ड प्रयोग गर्नुहोस्।' },
    features: [
      { en: 'Full agency dashboard', ne: 'पूर्ण एजेन्सी ड्यासबोर्ड' },
      { en: 'Commission calculator and vCard tools', ne: 'कमिसन क्याल्कुलेटर र vCard टुलहरू' },
      { en: 'Up to 5 policies', ne: '५ वटासम्म पोलिसी' },
    ],
    featured: false,
  },
  {
    code: 'agency_basic',
    name: { en: 'Agent Basic', ne: 'एजेन्ट बेसिक' },
    amount: 944,
    days: 180,
    summary: { en: 'Essential tools for managing your clients and policies.', ne: 'ग्राहक र पोलिसी व्यवस्थापनका लागि आवश्यक टुलहरू।' },
    features: [
      { en: 'Unlimited policies', ne: 'असीमित पोलिसीहरू' },
      { en: 'Family policy grouping', ne: 'परिवारअनुसार पोलिसी समूह' },
      { en: 'TDS and commission tools', ne: 'TDS तथा कमिसन टुलहरू' },
      { en: 'Offline policy draft sync', ne: 'अफलाइन पोलिसी ड्राफ्ट सिंक' },
      { en: 'Private document vault', ne: 'निजी कागजात भण्डार' },
    ],
    featured: false,
  },
  {
    code: 'agency_pro',
    name: { en: 'Agent Pro', ne: 'एजेन्ट प्रो' },
    amount: 2024,
    days: 365,
    summary: { en: 'Everything in Basic, plus tools to grow and support your team.', ne: 'बेसिकका सबै सुविधा र टिम विस्तार तथा सहयोग गर्ने थप टुलहरू।' },
    features: [
      { en: 'Everything in Agent Basic', ne: 'एजेन्ट बेसिकका सबै सुविधा' },
      { en: 'Downline hierarchy and titles', ne: 'डाउनलाइन संरचना र पदवी' },
      { en: 'Installment calendar and projections', ne: 'किस्ता क्यालेन्डर र अनुमान' },
      { en: 'Branded festival banner generator', ne: 'ब्रान्डेड चाडपर्व ब्यानर निर्माता' },
      { en: 'Priority coaching support', ne: 'प्राथमिकतासहित कोचिङ सहयोग' },
    ],
    featured: true,
  },
] as const;

export const PAID_AGENCY_PACKAGES = [AGENCY_PACKAGES[1], AGENCY_PACKAGES[2]] as const;

export const EXAM_PACKAGES = [
  {
    code: 'exam_weekly',
    name: { en: 'Weekly Pass', ne: 'साप्ताहिक पास' },
    amount: 201,
    days: 7,
    summary: { en: 'Quick revision with unlimited mock practice.', ne: 'असीमित नमुना अभ्याससहित छिटो दोहोर्‍याउने तयारी।' },
    features: [
      { en: 'Unlimited mock tests', ne: 'असीमित नमुना परीक्षा' },
      { en: 'All question topics', ne: 'सबै प्रश्न विषयहरू' },
      { en: 'Instant scorecards and answer reviews', ne: 'तुरुन्त स्कोरकार्ड र उत्तर समीक्षा' },
    ],
    featured: false,
  },
  {
    code: 'exam_half_month',
    name: { en: 'Half-Month Pass', ne: 'अर्ध-मासिक पास' },
    amount: 336,
    days: 15,
    summary: { en: 'Full question bank with Nepali and English support.', ne: 'नेपाली र अंग्रेजी सहयोगसहित पूर्ण प्रश्न बैंक।' },
    features: [
      { en: 'Full question bank', ne: 'पूर्ण प्रश्न बैंक' },
      { en: 'Nepali and English support', ne: 'नेपाली र अंग्रेजी भाषा सहयोग' },
      { en: 'Question error reporting', ne: 'प्रश्न त्रुटि रिपोर्ट गर्ने सुविधा' },
    ],
    featured: false,
  },
  {
    code: 'exam_pro_month',
    name: { en: 'Pro Monthly Pass', ne: 'प्रो मासिक पास' },
    amount: 539,
    days: 30,
    summary: { en: 'A full month of practice with analytics and explanations.', ne: 'विश्लेषण र व्याख्यासहित एक महिनाको पूर्ण अभ्यास।' },
    features: [
      { en: 'Unlimited mock tests', ne: 'असीमित नमुना परीक्षा' },
      { en: 'Performance analytics', ne: 'प्रदर्शन विश्लेषण' },
      { en: 'Explanation reviews and priority exam updates', ne: 'व्याख्या समीक्षा र प्राथमिकताका परीक्षा अपडेट' },
    ],
    featured: true,
  },
] as const;
