export const BRAND = {
  name: 'Learn With Sulav',
  owner: 'Sulav Sapkota',
  trustBadge: 'Powered by Learn With Sulav | Managed & Developed by Sulav Sapkota',
  role: 'Financial Advisor, Insurance Mentor and Coach',
  links: {
    facebook: 'https://www.facebook.com/share/1C2En4gvsg/',
    whatsapp: 'https://chat.whatsapp.com/IA5HndEQhscGMsMxnYi6uc',
    pass: 'https://chat.whatsapp.com/HXUt4bDRIXw7jXVaIA5Kmt',
    fail: 'https://chat.whatsapp.com/KTiZAbm0V2O1DDM9nxJTiA',
  },
  contact: { email: 'learnwithsulav@gmail.com', phones: ['+9779857053594', '+9779847303594'] },
};

// Exam rules. Change here and both the portal and the grader follow.
export const EXAM = {
  total: 50, // questions drawn at random from the bank
  perPage: 5, // 10 pages x 5 questions
  minutes: 60,
  pointsPerQuestion: 2, // 50 x 2 = 100 marks
  passPercent: 50, // pass mark as % of total marks (set to your real rule)
};

export type SiteKey = 'root' | 'agency' | 'exam' | 'admin';

export function siteUrl(site: SiteKey) {
  // Keep internal portal URLs identical during SSR and hydration. Runtime host
  // detection here caused the server to render absolute URLs and the browser
  // to replace them with preview-relative URLs before hydration completed.
  const root = (process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'sulavs.com.np').replace(/^www\./i, '');
  return site === 'root' ? `https://www.${root}` : `https://${site}.${root}`;
}

