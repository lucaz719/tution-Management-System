import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { BulkCourseCreate } from '../components/BulkCourseCreate';
import { Button } from '../components/ui/Button';
import { StatusBadge } from '../components/ui/StatusBadge';
import { useToast } from '../components/ui/Toast';
import { api } from '../services/api';

interface Course {
  id: string;
  name: string;
  description: string | null;
  type: string;
  branchId: string;
  branchName: string;
  gradeId: string | null;
  gradeName: string | null;
  feeStructure: { monthlyBase?: number } & Record<string, unknown>;
  isTaxExempt: boolean;
  taxPercentage: number;
  classCount: number;
  enrollmentCount: number;
  createdAt: string;
}

const COURSE_TYPES = ['REGULAR', 'MUSIC', 'SHORT_TERM', 'LONG_TERM', 'PERSONALIZED'];

interface FormState {
  name: string;
  branchId: string;
  gradeId: string;
  type: string;
  monthlyBase: string;
  isTaxExempt: boolean;
  description: string;
}

const EMPTY_FORM: FormState = { name: '', branchId: '', gradeId: '', type: 'REGULAR', monthlyBase: '', isTaxExempt: false, description: '' };

function CourseRowActions({ course, onEdit, onDelete, busyId }: {
  course: Course;
  onEdit: (c: Course) => void;
  onDelete: (c: Course) => void | Promise<void>;
  busyId: string;
}) {
  return (
    <div style={{ display: 'inline-flex', gap: '8px' }}>
      <Button variant="outline" onClick={() => onEdit(course)} style={{ minHeight: '34px', height: '34px', padding: '6px 12px', borderColor: 'rgba(21, 96, 189, 0.16)' }}>
        <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>edit</span>
      </Button>
      <Button variant="outline" onClick={() => void onDelete(course)} disabled={busyId === course.id} style={{ minHeight: '34px', height: '34px', padding: '6px 12px', color: 'var(--color-error)', borderColor: 'rgba(230, 57, 70, 0.4)' }}>
        <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>delete</span>
      </Button>
    </div>
  );
}

// A grade header row followed by the grade's courses.
function GroupRows({ label, courses, onEdit, onDelete, busyId }: {
  label: string;
  courses: Course[];
  onEdit: (c: Course) => void;
  onDelete: (c: Course) => void | Promise<void>;
  busyId: string;
}) {
  return (
    <>
      <tr>
        <td colSpan={6} style={{ background: 'var(--color-bg)', padding: '8px 16px' }}>
          <span style={{ fontWeight: 700, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-primary)' }}>{label}</span>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)', marginLeft: '8px' }}>{courses.length} course{courses.length === 1 ? '' : 's'}</span>
        </td>
      </tr>
      {courses.map((course) => (
        <tr key={course.id}>
          <td>
            <div className="people-person-name">{course.name}</div>
            {course.description ? <div className="people-person-email">{course.description}</div> : null}
          </td>
          <td><span style={{ fontSize: '13.5px' }}>{course.branchName}</span></td>
          <td>
            <div style={{ fontSize: '14px', fontWeight: 700 }}>NPR {(course.feeStructure?.monthlyBase ?? 0).toLocaleString()}</div>
            {course.isTaxExempt ? (
              <StatusBadge status="success">Tax-Exempt (0% VAT)</StatusBadge>
            ) : (
              <div style={{ fontSize: '11px', color: 'var(--color-primary-light)', marginTop: '2px', fontWeight: 600 }}>
                Incl. 13% VAT: NPR {Math.round((course.feeStructure?.monthlyBase ?? 0) * 1.13).toLocaleString()}
              </div>
            )}
          </td>
          <td><span style={{ fontSize: '14px' }}>{course.classCount}</span></td>
          <td><span style={{ fontSize: '14px' }}>{course.enrollmentCount}</span></td>
          <td style={{ textAlign: 'right' }}>
            <CourseRowActions course={course} onEdit={onEdit} onDelete={onDelete} busyId={busyId} />
          </td>
        </tr>
      ))}
    </>
  );
}

