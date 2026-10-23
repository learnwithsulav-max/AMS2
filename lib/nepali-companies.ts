// Comprehensive list of Nepal Insurance Authority (Nepal Beema Pradhikaran - NIA) regulated companies.

export interface InsuranceCompany {
  id: string;
  name: string;
  shortName: string;
  type: 'life' | 'non-life' | 'micro';
  isGovt?: boolean;
}

export const NEPALI_LIFE_COMPANIES: InsuranceCompany[] = [
  { id: 'nlic', name: 'Nepal Life Insurance Co. Ltd.', shortName: 'Nepal Life', type: 'life' },
  { id: 'licn', name: 'Life Insurance Corporation (Nepal) Ltd.', shortName: 'LIC Nepal', type: 'life' },
  { id: 'national', name: 'National Life Insurance Co. Ltd.', shortName: 'National Life', type: 'life' },
  { id: 'himalayan', name: 'Himalayan Life Insurance Ltd.', shortName: 'Himalayan Life', type: 'life' },
  { id: 'suryajyoti', name: 'SuryaJyoti Life Insurance Co. Ltd.', shortName: 'SuryaJyoti Life', type: 'life' },
  { id: 'asian', name: 'Asian Life Insurance Co. Ltd.', shortName: 'Asian Life', type: 'life' },
  { id: 'sanima_reliance', name: 'Sanima Reliance Life Insurance Ltd.', shortName: 'Sanima Reliance', type: 'life' },
  { id: 'citizen', name: 'Citizen Life Insurance Co. Ltd.', shortName: 'Citizen Life', type: 'life' },
  { id: 'prabhu_mahalaxmi', name: 'Prabhu Mahalaxmi Life Insurance Ltd.', shortName: 'Prabhu Mahalaxmi', type: 'life' },
  { id: 'sun_nepal', name: 'Sun Nepal Life Insurance Co. Ltd.', shortName: 'Sun Nepal Life', type: 'life' },
  { id: 'reliable_nepal', name: 'Reliable Nepal Life Insurance Ltd.', shortName: 'Reliable Nepal', type: 'life' },
  { id: 'ime_life', name: 'IME Life Insurance Co. Ltd.', shortName: 'IME Life', type: 'life' },
  { id: 'rbs', name: 'Rastriya Beema Sansthan (RBS)', shortName: 'Beema Sansthan', type: 'life', isGovt: true },
  { id: 'metlife', name: 'MetLife Nepal (American Life Insurance Co.)', shortName: 'MetLife', type: 'life' },
];

export const NEPALI_NON_LIFE_COMPANIES: InsuranceCompany[] = [
  { id: 'shikhar', name: 'Shikhar Insurance Co. Ltd.', shortName: 'Shikhar', type: 'non-life' },
  { id: 'salico', name: 'Sagarmatha Lumbini Insurance Co. Ltd.', shortName: 'SALICO', type: 'non-life' },
  { id: 'siddhartha_premier', name: 'Siddhartha Premier Insurance Ltd.', shortName: 'Siddhartha Premier', type: 'non-life' },
  { id: 'himalayan_everest', name: 'Himalayan Everest Insurance Ltd.', shortName: 'Himalayan Everest', type: 'non-life' },
  { id: 'neco', name: 'Neco Insurance Ltd.', shortName: 'Neco', type: 'non-life' },
  { id: 'united_ajod', name: 'United Ajod Insurance Ltd.', shortName: 'United Ajod', type: 'non-life' },
  { id: 'sanima_gic', name: 'Sanima GIC Insurance Ltd.', shortName: 'Sanima GIC', type: 'non-life' },
  { id: 'igi_prudential', name: 'IGI Prudential Insurance Ltd.', shortName: 'IGI Prudential', type: 'non-life' },
  { id: 'nlg', name: 'NLG Insurance Co. Ltd.', shortName: 'NLG', type: 'non-life' },
  { id: 'rbcl', name: 'Rastriya Beema Company Ltd. (RBCL)', shortName: 'Rastriya Beema Co', type: 'non-life', isGovt: true },
];

export const NEPALI_MICRO_COMPANIES: InsuranceCompany[] = [
  { id: 'guardian_micro', name: 'Guardian Micro Life Insurance Ltd.', shortName: 'Guardian Micro', type: 'micro' },
  { id: 'crest_micro', name: 'Crest Micro Life Insurance Ltd.', shortName: 'Crest Micro', type: 'micro' },
  { id: 'liberty_micro', name: 'Liberty Micro Life Insurance Ltd.', shortName: 'Liberty Micro', type: 'micro' },
];

export const ALL_INSURANCE_COMPANIES: InsuranceCompany[] = [
  ...NEPALI_LIFE_COMPANIES,
  ...NEPALI_NON_LIFE_COMPANIES,
  ...NEPALI_MICRO_COMPANIES,
];

// Popular branches across Nepal for quick autocomplete & manual entry
export const POPULAR_NEPALI_BRANCHES = [
  'Butwal',
  'Kathmandu - New Road',
  'Kathmandu - Putalisadak',
  'Kathmandu - Baneshwor',
  'Lalitpur - Kumaripati',
  'Bhaktapur',
  'Pokhara - New Road',
  'Pokhara - Lakeside',
  'Chitwan - Narayangarh',
  'Biratnagar',
  'Dharan',
  'Itahari',
  'Birtamod',
  'Damak',
  'Nepalgunj',
  'Bhairahawa',
  'Dang - Ghorahi',
  'Dang - Tulsipur',
  'Hetauda',
  'Birgunj',
  'Janakpur',
  'Dhangadhi',
  'Mahendranagar',
  'Surkhet - Birendranagar',
];
