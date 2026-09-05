import { createRoot } from 'react-dom/client';
import { NepalCalendar } from '../../src/components/calendar/NepalCalendar';
import { NepalDateTime } from '../../src/components/NepalDateTime';
import '../../src/index.css';

const events = [
  { id: '1', title: 'Staff planning meeting', description: 'Review the upcoming academic term.', eventType: 'EVENT' as const, startDate: '2026-09-05T03:15:00Z', endDate: '2026-09-05T04:15:00Z' },
  { id: '2', title: 'Institution holiday', eventType: 'HOLIDAY' as const, startDate: '2026-09-05', endDate: '2026-09-05' },
  { id: '3', title: 'Term examination preparation', eventType: 'EXAM' as const, startDate: '2026-09-05', endDate: '2026-09-06' },
];
createRoot(document.getElementById('root')!).render(<main style={{ maxWidth: 1100, margin: '0 auto', padding: 16 }}><NepalDateTime /><div style={{ marginTop: 24 }}><NepalCalendar events={events} /></div></main>);
