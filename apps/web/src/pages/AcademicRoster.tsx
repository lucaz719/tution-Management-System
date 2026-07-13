import { useEffect, useMemo, useState } from 'react';
import { Button } from '../components/ui/Button';
import { StatusBadge } from '../components/ui/StatusBadge';
import { UserProfileDrawer } from '../components/UserProfileDrawer';
import { api } from '../services/api';

interface PersonRole {
  role: string;
  branchId: string | null;
  branchName: string | null;
}

interface Person {
  id: string;
  name: string;
  email: string;
  status: string;
  roles: PersonRole[];
  createdAt: string;
}

interface AcademicRosterProps {
  role: 'Student' | 'Teacher';
  title: string;
  subtitle: string;
  emptyText: string;
}

function initials(name: string): string {
  return (
    name
      .split(' ')
      .filter(Boolean)
      .map((part) => part[0]?.toUpperCase())
      .join('')
      .slice(0, 2) || '??'
  );
}

export function AcademicRoster({ role, title, subtitle, emptyText }: AcademicRosterProps) {
  const [people, setPeople] = useState<Person[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [search, setSearch] = useState('');
  const [selectedUserId, setSelectedUserId] = useState('');

  const loadPeople = async () => {
    setIsLoading(true);
    setErrorMsg('');
    try {
      const list = (await api.people.list()) as Person[];
      setPeople(list.filter((p) => p.roles.some((r) => r.role === role)));
    } catch (error: unknown) {
      setErrorMsg(error instanceof Error ? error.message : 'Failed to load the roster.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadPeople();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return people;
    return people.filter((p) => p.name.toLowerCase().includes(term) || p.email.toLowerCase().includes(term));
  }, [people, search]);

  const branchesRepresented = useMemo(() => {
    const names = new Set<string>();
    people.forEach((p) => p.roles.forEach((r) => r.branchName && names.add(r.branchName)));
    return names.size;
  }, [people]);

  return (
    <div className="people-page">
      <div className="people-header">
        <div>
          <h1 className="people-title">{title}</h1>
          <p className="people-subtitle">{subtitle}</p>
        </div>
        <Button variant="outline" onClick={() => void loadPeople()} disabled={isLoading} style={{ height: '42px' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>refresh</span>
          Refresh
        </Button>
      </div>

      {errorMsg ? <StatusBadge variant="error">{errorMsg}</StatusBadge> : null}

      <div className="people-stats">
        <div className="people-stat" style={{ ['--stat-accent' as string]: 'var(--color-primary)' }}>
          <span className="people-stat-value">{people.length}</span>
          <span className="people-stat-label">Total {role === 'Student' ? 'Students' : 'Teachers'}</span>
        </div>
        <div className="people-stat" style={{ ['--stat-accent' as string]: 'var(--color-info)' }}>
          <span className="people-stat-value">{branchesRepresented}</span>
          <span className="people-stat-label">Branches</span>
        </div>
        <div className="people-stat" style={{ ['--stat-accent' as string]: 'var(--color-success)' }}>
          <span className="people-stat-value">{people.filter((p) => p.status === 'ACTIVE').length}</span>
          <span className="people-stat-label">Active</span>
        </div>
      </div>

      <div className="people-toolbar">
        <div className="people-search">
          <span className="material-symbols-outlined">search</span>
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name or email…" />
        </div>
      </div>

      <div className="people-table-wrap">
        <div className="people-table-scroll">
          <table className="people-table">
            <thead>
              <tr>
                <th>{role}</th>
                <th>Branch</th>
                <th>Status</th>
                <th>Added</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={4}>
                    <div className="people-empty">
                      <span className="material-symbols-outlined">{role === 'Student' ? 'school' : 'badge'}</span>
                      {isLoading ? 'Loading…' : people.length === 0 ? emptyText : 'No matches for your search.'}
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((person) => {
                  const branchNames = Array.from(
                    new Set(person.roles.map((r) => r.branchName).filter(Boolean) as string[])
                  );
                  return (
                    <tr key={person.id} onClick={() => setSelectedUserId(person.id)} style={{ cursor: 'pointer' }}>
                      <td>
                        <div className="people-person">
                          <div className="people-avatar">{initials(person.name)}</div>
                          <div>
                            <div className="people-person-name">{person.name}</div>
                            <div className="people-person-email">{person.email}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span style={{ fontSize: '13.5px', color: branchNames.length ? 'var(--text)' : 'var(--text-muted)' }}>
                          {branchNames.length ? branchNames.join(', ') : '—'}
                        </span>
                      </td>
                      <td>
                        <StatusBadge variant={person.status === 'ACTIVE' ? 'success' : 'warning'}>{person.status}</StatusBadge>
                      </td>
                      <td>
                        <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{new Date(person.createdAt).toLocaleDateString()}</span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedUserId ? <UserProfileDrawer userId={selectedUserId} onClose={() => setSelectedUserId('')} /> : null}
    </div>
  );
}

export function AcademicStudents() {
  return (
    <AcademicRoster
      role="Student"
      title="Students"
      subtitle="Every enrolled student across your branches."
      emptyText="No students yet. Add them from Staff & Students or a branch manager can enrol them."
    />
  );
}

export function AcademicTeachers() {
  return (
    <AcademicRoster
      role="Teacher"
      title="Teachers"
      subtitle="Teaching staff across your branches."
      emptyText="No teachers yet. Add them from Staff & Students."
    />
  );
}
