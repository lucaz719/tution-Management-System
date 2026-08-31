import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { BulkCourseCreate } from '../components/BulkCourseCreate';
import { Button } from '../components/ui/Button';
import { StatusBadge } from '../components/ui/StatusBadge';
import { useToast } from '../components/ui/Toast';
import { api } from '../services/api';

type BillingMode = 'GRADE' | 'SUBJECT';
type Workspace = 'ACADEMIC' | 'EXTRA';
interface Course { id: string; name: string; description: string | null; type: string; branchId: string; branchName: string; gradeId: string | null; gradeName: string | null; gradeBillingMode: BillingMode | null; feeStructure: { monthlyBase?: number }; isTaxExempt: boolean; isExtraActivity: boolean; taxPercentage: number; classCount: number; enrollmentCount: number }
interface Grade { id: string; name: string; sortOrder: number; monthlyFee: number; billingMode: BillingMode; studentCount: number }
interface FormState { name: string; branchId: string; gradeId: string; type: string; monthlyBase: string; isTaxExempt: boolean; description: string }

const EMPTY_FORM: FormState = { name: '', branchId: '', gradeId: '', type: 'REGULAR', monthlyBase: '', isTaxExempt: false, description: '' };
const EXTRA_TYPES = [{ value: 'MUSIC', label: 'Music' }, { value: 'SHORT_TERM', label: 'Short-term programme' }, { value: 'LONG_TERM', label: 'Long-term programme' }, { value: 'PERSONALIZED', label: 'Personalized class' }];
const money = (value: number) => `NPR ${value.toLocaleString('en-NP')}`;
const standardBillingMode = (name: string): BillingMode | null => {
  const normalized = name.trim().replace(/\s+/g, ' ');
  if (/^UKG$/i.test(normalized)) return 'GRADE';
  const match = normalized.match(/^(?:Class|Grade)\s*(\d{1,2})$/i);
  if (!match) return null;
  const level = Number(match[1]);
  if (level >= 1 && level <= 10) return 'GRADE';
  if (level === 11 || level === 12) return 'SUBJECT';
  return null;
};
const billingModeFor = (grade: Grade) => standardBillingMode(grade.name) ?? grade.billingMode;
const subjectName = (course: Course) => {
  if (!course.gradeName) return course.name;
  const suffix = ` — ${course.gradeName}`;
  return course.name.endsWith(suffix) ? course.name.slice(0, -suffix.length) : course.name;
};

