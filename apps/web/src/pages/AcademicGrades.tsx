import { useEffect, useState, type FormEvent } from 'react';
import { Button } from '../components/ui/Button';
import { StatusBadge } from '../components/ui/StatusBadge';
import { useToast } from '../components/ui/Toast';
import { api } from '../services/api';

interface Grade {
  id: string;
  name: string;
  sortOrder: number;
  monthlyFee: number;
  studentCount: number;
  courseCount: number;
}

interface GradeDetail {
  id: string;
  name: string;
  studentCount: number;
  courseCount: number;
  teacherCount: number;
  students: Array<{ studentId: string; userId: string; name: string; email: string }>;
  courses: Array<{ id: string; name: string; branchName: string; classCount: number; enrollmentCount: number }>;
  teachers: Array<{ id: string; name: string }>;
}

export function AcademicGrades() {
  const { showToast } = useToast();
  const [grades, setGrades] = useState<Grade[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [busy, setBusy] = useState(false);

  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState('');
  const [editName, setEditName] = useState('');
  const [editFee, setEditFee] = useState('');
  const [detail, setDetail] = useState<GradeDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const openDetail = async (grade: Grade) => {
    setDetailLoading(true);
    setDetail({ id: grade.id, name: grade.name, studentCount: grade.studentCount, courseCount: grade.courseCount, teacherCount: 0, students: [], courses: [], teachers: [] });
    try {
      setDetail((await api.grades.getDetail(grade.id)) as GradeDetail);
    } catch (error: unknown) {
      showToast(error instanceof Error ? error.message : 'Failed to load grade detail.', 'error');
      setDetail(null);
    } finally {
      setDetailLoading(false);
    }
  };

  const loadGrades = async () => {
    setIsLoading(true);
    setErrorMsg('');
    try {
      setGrades((await api.grades.list()) as Grade[]);
    } catch (error: unknown) {
      setErrorMsg(error instanceof Error ? error.message : 'Failed to load grades.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadGrades();
  }, []);

  const seedDefaults = async () => {
    setBusy(true);
    try {
      const r = await api.grades.seedDefaults();
      showToast(r.message, r.created > 0 ? 'success' : 'info');
      await loadGrades();
    } catch (error: unknown) {
      showToast(error instanceof Error ? error.message : 'Failed to add default grades.', 'error');
    } finally {
      setBusy(false);
    }
  };

  const addGrade = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!newName.trim()) return;
    setBusy(true);
    try {
      await api.grades.create(newName.trim(), grades.length + 90);
      setNewName('');
      showToast('Grade added.', 'success');
      await loadGrades();
    } catch (error: unknown) {
      showToast(error instanceof Error ? error.message : 'Failed to add grade.', 'error');
    } finally {
      setBusy(false);
    }
  };

  const saveEdit = async (id: string) => {
    if (!editName.trim()) return;
    setBusy(true);
    try {
      await api.grades.update(id, { name: editName.trim(), monthlyFee: Number(editFee) || 0 });
      setEditingId('');
      showToast('Grade updated.', 'success');
      await loadGrades();
    } catch (error: unknown) {
      showToast(error instanceof Error ? error.message : 'Failed to rename grade.', 'error');
    } finally {
      setBusy(false);
    }
  };

  const removeGrade = async (grade: Grade) => {
    if (!window.confirm(`Delete "${grade.name}"?`)) return;
    setBusy(true);
    try {
      await api.grades.remove(grade.id);
      showToast('Grade deleted.', 'success');
      await loadGrades();
    } catch (error: unknown) {
      showToast(error instanceof Error ? error.message : 'Failed to delete grade.', 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="people-page">
      <div className="people-header">
        <div>
          <h1 className="people-title">Grades</h1>
          <p className="people-subtitle">Grade levels students are assigned to (Nursery … Class 12).</p>
        </div>
        {grades.length === 0 ? (
          <Button onClick={() => void seedDefaults()} disabled={busy} style={{ height: '42px' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>auto_awesome</span>
            Add Standard Grades
          </Button>
        ) : null}
      </div>

      {errorMsg ? <StatusBadge variant="error">{errorMsg}</StatusBadge> : null}

      <form onSubmit={addGrade} style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '12px 14px', marginBottom: '22px' }}>
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Add a grade (e.g. Class 11)"
          style={{ flex: 1, minWidth: '200px', padding: '10px 16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'var(--bg-background)', color: 'var(--text-foreground)', fontFamily: 'inherit', fontSize: '14px', outline: 'none' }}
        />
        <Button type="submit" disabled={busy || !newName.trim()} style={{ height: '42px' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>add</span>
          Add Grade
        </Button>
        {grades.length > 0 ? (
          <Button type="button" variant="outline" onClick={() => void seedDefaults()} disabled={busy} style={{ height: '42px' }}>
            Fill Standard Set
          </Button>
        ) : null}
      </form>

      <div className="people-table-wrap">
        <div className="people-table-scroll">
          <table className="people-table">
            <thead>
              <tr>
                <th style={{ width: '28%' }}>Grade</th>
                <th style={{ width: '20%' }}>Monthly Tuition</th>
                <th style={{ textAlign: 'center', width: '13%' }}>Students</th>
                <th style={{ textAlign: 'center', width: '13%' }}>Courses</th>
                <th style={{ textAlign: 'right', width: '26%' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {grades.length === 0 ? (
                <tr>
                  <td colSpan={5}>
                    <div className="people-empty">
                      <span className="material-symbols-outlined">stairs</span>
                      {isLoading ? 'Loading grades…' : 'No grades yet. Click "Add Standard Grades" for Nursery through Class 12.'}
                    </div>
                  </td>
                </tr>
              ) : (
                grades.map((grade) => (
                  <tr key={grade.id}>
                    <td>
                      {editingId === grade.id ? (
                        <input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          autoFocus
                          style={{ padding: '8px 12px', borderRadius: 'var(--radius-md)', border: '1.5px solid var(--brand)', background: 'var(--bg-background)', color: 'var(--text-foreground)', fontFamily: 'inherit', fontSize: '14px', outline: 'none' }}
                        />
                      ) : (
                        <button type="button" onClick={() => void openDetail(grade)} style={{ fontSize: '14.5px', fontWeight: 700, color: 'var(--color-primary)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'inherit' }}>
                          {grade.name}
                        </button>
                      )}
                    </td>
                    <td>
                      {editingId === grade.id ? (
                        <input value={editFee} onChange={(e) => setEditFee(e.target.value)} inputMode="numeric" placeholder="0"
                          style={{ width: '110px', padding: '8px 12px', borderRadius: 'var(--radius-md)', border: '1.5px solid var(--brand)', background: 'var(--bg-background)', color: 'var(--text-foreground)', fontFamily: 'inherit', fontSize: '14px', outline: 'none' }} />
                      ) : (
                        <span style={{ fontSize: '14px', fontWeight: 700 }}>NPR {grade.monthlyFee.toLocaleString()}<span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 500 }}>/mo</span></span>
                      )}
                    </td>
                    <td style={{ textAlign: 'center' }}><StatusBadge variant={grade.studentCount > 0 ? 'info' : 'success'}>{grade.studentCount}</StatusBadge></td>
                    <td style={{ textAlign: 'center' }}><StatusBadge variant="gold">{grade.courseCount}</StatusBadge></td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '8px' }}>
                        {editingId === grade.id ? (
                          <>
                            <Button onClick={() => void saveEdit(grade.id)} disabled={busy} style={{ minHeight: '34px', height: '34px', padding: '6px 14px' }}>Save</Button>
                            <Button variant="outline" onClick={() => setEditingId('')} style={{ minHeight: '34px', height: '34px', padding: '6px 12px' }}>Cancel</Button>
                          </>
                        ) : (
                          <>
                            <Button variant="outline" onClick={() => { setEditingId(grade.id); setEditName(grade.name); setEditFee(String(grade.monthlyFee)); }} style={{ minHeight: '34px', height: '34px', padding: '6px 12px' }}>
                              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>edit</span>
                            </Button>
                            <Button variant="outline" onClick={() => void removeGrade(grade)} disabled={busy} style={{ minHeight: '34px', height: '34px', padding: '6px 12px', color: 'var(--color-error)', borderColor: 'rgba(230, 57, 70, 0.4)' }}>
                              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>delete</span>
                            </Button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {detail ? (
        <>
          <div className="people-drawer-overlay" onClick={() => setDetail(null)} />
          <aside className="people-drawer" role="dialog" aria-modal="true">
            <div className="people-drawer-head">
              <div>
                <h2>{detail.name}</h2>
                <p>{detail.studentCount} student{detail.studentCount === 1 ? '' : 's'} · {detail.courseCount} course{detail.courseCount === 1 ? '' : 's'} · {detail.teacherCount} teacher{detail.teacherCount === 1 ? '' : 's'}</p>
              </div>
              <button type="button" className="people-drawer-close" onClick={() => setDetail(null)} aria-label="Close">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="people-drawer-body">
              {detailLoading ? (
                <p style={{ color: 'var(--text-muted)', fontSize: '14px', textAlign: 'center', padding: '24px 0' }}>Loading…</p>
              ) : (
                <>
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '10px' }}>Courses ({detail.courses.length})</div>
                    {detail.courses.length === 0 ? (
                      <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>No courses assigned to this grade yet.</p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {detail.courses.map((c) => (
                          <div key={c.id} style={{ padding: '12px 14px', borderRadius: '12px', border: '1px solid var(--border)', background: 'var(--color-bg)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                              <div style={{ fontSize: '13.5px', fontWeight: 700 }}>{c.name}</div>
                              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{c.branchName}</div>
                            </div>
                            <div style={{ display: 'flex', gap: '6px' }}>
                              <StatusBadge variant="info">{c.classCount} classes</StatusBadge>
                              <StatusBadge variant="success">{c.enrollmentCount} enrolled</StatusBadge>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '10px' }}>Teachers ({detail.teachers.length})</div>
                    {detail.teachers.length === 0 ? (
                      <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>No teachers assigned to this grade's classes yet.</p>
                    ) : (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                        {detail.teachers.map((t) => (
                          <span key={t.id} className="people-role-tag">{t.name}</span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '10px' }}>Students ({detail.students.length})</div>
                    {detail.students.length === 0 ? (
                      <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>No students in this grade yet.</p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {detail.students.map((s) => (
                          <div key={s.studentId} style={{ padding: '10px 14px', borderRadius: '12px', border: '1px solid var(--border)', background: 'var(--color-bg)' }}>
                            <div style={{ fontSize: '13.5px', fontWeight: 600 }}>{s.name}</div>
                            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{s.email}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </aside>
        </>
      ) : null}
    </div>
  );
}
