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
}

export interface TestResult {
  id: string;
  subject: string;
  assessment: string;
  score: number;
  maximum: number;
  classAverage: number;
  publishedLabel: string;
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
  qrReference?: string;
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
}

export interface StudentNotification {
  id: string;
  title: string;
  message: string;
  time: string;
  icon: string;
  destination: string;
  unread: boolean;
}

export const studentProfile = {
  name: 'Aarav Shrestha',
  initials: 'AS',
  grade: 'Grade 8',
  branch: 'Baneshwor Branch',
  rollNumber: '12',
  enrollmentId: 'TMS-2026-0812',
  academicYear: '2026/27',
  validUntil: '31 March 2027',
  blocked: true,
  outstanding: 4500,
};

export const todaySessions: StudentSession[] = [
  { id: 's-1', time: '07:00', endTime: '08:00', subject: 'Mathematics', teacher: 'Ms. Riya Gurung', room: 'Room 2A', type: 'Regular' },
  { id: 's-2', time: '09:15', endTime: '10:15', subject: 'Guitar Fundamentals', teacher: 'Mr. Aayush Rai', room: 'Music Studio', type: 'Music' },
  { id: 's-3', time: '13:00', endTime: '14:00', subject: 'English Writing Lab', teacher: 'Mr. Suman Bista', room: 'Room 2B', type: 'Short-term' },
  { id: 's-4', time: '15:30', endTime: '16:30', subject: 'Science Revision', teacher: 'Ms. Nima Sherpa', room: 'Lab 1', type: 'Personalized' },
];

export const homework: HomeworkItem[] = [
  { id: 'h-1', subject: 'Mathematics', title: 'Complete algebra worksheet 4', teacher: 'Ms. Riya Gurung', dueLabel: 'Tomorrow · 5:00 PM', urgency: 'soon', completed: false },
  { id: 'h-2', subject: 'English', title: 'Prepare a two-minute book reflection', teacher: 'Mr. Suman Bista', dueLabel: '1 Aug · 4:00 PM', urgency: 'normal', completed: false },
  { id: 'h-3', subject: 'Science', title: 'Label the digestive system diagram', teacher: 'Ms. Nima Sherpa', dueLabel: 'Yesterday · 6:00 PM', urgency: 'overdue', completed: false },
  { id: 'h-4', subject: 'Computer', title: 'Review spreadsheet formulas', teacher: 'Mr. Bikash Thapa', dueLabel: 'Completed 27 Jul', urgency: 'normal', completed: true },
];

export const results: TestResult[] = [
  { id: 'r-1', subject: 'Mathematics', assessment: 'Algebra Unit Test', score: 44, maximum: 50, classAverage: 36, publishedLabel: 'Published today · 10:42 AM' },
  { id: 'r-2', subject: 'English', assessment: 'Grammar Assessment', score: 39, maximum: 50, classAverage: 35, publishedLabel: 'Published 21 Jul 2026' },
  { id: 'r-3', subject: 'Science', assessment: 'Biology Quiz', score: 31, maximum: 50, classAverage: 34, publishedLabel: 'Published 17 Jul 2026' },
  { id: 'r-4', subject: 'Mathematics', assessment: 'Fractions Test', score: 39, maximum: 50, classAverage: 35, publishedLabel: 'Published 10 Jul 2026' },
];

export const insights: SubjectInsight[] = [
  { subject: 'Mathematics', average: 86, previousAverage: 78, history: [68, 74, 78, 82, 86] },
  { subject: 'English', average: 78, previousAverage: 76, history: [72, 75, 74, 76, 78] },
  { subject: 'Science', average: 62, previousAverage: 70, history: [76, 73, 70, 66, 62] },
  { subject: 'Computer', average: 82, previousAverage: 80, history: [75, 77, 79, 80, 82] },
];

