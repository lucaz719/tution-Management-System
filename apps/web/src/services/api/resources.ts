import { request } from './client';

export interface MaintenanceTask {
  id: string; branchId: string; classroomId: string; description: string; assignedStaffId: string; status: string;
  escalationDaysSnapshot: number; createdAt: string; escalatedAt?: string | null; completionTimestamp?: string | null;
}
export const resourcesApi = {
  tasks: (branchId: string) => request<{ tasks: MaintenanceTask[] }>(`/resources/tasks?branchId=${encodeURIComponent(branchId)}`),
  complete: (taskId: string) => request<{ message: string }>(`/resources/tasks/complete/${encodeURIComponent(taskId)}`, { method: 'POST' }),
};
