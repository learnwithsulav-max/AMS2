// Nepali Bikram Sambat (BS) Calendar, Date Converter & Dynamic Greetings Engine

export const NEPALI_MONTHS_NE = [
  'बैशाख', 'जेठ', 'असार', 'साउन', 'भदौ', 'असोज',
  'कात्तिक', 'मंसिर', 'पुस', 'माघ', 'फागुन', 'चैत'
];

export const NEPALI_MONTHS_EN = [
  'Baisakh', 'Jestha', 'Ashadh', 'Shrawan', 'Bhadra', 'Ashwin',
  'Kartik', 'Mangsir', 'Poush', 'Magh', 'Falgun', 'Chaitra'
];

export const NEPALI_DAYS_NE = [
  'आइतबार', 'सोमबार', 'मंगलबार', 'बुधबार', 'बिहीबार', 'शुक्रबार', 'शनिबार'
];

export const NEPALI_DIGITS = ['०', '१', '२', '३', '४', '५', '६', '७', '८', '९'];

export function toNepaliNumber(num: number | string): string {
  return String(num).replace(/[0-9]/g, (d) => NEPALI_DIGITS[parseInt(d, 10)]);
}

// Days in each month for BS years 2075 through 2085 (official Nepal calendar)
const BS_CALENDAR_DATA: Record<number, number[]> = {
  2075: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2076: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 30],
  2077: [31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31],
  2078: [31, 31, 31, 32, 31, 31, 30, 29, 30, 29, 30, 30],
  2079: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2080: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 30],
  2081: [31, 31, 32, 32, 31, 30, 30, 30, 29, 30, 29, 31],
  2082: [31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31],
  2083: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2084: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 30],
  2085: [31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31],
};

// Anchor reference: 2081 Baisakh 1 = 2024 April 13
const ANCHOR_BS_YEAR = 2081;
const ANCHOR_AD_DATE = new Date(2024, 3, 13); // month is 0-indexed: 3 = April

export interface BsDate {
  year: number;
  month: number; // 1-12
  day: number;
  monthNameEn: string;
  monthNameNe: string;
  dayNameNe: string;
  formattedBs: string;
  formattedBsNe: string;
}

export function adToBs(inputDate?: Date | string): BsDate {
  const ad = inputDate ? new Date(inputDate) : new Date();
  const utcAd = new Date(ad.getFullYear(), ad.getMonth(), ad.getDate());
  const utcAnchor = new Date(ANCHOR_AD_DATE.getFullYear(), ANCHOR_AD_DATE.getMonth(), ANCHOR_AD_DATE.getDate());

  let diffDays = Math.round((utcAd.getTime() - utcAnchor.getTime()) / (1000 * 60 * 60 * 24));

  let currentYear = ANCHOR_BS_YEAR;
  let currentMonth = 0; // 0-indexed month
  let currentDay = 1;

  if (diffDays >= 0) {
    while (diffDays > 0) {
      const yearDays = BS_CALENDAR_DATA[currentYear] || [31, 31, 32, 31, 31, 30, 30, 30, 29, 30, 29, 30];
      const daysInMonth = yearDays[currentMonth];

      if (diffDays >= daysInMonth) {
        diffDays -= daysInMonth;
        currentMonth++;
        if (currentMonth >= 12) {
          currentMonth = 0;
          currentYear++;
        }
      } else {
        currentDay += diffDays;
        diffDays = 0;
      }
    }
  } else {
    // Before anchor date
    while (diffDays < 0) {
      currentMonth--;
      if (currentMonth < 0) {
        currentMonth = 11;
        currentYear--;
      }
      const yearDays = BS_CALENDAR_DATA[currentYear] || [31, 31, 32, 31, 31, 30, 30, 30, 29, 30, 29, 30];
      const daysInMonth = yearDays[currentMonth];

      if (Math.abs(diffDays) >= daysInMonth) {
        diffDays += daysInMonth;
      } else {
        currentDay = daysInMonth + diffDays + 1;
        diffDays = 0;
      }
    }
  }

  const monthIdx = currentMonth;
  const month1Idx = currentMonth + 1;
  const dayNameNe = NEPALI_DAYS_NE[ad.getDay()];
  const formattedBs = `${currentYear}-${String(month1Idx).padStart(2, '0')}-${String(currentDay).padStart(2, '0')}`;
  const formattedBsNe = `${toNepaliNumber(currentYear)} ${NEPALI_MONTHS_NE[monthIdx]} ${toNepaliNumber(currentDay)}, ${dayNameNe}`;

  return {
    year: currentYear,
    month: month1Idx,
    day: currentDay,
    monthNameEn: NEPALI_MONTHS_EN[monthIdx],
    monthNameNe: NEPALI_MONTHS_NE[monthIdx],
    dayNameNe,
    formattedBs,
    formattedBsNe,
  };
}

