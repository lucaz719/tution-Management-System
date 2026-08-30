import { useEffect, useMemo, useState } from 'react';
import { Button } from './ui/Button';
import { StatusBadge } from './ui/StatusBadge';
import { useToast } from './ui/Toast';
import { api } from '../services/api';

interface GradeOption { id: string; name: string; sortOrder: number; billingMode: 'GRADE' | 'SUBJECT' }

interface BulkCourseCreateProps {
  branches: Array<{ id: string; name: string }>;
  grades: GradeOption[];
  onClose: () => void;
  onCreated: () => void;
}

// Quick-select bands over the standard Nepali ladder, matched by name so
// tenants with custom grades simply don't light up the shortcut.
const BANDS: Array<{ label: string; names: string[] }> = [
  { label: 'UKG', names: ['UKG'] },
  { label: 'Primary (1–5)', names: ['Class 1', 'Class 2', 'Class 3', 'Class 4', 'Class 5'] },
  { label: 'Basic (6–8)', names: ['Class 6', 'Class 7', 'Class 8'] },
  { label: 'Secondary (9–10)', names: ['Class 9', 'Class 10'] },
  { label: 'Higher secondary (11–12)', names: ['Class 11', 'Class 12'] },
];

const DEFAULT_SUBJECTS = 'English, Nepali, Mathematics, Science, Social Studies, Computer';

interface BulkResult { index: number; name: string; status: 'created' | 'skipped' | 'error'; error?: string }

