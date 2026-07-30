import { API_BASE_URL, request } from '../../services/api/client';
import type { NepalPayPayload, StudentPortalDataset } from './studentPortalData';

export function loadStudentPortal(): Promise<StudentPortalDataset> {
  return request<StudentPortalDataset>('/users/me/student-portal');
}

export function loadNepalPayPayload(invoiceId: string): Promise<NepalPayPayload> {
  return request<NepalPayPayload>(`/finances/nepalpay-qr/${encodeURIComponent(invoiceId)}`);
}

export function studentFileUrl(path: string): string {
  return path.startsWith('/') ? `${API_BASE_URL}${path}` : path;
}
