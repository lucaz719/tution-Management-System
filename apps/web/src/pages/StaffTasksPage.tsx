import { useState } from 'react';
import { PageShell } from '../components/patterns/PageShell';
import { Button } from '../components/ui/Button';
import { KPICard } from '../components/ui/KPICard';
import { StatusBadge } from '../components/ui/StatusBadge';
import { useToast } from '../components/ui/Toast';
import { useAuth } from '../context/AuthContext';

interface MaintenanceTask {
  id: string;
  room: string;
  task: string;
  priority: string;
  status: 'warning' | 'error' | 'success';
  completed: boolean;
}

export function StaffTasksPage() {
  const { user, logout } = useAuth();
  const { showToast } = useToast();

  const [tasks, setTasks] = useState<MaintenanceTask[]>([
    { id: '1', room: 'Lab 102 - Computer Lab', task: 'Whiteboard cleaning & projector check', priority: 'High', status: 'warning', completed: false },
    { id: '2', room: 'Hall B - Main Auditorium', task: 'Setup seating for 2 PM parent seminar', priority: 'Urgent', status: 'error', completed: false },
    { id: '3', room: 'Classroom 204', task: 'Marker replenishment & trash disposal', priority: 'Normal', status: 'success', completed: true },
  ]);

  const toggleTask = (id: string) => {
    setTasks(tasks.map((t) => {
      if (t.id === id) {
        const nextCompleted = !t.completed;
        showToast(nextCompleted ? `Task for ${t.room} marked COMPLETED.` : `Task for ${t.room} reopened.`, nextCompleted ? 'success' : 'info');
        return {
          ...t,
          completed: nextCompleted,
          status: nextCompleted ? 'success' : 'warning',
        };
      }
      return t;
    }));
  };

  const completedCount = tasks.filter((t) => t.completed).length;

  return (
    <PageShell
      title="Facility & Maintenance Task Panel"
      subtitle="Classroom preparation, resource refills, and facility maintenance dispatch."
      userRole={user?.role ?? 'JANITOR'}
      userName={user?.name ?? 'Maintenance Staff'}
      onLogout={logout}
    >
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', marginBottom: '24px' }}>
        <KPICard title="Assigned Tasks" value={`${completedCount} / ${tasks.length}`} delta={`${tasks.length - completedCount} pending completion`} />
        <KPICard title="Resource Log Alerts" value="2" delta="1 marker refill request" />
        <KPICard title="Maintenance Score" value="98%" delta="Cleanliness SLA target met" />
      </div>

      <div className="card" style={{ padding: '24px', background: 'var(--color-bg)', borderRadius: '16px', border: '1px solid var(--color-border)' }}>
        <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '16px' }}>Maintenance &amp; Prep Dispatch</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--color-border)', textAlign: 'left', fontSize: '13px', color: 'var(--text-muted-foreground)' }}>
              <th style={{ padding: '12px' }}>Location / Room</th>
              <th style={{ padding: '12px' }}>Task Description</th>
              <th style={{ padding: '12px' }}>Priority Level</th>
              <th style={{ padding: '12px' }}>Status</th>
              <th style={{ padding: '12px', textAlign: 'right' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {tasks.map((t) => (
              <tr key={t.id} style={{ borderBottom: '1px solid var(--color-border)', fontSize: '14px', opacity: t.completed ? 0.65 : 1 }}>
                <td style={{ padding: '12px', fontWeight: 600 }}>{t.room}</td>
                <td style={{ padding: '12px', textDecoration: t.completed ? 'line-through' : 'none' }}>{t.task}</td>
                <td style={{ padding: '12px' }}>
                  <span style={{ fontWeight: 700, color: t.priority === 'Urgent' ? 'var(--color-error)' : t.priority === 'High' ? 'var(--color-accent)' : 'var(--color-primary)' }}>
                    {t.priority}
                  </span>
                </td>
                <td style={{ padding: '12px' }}>
                  <StatusBadge status={t.status} />
                </td>
                <td style={{ padding: '12px', textAlign: 'right' }}>
                  <Button
                    variant={t.completed ? 'outline' : 'primary'}
                    onClick={() => toggleTask(t.id)}
                    style={{ minHeight: '32px', height: '32px', padding: '4px 12px', fontSize: '12px' }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '16px', marginRight: '4px' }}>
                      {t.completed ? 'undo' : 'check_circle'}
                    </span>
                    {t.completed ? 'Reopen' : 'Mark Done'}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </PageShell>
  );
}
