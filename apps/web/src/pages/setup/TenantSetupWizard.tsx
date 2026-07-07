import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { WizardProgress } from '../../components/ui/WizardProgress';
import { useToast } from '../../components/ui/Toast';

const STEPS = [
  { label: 'Institution Profile' },
  { label: 'PAN & Tax' },
  { label: 'Add First Branch' },
  { label: 'Fee Defaults' },
  { label: 'Invite Admin' },
];

// ─── Step 1: Institution Profile ─────────────────────────────────────────────

function Step1({ data, onChange }: { data: any; onChange: (d: any) => void }) {
  return (
    <div className="wizard-step-content">
      <h3 className="wizard-step-title">Institution Profile</h3>
      <p className="wizard-step-desc">
        Enter your institution's basic information. This will appear on all invoices,
        certificates, and communications.
      </p>
      <div className="wizard-fields">
        <WizardField label="Institution Name *" required>
          <input className="auth-input" placeholder="e.g. Pinnacle Academy" value={data.name ?? ''} onChange={(e) => onChange({ ...data, name: e.target.value })} />
        </WizardField>
        <WizardField label="Phone Number *" required>
          <input className="auth-input" type="tel" placeholder="e.g. 01-4XXXXXX" value={data.phone ?? ''} onChange={(e) => onChange({ ...data, phone: e.target.value })} />
        </WizardField>
        <WizardField label="Official Email *" required>
          <input className="auth-input" type="email" placeholder="admin@institution.edu.np" value={data.email ?? ''} onChange={(e) => onChange({ ...data, email: e.target.value })} />
        </WizardField>
        <WizardField label="Address *" required>
          <input className="auth-input" placeholder="Street address" value={data.address ?? ''} onChange={(e) => onChange({ ...data, address: e.target.value })} />
        </WizardField>
        <WizardField label="City *" required>
          <input className="auth-input" placeholder="e.g. Kathmandu" value={data.city ?? ''} onChange={(e) => onChange({ ...data, city: e.target.value })} />
        </WizardField>
        <WizardField label="Province *" required>
          <select className="auth-input" value={data.province ?? ''} onChange={(e) => onChange({ ...data, province: e.target.value })}>
            <option value="">Select province</option>
            {['Koshi', 'Madhesh', 'Bagmati', 'Gandaki', 'Lumbini', 'Karnali', 'Sudurpashchim'].map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </WizardField>
        <WizardField label="Institution Logo (optional)">
          <div className="wizard-upload-zone">
            <span className="material-symbols-outlined wizard-upload-icon">cloud_upload</span>
            <p>Drag & drop or <span className="auth-link">browse</span></p>
            <p style={{ fontSize: '11px', color: 'var(--text-muted-foreground)' }}>PNG, JPG up to 2MB. Recommended: 256×256px</p>
          </div>
        </WizardField>
      </div>
    </div>
  );
}

// ─── Step 2: PAN & Tax ────────────────────────────────────────────────────────

function Step2({ data, onChange }: { data: any; onChange: (d: any) => void }) {
  return (
    <div className="wizard-step-content">
      <h3 className="wizard-step-title">PAN & Tax Setup</h3>
      <p className="wizard-step-desc">Configure your fiscal and tax settings for invoicing.</p>
      <div className="wizard-fields">
        <WizardField label="PAN Number * (9-digit Nepal)" required>
          <input className="auth-input" type="text" maxLength={9} pattern="\d{9}" placeholder="000000000" value={data.pan ?? ''} onChange={(e) => onChange({ ...data, pan: e.target.value.replace(/\D/g, '') })} />
        </WizardField>
        <WizardField label="VAT Registered?">
          <div className="wizard-radio-group">
            {['Yes', 'No'].map((opt) => (
              <label key={opt} className="wizard-radio-label">
                <input type="radio" name="vat" value={opt} checked={data.vatRegistered === opt} onChange={() => onChange({ ...data, vatRegistered: opt })} />
                {opt}
              </label>
            ))}
          </div>
        </WizardField>
        {data.vatRegistered === 'Yes' && (
          <WizardField label="VAT Percentage (0–100)">
            <input className="auth-input" type="number" min={0} max={100} placeholder="13" value={data.vatPct ?? ''} onChange={(e) => onChange({ ...data, vatPct: e.target.value })} />
          </WizardField>
        )}
        <WizardField label="Invoice Prefix">
          <input className="auth-input" placeholder="e.g. INV-" value={data.invoicePrefix ?? ''} onChange={(e) => onChange({ ...data, invoicePrefix: e.target.value })} />
        </WizardField>
        <WizardField label="Fiscal Year Start Month">
          <select className="auth-input" value={data.fiscalMonth ?? ''} onChange={(e) => onChange({ ...data, fiscalMonth: e.target.value })}>
            <option value="">Select month</option>
            {['January','February','March','April','Shrawan (July)','August','September','October','November','December'].map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </WizardField>
      </div>
    </div>
  );
}

// ─── Step 3: Add First Branch ─────────────────────────────────────────────────

function Step3({ data, onChange }: { data: any; onChange: (d: any) => void }) {
  return (
    <div className="wizard-step-content">
      <h3 className="wizard-step-title">Add First Branch</h3>
      <p className="wizard-step-desc">Configure your first branch. GPS coordinates are required for geo-attendance.</p>
      <div className="wizard-fields">
        <WizardField label="Branch Name *" required>
          <input className="auth-input" placeholder="e.g. Baneshwor Branch" value={data.branchName ?? ''} onChange={(e) => onChange({ ...data, branchName: e.target.value })} />
        </WizardField>
        <WizardField label="Branch Address *" required>
          <input className="auth-input" placeholder="Full address" value={data.branchAddress ?? ''} onChange={(e) => onChange({ ...data, branchAddress: e.target.value })} />
        </WizardField>
        <WizardField label="GPS Coordinates (required for geo-attendance)">
          <div className="wizard-map-placeholder">
            <span className="material-symbols-outlined" style={{ fontSize: '36px', color: 'var(--brand)' }}>location_on</span>
            <p>Map picker coming in production</p>
            <input className="auth-input" style={{ marginTop: '8px' }} placeholder="lat, lng  e.g. 27.7041, 85.3145" value={data.gps ?? ''} onChange={(e) => onChange({ ...data, gps: e.target.value })} />
          </div>
        </WizardField>
        <WizardField label="Attendance Radius (10–500 meters)">
          <div className="wizard-slider-row">
            <input type="range" min={10} max={500} step={10} value={data.radius ?? 100} onChange={(e) => onChange({ ...data, radius: Number(e.target.value) })} style={{ flex: 1 }} />
            <span className="wizard-slider-value">{data.radius ?? 100}m</span>
          </div>
        </WizardField>
      </div>
    </div>
  );
}

// ─── Step 4: Fee & Billing Defaults ──────────────────────────────────────────

function Step4({ data, onChange }: { data: any; onChange: (d: any) => void }) {
  return (
    <div className="wizard-step-content">
      <h3 className="wizard-step-title">Fee & Billing Defaults</h3>
      <p className="wizard-step-desc">Set default billing behaviour for all branches. Can be overridden per branch.</p>
      <div className="wizard-fields">
        <WizardField label="Default Late Fee Amount (NPR)">
          <input className="auth-input" type="number" min={0} placeholder="0" value={data.lateFee ?? ''} onChange={(e) => onChange({ ...data, lateFee: e.target.value })} />
        </WizardField>
        <WizardField label="Fee Reminder Schedule">
          <div className="wizard-radio-group">
            {['Day 1', 'Day 3', 'Custom'].map((opt) => (
              <label key={opt} className="wizard-radio-label">
                <input type="radio" name="reminder" value={opt} checked={data.reminder === opt} onChange={() => onChange({ ...data, reminder: opt })} />
                {opt}
              </label>
            ))}
          </div>
        </WizardField>
        <WizardField label="Monthly Petty Cash Cap (NPR)">
          <input className="auth-input" type="number" min={0} placeholder="5000" value={data.pettyCashCap ?? ''} onChange={(e) => onChange({ ...data, pettyCashCap: e.target.value })} />
        </WizardField>
        <WizardField label="Grace Period (1–60 minutes)">
          <div className="wizard-slider-row">
            <input type="range" min={1} max={60} value={data.gracePeriod ?? 10} onChange={(e) => onChange({ ...data, gracePeriod: Number(e.target.value) })} style={{ flex: 1 }} />
            <span className="wizard-slider-value">{data.gracePeriod ?? 10} min</span>
          </div>
        </WizardField>
      </div>
    </div>
  );
}

// ─── Step 5: Invite Branch Admin ──────────────────────────────────────────────

function Step5({ data, onChange }: { data: any; onChange: (d: any) => void }) {
  return (
    <div className="wizard-step-content">
      <h3 className="wizard-step-title">Invite Branch Admin</h3>
      <p className="wizard-step-desc">
        Invite the first Branch Admin. The system will send an email with a temporary password.
        You can skip this and do it later from Branch Management.
      </p>
      <div className="wizard-fields">
        <WizardField label="Full Name">
          <input className="auth-input" placeholder="Admin's full name" value={data.adminName ?? ''} onChange={(e) => onChange({ ...data, adminName: e.target.value })} />
        </WizardField>
        <WizardField label="Email Address">
          <input className="auth-input" type="email" placeholder="branch.admin@institution.edu.np" value={data.adminEmail ?? ''} onChange={(e) => onChange({ ...data, adminEmail: e.target.value })} />
        </WizardField>
        <WizardField label="Role">
          <input className="auth-input" value="Branch Admin" readOnly style={{ opacity: 0.6, cursor: 'not-allowed' }} />
        </WizardField>
      </div>
    </div>
  );
}

// ─── Shared Field Wrapper ─────────────────────────────────────────────────────

function WizardField({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="auth-field">
      <label className="auth-label">
        {label}
        {required && <span style={{ color: 'var(--color-error)', marginLeft: '2px' }}>*</span>}
      </label>
      {children}
    </div>
  );
}

// ─── Main Wizard ──────────────────────────────────────────────────────────────

const STEP_STORAGE_KEY = 'tms_tenant_wizard_draft';

export function TenantSetupWizard() {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [currentStep, setCurrentStep] = useState(0);
  const [isSaving, setIsSaving]       = useState(false);

  // Load draft from localStorage
  const [stepData, setStepData] = useState<Record<number, any>>(() => {
    try { return JSON.parse(localStorage.getItem(STEP_STORAGE_KEY) ?? '{}'); }
    catch { return {}; }
  });

  const updateStep = useCallback((data: any) => {
    setStepData((prev) => {
      const next = { ...prev, [currentStep]: data };
      localStorage.setItem(STEP_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, [currentStep]);

  const handleNext = useCallback(async () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep((s) => s + 1);
    } else {
      // Final step — submit
      setIsSaving(true);
      try {
        await new Promise((res) => setTimeout(res, 1200));
        localStorage.removeItem(STEP_STORAGE_KEY);
        showToast('Institution setup complete! Welcome to TMS.', 'success');
        navigate('/tenant/dashboard', { replace: true });
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
    <Step4 data={stepData[3] ?? {}} onChange={updateStep} />,
    <Step5 data={stepData[4] ?? {}} onChange={updateStep} />,
  ];

  return (
    <div className="auth-page">
      <div className="wizard-container">
        <div className="wizard-header">
          <span className="material-symbols-outlined" style={{ fontSize: '28px', color: 'var(--brand)' }}>
            business
          </span>
          <div>
            <h2 style={{ fontSize: '20px', fontWeight: 700 }}>First-Time Institution Setup</h2>
            <p style={{ fontSize: '13px', color: 'var(--text-muted-foreground)' }}>
              Complete {STEPS.length} steps to configure your institution
            </p>
          </div>
        </div>

        <WizardProgress steps={STEPS} currentStep={currentStep} />

        <div className="wizard-body">
          {STEP_COMPONENTS[currentStep]}
        </div>

        <div className="wizard-footer">
          {currentStep > 0 && (
            <button
              type="button"
              className="auth-text-btn"
              onClick={() => setCurrentStep((s) => s - 1)}
              disabled={isSaving}
            >
              <span className="material-symbols-outlined">arrow_back</span>
              Back
            </button>
          )}
          <div style={{ flex: 1 }} />
          {currentStep === STEPS.length - 1 && (
            <button
              type="button"
              className="auth-text-btn"
              onClick={() => { localStorage.removeItem(STEP_STORAGE_KEY); navigate('/tenant/dashboard'); }}
            >
              Skip & Do Later
            </button>
          )}
          <button
            type="button"
            className="auth-submit-btn"
            style={{ minWidth: '160px' }}
            onClick={handleNext}
            disabled={isSaving}
          >
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
