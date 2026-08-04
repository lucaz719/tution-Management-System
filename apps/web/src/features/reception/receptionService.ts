import { ApiError, request } from '../../services/api/client';

export interface ReceptionStudent {
  id: string;
  name: string;
  className: string;
  schedule: unknown;
  checkedInAt: string | null;
}

export interface ReceptionAppointment {
  id: string;
  parentName: string;
  destination: string;
  scheduledTime: string;
  status: 'REQUESTED' | 'APPROVED' | 'REJECTED' | 'ALTERNATIVE_PROPOSED' | 'CONFIRMED' | 'CANCELLED';
}

export interface ReceptionAnnouncement {
  id: string;
  title: string;
  description: string | null;
}

export interface ReceptionToday {
  branchName: string;
  roster: ReceptionStudent[];
  appointments: ReceptionAppointment[];
  announcements: ReceptionAnnouncement[];
  isDemo?: boolean;
}

const todayAt = (hour: number, minute = 0) => {
  const date = new Date();
  date.setHours(hour, minute, 0, 0);
  return date.toISOString();
};

const receptionDemoData: ReceptionToday = {
  branchName: 'TMS Main Center',
  isDemo: true,
  roster: [
    { id: 'demo-student-aarav', name: 'Aarav Gautam', className: 'Class 10 Mathematics · Room 204', schedule: null, checkedInAt: todayAt(7, 42) },
    { id: 'demo-student-saanvi', name: 'Saanvi Joshi', className: 'Class 9 English · Room 108', schedule: null, checkedInAt: null },
    { id: 'demo-student-pratik', name: 'Pratik Thapa', className: 'Science Foundation · Lab 2', schedule: null, checkedInAt: null },
    { id: 'demo-student-nisha', name: 'Nisha Koirala', className: 'Class 11 Accountancy · Room 302', schedule: null, checkedInAt: todayAt(8, 5) },
    { id: 'demo-student-rohan', name: 'Rohan Maharjan', className: 'Keyboard and Music Theory · Studio 1', schedule: null, checkedInAt: null },
  ],
  appointments: [
    { id: 'demo-appointment-1', parentName: 'Maya Gautam', destination: 'Anita Shrestha · Mathematics Department', scheduledTime: todayAt(9, 30), status: 'CONFIRMED' },
    { id: 'demo-appointment-2', parentName: 'Kiran Thapa', destination: 'Bikash Rai · Branch Administration', scheduledTime: todayAt(11), status: 'APPROVED' },
    { id: 'demo-appointment-3', parentName: 'Sushma Joshi', destination: 'Ramesh Adhikari · Science Department', scheduledTime: todayAt(14, 15), status: 'REQUESTED' },
  ],
  announcements: [
    { id: 'demo-announcement-1', title: 'First terminal examination', description: 'Examinations begin on 12 August. Direct timetable questions to the academic desk.' },
    { id: 'demo-announcement-2', title: 'Monthly tuition deadline', description: 'Payments are due by 20 August. Reception may direct payment questions to the accountant but must not view fee records.' },
    { id: 'demo-announcement-3', title: 'Saturday orientation', description: 'Parent orientation starts at 11:00 AM in the main seminar hall.' },
  ],
};

export async function loadReceptionToday() {
  try {
    const live = await request<ReceptionToday>('/reception/today');
    if (live.roster.length || live.appointments.length || live.announcements.length) return live;
    return receptionDemoData;
  } catch (error) {
    if (error instanceof ApiError && (error.status === 401 || error.status === 403)) throw error;
    return receptionDemoData;
  }
}

export function checkInStudent(studentId: string) {
  return request<{ message: string; checkedInAt: string }>(`/reception/students/${studentId}/check-in`, {
    method: 'POST',
  });
}
