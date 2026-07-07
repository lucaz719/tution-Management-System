import React, { useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/ui/Toast';

// ─── Demo quick-fill (hidden unless ?demo=true) ───────────────────────────────

const DEMO_USERS = [
  { label: 'Tenant Admin',    email: 'admin@pinnacle.edu.np',        password: 'PinnacleAdmin777!',  hint: 'Institutional P&L & global policy' },
  { label: 'Branch Admin',    email: 'branch-admin@pinnacle.edu.np', password: 'BaneshworAdmin888!', hint: 'Petty cash approvals & vehicle transit' },
  { label: 'Teacher',         email: 'shyam@pinnacle.edu.np',        password: 'PhysicsPass999!',    hint: 'Geo-attendance, lesson gates & parent chat' },
  { label: 'Student/Parent',  email: 'parent.shyam@gmail.com',       password: 'ShyamParent123!',    hint: 'Digital ID, payment calendars & wallet' },
];

const ROLE_ICONS: Record<string, string> = {
  'Tenant Admin':   'domain',
  'Branch Admin':   'location_away',
  'Teacher':        'account_circle',
  'Student/Parent': 'family_restroom',
};

const ROLE_COLORS: Record<string, string> = {
  'Tenant Admin':   '#4355b9',
  'Branch Admin':   '#00ab9c',
  'Teacher':        '#f59f00',
  'Student/Parent': '#ff6b6b',
};

export function LoginPage() {
  const navigate   = useNavigate();
  const { login, roleRedirectPath } = useAuth();
  const { showToast } = useToast();

  const [email, setEmail]         = useState('');
  const [password, setPassword]   = useState('');
  const [showPw, setShowPw]       = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [failCount, setFailCount] = useState(0);
  const [lockDialog, setLockDialog] = useState(false);

  const isDemoMode = new URLSearchParams(window.location.search).get('demo') === 'true';

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (failCount >= 5) { setLockDialog(true); return; }
    setIsLoading(true);
    try {
      await login(email, password, rememberMe);
      const dest = roleRedirectPath();
      navigate(dest, { replace: true });
    } catch {
      const next = failCount + 1;
      setFailCount(next);
      if (next >= 5) {
        setLockDialog(true);
      } else {
        showToast(
          `Invalid email or password. ${5 - next} attempt${5 - next === 1 ? '' : 's'} remaining before account lock.`,
          'error'
        );
      }
    } finally {
      setIsLoading(false);
    }
  }, [email, password, rememberMe, failCount, login, navigate, roleRedirectPath, showToast]);

  const handleDemoFill = (user: typeof DEMO_USERS[0]) => {
    setEmail(user.email);
    setPassword(user.password);
  };

  return (
    <div className="auth-page">
      <div className="auth-split">
        {/* ── Left Hero Panel ── */}
        <div className="auth-hero">
          <div className="auth-hero-content">
            <div className="auth-logo-row">
              <span className="material-symbols-outlined auth-logo-icon">school</span>
              <div>
                <h1 className="auth-brand">TMS</h1>
                <p className="auth-brand-sub">Tuition Management System</p>
              </div>
            </div>
            <h2 className="auth-hero-title">Welcome to TMS</h2>
            <p className="auth-hero-desc">
              Manage your tuition institution from a single, powerful platform.
            </p>
            <ul className="auth-feature-list">
              {[
                'Multi-branch management',
                'Smart attendance & billing',
                'AI-driven financial insights',
                'Real-time communication hub',
              ].map((feat) => (
                <li key={feat}>
                  <span className="material-symbols-outlined auth-check-icon">check_circle</span>
                  {feat}
                </li>
              ))}
            </ul>
          </div>
          <div className="auth-hero-decoration" aria-hidden="true">
            <div className="auth-orb auth-orb-1" />
            <div className="auth-orb auth-orb-2" />
          </div>
        </div>

        {/* ── Right Form Panel ── */}
        <div className="auth-form-panel">
          <div className="auth-form-inner">
            <h2 className="auth-form-title">Sign In</h2>
            <p className="auth-form-sub">Enter your credentials to access the platform</p>

            <form onSubmit={handleSubmit} className="auth-form" noValidate>
              {/* Email */}
              <div className="auth-field">
                <label htmlFor="login-email" className="auth-label">Email Address</label>
                <div className="auth-input-wrap">
                  <span className="material-symbols-outlined auth-input-icon">mail</span>
                  <input
                    id="login-email"
                    type="email"
                    className="auth-input"
                    placeholder="you@institution.edu.np"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    required
                  />
                </div>
              </div>

              {/* Password */}
              <div className="auth-field">
                <div className="auth-label-row">
                  <label htmlFor="login-password" className="auth-label">Password</label>
                  <Link to="/forgot-password" className="auth-forgot-link">
                    Forgot password?
                  </Link>
                </div>
                <div className="auth-input-wrap">
                  <span className="material-symbols-outlined auth-input-icon">lock</span>
                  <input
                    id="login-password"
                    type={showPw ? 'text' : 'password'}
                    className="auth-input auth-input--padded-right"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    required
                  />
                  <button
                    type="button"
                    className="auth-toggle-pw"
                    onClick={() => setShowPw((v) => !v)}
                    aria-label={showPw ? 'Hide password' : 'Show password'}
                  >
                    <span className="material-symbols-outlined">
                      {showPw ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>
              </div>

              {/* Remember me */}
              <label className="auth-remember">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                <span>Remember me for 30 days</span>
              </label>

              {/* Submit */}
              <button
                type="submit"
                className="auth-submit-btn"
                disabled={isLoading || !email || !password}
              >
                {isLoading ? (
                  <>
                    <span className="auth-spinner" aria-hidden="true" />
                    Verifying…
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined">login</span>
                    Sign In
                  </>
                )}
              </button>
            </form>

            <p className="auth-help-text">
              Having trouble signing in?{' '}
              <a href="mailto:support@tms.edu.np" className="auth-link">
                Contact your administrator
              </a>
            </p>

            {/* Demo Panel (only when ?demo=true) */}
            {isDemoMode && (
              <div className="auth-demo-panel">
                <p className="auth-demo-title">
                  <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>experiment</span>
                  Demo Quick-Fill
                </p>
                {DEMO_USERS.map((u) => (
                  <button
                    key={u.label}
                    className="auth-demo-btn"
                    onClick={() => handleDemoFill(u)}
                    type="button"
                  >
                    <span
                      className="material-symbols-outlined"
                      style={{ color: ROLE_COLORS[u.label], fontSize: '20px' }}
                    >
                      {ROLE_ICONS[u.label]}
                    </span>
                    <div>
                      <p style={{ fontWeight: 600, fontSize: '13px' }}>{u.label}</p>
                      <p style={{ fontSize: '11px', color: 'var(--text-muted-foreground)' }}>{u.hint}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Account Lock Dialog ── */}
      {lockDialog && (
        <div className="auth-dialog-overlay" role="dialog" aria-modal="true" aria-labelledby="lock-title">
          <div className="auth-dialog">
            <span className="material-symbols-outlined auth-dialog-icon auth-dialog-icon--error">lock</span>
            <h3 id="lock-title" className="auth-dialog-title">Account Locked</h3>
            <p className="auth-dialog-body">
              Your account has been locked after 5 failed attempts. Please reset your password
              or contact your administrator.
            </p>
            <div className="auth-dialog-actions">
              <Link to="/forgot-password" className="auth-submit-btn" style={{ textDecoration: 'none', textAlign: 'center' }}>
                Reset Password
              </Link>
              <a href="mailto:support@tms.edu.np" className="auth-link" style={{ textAlign: 'center' }}>
                Contact Admin
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
