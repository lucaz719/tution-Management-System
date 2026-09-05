import { NepalCalendar, type NepalCalendarProps } from '../../components/calendar/NepalCalendar';
import './tenantAcademicCalendar.css';

/** Institution adapter; the calendar is reusable across dashboards and portals. */
export function TenantAcademicCalendar(props: NepalCalendarProps) {
  return <NepalCalendar {...props} />;
}
