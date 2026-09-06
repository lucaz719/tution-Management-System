import { useId, useRef, useState } from 'react';
import { NepalCalendar } from './NepalCalendar';
import { CalendarIcon } from './CalendarIcon';
import { englishDateLabel, nepaliDateHeading } from '../../utils/nepalCalendar';
import './nepaliDatePicker.css';

/** Controlled Gregorian date key, presented and selected as a Nepali BS date. */
export function NepaliDatePicker({ label, value, onChange, disabled = false }: { label: string; value: string; onChange: (value: string) => void; disabled?: boolean }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const id = useId();
  function close() { dialog.current?.close(); setOpen(false); trigger.current?.focus(); }
  return <div className="nepali-date-picker">
    <span id={id} className="nepali-date-picker__label">{label}</span>
    <button ref={trigger} type="button" className="nepali-date-picker__trigger" disabled={disabled} aria-labelledby={id} aria-haspopup="dialog" onClick={() => { setOpen(true); dialog.current?.showModal(); }}>
      <span>{value ? <><strong lang="ne">{nepaliDateHeading(value)}</strong><small>{englishDateLabel(value)} AD</small></> : 'Choose Nepali date (BS)'}</span><CalendarIcon name="expand" />
    </button>
    <dialog ref={dialog} className="nepali-date-picker__dialog" aria-label={`${label} — Nepali date picker`} onCancel={close} onClick={(event) => { if (event.target === dialog.current) close(); }}>
      <div className="nepali-date-picker__content"><div className="nepali-date-picker__header"><strong>{label}</strong><button type="button" onClick={close}>Close</button></div>
        {open && <NepalCalendar events={[]} initialDate={value || undefined} showDetails={false} weeklyDaysOff={[]} onDateActivate={(key) => { onChange(key); close(); }} />}
      </div>
    </dialog>
  </div>;
}
