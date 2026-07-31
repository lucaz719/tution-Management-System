import { API_BASE_URL, request } from '../../services/api/client';
import type { NepalPayPayload, ParentPortalDataset } from './parentPortalTypes';

export function loadParentPortal(studentId?: string): Promise<ParentPortalDataset> {
  const query = studentId ? `?studentId=${encodeURIComponent(studentId)}` : '';
  return request<ParentPortalDataset>(`/parent/portal${query}`);
}

export function sendParentMessage(input: { studentId: string; receiverId: string; messageText: string }) {
  return request('/communication/messages', { method: 'POST', body: JSON.stringify(input) });
}

export function requestAppointment(input: {
  studentId: string;
  teacherId: string;
  scheduledTime: string;
  remarks: string;
  isGroup: boolean;
  participantIds?: string[];
}) {
  return request('/appointments/request', { method: 'POST', body: JSON.stringify(input) });
}

export function requestStudentLeave(input: {
  studentId: string;
  branchId: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  reason: string;
}) {
  return request('/leaves/request', { method: 'POST', body: JSON.stringify(input) });
}

export function loadParentNepalPayQr(invoiceId: string): Promise<NepalPayPayload> {
  return request<NepalPayPayload>(`/finances/nepalpay-qr/${encodeURIComponent(invoiceId)}`);
}

export function parentFileUrl(path: string) {
  return path.startsWith('/') ? `${API_BASE_URL}${path}` : path;
}
