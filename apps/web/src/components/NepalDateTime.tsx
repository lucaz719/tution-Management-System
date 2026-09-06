import { useNepalClock } from '../hooks/useNepalClock';
import { englishDateLabel, nepalDateKey, nepaliDateHeading, nepalTimeLabel } from '../utils/nepalCalendar';
import './nepalDateTime.css';

export interface NepalDateTimeProps {
  compact?: boolean;
  showSeconds?: boolean;
  className?: string;
}

/** Shared dashboard/calendar clock. Display time follows the device clock in Nepal's timezone. */
export function NepalDateTime({ compact = false, showSeconds = true, className = '' }: NepalDateTimeProps) {
  const now = useNepalClock();
  const key = nepalDateKey(now);
  const time = nepalTimeLabel(now);
  return <div className={`nepal-date-time ${className}`} data-compact={compact || undefined}>
    <time dateTime={key} lang="ne" className="nepal-date-time__nepali">{nepaliDateHeading(key)}</time>
    <div className="nepal-date-time__meta">
      <time dateTime={key} className="nepal-date-time__english">{englishDateLabel(key)}</time>
      <span className="nepal-date-time__clock">
        <time dateTime={now.toISOString()} aria-live="off">{showSeconds ? time : time.replace(/:\d{2}(?=\s)/, '')}</time>
        <span className="nepal-date-time__zone" title="Asia/Kathmandu · UTC+05:45">Nepal time</span>
      </span>
    </div>
  </div>;
}