export const attendance: AttendanceRecord[] = [
  { id: 'a-1', date: '29 Jul 2026', subject: 'Mathematics', session: '07:00–08:00', state: 'Present' },
  { id: 'a-2', date: '28 Jul 2026', subject: 'Science', session: '09:15–10:15', state: 'Absent (Excused)' },
  { id: 'a-3', date: '27 Jul 2026', subject: 'English', session: '13:00–14:00', state: 'Absent' },
  { id: 'a-4', date: '26 Jul 2026', subject: 'Computer', session: '10:30–11:30', state: 'Present' },
  { id: 'a-5', date: '25 Jul 2026', subject: 'Mathematics', session: '07:00–08:00', state: 'Present' },
  { id: 'a-6', date: '24 Jul 2026', subject: 'Guitar Fundamentals', session: '09:15–10:15', state: 'Present' },
];

export const invoices: Invoice[] = [
  {
    id: 'inv-aug',
    cycle: 'August 2026',
    dueDate: '1 Aug 2026',
    state: 'Overdue',
    qrReference: 'TMS-AUG-2026-0812',
    lines: [
      { label: 'Tuition dues', amount: 3800 },
      { label: 'Music course', amount: 900 },
      { label: 'Merit discount', amount: -300 },
      { label: 'Late fine', amount: 100 },
    ],
  },
  { id: 'inv-sep', cycle: 'September 2026', dueDate: '1 Sep 2026', state: 'Upcoming', lines: [{ label: 'Tuition dues', amount: 3800 }, { label: 'Music course', amount: 900 }, { label: 'Merit discount', amount: -300 }] },
  { id: 'inv-jul', cycle: 'July 2026', dueDate: '1 Jul 2026', state: 'Paid', lines: [{ label: 'Tuition dues', amount: 3800 }] },
];

export const events: AcademicEvent[] = [
  { id: 'e-1', date: '3 Aug 2026', day: '03', month: 'AUG', title: 'First Term Examination', kind: 'Exam', details: 'Examinations begin at 8:00 AM. Bring your digital student ID.' },
  { id: 'e-2', date: '6 Aug 2026', day: '06', month: 'AUG', title: 'Fee payment deadline', kind: 'Fee due', details: 'Final date to clear the current billing cycle.' },
  { id: 'e-3', date: '10 Aug 2026', day: '10', month: 'AUG', title: 'Gaijatra holiday', kind: 'Holiday', details: 'All branches remain closed.' },
  { id: 'e-4', date: '16 Aug 2026', day: '16', month: 'AUG', title: 'Student achievement ceremony', kind: 'Ceremony', details: 'Main auditorium, Baneshwor branch at 11:00 AM.' },
];

export const certificates: Certificate[] = [
  { id: 'CERT-2026-0192', title: 'Course Completion Certificate', course: 'Foundation Guitar', issuedDate: '24 Jul 2026', fileName: 'foundation-guitar-certificate.pdf' },
  { id: 'CERT-2026-0101', title: 'Academic Excellence', course: 'Grade 7 Mathematics', issuedDate: '12 Apr 2026', fileName: 'academic-excellence-2026.pdf' },
];

export const notifications: StudentNotification[] = [
  { id: 'n-1', title: 'Fee overdue', message: 'NPR 4,500 was due on 1 Aug 2026.', time: '1 hour ago', icon: 'payments', destination: '/student/fees', unread: true },
  { id: 'n-2', title: 'Homework assigned', message: 'Mathematics homework is due tomorrow at 5:00 PM.', time: '5 hours ago', icon: 'assignment', destination: '/student/homework', unread: true },
  { id: 'n-3', title: 'Certificate issued', message: 'Your Foundation Guitar certificate is ready to download.', time: '2 days ago', icon: 'workspace_premium', destination: '/student/certificates', unread: false },
  { id: 'n-4', title: 'Leave approved', message: 'Your parent-applied Science leave was approved.', time: '3 days ago', icon: 'event_available', destination: '/student/attendance', unread: false },
];

export function invoiceTotal(invoice: Invoice): number {
  return invoice.lines.reduce((total, line) => total + line.amount, 0);
}

export function resultPercentage(result: TestResult): number {
  return result.maximum === 0 ? 0 : Math.round((result.score / result.maximum) * 100);
}