export function AcademicCourses() {
  const { showToast } = useToast();
  const [courses, setCourses] = useState<Course[]>([]);
  const [branches, setBranches] = useState<Array<{ id: string; name: string }>>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [workspace, setWorkspace] = useState<Workspace>('ACADEMIC');
  const [search, setSearch] = useState('');
  const [expandedGrade, setExpandedGrade] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [editingId, setEditingId] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState('');

  const load = async () => {
    setLoading(true); setError('');
    try {
      const [courseList, branchList, gradeList] = await Promise.all([api.academics.listCourses(), api.branches.list(), api.grades.list()]);
      setCourses(courseList as Course[]); setBranches(branchList as Array<{ id: string; name: string }>); setGrades(gradeList as Grade[]);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Courses could not be loaded.'); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, []);
  useEffect(() => {
    if (!drawerOpen) return;
    const close = (event: KeyboardEvent) => { if (event.key === 'Escape') setDrawerOpen(false); };
    window.addEventListener('keydown', close); return () => window.removeEventListener('keydown', close);
  }, [drawerOpen]);

  const regular = useMemo(() => courses.filter((course) => course.type === 'REGULAR' && !course.isExtraActivity), [courses]);
  const activities = useMemo(() => courses.filter((course) => course.type !== 'REGULAR' || course.isExtraActivity), [courses]);
  const query = search.trim().toLowerCase();
  const filteredRegular = regular.filter((course) => !query || `${course.name} ${course.gradeName} ${course.branchName}`.toLowerCase().includes(query));
  const filteredActivities = activities.filter((course) => !query || `${course.name} ${course.type} ${course.branchName}`.toLowerCase().includes(query));
  const selectedGrade = grades.find((grade) => grade.id === form.gradeId);
  const isAcademicForm = form.type === 'REGULAR';
  const usesPackage = isAcademicForm && selectedGrade ? billingModeFor(selectedGrade) === 'GRADE' : false;

  const groups = useMemo(() => grades.map((grade) => ({ grade, courses: filteredRegular.filter((course) => course.gradeId === grade.id) })).filter((group) => group.courses.length || !query), [grades, filteredRegular, query]);

  const openCreate = (kind: Workspace) => {
    setEditingId(''); setDeleteId('');
    setForm({ ...EMPTY_FORM, type: kind === 'ACADEMIC' ? 'REGULAR' : 'MUSIC', branchId: branches.length === 1 ? branches[0].id : '', gradeId: kind === 'ACADEMIC' ? grades[0]?.id ?? '' : '' });
    setDrawerOpen(true);
  };
  const openEdit = (course: Course) => {
    setEditingId(course.id); setDeleteId('');
    setForm({ name: course.name, branchId: course.branchId, gradeId: course.gradeId ?? '', type: course.type, monthlyBase: String(course.feeStructure?.monthlyBase ?? 0), isTaxExempt: course.isTaxExempt, description: course.description ?? '' });
    setDrawerOpen(true);
  };
  const setField = (field: keyof FormState, value: string | boolean) => setForm((current) => ({ ...current, [field]: value }));

  const saveCourse = async (event: FormEvent) => {
    event.preventDefault();
    const fee = usesPackage ? 0 : Number(form.monthlyBase);
    if (!form.name.trim()) return showToast(isAcademicForm ? 'Subject name is required.' : 'Programme name is required.', 'error');
    if (!form.branchId) return showToast('Select a branch.', 'error');
    if (isAcademicForm && !form.gradeId) return showToast('Select a grade.', 'error');
    if (!Number.isFinite(fee) || fee < 0) return showToast('Enter a valid monthly fee.', 'error');
    setSaving(true);
    const payload = { name: form.name.trim(), description: form.description.trim() || null, type: form.type, feeStructure: { monthlyBase: fee }, isTaxExempt: form.isTaxExempt, gradeId: form.gradeId || null, isExtraActivity: !isAcademicForm };
    try {
      if (editingId) await api.academics.updateCourse(editingId, payload);
      else await api.academics.createCourse({ ...payload, branchId: form.branchId, description: payload.description ?? undefined, gradeId: payload.gradeId ?? undefined });
      showToast(`${isAcademicForm ? 'Subject' : 'Extra class'} ${editingId ? 'updated' : 'created'}.`, 'success'); setDrawerOpen(false); await load();
    } catch (cause) { showToast(cause instanceof Error ? cause.message : 'Course could not be saved.', 'error'); }
    finally { setSaving(false); }
  };

  const remove = async (course: Course) => {
    setSaving(true);
    try { await api.academics.deleteCourse(course.id); setDeleteId(''); showToast('Course deleted.', 'success'); await load(); }
    catch (cause) { showToast(cause instanceof Error ? cause.message : 'Course could not be deleted.', 'error'); }
    finally { setSaving(false); }
  };

  const CourseActions = ({ course }: { course: Course }) => deleteId === course.id ? <div className="course-delete-confirm"><span>Delete?</span><Button variant="danger" onClick={() => void remove(course)} disabled={saving}>Yes</Button><Button variant="outline" onClick={() => setDeleteId('')}>No</Button></div> : <div className="course-row-actions"><Button variant="outline" onClick={() => openEdit(course)} aria-label={`Edit ${course.name}`}><span className="material-symbols-outlined" aria-hidden="true">edit</span></Button><Button variant="outline" onClick={() => setDeleteId(course.id)} aria-label={`Delete ${course.name}`}><span className="material-symbols-outlined" aria-hidden="true">delete</span></Button></div>;

  return <div className="people-page course-catalogue-page">
    <header className="people-header"><div><h1 className="people-title">Courses and extra classes</h1><p className="people-subtitle">Organize academic subjects separately from optional programmes and activities.</p></div><Button onClick={() => openCreate(workspace)}><span className="material-symbols-outlined" aria-hidden="true">add</span>{workspace === 'ACADEMIC' ? 'Add subject' : 'Add extra class'}</Button></header>

    <section className="course-overview" aria-label="Course summary"><div><span>Academic subjects</span><strong>{regular.length}</strong></div><div><span>Extra classes</span><strong>{activities.length}</strong></div><div><span>Active classes</span><strong>{courses.reduce((sum, course) => sum + course.classCount, 0)}</strong></div><div><span>Enrolments</span><strong>{courses.reduce((sum, course) => sum + course.enrollmentCount, 0)}</strong></div></section>

    <div className="course-workspace-tabs" role="tablist" aria-label="Course workspace"><button role="tab" aria-selected={workspace === 'ACADEMIC'} onClick={() => setWorkspace('ACADEMIC')}><span className="material-symbols-outlined" aria-hidden="true">school</span><span><strong>Academic subjects</strong><small>UKG–Class 12 curriculum</small></span></button><button role="tab" aria-selected={workspace === 'EXTRA'} onClick={() => setWorkspace('EXTRA')}><span className="material-symbols-outlined" aria-hidden="true">extension</span><span><strong>Extra classes</strong><small>Music, short-term and personalized</small></span></button></div>

    <section className="course-toolbar"><label htmlFor="course-search"><span className="material-symbols-outlined" aria-hidden="true">search</span><input id="course-search" type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder={workspace === 'ACADEMIC' ? 'Search subjects, grades, or branches' : 'Search extra classes'} /></label>{workspace === 'ACADEMIC' ? <Button variant="outline" onClick={() => setBulkOpen(true)}><span className="material-symbols-outlined" aria-hidden="true">stacks</span>Add subjects in bulk</Button> : null}<Button variant="outline" onClick={() => void load()} disabled={loading}><span className="material-symbols-outlined" aria-hidden="true">refresh</span>Refresh</Button></section>

    {error ? <section className="course-error" role="alert"><div><strong>Courses could not be loaded</strong><p>{error}</p></div><Button variant="outline" onClick={() => void load()}>Try again</Button></section> : null}
    {loading ? <section className="course-skeleton-list">{Array.from({ length: 4 }, (_, index) => <div key={index} />)}</section> : null}

    {!loading && workspace === 'ACADEMIC' ? <section className="course-grade-list" aria-label="Academic subjects by grade">
      {!groups.length ? <div className="course-empty"><span className="material-symbols-outlined" aria-hidden="true">menu_book</span><strong>No matching subjects</strong><p>Clear the search or add subjects to the grade ladder.</p><Button onClick={() => openCreate('ACADEMIC')}>Add subject</Button></div> : groups.map(({ grade, courses: gradeCourses }) => {
        const expanded = expandedGrade === grade.id;
        const billingMode = billingModeFor(grade);
        const usesGradePackage = billingMode === 'GRADE';
        const selections = gradeCourses.reduce((sum, course) => sum + course.enrollmentCount, 0);
        const missingPrices = usesGradePackage ? 0 : gradeCourses.filter((course) => (course.feeStructure.monthlyBase ?? 0) <= 0).length;
        return <article className={`course-grade-card${expanded ? ' is-expanded' : ''}`} key={grade.id}><button className="course-grade-summary" type="button" onClick={() => setExpandedGrade(expanded ? '' : grade.id)} aria-expanded={expanded}><span className="course-grade-title"><span className="material-symbols-outlined" aria-hidden="true">school</span><span><strong>{grade.name}</strong><small className={usesGradePackage && grade.monthlyFee <= 0 ? 'is-warning' : ''}>{usesGradePackage ? (grade.monthlyFee > 0 ? `${money(grade.monthlyFee)} monthly package` : 'Monthly grade fee not configured') : 'Students pay only for selected subjects'}</small></span></span><span><small>Subjects</small><strong>{gradeCourses.length}</strong></span><span><small>{usesGradePackage ? 'Students in grade' : 'Subject selections'}</small><strong>{usesGradePackage ? grade.studentCount : selections}</strong></span><StatusBadge variant={missingPrices || (usesGradePackage && grade.monthlyFee <= 0) ? 'gold' : usesGradePackage ? 'info' : 'success'}>{missingPrices ? `${missingPrices} prices required` : usesGradePackage && grade.monthlyFee <= 0 ? 'Fee required' : usesGradePackage ? 'Grade billing' : 'Per subject'}</StatusBadge><span className="material-symbols-outlined course-grade-chevron" aria-hidden="true">expand_more</span></button>
          {expanded ? <div className="course-grade-panel">{gradeCourses.length ? gradeCourses.map((course) => {
            const fee = course.feeStructure.monthlyBase ?? 0;
            return <div className={`course-subject-row${usesGradePackage ? ' is-package' : ''}`} key={course.id}><div><strong>{subjectName(course)}</strong><small>{course.branchName}{course.description ? ` · ${course.description}` : ''}</small></div><div className={`course-price${!usesGradePackage && fee <= 0 ? ' is-missing' : ''}`}><small>{usesGradePackage ? 'Billing' : 'Monthly price'}</small><strong>{usesGradePackage ? 'Included in grade tuition' : fee > 0 ? money(fee) : 'Price required'}</strong></div><div><small>Classes</small><strong>{course.classCount}</strong></div>{usesGradePackage ? <div className="course-policy-state"><small>Student billing</small><strong>Uses grade assignment</strong></div> : <div><small>Selected</small><strong>{course.enrollmentCount}</strong></div>}<CourseActions course={course} /></div>;
          }) : <div className="course-inline-empty"><span>No subjects added yet.</span><Button onClick={() => { setForm({ ...EMPTY_FORM, branchId: branches[0]?.id ?? '', gradeId: grade.id }); setEditingId(''); setDrawerOpen(true); }}>Add first subject</Button></div>}</div> : null}
        </article>;
      })}
    </section> : null}

    {!loading && workspace === 'EXTRA' ? <section className="course-activity-grid" aria-label="Extra classes">
      {!filteredActivities.length ? <div className="course-empty"><span className="material-symbols-outlined" aria-hidden="true">extension</span><strong>No extra classes yet</strong><p>Add music, coaching, short-term, or personalized programmes here.</p><Button onClick={() => openCreate('EXTRA')}>Add extra class</Button></div> : filteredActivities.map((course) => <article className="course-activity-card" key={course.id}><div className="course-activity-head"><span className="material-symbols-outlined" aria-hidden="true">{course.type === 'MUSIC' ? 'music_note' : course.type === 'PERSONALIZED' ? 'person' : 'event_note'}</span><StatusBadge variant="info">{EXTRA_TYPES.find((type) => type.value === course.type)?.label ?? course.type}</StatusBadge></div><h2>{course.name}</h2><p>{course.description || 'Optional programme billed separately from grade tuition.'}</p><dl><div><dt>Branch</dt><dd>{course.branchName}</dd></div><div><dt>Monthly fee</dt><dd>{money(course.feeStructure.monthlyBase ?? 0)}</dd></div><div><dt>Classes</dt><dd>{course.classCount}</dd></div><div><dt>Enrolled</dt><dd>{course.enrollmentCount}</dd></div></dl><CourseActions course={course} /></article>)}
    </section> : null}

    {bulkOpen ? <BulkCourseCreate branches={branches} grades={grades} onClose={() => setBulkOpen(false)} onCreated={() => void load()} /> : null}
    {drawerOpen ? <><button className="people-drawer-overlay" onClick={() => setDrawerOpen(false)} aria-label="Close course form" /><aside className="people-drawer course-drawer" role="dialog" aria-modal="true" aria-labelledby="course-drawer-title"><div className="people-drawer-head"><div><h2 id="course-drawer-title">{editingId ? 'Edit' : 'Add'} {isAcademicForm ? 'academic subject' : 'extra class'}</h2><p>{isAcademicForm ? 'Subjects inherit the billing rule configured for their grade.' : 'Optional programmes are billed separately from tuition.'}</p></div><button type="button" className="people-drawer-close" onClick={() => setDrawerOpen(false)} aria-label="Close"><span className="material-symbols-outlined" aria-hidden="true">close</span></button></div>
      <form onSubmit={saveCourse} className="course-form" aria-busy={saving}><div className="people-drawer-body">
        {!editingId ? <fieldset className="course-kind-picker"><legend>What are you adding?</legend><label><input type="radio" name="kind" checked={isAcademicForm} onChange={() => setField('type', 'REGULAR')} /><span className="material-symbols-outlined" aria-hidden="true">school</span><span><strong>Academic subject</strong><small>Part of a grade curriculum</small></span></label><label><input type="radio" name="kind" checked={!isAcademicForm} onChange={() => setField('type', 'MUSIC')} /><span className="material-symbols-outlined" aria-hidden="true">extension</span><span><strong>Extra class</strong><small>Optional and billed separately</small></span></label></fieldset> : null}
        <div className="people-field"><label htmlFor="course-name">{isAcademicForm ? 'Subject name' : 'Programme name'}</label><input id="course-name" value={form.name} onChange={(event) => setField('name', event.target.value)} placeholder={isAcademicForm ? 'Example: Physics' : 'Example: Guitar lessons'} autoComplete="off" required /></div>
        <div className="people-field-row"><div className="people-field"><label htmlFor="course-branch">Branch</label>{editingId || branches.length === 1 ? <input id="course-branch" value={branches.find((branch) => branch.id === form.branchId)?.name ?? ''} readOnly /> : <select id="course-branch" value={form.branchId} onChange={(event) => setField('branchId', event.target.value)} required><option value="">Select branch</option>{branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</select>}</div><div className="people-field"><label htmlFor="course-grade">{isAcademicForm ? 'Grade' : 'Eligible grade (optional)'}</label><select id="course-grade" value={form.gradeId} onChange={(event) => setField('gradeId', event.target.value)} required={isAcademicForm}><option value="">{isAcademicForm ? 'Select grade' : 'Any grade'}</option>{grades.map((grade) => <option key={grade.id} value={grade.id}>{grade.name}</option>)}</select></div></div>
        {!isAcademicForm ? <div className="people-field"><label htmlFor="course-type">Extra class type</label><select id="course-type" value={form.type} onChange={(event) => setField('type', event.target.value)}>{EXTRA_TYPES.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}</select></div> : null}
        {usesPackage ? <div className="course-package-note"><span className="material-symbols-outlined" aria-hidden="true">inventory_2</span><div><strong>Included in {selectedGrade?.name} tuition</strong><p>This subject adds no separate charge. The grade package controls the monthly fee.</p></div></div> : <div className="people-field"><label htmlFor="course-fee">Monthly fee (NPR)</label><input id="course-fee" value={form.monthlyBase} onChange={(event) => setField('monthlyBase', event.target.value)} inputMode="numeric" pattern="[0-9]*" placeholder="2500" required /><small>{isAcademicForm ? 'Added for every student enrolled in this subject.' : 'Added separately to enrolled students’ monthly invoices.'}</small></div>}
        <div className="people-field"><label htmlFor="course-description">Description (optional)</label><textarea id="course-description" value={form.description} onChange={(event) => setField('description', event.target.value)} rows={3} placeholder="What students learn or who this programme is for" /></div>
        {!usesPackage ? <label className="course-tax-toggle"><input type="checkbox" checked={form.isTaxExempt} onChange={(event) => setField('isTaxExempt', event.target.checked)} /><span><strong>Tax-exempt</strong><small>No VAT will be added to this fee.</small></span></label> : null}
      </div><div className="people-drawer-foot"><Button type="submit" disabled={saving}>{saving ? 'Saving…' : editingId ? 'Save changes' : isAcademicForm ? 'Add subject' : 'Add extra class'}</Button><Button type="button" variant="outline" onClick={() => setDrawerOpen(false)}>Cancel</Button></div></form></aside></> : null}
  </div>;
}
