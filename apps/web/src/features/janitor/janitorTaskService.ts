import { request } from '../../services/api/client';

export type JanitorTaskStatus = 'PENDING' | 'IN_PROGRESS' | 'ESCALATED' | 'COMPLETED';

export interface JanitorTask {
  id: string;
  classroomId: string;
  location: string;
  description: string;
  status: JanitorTaskStatus;
  createdAt: string;
  dueAt: string;
  overdue: boolean;
  escalatedAt: string | null;
  completionTimestamp: string | null;
  completedBy: { id: string; name: string } | null;
}

export const janitorTaskService = {
  async listMine(): Promise<JanitorTask[]> {
    const response = await request<{ tasks: JanitorTask[] }>('/resources/my-tasks');
    return response.tasks;
  },
  async markDone(taskId: string): Promise<void> {
    await request(`/resources/tasks/complete/${encodeURIComponent(taskId)}`, { method: 'POST' });
  },
};
