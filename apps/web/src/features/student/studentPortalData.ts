export type CourseType = 'Regular' | 'Music' | 'Short-term' | 'Long-term' | 'Personalized';
export type AttendanceState = 'Present' | 'Absent' | 'Absent (Excused)';
export type FeeState = 'Upcoming' | 'Due soon' | 'Overdue' | 'Paid';
export type EventKind = 'Holiday' | 'Exam' | 'Ceremony' | 'Fee due';

export interface StudentSession {
  id: string;
  time: string;
  endTime: string;
  subject: string;
  teacher: string;
  room: string;
  type: CourseType;
}

export interface HomeworkItem {
  id: string;
  subject: string;
  title: string;
  teacher: string;
  dueLabel: string;
  urgency: 'soon' | 'normal' | 'overdue';
  completed: boolean;
  description?: string;
  contentUrl?: string;
  submissionUrl?: string;
  teacherRemarks?: string;
}

export interface TestResult {
  id: string;
  subject: string;
  assessment: string;
  score: number;
  maximum: number;
  classAverage: number;
  publishedLabel: string;
  teacherRemarks?: string;
  passMarks?: number;
  percentile?: number;
  resultSheetUrl?: string;
}

export interface StudentSyllabus {
  id: string;
  className: string;
  subject: string;
  teacherName?: string;
  chapters: Array<{ id: string; title: string; position: number; status: 'IN_PROGRESS' | 'COMPLETED' | 'LEFT' }>;
  dailyLogs: Array<{ id: string; chapterId: string; status: string; notes?: string; logDate: string }>;
}

export interface SubjectInsight {
  subject: string;
  average: number;
  previousAverage: number;
  history: number[];
}

export interface AttendanceRecord {
  id: string;
  date: string;
  subject: string;
  session: string;
  state: AttendanceState;
}

export interface InvoiceLine {
  label: string;
  amount: number;
}

export interface Invoice {
  id: string;
  cycle: string;
  dueDate: string;
  state: FeeState;
  lines: InvoiceLine[];
  netPayable: number;
  qrAvailable: boolean;
  paymentReference?: string;
}

export interface NepalPayPayload {
  invoiceId: string;
  merchantName: string;
  merchantCity: string;
  amount: number;
  currency: string;
  currencyCode: string;
  studentName: string;
  qrString: string;
}

export interface AcademicEvent {
  id: string;
  date: string;
  day: string;
  month: string;
  title: string;
  kind: EventKind;
  details: string;
}

export interface Certificate {
  id: string;
  title: string;
  course: string;
  issuedDate: string;
  fileName: string;
  pdfUrl?: string;
}

export interface StudentNotification {
  id: string;
  title: string;
  message: string;
  time: string;
  icon: string;
  destination: string;
  unread: boolean;
  occurredAt: string;
}

export interface StudentProfile {
  name: string;
  initials: string;
  institution: string;
  grade: string;
  branch: string;
  branchAddress?: string;
  rollNumber: string;
  enrollmentId: string;
  academicYear: string;
  validUntil: string;
  blocked: boolean;
  outstanding: number;
  attendanceRate?: number | null;
  attendanceCounts?: {
    present: number;
    absent: number;
    excused: number;
  };
}

export interface StudentPortalDataset {
  generatedAt: string;
  studentProfile: StudentProfile;
  todaySessions: StudentSession[];
  homework: HomeworkItem[];
  results: TestResult[];
  insights: SubjectInsight[];
  syllabi: StudentSyllabus[];
  attendance: AttendanceRecord[];
  invoices: Invoice[];
  events: AcademicEvent[];
  certificates: Certificate[];
  notifications: StudentNotification[];
}

export function invoiceTotal(invoice: Invoice): number {
  return invoice.netPayable;
}

export function resultPercentage(result: TestResult): number {
  return result.maximum === 0 ? 0 : Math.round((result.score / result.maximum) * 100);
}

