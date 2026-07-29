import { request } from './client';

export type EventType = 'HOLIDAY' | 'EXAM' | 'EVENT' | 'FEE_DUE';
export interface AcademicEvent {
  id: string; branchId: string | null; title: string; description?: string | null; eventType: EventType;
  startDate: string; endDate: string;
}
export const academicEventsApi = {
  list: () => request<{ events: AcademicEvent[] }>('/academic-events'),
  createTenantWide: (payload: Omit<AcademicEvent, 'id' | 'branchId'>) => request<{ event: AcademicEvent }>('/academic-events', { method: 'POST', body: JSON.stringify(payload) }),
};