export function AcademicCourses() {
  const { showToast } = useToast();
  const [courses, setCourses] = useState<Course[]>([]);
  const [branches, setBranches] = useState<Array<{ id: string; name: string }>>([]);
  const [grades, setGrades] = useState<Array<{ id: string; name: string; sortOrder: number }>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [editingId, setEditingId] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [busyId, setBusyId] = useState('');

  const loadData = async () => {
    setIsLoading(true);
    setErrorMsg('');
    try {
      const [courseList, branchList, gradeList] = await Promise.all([api.academics.listCourses(), api.branches.list(), api.grades.list().catch(() => [])]);
      setCourses(courseList as Course[]);
      setBranches((branchList as Array<{ id: string; name: string }>).map((b) => ({ id: b.id, name: b.name })));
      setGrades((gradeList as Array<{ id: string; name: string; sortOrder: number }>).map((g) => ({ id: g.id, name: g.name, sortOrder: g.sortOrder ?? 99 })));
    } catch (error: unknown) {
      setErrorMsg(error instanceof Error ? error.message : 'Failed to load courses.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return courses.filter((c) => {
      const matchesSearch = !term || c.name.toLowerCase().includes(term) || c.branchName.toLowerCase().includes(term);
      const matchesType = typeFilter === 'ALL' || c.type === typeFilter;
      return matchesSearch && matchesType;
    });
  }, [courses, search, typeFilter]);

  const totalEnrollments = useMemo(() => courses.reduce((sum, c) => sum + c.enrollmentCount, 0), [courses]);
  const totalClasses = useMemo(() => courses.reduce((sum, c) => sum + c.classCount, 0), [courses]);

  // Grade courses (REGULAR) grouped by grade in ladder order; everything else
  // (music, short/long-term, personalized) lives in the Extra Activities card.
  const gradeCourses = useMemo(() => filtered.filter((c) => c.type === 'REGULAR'), [filtered]);
  const activityCourses = useMemo(() => filtered.filter((c) => c.type !== 'REGULAR'), [filtered]);
  const totalGradeCourses = useMemo(() => courses.filter((c) => c.type === 'REGULAR').length, [courses]);
  const totalActivityCourses = courses.length - totalGradeCourses;

  const gradeGroups = useMemo(() => {
    const order = new Map(grades.map((g) => [g.id, g.sortOrder]));
    const groups = new Map<string, { label: string; sortOrder: number; courses: Course[] }>();
    for (const course of gradeCourses) {
      const key = course.gradeId ?? 'ungraded';
      const group = groups.get(key) ?? {
        label: course.gradeName ?? 'No grade set',
        sortOrder: course.gradeId ? order.get(course.gradeId) ?? 98 : 99,
        courses: [],
      };
      group.courses.push(course);
      groups.set(key, group);
    }
    return Array.from(groups.values())
      .sort((a, b) => a.sortOrder - b.sortOrder || a.label.localeCompare(b.label))
      .map((g) => ({ ...g, courses: [...g.courses].sort((a, b) => a.name.localeCompare(b.name)) }));
  }, [gradeCourses, grades]);

  const openDrawer = (type: string = 'REGULAR') => {
    setEditingId('');
    setForm({ ...EMPTY_FORM, type, branchId: branches.length === 1 ? branches[0].id : '' });
    setDrawerOpen(true);
  };
  const openEdit = (course: Course) => {
    setEditingId(course.id);
    setForm({
      name: course.name,
      branchId: course.branchId,
      gradeId: course.gradeId ?? '',
      type: course.type,
      monthlyBase: String(course.feeStructure?.monthlyBase ?? ''),
      isTaxExempt: course.isTaxExempt,
      description: course.description ?? '',
    });
    setDrawerOpen(true);
  };
  const setField = (field: keyof FormState, value: string | boolean) => setForm((c) => ({ ...c, [field]: value }));

  const handleDelete = async (course: Course) => {
    if (!window.confirm(`Delete "${course.name}"? This cannot be undone.`)) return;
    setBusyId(course.id);
    try {
      await api.academics.deleteCourse(course.id);
      showToast('Course deleted.', 'success');
      await loadData();
    } catch (error: unknown) {
      showToast(error instanceof Error ? error.message : 'Failed to delete the course.', 'error');
    } finally {
      setBusyId('');
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form.name.trim()) return showToast('Course name is required.', 'error');
    if (!form.branchId) return showToast('Select a branch.', 'error');
    const fee = Number(form.monthlyBase);
    if (!Number.isFinite(fee) || fee < 0) return showToast('Enter a valid monthly fee.', 'error');

    setIsSaving(true);
    try {
      if (editingId) {
        await api.academics.updateCourse(editingId, {
          name: form.name.trim(),
          description: form.description.trim() || null,
          type: form.type,
          feeStructure: { monthlyBase: fee },
          isTaxExempt: form.isTaxExempt,
          gradeId: form.gradeId || null,
        });
        showToast('Course updated.', 'success');
      } else {
        await api.academics.createCourse({
          branchId: form.branchId,
          gradeId: form.gradeId || undefined,
          name: form.name.trim(),
          description: form.description.trim() || undefined,
          type: form.type,
          feeStructure: { monthlyBase: fee },
          isTaxExempt: form.isTaxExempt,
        });
        showToast('Course created.', 'success');
      }
      setDrawerOpen(false);
      setEditingId('');
      await loadData();
    } catch (error: unknown) {
      showToast(error instanceof Error ? error.message : 'Failed to save the course.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const singleBranch = branches.length <= 1;

  return (
    <div className="people-page">
      <div className="people-header">
        <div>
          <h1 className="people-title">Courses</h1>
          <p className="people-subtitle">Programmes offered across your branches, with fees and tax treatment.</p>
        </div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <Button variant="outline" onClick={() => setBulkOpen(true)} style={{ height: '42px' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>stacks</span>
            Bulk Add by Grade
          </Button>
          <Button onClick={() => openDrawer()} style={{ height: '42px' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>library_add</span>
            Add Course
          </Button>
        </div>
      </div>

      {errorMsg ? <StatusBadge variant="error">{errorMsg}</StatusBadge> : null}

      <div className="people-stats">
        <div className="people-stat" style={{ ['--stat-accent' as string]: 'var(--color-primary)' }}>
          <span className="people-stat-value">{totalGradeCourses}</span>
          <span className="people-stat-label">Grade Courses</span>
        </div>
        <div className="people-stat" style={{ ['--stat-accent' as string]: 'var(--color-accent)' }}>
          <span className="people-stat-value">{totalActivityCourses}</span>
          <span className="people-stat-label">Extra Activities</span>
        </div>
        <div className="people-stat" style={{ ['--stat-accent' as string]: 'var(--color-info)' }}>
          <span className="people-stat-value">{totalClasses}</span>
          <span className="people-stat-label">Classes</span>
        </div>
        <div className="people-stat" style={{ ['--stat-accent' as string]: 'var(--color-success)' }}>
          <span className="people-stat-value">{totalEnrollments}</span>
          <span className="people-stat-label">Enrollments</span>
        </div>
      </div>

      <div className="people-toolbar">
        <div className="people-search">
          <span className="material-symbols-outlined">search</span>
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search courses…" />
        </div>
        <select className="people-filter" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
          <option value="ALL">All types</option>
          {COURSE_TYPES.map((t) => (
            <option key={t} value={t}>{t.replace('_', ' ')}</option>
          ))}
        </select>
        <Button variant="outline" onClick={() => void loadData()} disabled={isLoading} style={{ height: '42px' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>refresh</span>
          Refresh
        </Button>
      </div>

      {/* ── Grade courses, grouped by the school ladder ── */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: '6px 0 10px' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '20px', color: 'var(--color-primary)' }}>school</span>
          <div>
            <h2 style={{ fontSize: '16.5px', fontWeight: 700, color: 'var(--text)' }}>Grade Courses</h2>
            <p style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}>Regular subjects, organised Nursery → Class 12.</p>
          </div>
        </div>
        <div className="people-table-wrap">
          <div className="people-table-scroll">
            <table className="people-table">
              <thead>
                <tr>
                  <th>Course</th>
                  <th>Branch</th>
                  <th>Monthly Fee</th>
                  <th>Classes</th>
                  <th>Enrolled</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {gradeCourses.length === 0 ? (
                  <tr>
                    <td colSpan={6}>
                      <div className="people-empty">
                        <span className="material-symbols-outlined">menu_book</span>
                        {isLoading ? 'Loading courses…' : totalGradeCourses === 0 ? 'No grade courses yet. Use “Bulk Add by Grade” to set up the whole ladder in one go.' : 'No matches for your filters.'}
                      </div>
                    </td>
                  </tr>
                ) : (
                  gradeGroups.map((group) => (
                    <GroupRows key={group.label} label={group.label} courses={group.courses} onEdit={openEdit} onDelete={handleDelete} busyId={busyId} />
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ── Extra activity classes (music, short/long-term, personalized) ── */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', margin: '18px 0 10px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '20px', color: 'var(--color-accent)' }}>sports_esports</span>
            <div>
              <h2 style={{ fontSize: '16.5px', fontWeight: 700, color: 'var(--text)' }}>Extra Activity Classes</h2>
              <p style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}>Music, short-term, long-term, and personalized programmes billed alongside tuition.</p>
            </div>
          </div>
          <Button variant="outline" onClick={() => openDrawer('MUSIC')} style={{ height: '36px' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '17px' }}>add</span>
            Add Activity
          </Button>
        </div>
        <div className="people-table-wrap">
          <div className="people-table-scroll">
            <table className="people-table">
              <thead>
                <tr>
                  <th>Activity</th>
                  <th>Type</th>
                  <th>Branch</th>
                  <th>Monthly Fee</th>
                  <th>Classes</th>
                  <th>Enrolled</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {activityCourses.length === 0 ? (
                  <tr>
                    <td colSpan={7}>
                      <div className="people-empty">
                        <span className="material-symbols-outlined">music_note</span>
                        {isLoading ? 'Loading…' : totalActivityCourses === 0 ? 'No extra activities yet. Add music, sports, or other programmes here.' : 'No matches for your filters.'}
                      </div>
                    </td>
                  </tr>
                ) : (
                  activityCourses.map((course) => (
                    <tr key={course.id}>
                      <td>
                        <div className="people-person-name">{course.name}</div>
                        {course.description ? <div className="people-person-email">{course.description}</div> : null}
                      </td>
                      <td><span className="people-role-tag">{course.type.replace('_', ' ')}</span></td>
                      <td><span style={{ fontSize: '13.5px' }}>{course.branchName}</span></td>
                      <td>
                        <span style={{ fontSize: '14px', fontWeight: 700 }}>NPR {(course.feeStructure?.monthlyBase ?? 0).toLocaleString()}</span>
                        {course.isTaxExempt ? <StatusBadge variant="info">Tax-exempt</StatusBadge> : null}
                      </td>
                      <td><span style={{ fontSize: '14px' }}>{course.classCount}</span></td>
                      <td><span style={{ fontSize: '14px' }}>{course.enrollmentCount}</span></td>
                      <td style={{ textAlign: 'right' }}>
                        <CourseRowActions course={course} onEdit={openEdit} onDelete={handleDelete} busyId={busyId} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {bulkOpen ? (
        <BulkCourseCreate
          branches={branches}
          grades={grades}
          onClose={() => setBulkOpen(false)}
          onCreated={() => void loadData()}
        />
      ) : null}

      {drawerOpen ? (
        <>
          <div className="people-drawer-overlay" onClick={() => setDrawerOpen(false)} />
          <aside className="people-drawer" role="dialog" aria-modal="true">
            <div className="people-drawer-head">
              <div>
                <h2>{editingId ? 'Edit Course' : 'Add Course'}</h2>
                <p>{editingId ? 'Update the programme details, fee, or grade. Branch is fixed after creation.' : 'Define a programme and its base monthly fee. Classes and enrolments are added later.'}</p>
              </div>
              <button type="button" className="people-drawer-close" onClick={() => setDrawerOpen(false)} aria-label="Close">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <form onSubmit={handleSubmit} style={{ display: 'contents' }}>
              <div className="people-drawer-body">
                <div className="people-field">
                  <label>Course name</label>
                  <input value={form.name} onChange={(e) => setField('name', e.target.value)} placeholder="Grade 10 Physics" required />
                </div>
                <div className="people-field-row">
                  <div className="people-field">
                    <label>Type</label>
                    <select value={form.type} onChange={(e) => setField('type', e.target.value)}>
                      {COURSE_TYPES.map((t) => (
                        <option key={t} value={t}>{t.replace('_', ' ')}</option>
                      ))}
                    </select>
                  </div>
                  <div className="people-field">
                    <label>Monthly fee (NPR)</label>
                    <input value={form.monthlyBase} onChange={(e) => setField('monthlyBase', e.target.value)} placeholder="2500" inputMode="numeric" required />
                  </div>
                </div>
                <div className="people-field-row">
                  <div className="people-field">
                    <label>Branch</label>
                    {editingId ? (
                      <input value={branches.find((b) => b.id === form.branchId)?.name ?? '—'} disabled />
                    ) : singleBranch && branches[0] ? (
                      <input value={branches[0].name} disabled />
                    ) : (
                      <select value={form.branchId} onChange={(e) => setField('branchId', e.target.value)} required>
                        <option value="">Select a branch…</option>
                        {branches.map((b) => (
                          <option key={b.id} value={b.id}>{b.name}</option>
                        ))}
                      </select>
                    )}
                  </div>
                  <div className="people-field">
                    <label>Grade <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>(optional)</span></label>
                    <select value={form.gradeId} onChange={(e) => setField('gradeId', e.target.value)}>
                      <option value="">Any / not set</option>
                      {grades.map((g) => (
                        <option key={g.id} value={g.id}>{g.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="people-field">
                  <label>Description <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>(optional)</span></label>
                  <input value={form.description} onChange={(e) => setField('description', e.target.value)} placeholder="Short summary of the programme" />
                </div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13.5px', fontWeight: 600, color: 'var(--text)', cursor: 'pointer' }}>
                  <input type="checkbox" checked={form.isTaxExempt} onChange={(e) => setField('isTaxExempt', e.target.checked)} />
                  Tax-exempt (no VAT applied on invoices)
                </label>
              </div>
              <div className="people-drawer-foot">
                <Button type="submit" disabled={isSaving} style={{ flex: 1 }}>{isSaving ? 'Saving…' : editingId ? 'Save Changes' : 'Create Course'}</Button>
                <Button type="button" variant="outline" onClick={() => setDrawerOpen(false)}>Cancel</Button>
              </div>
            </form>
          </aside>
        </>
      ) : null}
    </div>
  );
}
