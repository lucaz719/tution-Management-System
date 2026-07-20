const MONTH_EN = [
  'Baisakh',
  'Jestha',
  'Ashadh',
  'Shrawan',
  'Bhadra',
  'Ashwin',
  'Kartik',
  'Mangsir',
  'Poush',
  'Magh',
  'Falgun',
  'Chaitra',
];

function atUtcMidnight(input: string | Date): Date {
  const d = typeof input === 'string' ? new Date(input) : input;
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

// Bikram Sambat (BS) is approx 56 years and 8.5 months ahead of AD.
function getBsDate(adDate: Date) {
  const year = adDate.getUTCFullYear() + 57;
  const month = (adDate.getUTCMonth() + 8) % 12;
  const day = adDate.getUTCDate();
  return { year, month, day };
}

// "Ashadh 29, 2083" — a full BS date for display to Nepali users.
export function toBsLabel(adInput: string | Date | null | undefined): string {
  if (!adInput) return '—';
  try {
    const d = atUtcMidnight(adInput);
    const bs = getBsDate(d);
    return `${MONTH_EN[bs.month]} ${bs.day}, ${bs.year}`;
  } catch {
    return '—';
  }
}

// "Ashadh 2083" — the BS month/year, used for billing-cycle labels.
export function toBsMonthLabel(adInput: string | Date | null | undefined): string {
  if (!adInput) return '—';
  try {
    const d = atUtcMidnight(adInput);
    const bs = getBsDate(d);
    return `${MONTH_EN[bs.month]} ${bs.year}`;
  } catch {
    return '—';
  }
}
