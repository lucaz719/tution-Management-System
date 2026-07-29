import type {
  ParentAppointment,
  ParentAttendance,
  ParentCertificate,
  ParentChild,
  ParentEvent,
  ParentInvoice,
  ParentLeave,
  ParentMessage,
  ParentNotification,
  ParentRemark,
  ParentSession,
  ParentTeacher,
} from './parentPortalTypes';

export const parentChildren: ParentChild[] = [
  { id: 'child-aarav', name: 'Aarav Shrestha', initials: 'AS', grade: 'Grade 8', branch: 'Baneshwor Branch', rollNumber: '12', blocked: true, attendanceRate: 83, outstanding: 4500 },
  { id: 'child-mira', name: 'Mira Shrestha', initials: 'MS', grade: 'Grade 5', branch: 'Baneshwor Branch', rollNumber: '07', blocked: false, attendanceRate: 94, outstanding: 0 },
];

export const parentSessions: ParentSession[] = [
  { id: 'as-1', childId: 'child-aarav', time: '07:00', endTime: '08:00', subject: 'Mathematics', teacher: 'Ms. Riya Gurung', room: 'Room 2A', type: 'Regular' },
  { id: 'as-2', childId: 'child-aarav', time: '09:15', endTime: '10:15', subject: 'Guitar Fundamentals', teacher: 'Mr. Aayush Rai', room: 'Music Studio', type: 'Music' },
  { id: 'as-3', childId: 'child-aarav', time: '13:00', endTime: '14:00', subject: 'English Writing Lab', teacher: 'Mr. Suman Bista', room: 'Room 2B', type: 'Short-term' },
  { id: 'ms-1', childId: 'child-mira', time: '08:00', endTime: '09:00', subject: 'English', teacher: 'Mr. Suman Bista', room: 'Room 1C', type: 'Regular' },
  { id: 'ms-2', childId: 'child-mira', time: '10:30', endTime: '11:30', subject: 'Science', teacher: 'Ms. Nima Sherpa', room: 'Lab 1', type: 'Regular' },
];

export const parentAttendance: ParentAttendance[] = [
  { id: 'aa-1', childId: 'child-aarav', date: '29 Jul 2026', subject: 'Mathematics', session: '07:00–08:00', state: 'Present' },
  { id: 'aa-2', childId: 'child-aarav', date: '28 Jul 2026', subject: 'Science', session: '09:15–10:15', state: 'Absent (Excused)' },
  { id: 'aa-3', childId: 'child-aarav', date: '27 Jul 2026', subject: 'English', session: '13:00–14:00', state: 'Absent' },
  { id: 'ma-1', childId: 'child-mira', date: '29 Jul 2026', subject: 'English', session: '08:00–09:00', state: 'Present' },
  { id: 'ma-2', childId: 'child-mira', date: '28 Jul 2026', subject: 'Science', session: '10:30–11:30', state: 'Present' },
];

export const parentRemarks: ParentRemark[] = [
  { id: 'remark-1', childId: 'child-aarav', subject: 'Mathematics', author: 'Ms. Riya Gurung', message: 'Aarav is showing stronger accuracy in multi-step algebra problems.', date: 'Today · 10:42 AM', signal: 'Improving', parentVisible: true },
  { id: 'remark-2', childId: 'child-aarav', subject: 'Science', author: 'Ms. Nima Sherpa', message: 'Please encourage a short revision routine before the biology assessment.', date: '27 Jul 2026', signal: 'Needs support', parentVisible: true },
  { id: 'remark-internal', childId: 'child-aarav', subject: 'Administration', author: 'Branch office', message: 'Internal note hidden from parent views.', date: '26 Jul 2026', signal: 'Stable', parentVisible: false },
  { id: 'remark-3', childId: 'child-mira', subject: 'English', author: 'Mr. Suman Bista', message: 'Mira participates confidently and reads with good expression.', date: '28 Jul 2026', signal: 'Improving', parentVisible: true },
];

