import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Button } from '../components/ui/Button';
import { StatusBadge } from '../components/ui/StatusBadge';
import { useToast } from '../components/ui/Toast';
import { api } from '../services/api';

interface ScheduleSlot {
  day: string;
  startTime: string;
  endTime: string;
}

interface ClassItem {
  id: string;
  name: string;
  schedule: ScheduleSlot[];
  courseId: string;
  courseName: string;
  courseType: string;
  gradeName: string | null;
  branchId: string;
  branchName: string;
  teacherId: string | null;
  teacherName: string | null;
  enrollmentCount: number;
  sessionCount: number;
  createdAt: string;
}

interface CourseOption {
  id: string;
  name: string;
  branchId: string;
  branchName: string;
  gradeName: string | null;
}

interface TeacherOption {
  id: string;
  name: string;
  branchIds: string[];
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

interface FormState {
  courseId: string;
  name: string;
  days: string[];
  startTime: string;
  endTime: string;
  teacherId: string;
}

const EMPTY_FORM: FormState = { courseId: '', name: '', days: [], startTime: '07:00', endTime: '08:30', teacherId: '' };

function formatSchedule(schedule: ScheduleSlot[]): string {
  if (!Array.isArray(schedule) || schedule.length === 0) return 'No schedule set';
  const byTime = schedule.reduce<Record<string, string[]>>((acc, slot) => {
    const key = `${slot.startTime}–${slot.endTime}`;
    (acc[key] ??= []).push(slot.day);
    return acc;
  }, {});
  return Object.entries(byTime)
    .map(([time, days]) => `${days.join(', ')} · ${time}`)
    .join('  |  ');
}

export function AcademicTimetables() {
  const { showToast } = useToast();
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [teachers, setTeachers] = useState<TeacherOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [branchFilter, setBranchFilter] = useState('ALL');

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingId, setEditingId] = useState('');
  const [editBranchId, setEditBranchId] = useState('');
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [isSaving, setIsSaving] = useState(false);
  const [busyId, setBusyId] = useState('');

