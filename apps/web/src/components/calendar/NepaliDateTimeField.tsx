import { NepaliDatePicker } from './NepaliDatePicker';

export function NepaliDateTimeField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  const [date = '', time = '09:00'] = value.split('T');
  return <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 110px', gap: 12, alignItems: 'end' }}>
    <NepaliDatePicker label={`${label} date (BS)`} value={date} onChange={(key) => onChange(`${key}T${time || '09:00'}`)} />
    <label style={{ display: 'grid', gap: 8, fontSize: 13, fontWeight: 700 }}>Nepal time<input aria-label={`${label} Nepal time`} type="time" value={time} required onChange={(event) => onChange(`${date}T${event.target.value}`)} style={{ minHeight: 48, minWidth: 0, padding: 8, border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--color-text)', background: 'var(--bg-card)' }} /></label>
  </div>;
}