export const parentTeachers: ParentTeacher[] = [
  { id: 'teacher-riya', childId: 'child-aarav', name: 'Riya Gurung', subject: 'Mathematics', initials: 'RG' },
  { id: 'teacher-aayush', childId: 'child-aarav', name: 'Aayush Rai', subject: 'Guitar Fundamentals', initials: 'AR' },
  { id: 'teacher-suman-aarav', childId: 'child-aarav', name: 'Suman Bista', subject: 'English Writing Lab', initials: 'SB' },
  { id: 'teacher-suman-mira', childId: 'child-mira', name: 'Suman Bista', subject: 'English', initials: 'SB' },
  { id: 'teacher-nima', childId: 'child-mira', name: 'Nima Sherpa', subject: 'Science', initials: 'NS' },
];

export const parentMessages: ParentMessage[] = [
  { id: 'msg-1', childId: 'child-aarav', teacherId: 'teacher-riya', sender: 'Teacher', text: 'Aarav has made good progress this week.', time: 'Yesterday · 4:20 PM' },
  { id: 'msg-2', childId: 'child-aarav', teacherId: 'teacher-riya', sender: 'Parent', text: 'Thank you. We will continue the revision routine at home.', time: 'Yesterday · 5:05 PM' },
  { id: 'msg-3', childId: 'child-mira', teacherId: 'teacher-suman-mira', sender: 'Teacher', text: 'Mira can bring her reading journal on Friday.', time: 'Monday · 2:10 PM' },
];

export const parentAppointments: ParentAppointment[] = [
  { id: 'apt-1', childId: 'child-aarav', teacher: 'Riya Gurung', subject: 'Mathematics', requestedTime: '1 Aug 2026 · 3:30 PM', state: 'Approved', group: false },
  { id: 'apt-2', childId: 'child-aarav', teacher: 'Nima Sherpa', subject: 'Science', requestedTime: '4 Aug 2026 · 4:00 PM', alternativeTime: '4 Aug 2026 · 4:30 PM', state: 'Alternative proposed', group: false },
  { id: 'apt-3', childId: 'child-mira', teacher: 'Suman Bista + Branch Admin', subject: 'Progress meeting', requestedTime: '8 Aug 2026 · 11:00 AM', state: 'Requested', group: true },
];

export const parentLeaves: ParentLeave[] = [
  { id: 'leave-1', childId: 'child-aarav', dates: '28 Jul 2026', reason: 'Medical appointment', state: 'Approved', detail: 'Attendance was automatically marked Absent (Excused).' },
  { id: 'leave-2', childId: 'child-aarav', dates: '5–6 Aug 2026', reason: 'Family ceremony', state: 'Pending', detail: 'Branch Admin and assigned teachers were notified.' },
  { id: 'leave-3', childId: 'child-mira', dates: '22 Jul 2026 · 1:15 PM', reason: 'Emergency departure logged by branch', state: 'Emergency departure', detail: 'Immediate Push + SMS sent to the linked guardian.' },
];

export const parentInvoices: ParentInvoice[] = [
  { id: 'invoice-aarav-aug', childId: 'child-aarav', cycle: 'August 2026', dueDate: '1 Aug 2026', state: 'Overdue', reference: 'TMS-AUG-2026-0812', lines: [{ label: 'Tuition dues', amount: 3800 }, { label: 'Music course', amount: 900 }, { label: 'Merit discount', amount: -300 }, { label: 'Late fine', amount: 100 }] },
  { id: 'invoice-aarav-sep', childId: 'child-aarav', cycle: 'September 2026', dueDate: '1 Sep 2026', state: 'Upcoming', reference: 'TMS-SEP-2026-0812', lines: [{ label: 'Tuition dues', amount: 3800 }, { label: 'Music course', amount: 900 }, { label: 'Merit discount', amount: -300 }] },
  { id: 'invoice-aarav-jul', childId: 'child-aarav', cycle: 'July 2026', dueDate: '1 Jul 2026', state: 'Paid', reference: 'TMS-JUL-2026-0812', lines: [{ label: 'Tuition dues', amount: 3800 }] },
  { id: 'invoice-mira-aug', childId: 'child-mira', cycle: 'August 2026', dueDate: '5 Aug 2026', state: 'Due soon', reference: 'TMS-AUG-2026-0507', lines: [{ label: 'Tuition dues', amount: 3200 }, { label: 'Sibling discount', amount: -200 }] },
  { id: 'invoice-mira-jul', childId: 'child-mira', cycle: 'July 2026', dueDate: '5 Jul 2026', state: 'Paid', reference: 'TMS-JUL-2026-0507', lines: [{ label: 'Tuition dues', amount: 3200 }, { label: 'Sibling discount', amount: -200 }] },
];

