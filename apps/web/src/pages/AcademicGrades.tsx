import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Button } from '../components/ui/Button';
import { StatusBadge } from '../components/ui/StatusBadge';
import { useToast } from '../components/ui/Toast';
import { api } from '../services/api';

type BillingMode = 'GRADE' | 'SUBJECT';
interface Grade { id: string; name: string; sortOrder: number; monthlyFee: number; billingMode: BillingMode; studentCount: number; courseCount: number }
interface GradeDetail { courses: Array<{ id: string; name: string; branchName: string; enrollmentCount: number }>; teachers: Array<{ id: string; name: string }> }
const money = (value: number) => `NPR ${value.toLocaleString('en-NP')}`;
const standardBillingMode = (name: string): BillingMode | null => {
  if (/^UKG$/i.test(name.trim())) return 'GRADE';
  const match = name.trim().match(/^(?:Class|Grade)\s*(\d{1,2})$/i);
  const level = Number(match?.[1]);
  return level >= 1 && level <= 10 ? 'GRADE' : level === 11 || level === 12 ? 'SUBJECT' : null;
};

export function AcademicGrades() {
  const { showToast } = useToast();
  const [grades, setGrades] = useState<Grade[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState('');
  const [newName, setNewName] = useState('');
  const [expandedId, setExpandedId] = useState('');
  const [editingId, setEditingId] = useState('');
  const [deleteId, setDeleteId] = useState('');
  const [editName, setEditName] = useState('');
  const [editFee, setEditFee] = useState('');
  const [editMode, setEditMode] = useState<BillingMode>('GRADE');
  const [detail, setDetail] = useState<GradeDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const load = async () => {
    setLoading(true); setError('');
    try { setGrades((await api.grades.list()) as Grade[]); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Grades could not be loaded.'); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, []);

  const totals = useMemo(() => ({
    students: grades.reduce((sum, grade) => sum + grade.studentCount, 0),
    packages: grades.filter((grade) => (standardBillingMode(grade.name) ?? grade.billingMode) === 'GRADE').length,
    subjects: grades.filter((grade) => (standardBillingMode(grade.name) ?? grade.billingMode) === 'SUBJECT').length,
  }), [grades]);

  const seedDefaults = async () => {
    setBusyId('seed');
    try { const result = await api.grades.seedDefaults(); showToast(result.message, result.created ? 'success' : 'info'); await load(); }
    catch (cause) { showToast(cause instanceof Error ? cause.message : 'Standard grades could not be added.', 'error'); }
    finally { setBusyId(''); }
  };

  const addGrade = async (event: FormEvent) => {
    event.preventDefault(); const name = newName.trim(); if (!name) return;
    setBusyId('new');
    try {
      await api.grades.create(name, grades.length, 0, /(?:11|12)$/.test(name) ? 'SUBJECT' : 'GRADE');
      setNewName(''); showToast(`${name} added. Configure its billing below.`, 'success'); await load();
    } catch (cause) { showToast(cause instanceof Error ? cause.message : 'Grade could not be added.', 'error'); }
    finally { setBusyId(''); }
  };

  const toggle = async (grade: Grade) => {
    if (expandedId === grade.id) { setExpandedId(''); setEditingId(''); setDeleteId(''); return; }
    setExpandedId(grade.id); setEditingId(''); setDeleteId(''); setDetail(null); setDetailLoading(true);
    try { setDetail((await api.grades.getDetail(grade.id)) as GradeDetail); }
    catch (cause) { showToast(cause instanceof Error ? cause.message : 'Grade details could not be loaded.', 'error'); }
    finally { setDetailLoading(false); }
  };

  const beginEdit = (grade: Grade) => {
    setEditingId(grade.id); setDeleteId(''); setEditName(grade.name); setEditFee(String(grade.monthlyFee)); setEditMode(standardBillingMode(grade.name) ?? grade.billingMode);
  };

  const save = async (grade: Grade) => {
    const fee = Number(editFee);
    if (!editName.trim()) return showToast('Grade name is required.', 'error');
    if (!Number.isFinite(fee) || fee < 0) return showToast('Enter a valid monthly fee.', 'error');
    setBusyId(grade.id);
    try {
      const resolvedMode = standardBillingMode(editName.trim()) ?? editMode;
      await api.grades.update(grade.id, { name: editName.trim(), monthlyFee: resolvedMode === 'GRADE' ? fee : 0, billingMode: resolvedMode });
      setEditingId(''); showToast('Billing settings saved.', 'success'); await load();
    } catch (cause) { showToast(cause instanceof Error ? cause.message : 'Billing settings could not be saved.', 'error'); }
    finally { setBusyId(''); }
  };

  const remove = async (grade: Grade) => {
    setBusyId(grade.id);
    try { await api.grades.remove(grade.id); setExpandedId(''); setDeleteId(''); showToast(`${grade.name} deleted.`, 'success'); await load(); }
    catch (cause) { showToast(cause instanceof Error ? cause.message : 'Grade could not be deleted.', 'error'); }
    finally { setBusyId(''); }
  };

  return <div className="people-page grade-settings-page">
    <header className="people-header">
      <div><h1 className="people-title">Grade billing</h1><p className="people-subtitle">UKG–Class 10 use one monthly package. Class 11–12 charge for each selected subject.</p></div>
      <Button variant="outline" onClick={() => void seedDefaults()} disabled={Boolean(busyId)}><span className="material-symbols-outlined" aria-hidden="true">auto_awesome</span>{busyId === 'seed' ? 'Adding…' : 'Fill standard grades'}</Button>
    </header>

    <section className="grade-summary" aria-label="Grade billing summary">
      <div><span>Grades</span><strong>{grades.length}</strong></div><div><span>Monthly packages</span><strong>{totals.packages}</strong></div><div><span>Per-subject grades</span><strong>{totals.subjects}</strong></div><div><span>Students</span><strong>{totals.students}</strong></div>
    </section>

    <form className="grade-add-card" onSubmit={addGrade} aria-busy={busyId === 'new'}>
      <div><label htmlFor="new-grade-name">Add another grade</label><p>Class 11 and 12 automatically start with per-subject billing.</p></div>
      <div className="grade-add-controls"><input id="new-grade-name" value={newName} onChange={(event) => setNewName(event.target.value)} placeholder="Example: Foundation" autoComplete="off" /><Button type="submit" disabled={Boolean(busyId) || !newName.trim()}><span className="material-symbols-outlined" aria-hidden="true">add</span>Add grade</Button></div>
    </form>

    {error ? <section className="grade-error" role="alert"><div><strong>Grades could not be loaded</strong><p>{error}</p></div><Button variant="outline" onClick={() => void load()}>Try again</Button></section> : null}

    <section className="grade-list" aria-label="Configured grades">
      {loading ? Array.from({ length: 5 }, (_, index) => <div className="grade-card-skeleton" key={index} />) : null}
      {!loading && !grades.length ? <div className="people-empty grade-empty"><span className="material-symbols-outlined" aria-hidden="true">stairs</span><strong>No grades configured</strong><p>Add the standard UKG–Class 12 ladder to begin.</p><Button onClick={() => void seedDefaults()}>Add standard grades</Button></div> : null}
      {!loading && grades.map((grade) => {
        const expanded = expandedId === grade.id; const editing = editingId === grade.id; const fixedMode = standardBillingMode(grade.name); const subjectBilling = (fixedMode ?? grade.billingMode) === 'SUBJECT';
        return <article className={`grade-card${expanded ? ' is-expanded' : ''}`} key={grade.id}>
          <button className="grade-card-summary" type="button" onClick={() => void toggle(grade)} aria-expanded={expanded} aria-controls={`grade-panel-${grade.id}`}>
            <span className="grade-card-title"><span className="grade-icon material-symbols-outlined" aria-hidden="true">school</span><span><strong>{grade.name}</strong><small>{subjectBilling ? 'Students pay for selected subjects' : 'One monthly tuition package'}</small></span></span>
            <span className="grade-card-metric"><small>Billing</small><strong className={!subjectBilling && grade.monthlyFee <= 0 ? 'is-warning' : ''}>{subjectBilling ? 'Per subject' : grade.monthlyFee > 0 ? money(grade.monthlyFee) : 'Fee required'}</strong></span><span className="grade-card-metric"><small>Students</small><strong>{grade.studentCount}</strong></span><span className="grade-card-metric"><small>Subjects</small><strong>{grade.courseCount}</strong></span><span className="grade-chevron material-symbols-outlined" aria-hidden="true">expand_more</span>
          </button>
          {expanded ? <div className="grade-card-panel" id={`grade-panel-${grade.id}`}>
            <div className="grade-panel-head"><div><h2>Billing and subjects</h2><p>Set how monthly charges are calculated for this grade.</p></div>{!editing ? <Button variant="outline" onClick={() => beginEdit(grade)}><span className="material-symbols-outlined" aria-hidden="true">edit</span>Edit billing</Button> : null}</div>
            {editing ? <form className="grade-edit-form" onSubmit={(event) => { event.preventDefault(); void save(grade); }} aria-busy={busyId === grade.id}>
              <label htmlFor={`grade-name-${grade.id}`}>Grade name<input id={`grade-name-${grade.id}`} value={editName} onChange={(event) => setEditName(event.target.value)} autoComplete="off" /></label>
              {fixedMode ? <div className="grade-locked-policy"><span className="material-symbols-outlined" aria-hidden="true">lock</span><span><strong>{fixedMode === 'GRADE' ? 'Monthly grade package' : 'Per selected subject'}</strong><small>Fixed institutional billing policy</small></span></div> : <label htmlFor={`grade-mode-${grade.id}`}>Billing method<select id={`grade-mode-${grade.id}`} value={editMode} onChange={(event) => setEditMode(event.target.value as BillingMode)}><option value="GRADE">Monthly grade package</option><option value="SUBJECT">Per selected subject</option></select><small>{editMode === 'GRADE' ? 'All regular subjects are included in one fee.' : 'Monthly total comes from active subject enrolments.'}</small></label>}
              <label htmlFor={`grade-fee-${grade.id}`}>Monthly package fee (NPR)<input id={`grade-fee-${grade.id}`} value={editFee} onChange={(event) => setEditFee(event.target.value)} inputMode="numeric" pattern="[0-9]*" disabled={(fixedMode ?? editMode) === 'SUBJECT'} /><small>{(fixedMode ?? editMode) === 'SUBJECT' ? 'Set individual prices from Courses.' : 'Regular subjects will not add separate charges.'}</small></label>
              <div className="grade-form-actions"><Button type="submit" disabled={busyId === grade.id}>{busyId === grade.id ? 'Saving…' : 'Save billing'}</Button><Button type="button" variant="outline" onClick={() => setEditingId('')}>Cancel</Button></div>
            </form> : <div className={`grade-billing-callout${!subjectBilling && grade.monthlyFee <= 0 ? ' is-warning' : ''}`}><span className="material-symbols-outlined" aria-hidden="true">{subjectBilling ? 'receipt_long' : grade.monthlyFee > 0 ? 'inventory_2' : 'warning'}</span><div><strong>{subjectBilling ? 'Subject billing is active' : grade.monthlyFee > 0 ? `${money(grade.monthlyFee)} per month` : 'Monthly package fee is required'}</strong><p>{subjectBilling ? 'Only selected subjects should appear on each student invoice.' : grade.monthlyFee > 0 ? 'This package covers every regular subject. Activities remain separate.' : 'Set the grade fee before generating monthly invoices. Subject enrolment is not required for package grades.'}</p></div></div>}
            <div className="grade-detail-grid"><section><h3>Subjects</h3>{detailLoading ? <p>Loading subjects…</p> : detail?.courses.length ? detail.courses.map((course) => <div className="grade-detail-row" key={course.id}><span><strong>{course.name}</strong><small>{course.branchName}</small></span><StatusBadge variant="info">{subjectBilling ? `${course.enrollmentCount} selected` : 'Included'}</StatusBadge></div>) : <p>No subjects are attached yet.</p>}</section><section><h3>Teaching team</h3>{detailLoading ? <p>Loading teachers…</p> : detail?.teachers.length ? detail.teachers.map((teacher) => <div className="grade-detail-row" key={teacher.id}><strong>{teacher.name}</strong></div>) : <p>No teachers are assigned yet.</p>}</section></div>
            <div className="grade-danger-zone"><div><strong>Delete grade</strong><p>Deletion is blocked while students are assigned.</p></div>{deleteId === grade.id ? <div className="grade-delete-confirm"><span>Delete {grade.name}?</span><Button variant="danger" onClick={() => void remove(grade)} disabled={busyId === grade.id}>{busyId === grade.id ? 'Deleting…' : 'Confirm delete'}</Button><Button variant="outline" onClick={() => setDeleteId('')}>Cancel</Button></div> : <Button variant="outline" onClick={() => setDeleteId(grade.id)}>Delete grade</Button>}</div>
          </div> : null}
        </article>;
      })}
    </section>
  </div>;
}
