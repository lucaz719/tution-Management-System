import { createRoot } from 'react-dom/client';
import { useState } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { AcademicCalendarView } from '../../src/components/calendar/AcademicCalendarView';
import { NepaliDateTimeField } from '../../src/components/calendar/NepaliDateTimeField';
import { NepalCalendar } from '../../src/components/calendar/NepalCalendar';
import { NepalDateTime } from '../../src/components/NepalDateTime';
import { TenantControlCenter } from '../../src/pages/TenantControlCenter';
import { ToastProvider } from '../../src/components/ui/Toast';
import '../../src/index.css';

const events = [
  { id: '1', title: 'Staff planning meeting', description: 'Review the upcoming academic term.', eventType: 'EVENT' as const, startDate: '2026-09-05T03:15:00Z', endDate: '2026-09-05T04:15:00Z' },
  { id: '2', title: 'Institution holiday', eventType: 'HOLIDAY' as const, startDate: '2026-09-05', endDate: '2026-09-05' },
  { id: '3', title: 'Term examination preparation', eventType: 'EXAM' as const, startDate: '2026-09-05', endDate: '2026-09-06' },
];
function Fixture() {
  const [value, setValue] = useState('2026-09-05T09:00');
  const [creating, setCreating] = useState(false);
  return <main style={{ maxWidth: 1100, margin: '0 auto', padding: 16 }}><NepalDateTime /><div style={{ marginTop: 24 }}><NepalCalendar events={events} onCreateEvent={(date) => { setValue(`${date}T09:00`); setCreating(true); }} /></div>
    {creating && <div data-testid="event-form"><NepaliDateTimeField label="Starts" value={value} onChange={setValue} /><output>{value}</output></div>}
  </main>;
}
function ReaderFixture() {
  const [child, setChild] = useState('one');
  return <BrowserRouter><button type="button" onClick={() => setChild('two')}>Switch child</button><AcademicCalendarView studentId={child} /><AcademicCalendarView studentId={child} upcoming calendarPath={`/parent/calendar?child=${child}`} /></BrowserRouter>;
}
createRoot(document.getElementById('root')!).render(new URLSearchParams(location.search).has('accountant') ? <BrowserRouter><AcademicCalendarView viewerRole="Accountant" /><AcademicCalendarView viewerRole="Accountant" upcoming calendarPath="/staff/finance#calendar" /></BrowserRouter> : new URLSearchParams(location.search).has('control') ? <ToastProvider><TenantControlCenter /></ToastProvider> : new URLSearchParams(location.search).has('reader') ? <ReaderFixture /> : <Fixture />);