  const loadData = async () => {
    setIsLoading(true);
    setErrorMsg('');
    try {
      const [classList, courseList, people] = await Promise.all([
        api.academics.listClasses(),
        api.academics.listCourses(),
        api.people.list(),
      ]);
      setClasses(classList as ClassItem[]);
      setCourses((courseList as any[]).map((c) => ({ id: c.id, name: c.name, branchId: c.branchId, branchName: c.branchName, gradeName: c.gradeName ?? null })));
      setTeachers(
        (people as any[])
          .filter((p) => p.roles.some((r: any) => r.role === 'Teacher'))
          .map((p) => ({
            id: p.id,
            name: p.name,
            branchIds: p.roles.filter((r: any) => r.role === 'Teacher' && r.branchId).map((r: any) => r.branchId),
          }))
      );
    } catch (error: unknown) {
      setErrorMsg(error instanceof Error ? error.message : 'Failed to load timetables.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const branchOptions = useMemo(() => {
    const set = new Map<string, string>();
    classes.forEach((c) => set.set(c.branchId, c.branchName));
    return Array.from(set.entries()).map(([id, name]) => ({ id, name }));
  }, [classes]);

  const filtered = useMemo(
    () => (branchFilter === 'ALL' ? classes : classes.filter((c) => c.branchId === branchFilter)),
    [classes, branchFilter]
  );

  // Teachers eligible for the class's branch (or tenant-wide teachers).
  const eligibleTeachers = useMemo(() => {
    if (!editBranchId) return teachers;
    return teachers.filter((t) => t.branchIds.length === 0 || t.branchIds.includes(editBranchId));
  }, [teachers, editBranchId]);

  const setField = (field: keyof FormState, value: string | string[]) => setForm((c) => ({ ...c, [field]: value }));
  const toggleDay = (day: string) =>
    setForm((c) => ({ ...c, days: c.days.includes(day) ? c.days.filter((d) => d !== day) : [...c.days, day] }));

  const openCreate = () => {
    setEditingId('');
    setEditBranchId(courses.length === 1 ? courses[0].branchId : '');
    setForm({ ...EMPTY_FORM, courseId: courses.length === 1 ? courses[0].id : '' });
    setDrawerOpen(true);
  };

  const openEdit = (cls: ClassItem) => {
    setEditingId(cls.id);
    setEditBranchId(cls.branchId);
    const first = Array.isArray(cls.schedule) && cls.schedule[0];
    setForm({
      courseId: cls.courseId,
      name: cls.name,
      days: Array.isArray(cls.schedule) ? Array.from(new Set(cls.schedule.map((s) => s.day))) : [],
      startTime: first ? first.startTime : '07:00',
      endTime: first ? first.endTime : '08:30',
      teacherId: cls.teacherId ?? '',
    });
    setDrawerOpen(true);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editingId && !form.courseId) return showToast('Select a course.', 'error');
    if (!form.name.trim()) return showToast('Class name is required.', 'error');
    if (form.days.length === 0) return showToast('Pick at least one day.', 'error');
    if (form.startTime >= form.endTime) return showToast('End time must be after start time.', 'error');

    const schedule: ScheduleSlot[] = form.days.map((day) => ({ day, startTime: form.startTime, endTime: form.endTime }));

    setIsSaving(true);
    try {
      if (editingId) {
        await api.academics.updateClass(editingId, {
          name: form.name.trim(),
          schedule,
          teacherId: form.teacherId || null,
        });
        showToast('Class updated.', 'success');
      } else {
        await api.academics.createClass({ courseId: form.courseId, name: form.name.trim(), schedule });
        showToast('Class added to the timetable.', 'success');
      }
      setDrawerOpen(false);
      setForm(EMPTY_FORM);
      setEditingId('');
      await loadData();
    } catch (error: unknown) {
      showToast(error instanceof Error ? error.message : 'Failed to save the class.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (cls: ClassItem) => {
    if (!window.confirm(`Delete "${cls.name}"? This cannot be undone.`)) return;
    setBusyId(cls.id);
    try {
      await api.academics.deleteClass(cls.id);
      showToast('Class deleted.', 'success');
      await loadData();
    } catch (error: unknown) {
      showToast(error instanceof Error ? error.message : 'Failed to delete the class.', 'error');
    } finally {
      setBusyId('');
    }
  };

  return (
    <div className="people-page">
      <div className="people-header">
        <div>
          <h1 className="people-title">Timetables</h1>
          <p className="people-subtitle">Class schedules and teacher assignments across your branches.</p>
        </div>
        <Button onClick={openCreate} disabled={courses.length === 0} style={{ height: '42px' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>calendar_add_on</span>
          Add Class
        </Button>
      </div>

      {errorMsg ? <StatusBadge variant="error">{errorMsg}</StatusBadge> : null}
      {courses.length === 0 && !isLoading ? (
        <StatusBadge variant="warning">Create a course first — classes belong to a course.</StatusBadge>
      ) : null}

      <div className="people-stats">
        <div className="people-stat" style={{ ['--stat-accent' as string]: 'var(--color-primary)' }}>
          <span className="people-stat-value">{classes.length}</span>
          <span className="people-stat-label">Classes</span>
        </div>
        <div className="people-stat" style={{ ['--stat-accent' as string]: 'var(--color-accent)' }}>
          <span className="people-stat-value">{classes.filter((c) => c.teacherId).length}</span>
          <span className="people-stat-label">Assigned</span>
        </div>
        <div className="people-stat" style={{ ['--stat-accent' as string]: 'var(--color-warning)' }}>
          <span className="people-stat-value">{classes.filter((c) => !c.teacherId).length}</span>
          <span className="people-stat-label">Unassigned</span>
        </div>
        <div className="people-stat" style={{ ['--stat-accent' as string]: 'var(--color-success)' }}>
          <span className="people-stat-value">{classes.reduce((s, c) => s + c.enrollmentCount, 0)}</span>
          <span className="people-stat-label">Enrolled</span>
        </div>
      </div>

      <div className="people-toolbar">
        <select className="people-filter" value={branchFilter} onChange={(e) => setBranchFilter(e.target.value)} style={{ flex: 1, minWidth: '200px' }}>
          <option value="ALL">All branches</option>
          {branchOptions.map((b) => (
            <option key={b.id} value={b.id}>{b.name}</option>
          ))}
        </select>
        <Button variant="outline" onClick={() => void loadData()} disabled={isLoading} style={{ height: '42px' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>refresh</span>
          Refresh
        </Button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '16px' }}>
        {filtered.length === 0 ? (
          <div className="people-table-wrap">
            <div className="people-empty">
              <span className="material-symbols-outlined">calendar_month</span>
              {isLoading ? 'Loading timetables…' : classes.length === 0 ? 'No classes scheduled yet.' : 'No classes for this branch.'}
            </div>
          </div>
        ) : (
          filtered.map((cls) => (
            <div key={cls.id} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
                <div>
                  <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text)' }}>{cls.name}</div>
                  <div style={{ fontSize: '12.5px', color: 'var(--text-muted)', marginTop: '3px' }}>{cls.courseName} · {cls.branchName}</div>
                </div>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                  {cls.gradeName ? <span className="people-role-tag">{cls.gradeName}</span> : null}
                  <span className="people-role-tag">{cls.courseType.replace('_', ' ')}</span>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--text)', background: 'rgba(21, 96, 189, 0.05)', borderRadius: '10px', padding: '10px 12px' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '18px', color: 'var(--color-primary-light)' }}>schedule</span>
                {formatSchedule(cls.schedule)}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '18px', color: cls.teacherName ? 'var(--color-success)' : 'var(--color-warning)' }}>
                  {cls.teacherName ? 'person_check' : 'person_off'}
                </span>
                {cls.teacherName ? (
                  <span style={{ fontWeight: 600 }}>{cls.teacherName}</span>
                ) : (
                  <span style={{ color: 'var(--text-muted)' }}>No teacher assigned</span>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <StatusBadge variant="info">{cls.enrollmentCount} enrolled</StatusBadge>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <Button variant="outline" onClick={() => openEdit(cls)} style={{ minHeight: '34px', height: '34px', padding: '6px 12px', borderColor: 'rgba(21, 96, 189, 0.16)' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>edit</span>
                    Manage
                  </Button>
                  <Button variant="outline" onClick={() => void handleDelete(cls)} disabled={busyId === cls.id} style={{ minHeight: '34px', height: '34px', padding: '6px 12px', color: 'var(--color-error)', borderColor: 'rgba(230, 57, 70, 0.4)' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>delete</span>
                  </Button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {drawerOpen ? (
        <>
          <div className="people-drawer-overlay" onClick={() => setDrawerOpen(false)} />
          <aside className="people-drawer" role="dialog" aria-modal="true">
            <div className="people-drawer-head">
              <div>
                <h2>{editingId ? 'Manage Class' : 'Add Class'}</h2>
                <p>{editingId ? 'Update the schedule or assign a teacher (generates their session for today if scheduled).' : 'A class is a scheduled instance of a course.'}</p>
              </div>
              <button type="button" className="people-drawer-close" onClick={() => setDrawerOpen(false)} aria-label="Close">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <form onSubmit={handleSubmit} style={{ display: 'contents' }}>
              <div className="people-drawer-body">
                {!editingId ? (
                  <div className="people-field">
                    <label>Course</label>
                    <select value={form.courseId} onChange={(e) => { setField('courseId', e.target.value); setEditBranchId(courses.find((c) => c.id === e.target.value)?.branchId ?? ''); }} required>
                      <option value="">Select a course…</option>
                      {courses.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}{c.gradeName ? ` · ${c.gradeName}` : ''} — {c.branchName}</option>
                      ))}
                    </select>
                    {(() => {
                      const selected = courses.find((c) => c.id === form.courseId);
                      if (!selected) return null;
                      return (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px', fontSize: '12.5px', color: 'var(--text-muted)' }}>
                          <span className="material-symbols-outlined" style={{ fontSize: '16px', color: 'var(--color-primary-light)' }}>stairs</span>
                          {selected.gradeName ? (
                            <>Grade auto-set from course: <span style={{ fontWeight: 700, color: 'var(--color-primary)' }}>{selected.gradeName}</span></>
                          ) : (
                            <>This course has no grade — set one under Courses to link it.</>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                ) : null}
                <div className="people-field">
                  <label>Class name</label>
                  <input value={form.name} onChange={(e) => setField('name', e.target.value)} placeholder="Grade 10 Physics — Morning" required />
                </div>
                <div className="people-field">
                  <label>Days</label>
                  <div className="people-role-picker">
                    {DAYS.map((day) => (
                      <button key={day} type="button" className={`people-role-chip${form.days.includes(day) ? ' people-role-chip--active' : ''}`} onClick={() => toggleDay(day)}>
                        {day}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="people-field-row">
                  <div className="people-field">
                    <label>Start time</label>
                    <input type="time" value={form.startTime} onChange={(e) => setField('startTime', e.target.value)} required />
                  </div>
                  <div className="people-field">
                    <label>End time</label>
                    <input type="time" value={form.endTime} onChange={(e) => setField('endTime', e.target.value)} required />
                  </div>
                </div>
                {editingId ? (
                  <div className="people-field">
                    <label>Assigned teacher</label>
                    <select value={form.teacherId} onChange={(e) => setField('teacherId', e.target.value)}>
                      <option value="">Unassigned</option>
                      {eligibleTeachers.map((t) => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </select>
                    {eligibleTeachers.length === 0 ? (
                      <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>No teachers in this branch yet — add one from Staff &amp; Students.</p>
                    ) : null}
                  </div>
                ) : null}
              </div>
              <div className="people-drawer-foot">
                <Button type="submit" disabled={isSaving} style={{ flex: 1 }}>{isSaving ? 'Saving…' : editingId ? 'Save Changes' : 'Add Class'}</Button>
                <Button type="button" variant="outline" onClick={() => setDrawerOpen(false)}>Cancel</Button>
              </div>
            </form>
          </aside>
        </>
      ) : null}
    </div>
  );
}
