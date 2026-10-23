import 'server-only';
import raw from '@/data/questions.json';

export const QUESTION_CATEGORIES = [
  'nia',
  'reinsurance',
  'life',
  'nonlife',
  'microinsurance',
  'aml_cft',
  'agent_conduct',
  'life_cases',
  'nonlife_cases',
  'micro_cases',
] as const;

export type QuestionCategory = (typeof QUESTION_CATEGORIES)[number];
export type Q = {
  id: number;
  category: QuestionCategory;
  q: string;
  options: { k: string; text: string }[];
  ans: string;
};

type RawQuestion = {
  id: number;
  category: QuestionCategory;
  q: string;
  a: string;
  b: string;
  c: string;
  d: string;
  ans: string;
};

// Questions are imported only on the server, so correct answers never reach the browser.
export const QUESTIONS: Q[] = (raw as RawQuestion[]).map((r) => ({
  id: r.id,
  category: r.category,
  q: r.q,
  ans: r.ans,
  options: [
    { k: 'A', text: r.a },
    { k: 'B', text: r.b },
    { k: 'C', text: r.c },
    { k: 'D', text: r.d },
  ],
}));