const demoDate = (offset: number) => {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() + offset);
  return date;
};
const dateLabel = (date: Date) => date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
const academicEvent = (id: string, offset: number, title: string, kind: EventKind, details: string): AcademicEvent => {
  const date = demoDate(offset);
  return { id, date: dateLabel(date), day: String(date.getDate()).padStart(2, '0'), month: date.toLocaleDateString('en', { month: 'short' }).toUpperCase(), title, kind, details };
};

export const demoStudentPortalData: StudentPortalDataset = {
  generatedAt: new Date().toISOString(),
  studentProfile: { name: 'Aarav Shrestha', initials: 'AS', institution: 'TMS Academy', grade: 'Grade 8 · Section A', branch: 'Main Branch', branchAddress: 'Kathmandu, Nepal', rollNumber: '08-014', enrollmentId: 'DEMO-ENR-014', academicYear: '2083/84', validUntil: dateLabel(demoDate(300)), blocked: false, outstanding: 3200, attendanceRate: 92, attendanceCounts: { present: 46, absent: 3, excused: 1 } },
  todaySessions: [
    { id: 'demo-session-math', time: '08:00', endTime: '09:00', subject: 'Mathematics', teacher: 'Shyam Adhikari', room: 'Room 2A', type: 'Regular' },
    { id: 'demo-session-science', time: '10:15', endTime: '11:15', subject: 'Science', teacher: 'Nisha Karki', room: 'Lab 1', type: 'Regular' },
    { id: 'demo-session-music', time: '13:00', endTime: '14:00', subject: 'Music', teacher: 'Rajan Gurung', room: 'Music Studio', type: 'Music' },
  ],
  homework: [
    { id: 'demo-homework-1', subject: 'Mathematics', title: 'Linear equations practice', teacher: 'Shyam Adhikari', dueLabel: 'Due tomorrow', urgency: 'soon', completed: false, description: 'Complete exercises 4.1–4.3.' },
    { id: 'demo-homework-2', subject: 'Science', title: 'Plant cell diagram', teacher: 'Nisha Karki', dueLabel: 'Due in 3 days', urgency: 'normal', completed: false, description: 'Draw and label a plant cell.' },
    { id: 'demo-homework-3', subject: 'English', title: 'Reading reflection', teacher: 'Sabina Rai', dueLabel: 'Submitted', urgency: 'normal', completed: true, teacherRemarks: 'Clear and thoughtful response.' },
  ],
  results: [
    { id: 'demo-result-1', subject: 'Mathematics', assessment: 'Unit Test 1', score: 22, maximum: 25, classAverage: 18, publishedLabel: 'Published this week', teacherRemarks: 'Strong algebra work.', passMarks: 10, percentile: 88, resultSheetUrl: 'data:text/plain;charset=utf-8,Mathematics%20Unit%20Test%201%20-%20Sample%20exam%20sheet' },
    { id: 'demo-result-2', subject: 'Science', assessment: 'Practical assessment', score: 18, maximum: 20, classAverage: 15, publishedLabel: 'Published 2 weeks ago', passMarks: 8, percentile: 84, resultSheetUrl: 'data:text/plain;charset=utf-8,Science%20Practical%20Assessment%20-%20Sample%20exam%20sheet' },
    { id: 'demo-result-3', subject: 'English', assessment: 'Monthly test', score: 41, maximum: 50, classAverage: 37, publishedLabel: 'Published last month', passMarks: 20, percentile: 76 },
  ],
  insights: [
    { subject: 'Mathematics', average: 88, previousAverage: 82, history: [72, 78, 82, 88] },
    { subject: 'Science', average: 84, previousAverage: 80, history: [75, 79, 80, 84] },
    { subject: 'English', average: 82, previousAverage: 85, history: [78, 83, 85, 82] },
  ],
  syllabi: [{ id: 'demo-syllabus-1', className: 'Grade 8 · Section A', subject: 'Mathematics', teacherName: 'Shyam Adhikari', chapters: [
    { id: 'demo-chapter-1', title: 'Numbers and operations', position: 1, status: 'COMPLETED' },
    { id: 'demo-chapter-2', title: 'Algebraic expressions', position: 2, status: 'IN_PROGRESS' },
    { id: 'demo-chapter-3', title: 'Linear equations', position: 3, status: 'LEFT' },
  ], dailyLogs: [{ id: 'demo-log-1', chapterId: 'demo-chapter-2', status: 'IN_PROGRESS', notes: 'Worked through examples 1–6.', logDate: dateLabel(demoDate(-1)) }] }],
  attendance: [
    { id: 'demo-att-1', date: dateLabel(demoDate(-1)), subject: 'Mathematics', session: '08:00–09:00', state: 'Present' },
    { id: 'demo-att-2', date: dateLabel(demoDate(-2)), subject: 'Science', session: '10:15–11:15', state: 'Present' },
    { id: 'demo-att-3', date: dateLabel(demoDate(-3)), subject: 'English', session: '09:00–10:00', state: 'Absent (Excused)' },
  ],
  invoices: [
    { id: 'DEMO-INV-003', cycle: 'Shrawan 2083', dueDate: dateLabel(demoDate(6)), state: 'Due soon', lines: [{ label: 'Monthly tuition', amount: 3500 }, { label: 'Scholarship discount', amount: -300 }], netPayable: 3200, qrAvailable: true },
    { id: 'DEMO-INV-002', cycle: 'Ashadh 2083', dueDate: dateLabel(demoDate(-24)), state: 'Paid', lines: [{ label: 'Monthly tuition', amount: 3500 }], netPayable: 3500, qrAvailable: false, paymentReference: 'NP-DEMO-2048' },
  ],
  events: [
    academicEvent('demo-event-1', 2, 'Mathematics unit test', 'Exam', 'Unit 1–3 examination in Room 2A.'),
    academicEvent('demo-event-2', 6, 'Shrawan fee deadline', 'Fee due', 'Monthly tuition payment is due by 5:00 PM.'),
    academicEvent('demo-event-3', 11, 'Janai Purnima holiday', 'Holiday', 'The academy will remain closed.'),
    academicEvent('demo-event-4', 17, 'Student achievement ceremony', 'Ceremony', 'Awards and student performances in the main hall.'),
    academicEvent('demo-event-5', 25, 'Science practical exam', 'Exam', 'Bring your lab notebook and student ID.'),
  ],
  certificates: [{ id: 'DEMO-CERT-001', title: 'Academic Excellence Certificate', course: 'Grade 7', issuedDate: dateLabel(demoDate(-60)), fileName: 'academic-excellence.pdf' }],
  notifications: [
    { id: 'demo-notice-1', title: 'New homework assigned', message: 'Linear equations practice is due tomorrow.', time: '10 minutes ago', icon: 'assignment', destination: '/student/homework', unread: true, occurredAt: new Date().toISOString() },
    { id: 'demo-notice-2', title: 'Upcoming unit test', message: 'Mathematics unit test is in 2 days.', time: '1 hour ago', icon: 'event', destination: '/student/calendar', unread: true, occurredAt: new Date().toISOString() },
    { id: 'demo-notice-3', title: 'Result published', message: 'Your Science practical result is available.', time: 'Yesterday', icon: 'analytics', destination: '/student/results', unread: false, occurredAt: demoDate(-1).toISOString() },
  ],
};

export function withStudentDemoData(live: StudentPortalDataset): StudentPortalDataset {
  const fill = <T>(items: T[] | undefined, fallback: T[]) => items?.length ? items : fallback;
  return {
    ...live,
    generatedAt: new Date().toISOString(),
    studentProfile: { ...demoStudentPortalData.studentProfile, ...live.studentProfile },
    todaySessions: fill(live.todaySessions, demoStudentPortalData.todaySessions),
    homework: fill(live.homework, demoStudentPortalData.homework),
    results: fill(live.results, demoStudentPortalData.results),
    insights: fill(live.insights, demoStudentPortalData.insights),
    syllabi: fill(live.syllabi, demoStudentPortalData.syllabi),
    attendance: fill(live.attendance, demoStudentPortalData.attendance),
    invoices: fill(live.invoices, demoStudentPortalData.invoices),
    events: fill(live.events, demoStudentPortalData.events),
    certificates: fill(live.certificates, demoStudentPortalData.certificates),
    notifications: fill(live.notifications, demoStudentPortalData.notifications),
  };
}
