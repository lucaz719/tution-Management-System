import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { api } from '../../services/api';
import { normalizeSchedule, sortSchedule, type ScheduleSlot } from '../../utils/schedule';
import { Button } from '../ui/Button';
import { StatusBadge } from '../ui/StatusBadge';
import { useToast } from '../ui/Toast';
import { TimetableSlotEditor } from './TimetableSlotEditor';
import './timetableWorkspace.css';

interface TimetableClass {
  id: string;
  name: string;
  schedule: ScheduleSlot[];
  courseId: string;
  courseName: string;
  courseType: string;
  gradeId: string | null;
  gradeName: string | null;
  branchId: string;
  branchName: string;
  teacherId: string | null;
  teacherName: string | null;
  enrollmentCount: number;
  enrollments: Array<{ studentId: string }>;
}

interface TimetableCourse {
  id: string;
  name: string;
  branchId: string;
  branchName: string;
  gradeId: string | null;
  gradeName: string | null;
  type: string;
}

interface TimetableTeacher { id: string; name: string; branchIds: string[] }
interface BranchOption { id: string; name: string }
interface TimetableForm { branchId: string; gradeId: string; courseId: string; name: string; teacherId: string; schedule: ScheduleSlot[] }

const EMPTY_FORM: TimetableForm = { branchId: '', gradeId: '', courseId: '', name: '', teacherId: '', schedule: [] };
const UNGRADED = '__UNGRADED__';

function gradeKey(course: TimetableCourse) { return course.gradeId || UNGRADED; }
function formatSchedule(schedule: ScheduleSlot[]) {
  if (!schedule.length) return 'Schedule not set';
  return schedule.map((slot) => `${slot.day} ${slot.startTime}–${slot.endTime}${slot.room ? ` · ${slot.room}` : ''}`).join('  |  ');
}

