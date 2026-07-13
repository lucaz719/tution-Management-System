import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { StatusBadge } from '../components/ui/StatusBadge';
import { useToast } from '../components/ui/Toast';
import { UserProfileDrawer } from '../components/UserProfileDrawer';
import { BulkStudentImport } from '../components/BulkStudentImport';
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

interface Capabilities {
  isTenantAdmin: boolean;
  isBranchAdmin: boolean;
  canManagePeople: boolean;
  creatableRoles: string[];
  manageableBranches: Array<{ id: string; name: string }>;
}

interface CreatedCredentials {
  name: string;
  email: string;
  role: string;
  branch: string;
  temporaryPassword: string;
}

interface FormState {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: string;
  branchId: string;
  gradeId: string;
}

const EMPTY_FORM: FormState = { firstName: '', lastName: '', email: '', phone: '', role: '', branchId: '', gradeId: '' };

// Categorize a role for the stat strip.
const STAFF_ROLES = ['Teacher', 'Accountant', 'Receptionist', 'Janitor'];

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

function primaryRole(person: Person): string {
  const order = ['Branch Admin', 'Teacher', 'Accountant', 'Receptionist', 'Janitor', 'Student', 'Parent', 'Tenant Admin'];
  const names = person.roles.map((r) => r.role);
  return order.find((r) => names.includes(r)) ?? names[0] ?? '';
}

// Ordered role groups for the sectioned directory view.
interface RoleGroup {
  label: string;
  icon: string;
  roles: string[];
  link?: string;
}
const ROLE_GROUPS: RoleGroup[] = [
  { label: 'Administration', icon: 'shield_person', roles: ['Tenant Admin'] },
  { label: 'Branch Managers', icon: 'manage_accounts', roles: ['Branch Admin'] },
  { label: 'Teachers', icon: 'badge', roles: ['Teacher'], link: '/tenant/teachers' },
  { label: 'Support Staff', icon: 'engineering', roles: ['Accountant', 'Receptionist', 'Janitor'] },
  { label: 'Students', icon: 'school', roles: ['Student'], link: '/tenant/students' },
  { label: 'Parents', icon: 'family_restroom', roles: ['Parent'] },
];

function groupPeople(list: Person[]): Array<{ group: RoleGroup; members: Person[] }> {
  return ROLE_GROUPS.map((group) => ({
    group,
    members: list.filter((person) => group.roles.includes(primaryRole(person))),
  })).filter((section) => section.members.length > 0);
}