export function bsToAd(year: number, month: number, day: number): Date {
  let targetYear = Number(year);
  let targetMonth = Number(month) - 1; // 0-indexed
  let targetDay = Number(day);

  let currentYear = ANCHOR_BS_YEAR;
  let currentMonth = 0;
  let totalDays = 0;

  if (targetYear >= ANCHOR_BS_YEAR) {
    while (currentYear < targetYear || (currentYear === targetYear && currentMonth < targetMonth)) {
      const yearDays = BS_CALENDAR_DATA[currentYear] || [31, 31, 32, 31, 31, 30, 30, 30, 29, 30, 29, 30];
      totalDays += yearDays[currentMonth];
      currentMonth++;
      if (currentMonth >= 12) {
        currentMonth = 0;
        currentYear++;
      }
    }
    totalDays += (targetDay - 1);
  } else {
    while (currentYear > targetYear || (currentYear === targetYear && currentMonth > targetMonth)) {
      currentMonth--;
      if (currentMonth < 0) {
        currentMonth = 11;
        currentYear--;
      }
      const yearDays = BS_CALENDAR_DATA[currentYear] || [31, 31, 32, 31, 31, 30, 30, 30, 29, 30, 29, 30];
      totalDays -= yearDays[currentMonth];
    }
    totalDays += (targetDay - 1);
  }

  const res = new Date(ANCHOR_AD_DATE);
  res.setDate(res.getDate() + totalDays);
  return res;
}

// Insurance Underwriting Age Calculation (Calculates age in completed years or nearest birthday)
export function calculateInsuranceAge(dobAd: Date | string, referenceDate: Date | string = new Date()): {
  completedAge: number;
  nearestAge: number;
} {
  const birth = new Date(dobAd);
  const ref = new Date(referenceDate);

  let age = ref.getFullYear() - birth.getFullYear();
  const m = ref.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && ref.getDate() < birth.getDate())) {
    age--;
  }

  // Nearest birthday: if elapsed months >= 6, add 1
  const birthdayThisYear = new Date(ref.getFullYear(), birth.getMonth(), birth.getDate());
  const diffTime = Math.abs(ref.getTime() - birthdayThisYear.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  const nearestAge = diffDays > 182 ? age + 1 : age;

  return {
    completedAge: Math.max(0, age),
    nearestAge: Math.max(0, nearestAge),
  };
}

// Special Day / Festival / Occasion Greetings Engine
export interface NepalGreeting {
  title: string;
  occasion: string;
  message: string;
  badge: string;
  isSpecialDay: boolean;
}

