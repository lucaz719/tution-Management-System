// Bikram Sambat (Nepali) billing helpers.
//
// nepali-date-library ships a broken CommonJS build (empty exports), but a
// correct ESM build. Because this service compiles to CommonJS, a normal
// import/require would hit the broken build — so we load the ESM module via a
// Function-wrapped dynamic import (which TypeScript does NOT downlevel to
// require) and cache it.

interface NepaliLib {
  NepaliDate: new (yearOrDate?: Date | number | string, month?: number, day?: number) => {
    year: number;
    month: number; // 0-indexed BS month
    day: number;
    getEnglishDate: () => Date;
  };
  ADtoBS: (adDate: string) => string;
  BStoAD: (bsDate: string) => string;
  MONTH_EN: string[];
  MONTH_NP: string[];
  NEPALI_DATE_MAP: Array<{ year: number; days: number[] }>;
}

const dynamicImport = new Function('m', 'return import(m)') as
  (m: string) => Promise<NepaliLib | { default: NepaliLib }>;
let cached: NepaliLib | null = null;

async function lib(): Promise<NepaliLib> {
  if (!cached) {
    const imported = await dynamicImport('nepali-date-library');
    cached = 'NepaliDate' in imported ? imported : imported.default;
  }
  return cached;
}

function atUtcMidnight(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

export interface BillingPeriod {
  bsYear: number;
  bsMonthIndex: number; // 0-indexed
  bsMonthName: string; // e.g. "Asar"
  bsMonthNameNp: string; // Devanagari
  label: string; // e.g. "Asar 2083"
  daysInMonth: number;
  cycleStart: Date; // AD, inclusive
  cycleEnd: Date; // AD, inclusive
  dueDate: Date; // AD
}

// The BS month that contains `ref`, with its AD boundaries and a due date
// `graceDays` after the cycle start.
export async function getBillingPeriod(ref: Date = new Date(), graceDays = 10): Promise<BillingPeriod> {
  const { NepaliDate, MONTH_EN, MONTH_NP, NEPALI_DATE_MAP } = await lib();

  const nd = new NepaliDate(atUtcMidnight(ref));
  const bsYear = nd.year;
  const bsMonthIndex = nd.month;

  const yearRow = NEPALI_DATE_MAP.find((r) => r.year === bsYear);
  const daysInMonth = yearRow ? yearRow.days[bsMonthIndex] : 30;

  const cycleStart = atUtcMidnight(new NepaliDate(bsYear, bsMonthIndex, 1).getEnglishDate());
  const cycleEnd = atUtcMidnight(new NepaliDate(bsYear, bsMonthIndex, daysInMonth).getEnglishDate());
  const dueDate = new Date(cycleStart);
  dueDate.setUTCDate(dueDate.getUTCDate() + graceDays);

  return {
    bsYear,
    bsMonthIndex,
    bsMonthName: MONTH_EN[bsMonthIndex],
    bsMonthNameNp: MONTH_NP[bsMonthIndex],
    label: `${MONTH_EN[bsMonthIndex]} ${bsYear}`,
    daysInMonth,
    cycleStart,
    cycleEnd,
    dueDate,
  };
}

// Format an AD date as a BS label, e.g. "Asar 29, 2083".
export async function formatBsDate(adDate: Date): Promise<string> {
  const { NepaliDate, MONTH_EN } = await lib();
  const nd = new NepaliDate(atUtcMidnight(adDate));
  return `${MONTH_EN[nd.month]} ${nd.day}, ${nd.year}`;
}
