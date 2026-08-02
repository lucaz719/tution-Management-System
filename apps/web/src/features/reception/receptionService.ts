import { request } from '../../services/api/client';

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
}

export function loadReceptionToday() {
  return request<ReceptionToday>('/reception/today');
}

export function checkInStudent(studentId: string) {
  return request<{ message: string; checkedInAt: string }>(`/reception/students/${studentId}/check-in`, {
    method: 'POST',
  });
}