export function getTodayGreeting(adDate?: Date): NepalGreeting {
  const bs = adToBs(adDate);
  const m = bs.month; // 1 to 12
  const d = bs.day;

  // Key Nepal Occasions by BS Month & Day
  if (m === 1 && d === 1) {
    return {
      title: 'नयाँ वर्षको हार्दिक मंगलमय शुभकामना!',
      occasion: 'नव वर्ष (Baisakh 1)',
      message: `विक्रम संवत् ${toNepaliNumber(bs.year)} को हार्दिक मंगलमय शुभकामना! नयाँ वर्षले तपाईंको बिमा व्यवसायमा नयाँ उचाइ, समृद्धि र सफलता ल्याओस्।`,
      badge: 'नव वर्ष विशेष',
      isSpecialDay: true,
    };
  }

  if (m === 6 && d === 3) {
    return {
      title: 'राष्ट्रिय संविधान दिवसको शुभकामना!',
      occasion: 'संविधान दिवस (Asoj 3)',
      message: 'नेपालको राष्ट्रिय संविधान दिवसको हार्दिक शुभकामना! सबल, सुरक्षित र समृद्ध नेपाल निर्माणमा बिमा सुरक्षाको महत्वपूर्ण भूमिका छ।',
      badge: 'राष्ट्रिय दिवस',
      isSpecialDay: true,
    };
  }

  if (m === 6 && d >= 24 && d <= 30) {
    return {
      title: 'बडा दशैंको हार्दिक मंगलमय शुभकामना!',
      occasion: 'बडा दशैं / विजयादशमी',
      message: 'माता दुर्गा भवानीले तपाईं र तपाईंको सम्पूर्ण परिवारमा सुख, शान्ति, सुस्वास्थ्य र बिमा व्यवसायमा प्रगतिको आशिर्वाद प्रदान गरून्।',
      badge: 'बडा दशैं विशेष',
      isSpecialDay: true,
    };
  }

  if (m === 7 && d >= 1 && d <= 5) {
    return {
      title: 'विजयादशमी तथा कोजाग्रत पूर्णिमाको शुभकामना!',
      occasion: 'दशैं उत्सव',
      message: 'विजयादशमीको शुभकामना! तपाईंको बिमा लक्ष्य तथा टिम विस्तारले नयाँ सफलता प्राप्त गरोस्।',
      badge: 'दशैं पावन पर्व',
      isSpecialDay: true,
    };
  }

  if (m === 7 && d >= 12 && d <= 18) {
    return {
      title: 'शुभ दीपावली तथा तिहारको हार्दिक शुभकामना!',
      occasion: 'दीपावली, लक्ष्मीपूजा तथा भाइटीका',
      message: 'दीपावलीको पावन अवसरमा धनधान्यकी देवी महालक्ष्मीले तपाईंको घर-आँगनमा ऐश्वर्य र जीवनमा सुरक्षाको उज्यालो छरून्।',
      badge: 'दीपावली विशेष',
      isSpecialDay: true,
    };
  }

  if (m === 7 && d >= 19 && d <= 23) {
    return {
      title: 'पवित्र छठ पर्वको हार्दिक शुभकामना!',
      occasion: 'छठ पर्व',
      message: 'सूर्यदेव र षष्ठी मैयाको कृपाले सम्पूर्ण परिवारमा सुख, समृद्धि, निरोगिता र कार्य सफलता छाओस्।',
      badge: 'छठ पावन पर्व',
      isSpecialDay: true,
    };
  }

  if (m === 10 && d === 1) {
    return {
      title: 'माघे संक्रान्तिको हार्दिक शुभकामना!',
      occasion: 'माघे संक्रान्ति / मकर संक्रान्ति',
      message: 'तीलको लड्डु, तरुल र चाकुको मिठाससँगै माघे संक्रान्ति तथा माघी पर्वको हार्दिक शुभकामना!',
      badge: 'माघे संक्रान्ति',
      isSpecialDay: true,
    };
  }

  if (m === 11 && d >= 14 && d <= 18) {
    return {
      title: 'महाशिवरात्रिको पावन शुभकामना!',
      occasion: 'महाशिवरात्रि',
      message: 'भगवान् पशुपतिनाथ तथा देवका देव महादेवले समस्त परिवारको कल्याण र दीर्घायु प्रदान गरून्। हर हर महादेव!',
      badge: 'महाशिवरात्रि विशेष',
      isSpecialDay: true,
    };
  }

  if (m === 11 && d >= 28) {
    return {
      title: 'फागु पूर्णिमा (होली) को रङ्गिन शुभकामना!',
      occasion: 'होली पर्व',
      message: 'रङहरूको पावन उत्सव होलीले तपाईंको जीवन र बिमा यात्रामा उमंग, हर्ष र नयाँ उत्साह भरिदेओस्।',
      badge: 'होली विशेष',
      isSpecialDay: true,
    };
  }

  // Daily professional & inspiring greeting for Learn With Sulav agents
  const hour = new Date().getHours();
  const timeGreeting = hour < 12 ? 'शुभ बिहानी' : hour < 17 ? 'शुभ दिउँसो' : 'शुभ साँझ';

  return {
    title: `${timeGreeting}! आजको दिन फलदायी रहोस्`,
    occasion: `नेपाली मिति: ${bs.formattedBsNe}`,
    message: 'आज नयाँ बिमा प्रस्ताव छलफल, पोलिसी नवीकरण र सेवाग्राहीसँगको भेटघाटमा उच्च सफलताको हार्दिक शुभकामना। लगनशीलता नै सफलताको मूल आधार हो!',
    badge: 'दैनिक बिमा ऊर्जा',
    isSpecialDay: false,
  };
}