export function BulkCourseCreate({ branches, grades, onClose, onCreated }: BulkCourseCreateProps) {
  const { showToast } = useToast();
  const [branchId, setBranchId] = useState(branches.length === 1 ? branches[0].id : '');
  const [selectedGrades, setSelectedGrades] = useState<Set<string>>(new Set());
  const [subjectsText, setSubjectsText] = useState(DEFAULT_SUBJECTS);
  const [monthlyBase, setMonthlyBase] = useState('');
  const [isTaxExempt, setIsTaxExempt] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [results, setResults] = useState<BulkResult[] | null>(null);
  const [labels, setLabels] = useState<string[]>([]);

  useEffect(() => {
    const close = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, [onClose]);

  const sortedGrades = useMemo(() => [...grades].sort((a, b) => a.sortOrder - b.sortOrder), [grades]);

  const subjects = useMemo(() => {
    const list = subjectsText.split(/[,\n]/).map((s) => s.trim()).filter(Boolean);
    return Array.from(new Set(list.map((s) => s.toLowerCase()))).map((lower) => list.find((s) => s.toLowerCase() === lower)!);
  }, [subjectsText]);

  const toggleGrade = (id: string) => {
    setSelectedGrades((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const applyBand = (names: string[]) => {
    const ids = sortedGrades.filter((g) => names.includes(g.name)).map((g) => g.id);
    if (ids.length === 0) return;
    setSelectedGrades((current) => {
      const next = new Set(current);
      const allIn = ids.every((id) => next.has(id));
      ids.forEach((id) => (allIn ? next.delete(id) : next.add(id)));
      return next;
    });
  };

  const total = selectedGrades.size * subjects.length;
  const selectedSubjectBillingGrades = sortedGrades.filter((grade) => selectedGrades.has(grade.id) && grade.billingMode === 'SUBJECT');

  const submit = async () => {
    if (!branchId) return showToast('Select a branch.', 'error');
    if (selectedGrades.size === 0) return showToast('Select at least one grade.', 'error');
    if (subjects.length === 0) return showToast('Enter at least one subject.', 'error');
    if (selectedSubjectBillingGrades.length && !monthlyBase.trim()) return showToast('Enter the monthly fee for Class 11–12 subjects.', 'error');
    const fee = selectedSubjectBillingGrades.length ? Number(monthlyBase) : 0;
    if (!Number.isFinite(fee) || fee < 0) return showToast('Enter a valid subject fee.', 'error');

    const items: Array<{ name: string; gradeId: string; monthlyBase: number; isTaxExempt: boolean; type: string }> = [];
    const itemLabels: string[] = [];
    for (const grade of sortedGrades) {
      if (!selectedGrades.has(grade.id)) continue;
      for (const subject of subjects) {
        items.push({ name: `${subject} — ${grade.name}`, gradeId: grade.id, monthlyBase: grade.billingMode === 'SUBJECT' ? fee : 0, isTaxExempt, type: 'REGULAR' });
        itemLabels.push(`${subject} — ${grade.name}`);
      }
    }

    setIsSaving(true);
    try {
      const response = await api.academics.bulkCreateCourses({ branchId, items });
      setResults(response.results);
      setLabels(itemLabels);
      showToast(response.message, response.skipped === 0 ? 'success' : 'info');
      if (response.created > 0) onCreated();
    } catch (error: unknown) {
      showToast(error instanceof Error ? error.message : 'Bulk creation failed.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const singleBranch = branches.length <= 1;

  return (
    <>
      <button type="button" className="people-drawer-overlay" onClick={onClose} aria-label="Close bulk subject form" />
      <aside className="people-drawer" role="dialog" aria-modal="true" style={{ width: '560px' }}>
        <div className="people-drawer-head">
          <div>
            <h2>Add subjects by grade</h2>
            <p>Package grades include subjects at no extra cost. Class 11–12 use the subject fee.</p>
          </div>
          <button type="button" className="people-drawer-close" onClick={onClose} aria-label="Close">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="people-drawer-body">
          {!results ? (
            <>
              <div className="people-field">
                <label>Branch</label>
                {singleBranch && branches[0] ? (
                  <input value={branches[0].name} disabled />
                ) : (
                  <select value={branchId} onChange={(e) => setBranchId(e.target.value)} required>
                    <option value="">Select a branch…</option>
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                )}
              </div>

              <div className="people-field">
                <label>Grades ({selectedGrades.size} selected)</label>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '8px' }}>
                  {BANDS.map((band) => (
                    <button key={band.label} type="button" onClick={() => applyBand(band.names)}
                      style={{ fontSize: '11.5px', fontWeight: 700, padding: '4px 10px', borderRadius: '999px', border: '1px solid var(--border)', background: 'var(--color-bg)', color: 'var(--color-primary)', cursor: 'pointer', fontFamily: 'inherit' }}>
                      {band.label}
                    </button>
                  ))}
                  <button type="button" onClick={() => setSelectedGrades(new Set(selectedGrades.size === sortedGrades.length ? [] : sortedGrades.map((g) => g.id)))}
                    style={{ fontSize: '11.5px', fontWeight: 700, padding: '4px 10px', borderRadius: '999px', border: '1px solid var(--border)', background: 'var(--color-bg)', color: 'var(--text-muted)', cursor: 'pointer', fontFamily: 'inherit' }}>
                    {selectedGrades.size === sortedGrades.length ? 'Clear all' : 'Select all'}
                  </button>
                </div>
                {sortedGrades.length === 0 ? (
                  <p style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}>
                    No grades yet — set up the grade ladder first (Grades page → “Add default grades”).
                  </p>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
                    {sortedGrades.map((g) => {
                      const checked = selectedGrades.has(g.id);
                      return (
                        <label key={g.id} style={{
                          display: 'flex', alignItems: 'center', gap: '7px', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
                          padding: '7px 10px', borderRadius: '10px',
                          border: `1px solid ${checked ? 'var(--color-primary)' : 'var(--border)'}`,
                          background: checked ? 'color-mix(in srgb, var(--color-primary) 8%, transparent)' : 'var(--color-bg)',
                          color: 'var(--text)',
                        }}>
                          <input type="checkbox" checked={checked} onChange={() => toggleGrade(g.id)} style={{ margin: 0 }} />
                          {g.name}
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="people-field">
                <label>Subjects <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>(comma-separated, {subjects.length} parsed)</span></label>
                <textarea value={subjectsText} onChange={(e) => setSubjectsText(e.target.value)} rows={3}
                  placeholder={DEFAULT_SUBJECTS}
                  style={{ resize: 'vertical', fontFamily: 'inherit', fontSize: '13.5px', padding: '10px 12px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--color-bg)', color: 'var(--text)', width: '100%' }} />
              </div>

              <div className="people-field-row">
                <div className="people-field">
                  <label htmlFor="bulk-subject-fee">Monthly subject fee (NPR)</label>
                  <input id="bulk-subject-fee" value={monthlyBase} onChange={(e) => setMonthlyBase(e.target.value)} placeholder="1500" inputMode="numeric" pattern="[0-9]*" required={selectedSubjectBillingGrades.length > 0} disabled={selectedSubjectBillingGrades.length === 0} />
                  <small>{selectedSubjectBillingGrades.length ? `Applied only to ${selectedSubjectBillingGrades.map((grade) => grade.name).join(', ')}.` : 'Selected grades use one package fee, so subjects are included.'}</small>
                </div>
                <label style={{ display: selectedSubjectBillingGrades.length ? 'flex' : 'none', alignItems: 'center', gap: '10px', fontSize: '13.5px', fontWeight: 600, color: 'var(--text)', cursor: 'pointer', alignSelf: 'end', paddingBottom: '10px' }}>
                  <input type="checkbox" checked={isTaxExempt} onChange={(e) => setIsTaxExempt(e.target.checked)} />
                  Tax-exempt
                </label>
              </div>

              {total > 0 ? (
                <div style={{ background: 'color-mix(in srgb, var(--color-primary) 6%, transparent)', border: '1px solid color-mix(in srgb, var(--color-primary) 20%, transparent)', borderRadius: '12px', padding: '12px 14px', fontSize: '13px' }}>
                  Will create <strong>{total}</strong> course{total === 1 ? '' : 's'} ({selectedGrades.size} grade{selectedGrades.size === 1 ? '' : 's'} × {subjects.length} subject{subjects.length === 1 ? '' : 's'}), e.g.{' '}
                  <em>{subjects[0]} — {sortedGrades.find((g) => selectedGrades.has(g.id))?.name}</em>. Existing duplicates are skipped automatically.
                </div>
              ) : null}
            </>
          ) : (
            <>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <StatusBadge variant="success">{results.filter((r) => r.status === 'created').length} created</StatusBadge>
                {results.some((r) => r.status !== 'created') ? (
                  <StatusBadge variant="warning">{results.filter((r) => r.status !== 'created').length} skipped</StatusBadge>
                ) : null}
              </div>
              <div className="people-table-wrap">
                <div className="people-table-scroll" style={{ maxHeight: '360px', overflowY: 'auto' }}>
                  <table className="people-table" style={{ minWidth: '440px' }}>
                    <thead>
                      <tr><th>#</th><th>Course</th><th>Result</th></tr>
                    </thead>
                    <tbody>
                      {results.map((r) => (
                        <tr key={r.index}>
                          <td style={{ color: 'var(--text-muted)' }}>{r.index + 1}</td>
                          <td style={{ fontWeight: 600 }}>{labels[r.index] ?? r.name}</td>
                          <td>
                            {r.status === 'created' ? (
                              <StatusBadge variant="success">Created</StatusBadge>
                            ) : (
                              <div>
                                <StatusBadge variant={r.status === 'skipped' ? 'warning' : 'error'}>{r.status === 'skipped' ? 'Skipped' : 'Error'}</StatusBadge>
                                {r.error ? <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '2px' }}>{r.error}</div> : null}
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="people-drawer-foot">
          {!results ? (
            <>
              <Button onClick={() => void submit()} disabled={total === 0 || isSaving} style={{ flex: 1 }}>
                {isSaving ? 'Creating…' : total > 0 ? `Create ${total} Course${total === 1 ? '' : 's'}` : 'Create Courses'}
              </Button>
              <Button variant="outline" onClick={onClose}>Cancel</Button>
            </>
          ) : (
            <Button onClick={onClose} style={{ flex: 1 }}>Done</Button>
          )}
        </div>
      </aside>
    </>
  );
}
