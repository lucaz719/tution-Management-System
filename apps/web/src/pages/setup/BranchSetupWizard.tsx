import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { WizardProgress } from '../../components/ui/WizardProgress';
import { useToast } from '../../components/ui/Toast';

const STEPS = [
  { label: 'Branch Profile' },
  { label: 'Classroom Setup' },
  { label: 'Staff Assignment' },
];

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const DRAFT_KEY = 'tms_branch_wizard_draft';

// ─── Step 1 ───────────────────────────────────────────────────────────────────

function Step1({ data, onChange }: { data: any; onChange: (d: any) => void }) {
  const toggleDay = (day: string) => {
    const days: string[] = data.workingDays ?? [];
    onChange({ ...data, workingDays: days.includes(day) ? days.filter((d) => d !== day) : [...days, day] });
  };

  return (
    <div className="wizard-step-content">
      <h3 className="wizard-step-title">Branch Profile</h3>
      <p className="wizard-step-desc">Configure operating hours and working days for this branch.</p>
      <div className="wizard-fields">
        <div className="auth-field">
          <label className="auth-label">Branch Name</label>
          <input className="auth-input" placeholder="Branch name" value={data.branchName ?? ''} onChange={(e) => onChange({ ...data, branchName: e.target.value })} />
        </div>
        <div className="auth-field">
          <label className="auth-label">Contact Phone</label>
          <input className="auth-input" type="tel" placeholder="01-XXXXXXX" value={data.phone ?? ''} onChange={(e) => onChange({ ...data, phone: e.target.value })} />
        </div>
        <div className="auth-field">
          <label className="auth-label">Operating Hours *</label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label className="auth-label" style={{ fontSize: '11px' }}>From</label>
              <input className="auth-input" type="time" value={data.hoursFrom ?? '07:00'} onChange={(e) => onChange({ ...data, hoursFrom: e.target.value })} />
            </div>
            <div>
              <label className="auth-label" style={{ fontSize: '11px' }}>To</label>
              <input className="auth-input" type="time" value={data.hoursTo ?? '17:00'} onChange={(e) => onChange({ ...data, hoursTo: e.target.value })} />
            </div>
          </div>
        </div>
        <div className="auth-field">
          <label className="auth-label">Working Days * (select at least 1)</label>
          <div className="wizard-days-row">
            {DAYS.map((d) => (
              <button
                key={d}
                type="button"
                className={`wizard-day-chip ${(data.workingDays ?? []).includes(d) ? 'wizard-day-chip--active' : ''}`}
                onClick={() => toggleDay(d)}
              >
                {d}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Step 2 ───────────────────────────────────────────────────────────────────

interface Classroom { id: string; name: string; capacity: string; floor: string; }

function Step2({ data, onChange }: { data: any; onChange: (d: any) => void }) {
  const rooms: Classroom[] = data.classrooms ?? [];

  const addRoom = () => onChange({ ...data, classrooms: [...rooms, { id: crypto.randomUUID(), name: '', capacity: '', floor: '' }] });
  const removeRoom = (id: string) => onChange({ ...data, classrooms: rooms.filter((r) => r.id !== id) });
  const updateRoom = (id: string, field: keyof Classroom, val: string) =>
    onChange({ ...data, classrooms: rooms.map((r) => r.id === id ? { ...r, [field]: val } : r) });

  return (
    <div className="wizard-step-content">
      <h3 className="wizard-step-title">Classroom Setup</h3>
      <p className="wizard-step-desc">Add at least one classroom. You can add more from Branch Settings later.</p>
      <div className="wizard-fields">
        {rooms.length === 0 && (
          <div className="wizard-empty-state">
            <span className="material-symbols-outlined" style={{ fontSize: '36px', color: 'var(--text-muted-foreground)' }}>meeting_room</span>
            <p>No classrooms added yet</p>
          </div>
        )}
        {rooms.map((room, i) => (
          <div key={room.id} className="wizard-room-card">
            <div className="wizard-room-header">
              <span style={{ fontWeight: 600, fontSize: '13px' }}>Classroom {i + 1}</span>
              <button type="button" onClick={() => removeRoom(room.id)} className="wizard-remove-btn" aria-label="Remove classroom">
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>delete</span>
              </button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '10px' }}>
              <input className="auth-input" placeholder="Room name *" value={room.name} onChange={(e) => updateRoom(room.id, 'name', e.target.value)} />
              <input className="auth-input" type="number" min={1} max={200} placeholder="Capacity" value={room.capacity} onChange={(e) => updateRoom(room.id, 'capacity', e.target.value)} />
              <input className="auth-input" placeholder="Floor" value={room.floor} onChange={(e) => updateRoom(room.id, 'floor', e.target.value)} />
            </div>
          </div>
        ))}
        <button type="button" className="wizard-add-btn" onClick={addRoom}>
          <span className="material-symbols-outlined">add_circle</span>
          Add Classroom
        </button>
      </div>
    </div>
  );
}

// ─── Step 3 ───────────────────────────────────────────────────────────────────

interface StaffMember { id: string; name: string; role: string; email: string; salaryType: string; }

const STAFF_ROLES = ['Teacher', 'Accountant', 'Receptionist', 'Janitor / Cleaner', 'Other'];

function Step3({ data, onChange }: { data: any; onChange: (d: any) => void }) {
  const staff: StaffMember[] = data.staff ?? [];

  const addStaff = () => onChange({ ...data, staff: [...staff, { id: crypto.randomUUID(), name: '', role: '', email: '', salaryType: '' }] });
  const removeStaff = (id: string) => onChange({ ...data, staff: staff.filter((s) => s.id !== id) });
  const updateStaff = (id: string, field: keyof StaffMember, val: string) =>
    onChange({ ...data, staff: staff.map((s) => s.id === id ? { ...s, [field]: val } : s) });

  return (
    <div className="wizard-step-content">
      <h3 className="wizard-step-title">Staff Assignment</h3>
      <p className="wizard-step-desc">Add staff members or skip and manage from the HR module later.</p>
      <div className="wizard-fields">
        {staff.length === 0 && (
          <div className="wizard-empty-state">
            <span className="material-symbols-outlined" style={{ fontSize: '36px', color: 'var(--text-muted-foreground)' }}>groups</span>
            <p>No staff added yet</p>
          </div>
        )}
        {staff.map((s, i) => (
          <div key={s.id} className="wizard-room-card">
            <div className="wizard-room-header">
              <span style={{ fontWeight: 600, fontSize: '13px' }}>Staff Member {i + 1}</span>
              <button type="button" onClick={() => removeStaff(s.id)} className="wizard-remove-btn" aria-label="Remove staff">
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>delete</span>
              </button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <input className="auth-input" placeholder="Full name *" value={s.name} onChange={(e) => updateStaff(s.id, 'name', e.target.value)} />
              <select className="auth-input" value={s.role} onChange={(e) => updateStaff(s.id, 'role', e.target.value)}>
                <option value="">Select role *</option>
                {STAFF_ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
              <input className="auth-input" type="email" placeholder="Email *" value={s.email} onChange={(e) => updateStaff(s.id, 'email', e.target.value)} />
              <select className="auth-input" value={s.salaryType} onChange={(e) => updateStaff(s.id, 'salaryType', e.target.value)}>
                <option value="">Salary type *</option>
                <option value="fixed">Fixed</option>
                <option value="hourly">Hourly</option>
              </select>
            </div>
          </div>
        ))}
        <button type="button" className="wizard-add-btn" onClick={addStaff}>
          <span className="material-symbols-outlined">person_add</span>
          Add Staff Member
        </button>
      </div>
    </div>
  );
}

// ─── Main Wizard ──────────────────────────────────────────────────────────────

export function BranchSetupWizard() {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [currentStep, setCurrentStep] = useState(0);
  const [isSaving, setIsSaving]       = useState(false);

  const [stepData, setStepData] = useState<Record<number, any>>(() => {
    try { return JSON.parse(localStorage.getItem(DRAFT_KEY) ?? '{}'); }
    catch { return {}; }
  });

  const updateStep = useCallback((data: any) => {
    setStepData((prev) => {
      const next = { ...prev, [currentStep]: data };
      localStorage.setItem(DRAFT_KEY, JSON.stringify(next));
      return next;
    });
  }, [currentStep]);

  const handleNext = useCallback(async () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep((s) => s + 1);
    } else {
      setIsSaving(true);
      try {
        await new Promise((res) => setTimeout(res, 1000));
        localStorage.removeItem(DRAFT_KEY);
        showToast('Branch setup complete! Your dashboard is ready.', 'success');
        navigate('/branch/dashboard', { replace: true });
      } catch {
        showToast('Failed to save setup. Please try again.', 'error');
      } finally {
        setIsSaving(false);
      }
    }
  }, [currentStep, navigate, showToast]);

  const STEP_COMPONENTS = [
    <Step1 data={stepData[0] ?? {}} onChange={updateStep} />,
    <Step2 data={stepData[1] ?? {}} onChange={updateStep} />,
    <Step3 data={stepData[2] ?? {}} onChange={updateStep} />,
  ];

  return (
    <div className="auth-page">
      <div className="wizard-container">
        <div className="wizard-header">
          <span className="material-symbols-outlined" style={{ fontSize: '28px', color: 'var(--brand)' }}>
            location_away
          </span>
          <div>
            <h2 style={{ fontSize: '20px', fontWeight: 700 }}>Branch Setup</h2>
            <p style={{ fontSize: '13px', color: 'var(--text-muted-foreground)' }}>
              3 quick steps to configure your branch
            </p>
          </div>
        </div>

        <WizardProgress steps={STEPS} currentStep={currentStep} />

        <div className="wizard-body">
          {STEP_COMPONENTS[currentStep]}
        </div>

        <div className="wizard-footer">
          {currentStep > 0 && (
            <button type="button" className="auth-text-btn" onClick={() => setCurrentStep((s) => s - 1)} disabled={isSaving}>
              <span className="material-symbols-outlined">arrow_back</span>Back
            </button>
          )}
          <div style={{ flex: 1 }} />
          {currentStep === STEPS.length - 1 && (
            <button type="button" className="auth-text-btn" onClick={() => { localStorage.removeItem(DRAFT_KEY); navigate('/branch/dashboard'); }}>
              Skip & Do Later
            </button>
          )}
          <button type="button" className="auth-submit-btn" style={{ minWidth: '160px' }} onClick={handleNext} disabled={isSaving}>
            {isSaving ? (
              <><span className="auth-spinner" />Saving…</>
            ) : currentStep === STEPS.length - 1 ? (
              <><span className="material-symbols-outlined">check_circle</span>Complete Setup</>
            ) : (
              <>Save & Continue<span className="material-symbols-outlined">arrow_forward</span></>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
