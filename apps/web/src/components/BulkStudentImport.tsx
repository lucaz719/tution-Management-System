import { useRef, useState } from 'react';
import { Button } from './ui/Button';
import { StatusBadge } from './ui/StatusBadge';
import { useToast } from './ui/Toast';
import { api } from '../services/api';

interface BulkStudentImportProps {
  branches: Array<{ id: string; name: string }>;
  grades?: string[];
  onClose: () => void;
  onImported: () => void;
}

const COLUMNS = [
  { header: 'First Name', key: 'firstName', width: 18, required: true },
  { header: 'Last Name', key: 'lastName', width: 18, required: true },
  { header: 'Email', key: 'email', width: 28, required: true },
  { header: 'Phone', key: 'phone', width: 16, required: false },
  { header: 'Branch', key: 'branchName', width: 22, required: false },
  { header: 'Grade', key: 'grade', width: 14, required: false },
  { header: 'Emergency Contact', key: 'emergencyContact', width: 18, required: false },
  { header: 'Parent First Name', key: 'parentFirstName', width: 18, required: false },
  { header: 'Parent Last Name', key: 'parentLastName', width: 18, required: false },
  { header: 'Parent Email', key: 'parentEmail', width: 28, required: false },
  { header: 'Parent Phone', key: 'parentPhone', width: 16, required: false },
] as const;

type RowRecord = Record<string, string>;

interface ImportResult {
  row: number;
  name: string;
  email: string;
  status: 'created' | 'error';
  temporaryPassword?: string;
  parentEmail?: string;
  parentTemporaryPassword?: string;
  error?: string;
}

