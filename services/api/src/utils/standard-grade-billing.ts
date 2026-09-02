export type StandardGradeBillingMode = 'GRADE' | 'SUBJECT';

export function standardGradeBillingMode(name: string): StandardGradeBillingMode | null {
  const normalized = name.trim().replace(/\s+/g, ' ');
  if (/^UKG$/i.test(normalized)) return 'GRADE';

  const match = normalized.match(/^(?:Class|Grade)\s*(\d{1,2})$/i);
  if (!match) return null;

  const level = Number(match[1]);
  if (level >= 1 && level <= 10) return 'GRADE';
  if (level === 11 || level === 12) return 'SUBJECT';
  return null;
}
