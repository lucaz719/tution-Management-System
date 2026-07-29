import { request } from './client';

export interface MaintenanceTask {
  id: string; branchId: string; description: string; assignedStaffId: string; status: string;
  escalationDaysSnapshot: number; createdAt: string; completionTimestamp?: string | null;
}
export const resourcesApi = {
  tasks: (branchId: string) => request<{ tasks: MaintenanceTask[] }>(`/resources/tasks?branchId=${encodeURIComponent(branchId)}`),
};