export function BulkStudentImport({ branches, grades = [], onClose, onImported }: BulkStudentImportProps) {
  const { showToast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<RowRecord[]>([]);
  const [fileName, setFileName] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [results, setResults] = useState<ImportResult[] | null>(null);

  const downloadTemplate = () => {
    const headers = COLUMNS.map((c) => `"${c.header}"`).join(',');
    const sampleRow = [
      '"Aarav"',
      '"Koirala"',
      '"aarav.koirala@example.com"',
      '"9800000001"',
      `"${branches[0]?.name ?? 'Damak Main Center'}"`,
      `"${grades[0] ?? 'Class 10'}"`,
      '"9800000002"',
      '"Rajesh"',
      '"Koirala"',
      '"rajesh.koirala@example.com"',
      '"9800000002"',
    ].join(',');

    const csvContent = `${headers}\n${sampleRow}`;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'tms-student-import-template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFile = async (file: File) => {
    setIsParsing(true);
    setResults(null);
    try {
      let parsed: RowRecord[] = [];

      const text = await file.text();
      const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
      if (lines.length < 2) throw new Error('File is empty or has no header.');

      const headers = lines[0].split(/,|\t/).map((h) => h.trim().replace(/^"|"$/g, '').toLowerCase());
      const headerMap = new Map<string, number>();
      COLUMNS.forEach((c) => {
        const idx = headers.findIndex((h) => h === c.header.toLowerCase());
        if (idx !== -1) headerMap.set(c.key, idx);
      });

      if (!headerMap.has('firstName') || !headerMap.has('email')) {
        throw new Error('File missing required headers: "First Name" and "Email".');
      }

      for (let i = 1; i < lines.length; i++) {
        const cells = lines[i].split(/,|\t/).map((c) => c.trim().replace(/^"|"$/g, ''));
        const rec: RowRecord = {};
        let hasVal = false;
        COLUMNS.forEach((c) => {
          const idx = headerMap.get(c.key);
          if (idx !== undefined && idx < cells.length) {
            rec[c.key] = cells[idx];
            if (cells[idx]) hasVal = true;
          }
        });
        if (hasVal) parsed.push(rec);
      }

      if (parsed.length === 0) throw new Error('No valid student data rows found below the header.');
      setRows(parsed);
      setFileName(file.name);
    } catch (error: unknown) {
      showToast(error instanceof Error ? error.message : 'Could not read the file.', 'error');
      setRows([]);
      setFileName('');
    } finally {
      setIsParsing(false);
    }
  };

  const submit = async () => {
    if (rows.length === 0) return;
    setIsImporting(true);
    try {
      const response = await api.people.bulkCreateStudents(rows);
      setResults(response.results);
      showToast(`${response.createdCount} created, ${response.errorCount} skipped.`, response.errorCount === 0 ? 'success' : 'info');
      if (response.createdCount > 0) onImported();
    } catch (error: unknown) {
      showToast(error instanceof Error ? error.message : 'Import failed.', 'error');
    } finally {
      setIsImporting(false);
    }
  };

  const downloadCredentials = () => {
    if (!results) return;
    const created = results.filter((r) => r.status === 'created');
    const lines = ['Name,Email,Temporary Password,Parent Email,Parent Temporary Password'];
    created.forEach((r) => {
      lines.push([r.name, r.email, r.temporaryPassword ?? '', r.parentEmail ?? '', r.parentTemporaryPassword ?? ''].map((v) => `"${v}"`).join(','));
    });
    const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'imported-student-credentials.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <div className="people-drawer-overlay" onClick={onClose} />
      <aside className="people-drawer" role="dialog" aria-modal="true" style={{ width: '560px' }}>
        <div className="people-drawer-head">
          <div>
            <h2>Bulk Import Students</h2>
            <p>Download the Excel template, fill it in, and upload — one row per student.</p>
          </div>
          <button type="button" className="people-drawer-close" onClick={onClose} aria-label="Close">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="people-drawer-body">
          {!results ? (
            <>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <Button variant="outline" onClick={() => void downloadTemplate()} style={{ flex: 1, minWidth: '200px' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>download</span>
                  Download Excel Template
                </Button>
                <Button onClick={() => fileRef.current?.click()} disabled={isParsing} style={{ flex: 1, minWidth: '160px' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>upload_file</span>
                  {isParsing ? 'Reading…' : 'Choose File'}
                </Button>
                <input ref={fileRef} type="file" accept=".xlsx,.xls" style={{ display: 'none' }} onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleFile(f); e.target.value = ''; }} />
              </div>

              <div style={{ fontSize: '12.5px', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                Required columns: <strong>First Name, Last Name, Email</strong>. Optional: Phone, Branch (must match an existing branch{branches.length === 1 ? `; defaults to ${branches[0].name}` : ''}), Emergency Contact, and Parent details (a parent account is created and linked automatically when Parent Email is filled).
              </div>

              {rows.length > 0 ? (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 700 }}>{fileName} — {rows.length} student{rows.length === 1 ? '' : 's'}</span>
                    <StatusBadge variant="info">Preview</StatusBadge>
                  </div>
                  <div className="people-table-wrap">
                    <div className="people-table-scroll" style={{ maxHeight: '260px', overflowY: 'auto' }}>
                      <table className="people-table" style={{ minWidth: '520px' }}>
                        <thead>
                          <tr><th>#</th><th>Name</th><th>Email</th><th>Branch</th><th>Parent</th></tr>
                        </thead>
                        <tbody>
                          {rows.map((r, i) => (
                            <tr key={i}>
                              <td style={{ color: 'var(--text-muted)' }}>{i + 1}</td>
                              <td>{`${r.firstName ?? ''} ${r.lastName ?? ''}`.trim() || <span style={{ color: 'var(--color-error)' }}>missing</span>}</td>
                              <td style={{ fontSize: '12.5px' }}>{r.email || <span style={{ color: 'var(--color-error)' }}>missing</span>}</td>
                              <td style={{ fontSize: '12.5px' }}>{r.branchName || (branches.length === 1 ? branches[0].name : '—')}</td>
                              <td style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}>{r.parentEmail || '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              ) : null}
            </>
          ) : (
            <>
              <div style={{ display: 'flex', gap: '10px' }}>
                <StatusBadge variant="success">{results.filter((r) => r.status === 'created').length} created</StatusBadge>
                {results.some((r) => r.status === 'error') ? <StatusBadge variant="error">{results.filter((r) => r.status === 'error').length} skipped</StatusBadge> : null}
              </div>
              <div className="people-table-wrap">
                <div className="people-table-scroll" style={{ maxHeight: '360px', overflowY: 'auto' }}>
                  <table className="people-table" style={{ minWidth: '480px' }}>
                    <thead>
                      <tr><th>#</th><th>Student</th><th>Result</th></tr>
                    </thead>
                    <tbody>
                      {results.map((r) => (
                        <tr key={r.row}>
                          <td style={{ color: 'var(--text-muted)' }}>{r.row}</td>
                          <td>
                            <div style={{ fontWeight: 600 }}>{r.name || r.email}</div>
                            <div className="people-person-email">{r.email}</div>
                          </td>
                          <td>
                            {r.status === 'created' ? (
                              <div>
                                <StatusBadge variant="success">Created</StatusBadge>
                                <div style={{ fontFamily: 'monospace', fontSize: '12px', marginTop: '4px', color: 'var(--color-primary-light)' }}>{r.temporaryPassword}</div>
                                {r.error ? <div style={{ fontSize: '11px', color: 'var(--color-warning)', marginTop: '2px' }}>{r.error}</div> : null}
                              </div>
                            ) : (
                              <div>
                                <StatusBadge variant="error">Skipped</StatusBadge>
                                <div style={{ fontSize: '11.5px', color: 'var(--color-error)', marginTop: '2px' }}>{r.error}</div>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                Temporary passwords are shown once. Download them to hand out securely.
              </p>
            </>
          )}
        </div>

        <div className="people-drawer-foot">
          {!results ? (
            <>
              <Button onClick={() => void submit()} disabled={rows.length === 0 || isImporting} style={{ flex: 1 }}>
                {isImporting ? 'Importing…' : `Import ${rows.length || ''} Student${rows.length === 1 ? '' : 's'}`}
              </Button>
              <Button variant="outline" onClick={onClose}>Cancel</Button>
            </>
          ) : (
            <>
              <Button onClick={downloadCredentials} style={{ flex: 1 }}>
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>download</span>
                Download Credentials
              </Button>
              <Button variant="outline" onClick={onClose}>Done</Button>
            </>
          )}
        </div>
      </aside>
    </>
  );
}
