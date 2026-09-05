/** Small local icons keep shared date components usable without a font download. */
export function CalendarIcon({ name }: { name: 'clock' | 'previous' | 'next' | 'expand' }) {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
    {name === 'clock' ? <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></> : <path d={name === 'previous' ? 'm14 6-6 6 6 6' : name === 'next' ? 'm10 6 6 6-6 6' : 'm6 9 6 6 6-6'} />}
  </svg>;
}