export const parentCertificates: ParentCertificate[] = [
  { id: 'CERT-2026-0192', childId: 'child-aarav', title: 'Course Completion Certificate', course: 'Foundation Guitar', issuedDate: '24 Jul 2026', fileName: 'foundation-guitar-certificate.pdf' },
  { id: 'CERT-2026-0148', childId: 'child-mira', title: 'Reading Achievement', course: 'Grade 5 English', issuedDate: '18 Jul 2026', fileName: 'reading-achievement-mira.pdf' },
];

export const parentEvents: ParentEvent[] = [
  { id: 'event-a1', childId: 'child-aarav', day: '03', month: 'AUG', date: '3 Aug 2026', title: 'First Term Examination', kind: 'Exam', details: 'Grade 8 examinations begin at 8:00 AM.' },
  { id: 'event-a2', childId: 'child-aarav', day: '06', month: 'AUG', date: '6 Aug 2026', title: 'Fee payment deadline', kind: 'Fee due', details: 'Final date to clear the current billing cycle.' },
  { id: 'event-a3', childId: 'child-aarav', day: '10', month: 'AUG', date: '10 Aug 2026', title: 'Gaijatra holiday', kind: 'Holiday', details: 'All branches remain closed.' },
  { id: 'event-m1', childId: 'child-mira', day: '07', month: 'AUG', date: '7 Aug 2026', title: 'Reading assessment', kind: 'Exam', details: 'Grade 5 reading assessment in Room 1C.' },
  { id: 'event-m2', childId: 'child-mira', day: '16', month: 'AUG', date: '16 Aug 2026', title: 'Student achievement ceremony', kind: 'Ceremony', details: 'Main auditorium at 11:00 AM.' },
];

export const parentNotifications: ParentNotification[] = [
  { id: 'notice-1', childId: 'child-aarav', title: 'Fee overdue', message: 'NPR 4,500 was due on 1 Aug 2026.', time: '1 hour ago', icon: 'payments', destination: 'fees', channels: ['Push', 'SMS'], urgent: true, unread: true },
  { id: 'notice-2', childId: 'child-aarav', title: 'Appointment alternative proposed', message: 'Ms. Nima proposed 4 Aug at 4:30 PM.', time: '4 hours ago', icon: 'event', destination: 'appointments', channels: ['Push', 'SMS'], urgent: false, unread: true },
  { id: 'notice-3', childId: 'child-mira', title: 'Emergency departure', message: 'Mira departed with branch approval at 1:15 PM.', time: '7 days ago', icon: 'emergency', destination: 'leave', channels: ['Push', 'SMS'], urgent: true, unread: false },
  { id: 'notice-4', childId: 'child-mira', title: 'Certificate issued', message: 'Mira’s Reading Achievement certificate is ready.', time: '11 days ago', icon: 'workspace_premium', destination: 'certificates', channels: ['Push'], urgent: false, unread: false },
  { id: 'notice-5', childId: 'child-aarav', title: 'Attendance summary', message: 'Aarav attended 5 of 6 sessions this week.', time: 'Friday · 6:00 PM', icon: 'fact_check', destination: 'attendance', channels: ['Push', 'SMS'], urgent: false, unread: false },
];

export function invoiceTotal(invoice: ParentInvoice) {
  return invoice.lines.reduce((sum, line) => sum + line.amount, 0);
}
