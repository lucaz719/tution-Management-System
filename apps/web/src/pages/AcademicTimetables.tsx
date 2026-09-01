import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Button } from '../components/ui/Button';
import { StatusBadge } from '../components/ui/StatusBadge';
import { useToast } from '../components/ui/Toast';
import { api } from '../services/api';
import { normalizeSchedule, SCHEDULE_DAYS, sortSchedule, type ScheduleSlot } from '../utils/schedule';

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

interface FormState {
  courseId: string;
  name: string;
  schedule: ScheduleSlot[];
  teacherId: string;
}

const EMPTY_FORM: FormState = { courseId: '', name: '', schedule: [], teacherId: '' };
const EMPTY_SLOT: ScheduleSlot = { day: 'Sun', startTime: '07:00', endTime: '08:30', room: '' };

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
  const [slotDraft, setSlotDraft] = useState<ScheduleSlot>(EMPTY_SLOT);
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

  const setField = (field: 'courseId' | 'name' | 'teacherId', value: string) => setForm((current) => ({ ...current, [field]: value }));
  const addSlot = () => {
    if (slotDraft.startTime >= slotDraft.endTime) return showToast('End time must be after start time.', 'error');
    const duplicate = form.schedule.some((slot) => slot.day === slotDraft.day && slot.startTime === slotDraft.startTime && slot.endTime === slotDraft.endTime);
    if (duplicate) return showToast('That weekly session is already listed.', 'error');
    setForm((current) => ({ ...current, schedule: sortSchedule([...current.schedule, { ...slotDraft, room: slotDraft.room.trim() }]) }));
    setSlotDraft((current) => ({ ...EMPTY_SLOT, day: current.day }));
  };
  const removeSlot = (index: number) => setForm((current) => ({ ...current, schedule: current.schedule.filter((_, slotIndex) => slotIndex !== index) }));

  const openCreate = () => {
    setEditingId('');
    setEditBranchId(courses.length === 1 ? courses[0].branchId : '');
    setForm({ ...EMPTY_FORM, courseId: courses.length === 1 ? courses[0].id : '' });
    setSlotDraft(EMPTY_SLOT);
    setDrawerOpen(true);
  };

  const openEdit = (cls: ClassItem) => {
    setEditingId(cls.id);
    setEditBranchId(cls.branchId);
    setForm({
      courseId: cls.courseId,
      name: cls.name,
      schedule: sortSchedule(normalizeSchedule(cls.schedule)),
      teacherId: cls.teacherId ?? '',
    });
    setSlotDraft(EMPTY_SLOT);
    setDrawerOpen(true);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editingId && !form.courseId) return showToast('Select a course.', 'error');
    if (!form.name.trim()) return showToast('Class name is required.', 'error');
    if (form.schedule.length === 0) return showToast('Add at least one weekly session.', 'error');

    setIsSaving(true);
    try {
      if (editingId) {
        await api.academics.updateClass(editingId, {
          name: form.name.trim(),
          schedule: form.schedule,
          teacherId: form.teacherId || null,
        });
        showToast('Class updated.', 'success');
      } else {
        await api.academics.createClass({ courseId: form.courseId, name: form.name.trim(), schedule: form.schedule });
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
          <button type="button" className="people-drawer-overlay" onClick={() => setDrawerOpen(false)} aria-label="Close timetable form" />
          <aside className="people-drawer" role="dialog" aria-modal="true" aria-labelledby="timetable-drawer-title">
            <div className="people-drawer-head">
              <div>
                <h2 id="timetable-drawer-title">{editingId ? 'Manage Class' : 'Add Class'}</h2>
                <p>{editingId ? 'Update the schedule or assign a teacher (generates their session for today if scheduled).' : 'A class is a scheduled instance of a course.'}</p>
              </div>
              <button type="button" className="people-drawer-close" onClick={() => setDrawerOpen(false)} aria-label="Close">
                <span className="material-symbols-outlined" aria-hidden="true">close</span>
              </button>
            </div>
            <form onSubmit={handleSubmit} style={{ display: 'contents' }}>
              <div className="people-drawer-body">
                {!editingId ? (
                  <div className="people-field">
                    <label htmlFor="timetable-course">Course</label>
                    <select id="timetable-course" value={form.courseId} onChange={(e) => { setField('courseId', e.target.value); setEditBranchId(courses.find((c) => c.id === e.target.value)?.branchId ?? ''); }} required>
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
                  <label htmlFor="timetable-class-name">Class name</label>
                  <input id="timetable-class-name" autoComplete="off" value={form.name} onChange={(e) => setField('name', e.target.value)} placeholder="Grade 10 Physics — Morning" required />
                </div>
                <fieldset className="people-field" style={{ border: 0, padding: 0, margin: 0 }}>
                  <legend style={{ marginBottom: '8px', fontWeight: 700 }}>Weekly sessions</legend>
                  {form.schedule.length ? (
                    <div style={{ display: 'grid', gap: '8px', marginBottom: '12px' }}>
                      {form.schedule.map((slot, index) => (
                        <div key={`${slot.day}-${slot.startTime}-${slot.endTime}-${index}`} style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', alignItems: 'center', gap: '10px', padding: '10px 12px', border: '1px solid var(--border)', borderRadius: '10px', background: 'var(--bg-subtle)' }}>
                          <span><strong>{slot.day} · {slot.startTime}–{slot.endTime}</strong><small style={{ display: 'block', marginTop: '2px', color: 'var(--text-muted)' }}>{slot.room || 'Room not set'}</small></span>
                          <button type="button" onClick={() => removeSlot(index)} aria-label={`Remove ${slot.day} ${slot.startTime} session`} style={{ width: '40px', height: '40px', border: '1px solid var(--border)', borderRadius: '10px', color: 'var(--color-error)', background: 'var(--bg-card)', cursor: 'pointer' }}><span className="material-symbols-outlined" aria-hidden="true">delete</span></button>
                        </div>
                      ))}
                    </div>
                  ) : <p style={{ margin: '0 0 12px', color: 'var(--text-muted)', fontSize: '13px' }}>No weekly sessions added yet.</p>}
                  <div className="people-field-row">
                    <div className="people-field"><label htmlFor="timetable-day">Day</label><select id="timetable-day" value={slotDraft.day} onChange={(event) => setSlotDraft((current) => ({ ...current, day: event.target.value }))}>{SCHEDULE_DAYS.map((day) => <option key={day} value={day}>{day}</option>)}</select></div>
                    <div className="people-field"><label htmlFor="timetable-room">Room</label><input id="timetable-room" maxLength={120} value={slotDraft.room} onChange={(event) => setSlotDraft((current) => ({ ...current, room: event.target.value }))} placeholder="Room 302" /></div>
                  </div>
                  <div className="people-field-row">
                    <div className="people-field"><label htmlFor="timetable-start">Start time</label><input id="timetable-start" type="time" value={slotDraft.startTime} onChange={(event) => setSlotDraft((current) => ({ ...current, startTime: event.target.value }))} /></div>
                    <div className="people-field"><label htmlFor="timetable-end">End time</label><input id="timetable-end" type="time" value={slotDraft.endTime} onChange={(event) => setSlotDraft((current) => ({ ...current, endTime: event.target.value }))} /></div>
                  </div>
                  <Button type="button" variant="outline" onClick={addSlot}><span className="material-symbols-outlined" aria-hidden="true">add</span>Add weekly session</Button>
                </fieldset>
                {editingId ? (
                  <div className="people-field">
                    <label htmlFor="timetable-teacher">Assigned teacher</label>
                    <select id="timetable-teacher" value={form.teacherId} onChange={(e) => setField('teacherId', e.target.value)}>
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
