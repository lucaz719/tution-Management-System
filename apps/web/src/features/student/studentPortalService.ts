import { API_BASE_URL, request } from '../../services/api/client';
import { withStudentDemoData, type NepalPayPayload, type StudentPortalDataset } from './studentPortalData';

export async function loadStudentPortal(): Promise<StudentPortalDataset> {
  return withStudentDemoData(await request<StudentPortalDataset>('/users/me/student-portal'));
}

export function loadNepalPayPayload(invoiceId: string): Promise<NepalPayPayload> {
  return request<NepalPayPayload>(`/finances/nepalpay-qr/${encodeURIComponent(invoiceId)}`);
}

export function studentFileUrl(path: string): string {
  return path.startsWith('/') ? `${API_BASE_URL}${path}` : path;
}