export function PeopleDirectory() {
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [caps, setCaps] = useState<Capabilities | null>(null);
  const [people, setPeople] = useState<Person[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [branchFilter, setBranchFilter] = useState('ALL');

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [isSaving, setIsSaving] = useState(false);
  const [credentials, setCredentials] = useState<CreatedCredentials | null>(null);
  const [copied, setCopied] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [bulkOpen, setBulkOpen] = useState(false);
  const [grades, setGrades] = useState<Array<{ id: string; name: string }>>([]);

  const PREVIEW_LIMIT = 5;

  const loadData = async () => {
    setIsLoading(true);
    setErrorMsg('');
    try {
      const [capabilities, list, gradeList] = await Promise.all([
        api.people.capabilities(),
        api.people.list(),
        api.grades.list().catch(() => []),
      ]);
      setCaps(capabilities);
      setPeople(list as Person[]);
      setGrades((gradeList as Array<{ id: string; name: string }>).map((g) => ({ id: g.id, name: g.name })));
    } catch (error: unknown) {
      setErrorMsg(error instanceof Error ? error.message : 'Failed to load the directory.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const stats = useMemo(() => {
    const roles = people.flatMap((p) => p.roles.map((r) => r.role));
    return {
      total: people.length,
      managers: roles.filter((r) => r === 'Branch Admin').length,
      teachers: roles.filter((r) => r === 'Teacher').length,
      students: roles.filter((r) => r === 'Student').length,
      staff: roles.filter((r) => STAFF_ROLES.includes(r)).length,
    };
  }, [people]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return people.filter((person) => {
      const matchesSearch =
        !term || person.name.toLowerCase().includes(term) || person.email.toLowerCase().includes(term);
      const matchesRole = roleFilter === 'ALL' || person.roles.some((r) => r.role === roleFilter);
      const matchesBranch =
        branchFilter === 'ALL' || person.roles.some((r) => r.branchId === branchFilter);
      return matchesSearch && matchesRole && matchesBranch;
    });
  }, [people, search, roleFilter, branchFilter]);

  const roleOptions = useMemo(() => {
    const set = new Set(people.flatMap((p) => p.roles.map((r) => r.role)));
    return Array.from(set);
  }, [people]);

  const grouped = useMemo(() => groupPeople(filtered), [filtered]);

  const openDrawer = () => {
    const branches = caps?.manageableBranches ?? [];
    setForm({
      ...EMPTY_FORM,
      role: caps?.creatableRoles[0] ?? '',
      branchId: branches.length === 1 ? branches[0].id : '',
    });
    setDrawerOpen(true);
  };

  const setField = (field: keyof FormState, value: string) => setForm((c) => ({ ...c, [field]: value }));

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form.firstName.trim() || !form.lastName.trim() || !form.email.trim()) {
      showToast('First name, last name, and email are required.', 'error');
      return;
    }
    if (!form.role) {
      showToast('Select a role.', 'error');
      return;
    }
    if (!form.branchId) {
      showToast('Select a branch.', 'error');
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        branchId: form.branchId,
      };
      const result =
        form.role === 'Branch Admin'
          ? await api.people.createBranchAdmin(payload)
          : await api.people.create({ ...payload, role: form.role, gradeId: form.role === 'Student' && form.gradeId ? form.gradeId : undefined });

      const branchName = caps?.manageableBranches.find((b) => b.id === form.branchId)?.name ?? '';
      setCredentials({
        name: `${payload.firstName} ${payload.lastName}`,
        email: result.user.email,
        role: form.role,
        branch: branchName,
        temporaryPassword: result.temporaryPassword,
      });
      setCopied(false);
      setDrawerOpen(false);
      showToast(`${form.role} created successfully.`, 'success');
      await loadData();
    } catch (error: unknown) {
      showToast(error instanceof Error ? error.message : 'Failed to create the user.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCopy = async () => {
    if (!credentials) return;
    try {
      await navigator.clipboard.writeText(
        `TMS login for ${credentials.name} (${credentials.role})\nEmail: ${credentials.email}\nTemporary password: ${credentials.temporaryPassword}`
      );
      setCopied(true);
    } catch {
      showToast('Could not copy. Please copy manually.', 'error');
    }
  };

  const singleBranch = (caps?.manageableBranches.length ?? 0) <= 1;

  return (
    <div className="people-page">
      <div className="people-header">
        <div>
          <h1 className="people-title">Staff &amp; Students</h1>
          <p className="people-subtitle">
            {caps?.isTenantAdmin
              ? 'Provision branch managers and staff across every center.'
              : 'Add and manage teachers and students in your branch.'}
          </p>
        </div>
        {caps?.canManagePeople ? (
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <Button variant="outline" onClick={() => setBulkOpen(true)} style={{ height: '42px' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>upload_file</span>
              Bulk Import
            </Button>
            <Button onClick={openDrawer} style={{ height: '42px' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>person_add</span>
              Add Person
            </Button>
          </div>
        ) : null}
      </div>

      {errorMsg ? <StatusBadge variant="error">{errorMsg}</StatusBadge> : null}

      <div className="people-stats">
        <div className="people-stat" style={{ ['--stat-accent' as string]: 'var(--color-primary)' }}>
          <span className="people-stat-value">{stats.total}</span>
          <span className="people-stat-label">Total People</span>
        </div>
        {caps?.isTenantAdmin ? (
          <div className="people-stat" style={{ ['--stat-accent' as string]: 'var(--color-accent)' }}>
            <span className="people-stat-value">{stats.managers}</span>
            <span className="people-stat-label">Branch Managers</span>
          </div>
        ) : null}
        <div className="people-stat" style={{ ['--stat-accent' as string]: 'var(--color-info)' }}>
          <span className="people-stat-value">{stats.teachers}</span>
          <span className="people-stat-label">Teachers</span>
        </div>
        <div className="people-stat" style={{ ['--stat-accent' as string]: 'var(--color-success)' }}>
          <span className="people-stat-value">{stats.students}</span>
          <span className="people-stat-label">Students</span>
        </div>
        <div className="people-stat" style={{ ['--stat-accent' as string]: 'var(--color-warning)' }}>
          <span className="people-stat-value">{stats.staff}</span>
          <span className="people-stat-label">Support Staff</span>
        </div>
      </div>

      <div className="people-toolbar">
        <div className="people-search">
          <span className="material-symbols-outlined">search</span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or email…"
          />
        </div>
        <select className="people-filter" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
          <option value="ALL">All roles</option>
          {roleOptions.map((role) => (
            <option key={role} value={role}>{role}</option>
          ))}
        </select>
        {caps && !singleBranch ? (
          <select className="people-filter" value={branchFilter} onChange={(e) => setBranchFilter(e.target.value)}>
            <option value="ALL">All branches</option>
            {caps.manageableBranches.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        ) : null}
        <Button variant="outline" onClick={() => void loadData()} disabled={isLoading} style={{ height: '42px' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>refresh</span>
          Refresh
        </Button>
      </div>

      {filtered.length === 0 ? (
        <div className="pd-empty">
          <span className="material-symbols-outlined">group_off</span>
          <p>{isLoading ? 'Loading directory…' : people.length === 0 ? 'No people yet. Add your first staff member or student.' : 'No matches for your filters.'}</p>
        </div>
      ) : (
        <div className="pd-dashboard">
          {grouped.map(({ group, members }) => {
            const preview = members.slice(0, PREVIEW_LIMIT);
            const overflow = members.length - PREVIEW_LIMIT;
            const isClickable = !!group.link;
            return (
              <div
                key={group.label}
                className={`pd-card ${isClickable ? 'pd-card--clickable' : ''}`}
                onClick={() => { if (isClickable) navigate(group.link!); }}
                role={isClickable ? "button" : undefined}
                tabIndex={isClickable ? 0 : undefined}
                onKeyDown={(e) => { if (isClickable && e.key === 'Enter') navigate(group.link!); }}
              >
                <div className="pd-card-head">
                  <span className="material-symbols-outlined">{group.icon}</span>
                  <span className="pd-card-title">{group.label}</span>
                  <span className="pd-card-count">{members.length}</span>
                </div>
                <div className="pd-card-body">
                  {preview.map((person) => (
                    <div key={person.id} className="pd-person pd-person--preview" onClick={(e) => { e.stopPropagation(); setSelectedUserId(person.id); }}>
                      <div className="people-avatar pd-av">{initials(person.name)}</div>
                      <div className="pd-info">
                        <span className="pd-name">{person.name}</span>
                        <span className="pd-meta">{person.email}</span>
                      </div>
                      <StatusBadge variant={person.status === 'ACTIVE' ? 'success' : 'warning'}>{person.status}</StatusBadge>
                    </div>
                  ))}
                </div>
                {isClickable && (
                  <div className="pd-card-footer">
                    <span>{overflow > 0 ? `View all ${members.length} ${group.label.toLowerCase()}` : `Open ${group.label.toLowerCase()}`}</span>
                    <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>arrow_forward</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {selectedUserId ? <UserProfileDrawer userId={selectedUserId} onClose={() => setSelectedUserId('')} /> : null}

      {bulkOpen ? (
        <BulkStudentImport
          branches={caps?.manageableBranches ?? []}
          grades={grades.map((g) => g.name)}
          onClose={() => setBulkOpen(false)}
          onImported={() => void loadData()}
        />
      ) : null}

      {drawerOpen ? (
        <>
          <div className="people-drawer-overlay" onClick={() => setDrawerOpen(false)} />
          <aside className="people-drawer" role="dialog" aria-modal="true">
            <div className="people-drawer-head">
              <div>
                <h2>Add Person</h2>
                <p>They receive a one-time temporary password to sign in and set their own.</p>
              </div>
              <button type="button" className="people-drawer-close" onClick={() => setDrawerOpen(false)} aria-label="Close">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'contents' }}>
              <div className="people-drawer-body">
                <div className="people-field">
                  <label>Role</label>
                  <div className="people-role-picker">
                    {(caps?.creatableRoles ?? []).map((role) => (
                      <button
                        key={role}
                        type="button"
                        className={`people-role-chip${form.role === role ? ' people-role-chip--active' : ''}`}
                        onClick={() => setField('role', role)}
                      >
                        {role}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="people-field-row">
                  <div className="people-field">
                    <label>First name</label>
                    <input value={form.firstName} onChange={(e) => setField('firstName', e.target.value)} placeholder="Bishnu" required />
                  </div>
                  <div className="people-field">
                    <label>Last name</label>
                    <input value={form.lastName} onChange={(e) => setField('lastName', e.target.value)} placeholder="Thapa" required />
                  </div>
                </div>

                <div className="people-field">
                  <label>Email</label>
                  <input type="email" value={form.email} onChange={(e) => setField('email', e.target.value)} placeholder="name@sanskardip.edu.np" required />
                </div>

                <div className="people-field">
                  <label>Phone <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>(optional)</span></label>
                  <input value={form.phone} onChange={(e) => setField('phone', e.target.value)} placeholder="98XXXXXXXX" inputMode="tel" />
                </div>

                <div className="people-field">
                  <label>Branch</label>
                  {singleBranch && caps?.manageableBranches[0] ? (
                    <input value={caps.manageableBranches[0].name} disabled />
                  ) : (
                    <select value={form.branchId} onChange={(e) => setField('branchId', e.target.value)} required>
                      <option value="">Select a branch…</option>
                      {(caps?.manageableBranches ?? []).map((b) => (
                        <option key={b.id} value={b.id}>{b.name}</option>
                      ))}
                    </select>
                  )}
                </div>

                {form.role === 'Student' ? (
                  <div className="people-field">
                    <label>Grade <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>(class level)</span></label>
                    {grades.length === 0 ? (
                      <input value="No grades set up — add them under Academics › Grades" disabled />
                    ) : (
                      <select value={form.gradeId} onChange={(e) => setField('gradeId', e.target.value)}>
                        <option value="">Not assigned</option>
                        {grades.map((g) => (
                          <option key={g.id} value={g.id}>{g.name}</option>
                        ))}
                      </select>
                    )}
                  </div>
                ) : null}
              </div>

              <div className="people-drawer-foot">
                <Button type="submit" disabled={isSaving} style={{ flex: 1 }}>
                  {isSaving ? 'Creating…' : 'Create Person'}
                </Button>
                <Button type="button" variant="outline" onClick={() => setDrawerOpen(false)}>Cancel</Button>
              </div>
            </form>
          </aside>
        </>
      ) : null}

      {credentials ? (
        <div className="people-cred-overlay">
          <div className="people-cred-card" role="dialog" aria-modal="true">
            <div className="people-cred-icon">
              <span className="material-symbols-outlined">check</span>
            </div>
            <h2>{credentials.role} created</h2>
            <p className="people-cred-sub">{credentials.name} · {credentials.branch}</p>

            <div className="people-cred-box">
              <div className="people-cred-row">
                <span className="people-cred-key">Login email</span>
                <span className="people-cred-val">{credentials.email}</span>
              </div>
              <div className="people-cred-row">
                <span className="people-cred-key">Temporary password (shown once)</span>
                <span className="people-cred-val people-cred-val--mono">{credentials.temporaryPassword}</span>
              </div>
            </div>

            <p className="people-cred-note">
              Share these credentials securely. The password is stored only as a hash and cannot be shown again.
            </p>

            <div style={{ display: 'flex', gap: '12px', marginTop: '18px' }}>
              <Button onClick={() => void handleCopy()} style={{ flex: 1 }}>
                {copied ? 'Copied ✓' : 'Copy Credentials'}
              </Button>
              <Button variant="outline" onClick={() => setCredentials(null)} style={{ flex: 1 }}>Done</Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
