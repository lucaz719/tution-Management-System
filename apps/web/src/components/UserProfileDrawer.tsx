import { useEffect, useState } from 'react';
import { StatusBadge } from './ui/StatusBadge';
import { api } from '../services/api';
import { toBsLabel } from '../utils/nepaliDate';

interface UserProfileDrawerProps {
  userId: string;
  onClose: () => void;
}

interface Profile {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: string;
  createdAt: string;
  roles: Array<{ role: string; branchName: string | null }>;
  detail: {
    student?: {
      admissionDate: string;
      emergencyContact: string;
      enrollments: Array<{ courseName: string; className: string; status: string }>;
      fees: { totalBilled: number; totalPaid: number; totalDue: number; overdueCount: number; invoices: Array<{ id: string; netPayable: number; status: string; dueDate: string }> };
      attendance: Record<string, number>;
    };
    parent?: {
      children: Array<{ studentId: string; name: string; activeEnrollments: number; totalPaid: number; totalDue: number; overdueCount: number }>;
    };
    teacher?: {
      assignedClasses: Array<{ className: string; courseName: string; branchName: string; enrollmentCount: number }>;
      totalSessions: number;
      pendingUpdates: number;
    };
    staff?: { designation: string; contractType: string; joiningDate: string };
  };
}

function initials(name: string): string {
  return name.split(' ').filter(Boolean).map((p) => p[0]?.toUpperCase()).join('').slice(0, 2) || '??';
}

function money(n: number): string {
  return `NPR ${n.toLocaleString()}`;
}

const sectionTitle: React.CSSProperties = { fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '10px' };
const rowCard: React.CSSProperties = { padding: '12px 14px', borderRadius: '12px', border: '1px solid var(--border)', background: 'var(--color-bg)' };

function FeeStat({ label, value, tone }: { label: string; value: string; tone?: 'due' | 'paid' }) {
  const color = tone === 'due' ? 'var(--color-error)' : tone === 'paid' ? 'var(--color-success)' : 'var(--text)';
  return (
    <div style={{ flex: 1, minWidth: '96px', ...rowCard }}>
      <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
      <div style={{ fontSize: '16px', fontWeight: 700, color, marginTop: '5px' }}>{value}</div>
    </div>
  );
}

