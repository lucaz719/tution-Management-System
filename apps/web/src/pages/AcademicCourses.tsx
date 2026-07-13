import { useEffect, useMemo, useState, type FormEvent } from 'react';
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

export function AcademicCourses() {
  const { showToast } = useToast();
  const [courses, setCourses] = useState<Course[]>([]);
  const [branches, setBranches] = useState<Array<{ id: string; name: string }>>([]);
  const [grades, setGrades] = useState<Array<{ id: string; name: string }>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [isSaving, setIsSaving] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    setErrorMsg('');
    try {
      const [courseList, branchList, gradeList] = await Promise.all([api.academics.listCourses(), api.branches.list(), api.grades.list().catch(() => [])]);
      setCourses(courseList as Course[]);
      setBranches((branchList as Array<{ id: string; name: string }>).map((b) => ({ id: b.id, name: b.name })));
      setGrades((gradeList as Array<{ id: string; name: string }>).map((g) => ({ id: g.id, name: g.name })));
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

  const openDrawer = () => {
    setForm({ ...EMPTY_FORM, branchId: branches.length === 1 ? branches[0].id : '' });
    setDrawerOpen(true);
  };
  const setField = (field: keyof FormState, value: string | boolean) => setForm((c) => ({ ...c, [field]: value }));

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form.name.trim()) return showToast('Course name is required.', 'error');
    if (!form.branchId) return showToast('Select a branch.', 'error');
    const fee = Number(form.monthlyBase);
    if (!Number.isFinite(fee) || fee < 0) return showToast('Enter a valid monthly fee.', 'error');

    setIsSaving(true);
    try {
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
      setDrawerOpen(false);
      await loadData();
    } catch (error: unknown) {
      showToast(error instanceof Error ? error.message : 'Failed to create the course.', 'error');
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
        <Button onClick={openDrawer} style={{ height: '42px' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>library_add</span>
          Add Course
        </Button>
      </div>

      {errorMsg ? <StatusBadge variant="error">{errorMsg}</StatusBadge> : null}

      <div className="people-stats">
        <div className="people-stat" style={{ ['--stat-accent' as string]: 'var(--color-primary)' }}>
          <span className="people-stat-value">{courses.length}</span>
          <span className="people-stat-label">Courses</span>
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

      <div className="people-table-wrap">
        <div className="people-table-scroll">
          <table className="people-table">
            <thead>
              <tr>
                <th>Course</th>
                <th>Grade</th>
                <th>Type</th>
                <th>Branch</th>
                <th>Monthly Fee</th>
                <th>Classes</th>
                <th>Enrolled</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7}>
                    <div className="people-empty">
                      <span className="material-symbols-outlined">menu_book</span>
                      {isLoading ? 'Loading courses…' : courses.length === 0 ? 'No courses yet. Add your first programme.' : 'No matches for your filters.'}
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((course) => (
                  <tr key={course.id}>
                    <td>
                      <div className="people-person-name">{course.name}</div>
                      {course.description ? <div className="people-person-email">{course.description}</div> : null}
                    </td>
                    <td>{course.gradeName ? <span className="people-role-tag">{course.gradeName}</span> : <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>—</span>}</td>
                    <td><span className="people-role-tag">{course.type.replace('_', ' ')}</span></td>
                    <td><span style={{ fontSize: '13.5px' }}>{course.branchName}</span></td>
                    <td>
                      <span style={{ fontSize: '14px', fontWeight: 700 }}>NPR {(course.feeStructure?.monthlyBase ?? 0).toLocaleString()}</span>
                      {course.isTaxExempt ? <StatusBadge variant="info">Tax-exempt</StatusBadge> : null}
                    </td>
                    <td><span style={{ fontSize: '14px' }}>{course.classCount}</span></td>
                    <td><span style={{ fontSize: '14px' }}>{course.enrollmentCount}</span></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {drawerOpen ? (
        <>
          <div className="people-drawer-overlay" onClick={() => setDrawerOpen(false)} />
          <aside className="people-drawer" role="dialog" aria-modal="true">
            <div className="people-drawer-head">
              <div>
                <h2>Add Course</h2>
                <p>Define a programme and its base monthly fee. Classes and enrolments are added later.</p>
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
                    {singleBranch && branches[0] ? (
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
                <Button type="submit" disabled={isSaving} style={{ flex: 1 }}>{isSaving ? 'Creating…' : 'Create Course'}</Button>
                <Button type="button" variant="outline" onClick={() => setDrawerOpen(false)}>Cancel</Button>
              </div>
            </form>
          </aside>
        </>
      ) : null}
    </div>
  );
}
