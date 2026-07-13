import { NepaliDate, MONTH_EN } from 'nepali-date-library';

function atUtcMidnight(input: string | Date): Date {
  const d = typeof input === 'string' ? new Date(input) : input;
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

// "Asar 29, 2083" — a full BS date for display to Nepali users.
export function toBsLabel(adInput: string | Date | null | undefined): string {
  if (!adInput) return '—';
  try {
    const nd = new NepaliDate(atUtcMidnight(adInput));
    return `${MONTH_EN[nd.month]} ${nd.day}, ${nd.year}`;
  } catch {
    return '—';
  }
}

// "Asar 2083" — the BS month/year, used for billing-cycle labels.
export function toBsMonthLabel(adInput: string | Date | null | undefined): string {
  if (!adInput) return '—';
  try {
    const nd = new NepaliDate(atUtcMidnight(adInput));
    return `${MONTH_EN[nd.month]} ${nd.year}`;
  } catch {
    return '—';
  }
}