export function UserProfileDrawer({ userId, onClose }: UserProfileDrawerProps) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    setErrorMsg('');
    api.people
      .getProfile(userId)
      .then((data) => { if (active) setProfile(data as Profile); })
      .catch((error: unknown) => { if (active) setErrorMsg(error instanceof Error ? error.message : 'Failed to load profile.'); })
      .finally(() => { if (active) setIsLoading(false); });
    return () => { active = false; };
  }, [userId]);

  return (
    <>
      <div className="people-drawer-overlay" onClick={onClose} />
      <aside className="people-drawer" role="dialog" aria-modal="true" style={{ width: '460px' }}>
        <div className="people-drawer-head">
          <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
            <div className="people-avatar" style={{ width: '46px', height: '46px', fontSize: '15px' }}>
              {profile ? initials(profile.name) : '…'}
            </div>
            <div>
              <h2 style={{ fontSize: '18px' }}>{profile?.name ?? 'Loading…'}</h2>
              <p style={{ marginTop: '2px' }}>{profile?.email}</p>
            </div>
          </div>
          <button type="button" className="people-drawer-close" onClick={onClose} aria-label="Close">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="people-drawer-body">
          {errorMsg ? <StatusBadge variant="error">{errorMsg}</StatusBadge> : null}
          {isLoading ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '14px', textAlign: 'center', padding: '30px 0' }}>Loading profile…</p>
          ) : profile ? (
            <>
              {/* Identity */}
              <div>
                <div style={sectionTitle}>Overview</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '10px' }}>
                  {profile.roles.map((r, i) => (
                    <span key={i} className="people-role-tag">{r.role}{r.branchName ? ` · ${r.branchName}` : ''}</span>
                  ))}
                  <StatusBadge variant={profile.status === 'ACTIVE' ? 'success' : 'warning'}>{profile.status}</StatusBadge>
                </div>
                <div style={{ ...rowCard, display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--text-muted)' }}>Phone</span><span>{profile.phone || '—'}</span></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--text-muted)' }}>Member since</span><span>{new Date(profile.createdAt).toLocaleDateString()}</span></div>
                  {profile.detail.staff ? (
                    <>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--text-muted)' }}>Designation</span><span>{profile.detail.staff.designation}</span></div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--text-muted)' }}>Contract</span><span>{profile.detail.staff.contractType}</span></div>
                    </>
                  ) : null}
                </div>
              </div>

              {/* Parent → children + dues */}
              {profile.detail.parent ? (
                <div>
                  <div style={sectionTitle}>Children ({profile.detail.parent.children.length})</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {profile.detail.parent.children.length === 0 ? (
                      <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>No linked children.</p>
                    ) : (
                      profile.detail.parent.children.map((child) => (
                        <div key={child.studentId} style={rowCard}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '14px', fontWeight: 700 }}>{child.name}</span>
                            <StatusBadge variant={child.totalDue > 0 ? 'warning' : 'success'}>{child.totalDue > 0 ? 'Dues pending' : 'Cleared'}</StatusBadge>
                          </div>
                          <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                            <FeeStat label="Paid" value={money(child.totalPaid)} tone="paid" />
                            <FeeStat label="Due" value={money(child.totalDue)} tone="due" />
                            <FeeStat label="Classes" value={String(child.activeEnrollments)} />
                          </div>
                          {child.overdueCount > 0 ? (
                            <p style={{ fontSize: '12px', color: 'var(--color-error)', marginTop: '8px', fontWeight: 600 }}>{child.overdueCount} overdue invoice{child.overdueCount === 1 ? '' : 's'}</p>
                          ) : null}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              ) : null}

              {/* Student → fees + enrollments + attendance */}
              {profile.detail.student ? (
                <>
                  <div>
                    <div style={sectionTitle}>Fees</div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <FeeStat label="Billed" value={money(profile.detail.student.fees.totalBilled)} />
                      <FeeStat label="Paid" value={money(profile.detail.student.fees.totalPaid)} tone="paid" />
                      <FeeStat label="Due" value={money(profile.detail.student.fees.totalDue)} tone="due" />
                    </div>
                    {profile.detail.student.fees.invoices.length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '10px' }}>
                        {profile.detail.student.fees.invoices.map((inv) => (
                          <div key={inv.id} style={{ ...rowCard, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                              <div style={{ fontSize: '13.5px', fontWeight: 700 }}>{money(inv.netPayable)}</div>
                              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Due {toBsLabel(inv.dueDate)} BS</div>
                            </div>
                            <StatusBadge variant={inv.status === 'PAID' ? 'success' : inv.status === 'OVERDUE' ? 'error' : 'warning'}>{inv.status}</StatusBadge>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                  <div>
                    <div style={sectionTitle}>Enrollments ({profile.detail.student.enrollments.length})</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {profile.detail.student.enrollments.length === 0 ? (
                        <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Not enrolled in any class yet.</p>
                      ) : (
                        profile.detail.student.enrollments.map((e, i) => (
                          <div key={i} style={{ ...rowCard, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                              <div style={{ fontSize: '13.5px', fontWeight: 700 }}>{e.courseName}</div>
                              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{e.className}</div>
                            </div>
                            <StatusBadge variant={e.status === 'ACTIVE' ? 'success' : e.status === 'BLOCKED' ? 'error' : 'info'}>{e.status}</StatusBadge>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </>
              ) : null}

              {/* Teacher → assigned classes + session stats */}
              {profile.detail.teacher ? (
                <div>
                  <div style={sectionTitle}>Teaching</div>
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
                    <FeeStat label="Classes" value={String(profile.detail.teacher.assignedClasses.length)} />
                    <FeeStat label="Sessions" value={String(profile.detail.teacher.totalSessions)} />
                    <FeeStat label="Pending logs" value={String(profile.detail.teacher.pendingUpdates)} tone={profile.detail.teacher.pendingUpdates > 0 ? 'due' : 'paid'} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {profile.detail.teacher.assignedClasses.length === 0 ? (
                      <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>No classes assigned yet.</p>
                    ) : (
                      profile.detail.teacher.assignedClasses.map((c, i) => (
                        <div key={i} style={{ ...rowCard, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <div style={{ fontSize: '13.5px', fontWeight: 700 }}>{c.className}</div>
                            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{c.courseName} · {c.branchName}</div>
                          </div>
                          <StatusBadge variant="info">{c.enrollmentCount} enrolled</StatusBadge>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              ) : null}
            </>
          ) : null}
        </div>
      </aside>
    </>
  );
}