export function TimetableWorkspace() {
  const { showToast } = useToast();
  const [classes, setClasses] = useState<TimetableClass[]>([]);
  const [courses, setCourses] = useState<TimetableCourse[]>([]);
  const [teachers, setTeachers] = useState<TimetableTeacher[]>([]);
  const [branches, setBranches] = useState<BranchOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [branchFilter, setBranchFilter] = useState('ALL');
  const [gradeFilter, setGradeFilter] = useState('ALL');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingId, setEditingId] = useState('');
  const [form, setForm] = useState<TimetableForm>(EMPTY_FORM);
  const [formError, setFormError] = useState('');
  const [conflicts, setConflicts] = useState<string[]>([]);
  const [checkingConflicts, setCheckingConflicts] = useState(false);
  const [conflictError, setConflictError] = useState('');
  const [conflictVersion, setConflictVersion] = useState(0);
  const [saving, setSaving] = useState(false);
  const [deleteCandidate, setDeleteCandidate] = useState('');
  const [deleting, setDeleting] = useState(false);
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  const load = async () => {
    setLoading(true);
    setLoadError('');
    try {
      const [classRows, courseRows, people, capabilities] = await Promise.all([
        api.academics.listClasses(), api.academics.listCourses(), api.people.list(), api.people.capabilities(),
      ]);
      setClasses((classRows as TimetableClass[]).map((item) => ({ ...item, schedule: sortSchedule(normalizeSchedule(item.schedule)), enrollments: item.enrollments ?? [] })));
      setCourses((courseRows as TimetableCourse[]).map((item) => ({ ...item, gradeId: item.gradeId ?? null, gradeName: item.gradeName ?? null })));
      setTeachers((people as any[]).filter((person) => person.roles.some((role: any) => role.role === 'Teacher')).map((person) => ({
        id: person.id,
        name: person.name,
        branchIds: person.roles.filter((role: any) => role.role === 'Teacher' && role.branchId).map((role: any) => role.branchId),
      })));
      setBranches(capabilities.manageableBranches);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Timetables could not be loaded.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const gradeOptions = useMemo(() => {
    const source = branchFilter === 'ALL' ? courses : courses.filter((course) => course.branchId === branchFilter);
    const values = new Map<string, string>();
    source.forEach((course) => values.set(gradeKey(course), course.gradeName || 'Extra / ungraded'));
    return Array.from(values, ([id, name]) => ({ id, name })).sort((left, right) => left.name.localeCompare(right.name, undefined, { numeric: true }));
  }, [branchFilter, courses]);

  const filteredClasses = useMemo(() => classes.filter((item) =>
    (branchFilter === 'ALL' || item.branchId === branchFilter)
    && (gradeFilter === 'ALL' || (item.gradeId || UNGRADED) === gradeFilter),
  ), [branchFilter, classes, gradeFilter]);

  const formGrades = useMemo(() => {
    const values = new Map<string, string>();
    courses.filter((course) => course.branchId === form.branchId).forEach((course) => values.set(gradeKey(course), course.gradeName || 'Extra / ungraded'));
    return Array.from(values, ([id, name]) => ({ id, name })).sort((left, right) => left.name.localeCompare(right.name, undefined, { numeric: true }));
  }, [courses, form.branchId]);
  const formCourses = useMemo(() => courses.filter((course) => course.branchId === form.branchId && gradeKey(course) === form.gradeId), [courses, form.branchId, form.gradeId]);
  const eligibleTeachers = useMemo(() => teachers.filter((teacher) => !teacher.branchIds.length || teacher.branchIds.includes(form.branchId)), [form.branchId, teachers]);
  const selectedCourse = courses.find((course) => course.id === form.courseId);

  const closeDrawer = () => {
    setDrawerOpen(false);
    setEditingId('');
    setForm(EMPTY_FORM);
    setFormError('');
    setConflicts([]);
    setConflictError('');
    window.setTimeout(() => triggerRef.current?.focus(), 0);
  };

  useEffect(() => {
    if (!drawerOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape' && !saving) closeDrawer(); };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [drawerOpen, saving]);

  const openCreate = (event: React.MouseEvent<HTMLButtonElement>) => {
    triggerRef.current = event.currentTarget;
    const branchId = branches.length === 1 ? branches[0].id : '';
    setEditingId('');
    setForm({ ...EMPTY_FORM, branchId });
    setFormError('');
    setDrawerOpen(true);
  };

  const openEdit = (item: TimetableClass, event: React.MouseEvent<HTMLButtonElement>) => {
    triggerRef.current = event.currentTarget;
    setEditingId(item.id);
    setForm({ branchId: item.branchId, gradeId: item.gradeId || UNGRADED, courseId: item.courseId, name: item.name, teacherId: item.teacherId || '', schedule: item.schedule });
    setFormError('');
    setDrawerOpen(true);
  };

  useEffect(() => {
    setConflicts([]);
    setConflictError('');
    if (!drawerOpen || !form.courseId || !form.schedule.length) { setCheckingConflicts(false); return; }
    let current = true;
    const timeout = window.setTimeout(async () => {
      setCheckingConflicts(true);
      try {
        const result = await api.academics.checkClassConflicts({ courseId: form.courseId, classId: editingId || undefined, teacherId: form.teacherId || null, schedule: form.schedule });
        if (current) setConflicts(result.conflicts);
      } catch (error) {
        if (current) setConflictError(error instanceof Error ? error.message : 'Conflict check failed.');
      } finally {
        if (current) setCheckingConflicts(false);
      }
    }, 300);
    return () => { current = false; window.clearTimeout(timeout); };
  }, [drawerOpen, editingId, form.courseId, form.teacherId, form.schedule, conflictVersion]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form.courseId) { setFormError('Choose a branch, grade, and course.'); return; }
    if (!form.name.trim()) { setFormError('Class name is required.'); return; }
    if (!form.schedule.length) { setFormError('Add at least one weekly session.'); return; }
    if (checkingConflicts || conflictError) { setFormError('Complete the conflict check before saving.'); return; }
    if (conflicts.length) { setFormError('Resolve the timetable conflicts before saving.'); return; }
    setSaving(true);
    setFormError('');
    try {
      if (editingId) await api.academics.updateClass(editingId, { name: form.name.trim(), schedule: form.schedule, teacherId: form.teacherId || null });
      else await api.academics.createClass({ courseId: form.courseId, name: form.name.trim(), schedule: form.schedule, teacherId: form.teacherId || null });
      showToast(editingId ? 'Timetable updated.' : 'Class and timetable created.', 'success');
      closeDrawer();
      await load();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Timetable could not be saved.');
    } finally {
      setSaving(false);
    }
  };

  const removeClass = async (item: TimetableClass) => {
    setDeleting(true);
    try {
      await api.academics.deleteClass(item.id);
      showToast('Class deleted.', 'success');
      setDeleteCandidate('');
      await load();
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Class could not be deleted.', 'error');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="timetable-workspace">
      <header className="timetable-page-header">
        <div><span className="timetable-eyebrow">ACADEMIC OPERATIONS</span><h1>Timetables</h1><p>Create classes, assign teachers, and prevent schedule collisions from one workspace.</p></div>
        <Button onClick={openCreate} disabled={!courses.length || loading}><span className="material-symbols-outlined" aria-hidden="true">calendar_add_on</span>Add class</Button>
      </header>

      {loading ? <div className="timetable-skeleton" aria-busy="true" aria-label="Loading timetables">{Array.from({ length: 3 }, (_, index) => <i key={index} />)}</div> : null}
      {!loading && loadError ? <div className="timetable-load-error" role="alert"><span className="material-symbols-outlined" aria-hidden="true">cloud_off</span><div><strong>Couldn’t load timetables</strong><p>{loadError}</p></div><Button variant="outline" onClick={() => void load()}>Try again</Button></div> : null}

      {!loading && !loadError ? <>
        <section className="timetable-summary" aria-label="Timetable summary">
          <article><strong>{classes.length}</strong><span>Classes</span></article>
          <article><strong>{classes.filter((item) => item.teacherId).length}</strong><span>Teacher assigned</span></article>
          <article><strong>{classes.filter((item) => !item.teacherId).length}</strong><span>Need a teacher</span></article>
          <article><strong>{classes.reduce((total, item) => total + item.enrollmentCount, 0)}</strong><span>Enrollments</span></article>
        </section>

        <section className="timetable-filters" aria-label="Filter timetables">
          <label htmlFor="timetable-filter-branch">Branch<select id="timetable-filter-branch" value={branchFilter} onChange={(event) => { setBranchFilter(event.target.value); setGradeFilter('ALL'); }}><option value="ALL">All branches</option>{branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</select></label>
          <label htmlFor="timetable-filter-grade">Grade<select id="timetable-filter-grade" value={gradeFilter} onChange={(event) => setGradeFilter(event.target.value)}><option value="ALL">All grades</option>{gradeOptions.map((grade) => <option key={grade.id} value={grade.id}>{grade.name}</option>)}</select></label>
          <Button variant="outline" onClick={() => void load()}><span className="material-symbols-outlined" aria-hidden="true">refresh</span>Refresh</Button>
        </section>

        {filteredClasses.length ? <div className="timetable-class-grid">{filteredClasses.map((item) => (
          <article className="timetable-class-card" key={item.id}>
            <header><div><h2>{item.name}</h2><p>{item.branchName} · {item.gradeName || 'Extra / ungraded'} · {item.courseName}</p></div><StatusBadge variant={item.teacherId ? 'success' : 'warning'}>{item.teacherId ? 'Ready' : 'Teacher needed'}</StatusBadge></header>
            <div className="timetable-card-schedule"><span className="material-symbols-outlined" aria-hidden="true">schedule</span><span>{formatSchedule(item.schedule)}</span></div>
            <dl><div><dt>Teacher</dt><dd>{item.teacherName || 'Not assigned'}</dd></div><div><dt>Students</dt><dd>{item.enrollmentCount}</dd></div></dl>
            {deleteCandidate === item.id ? <div className="timetable-delete-confirm" role="alert"><p><strong>Delete this class?</strong> This is available only when no students are enrolled.</p><div><Button variant="danger" disabled={deleting} onClick={() => void removeClass(item)}>{deleting ? 'Deleting…' : 'Confirm delete'}</Button><Button variant="outline" disabled={deleting} onClick={() => setDeleteCandidate('')}>Cancel</Button></div></div> : <footer><Button variant="outline" onClick={(event) => openEdit(item, event)}><span className="material-symbols-outlined" aria-hidden="true">edit</span>Manage</Button><Button variant="ghost" onClick={() => setDeleteCandidate(item.id)} disabled={item.enrollmentCount > 0} aria-label={item.enrollmentCount ? `Cannot delete ${item.name} while students are enrolled` : `Delete ${item.name}`}><span className="material-symbols-outlined" aria-hidden="true">delete</span></Button></footer>}
          </article>
        ))}</div> : <div className="timetable-empty"><span className="material-symbols-outlined" aria-hidden="true">calendar_month</span><h2>{classes.length ? 'No matching classes' : courses.length ? 'No classes scheduled' : 'Courses are required first'}</h2><p>{classes.length ? 'Change the branch or grade filter.' : courses.length ? 'Add the first class to begin building the weekly timetable.' : 'Create the grade courses before adding timetable classes.'}</p>{!classes.length && courses.length ? <Button onClick={openCreate}>Add first class</Button> : null}</div>}
      </> : null}

      {drawerOpen ? <>
        <button type="button" className="people-drawer-overlay" onClick={closeDrawer} aria-label="Close timetable editor" />
        <aside className="people-drawer timetable-drawer" role="dialog" aria-modal="true" aria-labelledby="timetable-editor-title">
          <div className="people-drawer-head"><div><h2 id="timetable-editor-title">{editingId ? 'Manage timetable' : 'Create class timetable'}</h2><p>{editingId ? 'Update the teacher and weekly sessions.' : 'Choose the academic path, assign a teacher, then add weekly sessions.'}</p></div><button type="button" className="people-drawer-close" onClick={closeDrawer} aria-label="Close"><span className="material-symbols-outlined" aria-hidden="true">close</span></button></div>
          <form className="timetable-form" onSubmit={submit} aria-busy={saving}>
            <div className="people-drawer-body">
              {!editingId ? <fieldset className="timetable-path"><legend>1. Choose where this class belongs</legend>
                <label htmlFor="class-branch">Branch <span>*</span><select id="class-branch" autoFocus required value={form.branchId} onChange={(event) => setForm((current) => ({ ...current, branchId: event.target.value, gradeId: '', courseId: '', teacherId: '', name: '' }))}><option value="">Select branch…</option>{branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</select></label>
                <label htmlFor="class-grade">Grade <span>*</span><select id="class-grade" required disabled={!form.branchId} value={form.gradeId} onChange={(event) => setForm((current) => ({ ...current, gradeId: event.target.value, courseId: '', name: '' }))}><option value="">{form.branchId ? 'Select grade…' : 'Choose branch first'}</option>{formGrades.map((grade) => <option key={grade.id} value={grade.id}>{grade.name}</option>)}</select></label>
                <label htmlFor="class-course">Course <span>*</span><select id="class-course" required disabled={!form.gradeId} value={form.courseId} onChange={(event) => { const course = courses.find((item) => item.id === event.target.value); setForm((current) => ({ ...current, courseId: event.target.value, name: course?.name || current.name })); }}><option value="">{form.gradeId ? 'Select course…' : 'Choose grade first'}</option>{formCourses.map((course) => <option key={course.id} value={course.id}>{course.name}</option>)}</select></label>
              </fieldset> : <div className="timetable-locked-path"><span className="material-symbols-outlined" aria-hidden="true">account_tree</span><div><strong>{selectedCourse?.branchName} · {selectedCourse?.gradeName || 'Extra / ungraded'}</strong><span>{selectedCourse?.name}</span></div></div>}

              <fieldset className="timetable-details"><legend>2. Name and teacher</legend>
                <label htmlFor="class-name">Class name <span>*</span><input id="class-name" autoFocus={Boolean(editingId)} autoComplete="off" required maxLength={160} value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} placeholder="Class 10 Science — Morning" /></label>
                <label htmlFor="class-teacher">Teacher <span>(optional)</span><select id="class-teacher" disabled={!form.branchId} value={form.teacherId} onChange={(event) => setForm((current) => ({ ...current, teacherId: event.target.value }))}><option value="">Unassigned</option>{eligibleTeachers.map((teacher) => <option key={teacher.id} value={teacher.id}>{teacher.name}</option>)}</select><small>{eligibleTeachers.length ? 'Only teachers assigned to this branch are shown.' : 'No teachers are assigned to this branch yet.'}</small></label>
              </fieldset>

              <div className="timetable-step"><h3>3. Build the weekly schedule</h3><TimetableSlotEditor value={form.schedule} onChange={(schedule) => setForm((current) => ({ ...current, schedule }))} disabled={saving} /></div>

              <section className="timetable-conflicts" aria-live="polite"><h3>4. Conflict check</h3>{checkingConflicts ? <p className="is-checking"><span className="material-symbols-outlined" aria-hidden="true">progress_activity</span>Checking teacher, student, and room availability…</p> : conflictError ? <div className="is-error" role="alert"><p>{conflictError}</p><Button type="button" variant="outline" onClick={() => setConflictVersion((value) => value + 1)}>Try again</Button></div> : conflicts.length ? <div className="is-error" role="alert"><strong>Resolve {conflicts.length} conflict{conflicts.length === 1 ? '' : 's'} before saving</strong><ul>{conflicts.map((conflict) => <li key={conflict}>{conflict}</li>)}</ul></div> : form.schedule.length ? <p className="is-clear"><span className="material-symbols-outlined" aria-hidden="true">verified</span>No conflicts found.</p> : <p className="is-idle">Add a session to check availability.</p>}</section>
              {formError ? <p className="timetable-form-error" role="alert">{formError}</p> : null}
            </div>
            <div className="people-drawer-foot"><Button type="submit" disabled={saving || checkingConflicts || Boolean(conflicts.length) || Boolean(conflictError)} style={{ flex: 1 }}>{saving ? 'Saving timetable…' : editingId ? 'Save timetable' : 'Create class'}</Button><Button type="button" variant="outline" disabled={saving} onClick={closeDrawer}>Cancel</Button></div>
          </form>
        </aside>
      </> : null}
    </div>
  );
}
