export type ParentView =
  | 'home'
  | 'timetable'
  | 'attendance'
  | 'performance'
  | 'messages'
  | 'appointments'
  | 'leave'
  | 'fees'
  | 'certificates'
  | 'calendar'
  | 'notifications';

export type ParentTone = 'success' | 'warning' | 'error' | 'info' | 'gold';
export type AttendanceState = 'Present' | 'Absent' | 'Absent (Excused)';
export type InvoiceState = 'Paid' | 'Upcoming' | 'Due soon' | 'Overdue';
export type AppointmentState = 'Requested' | 'Approved' | 'Rejected' | 'Alternative proposed' | 'Confirmed';
export type LeaveState = 'Pending' | 'Approved' | 'Rejected' | 'Emergency departure';

export interface ParentChild {
  id: string;
  name: string;
  initials: string;
  grade: string;
  branch: string;
  rollNumber: string;
  blocked: boolean;
  attendanceRate: number;
  outstanding: number;
}

export interface ParentSession {
  id: string;
  childId: string;
  time: string;
  endTime: string;
  subject: string;
  teacher: string;
  room: string;
  type: string;
}

export interface ParentAttendance {
  id: string;
  childId: string;
  date: string;
  subject: string;
  session: string;
  state: AttendanceState;
}

export interface ParentRemark {
  id: string;
  childId: string;
  subject: string;
  author: string;
  message: string;
  date: string;
  signal: 'Improving' | 'Stable' | 'Needs support';
  parentVisible: boolean;
}

export interface ParentTeacher {
  id: string;
  childId: string;
  name: string;
  subject: string;
  initials: string;
}

export interface ParentMessage {
  id: string;
  childId: string;
  teacherId: string;
  sender: 'Parent' | 'Teacher';
  text: string;
  time: string;
}

export interface ParentAppointment {
  id: string;
  childId: string;
  teacher: string;
  subject: string;
  requestedTime: string;
  alternativeTime?: string;
  state: AppointmentState;
  group: boolean;
}

export interface ParentLeave {
  id: string;
  childId: string;
  dates: string;
  reason: string;
  state: LeaveState;
  detail: string;
}

export interface ParentInvoice {
  id: string;
  childId: string;
  cycle: string;
  dueDate: string;
  state: InvoiceState;
  reference: string;
  lines: Array<{ label: string; amount: number }>;
}

export interface ParentCertificate {
  id: string;
  childId: string;
  title: string;
  course: string;
  issuedDate: string;
  fileName: string;
}

export interface ParentEvent {
  id: string;
  childId: string;
  day: string;
  month: string;
  date: string;
  title: string;
  kind: 'Holiday' | 'Exam' | 'Ceremony' | 'Fee due';
  details: string;
}

export interface ParentNotification {
  id: string;
  childId: string;
  title: string;
  message: string;
  time: string;
  icon: string;
  destination: ParentView;
  channels: Array<'Push' | 'SMS'>;
  urgent: boolean;
  unread: boolean;
}
