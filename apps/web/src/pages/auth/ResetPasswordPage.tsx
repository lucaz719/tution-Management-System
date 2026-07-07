import React, { useState, useCallback } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { PasswordStrengthBar } from '../../components/ui/PasswordStrengthBar';
import { useToast } from '../../components/ui/Toast';

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { showToast } = useToast();

  const { email = '', otp = '' } = (location.state as { email?: string; otp?: string }) ?? {};

  const [newPw, setNewPw]         = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [showNew, setShowNew]     = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess]     = useState(false);

  const passwordsMatch = confirmPw && newPw === confirmPw;
  const allRulesPassed = /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/.test(newPw);
  const canSubmit = allRulesPassed && passwordsMatch && !isLoading;

  const handleReset = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setIsLoading(true);
    try {
      // TODO: replace with api.auth.resetPassword(email, otp, newPw)
      await new Promise((res) => setTimeout(res, 1000));
      setSuccess(true);
      showToast('Password updated successfully!', 'success');
      setTimeout(() => navigate('/login'), 2500);
    } catch {
      showToast('Failed to reset password. The OTP may have expired. Please try again.', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [canSubmit, navigate, showToast, email, otp]);

  return (
    <div className="auth-page">
      <div className="auth-centered-card">
        <Link to="/forgot-password" className="auth-back-link">
          <span className="material-symbols-outlined">arrow_back</span>
          Back
        </Link>

        {success ? (
          <div className="auth-success-state">
            <div className="auth-icon-circle auth-icon-circle--success">
              <span className="material-symbols-outlined">check_circle</span>
            </div>
            <h2 className="auth-form-title">Password Updated!</h2>
            <p className="auth-form-sub">Redirecting you to Sign In…</p>
            <div className="auth-progress-bar">
              <div className="auth-progress-bar-fill auth-progress-bar-fill--animated" />
            </div>
          </div>
        ) : (
          <>
            <div className="auth-icon-circle auth-icon-circle--primary">
              <span className="material-symbols-outlined">lock_reset</span>
            </div>
            <h2 className="auth-form-title">Set New Password</h2>
            <p className="auth-form-sub">
              Your new password must be at least 8 characters and include uppercase,
              lowercase, a number, and a special character.
            </p>

            <form onSubmit={handleReset} className="auth-form">
              {/* New Password */}
              <div className="auth-field">
                <label htmlFor="new-password" className="auth-label">New Password</label>
                <div className="auth-input-wrap">
                  <span className="material-symbols-outlined auth-input-icon">lock</span>
                  <input
                    id="new-password"
                    type={showNew ? 'text' : 'password'}
                    className="auth-input auth-input--padded-right"
                    placeholder="Min 8 characters"
                    value={newPw}
                    onChange={(e) => setNewPw(e.target.value)}
                    autoComplete="new-password"
                    required
                    autoFocus
                  />
                  <button
                    type="button"
                    className="auth-toggle-pw"
                    onClick={() => setShowNew((v) => !v)}
                    aria-label={showNew ? 'Hide password' : 'Show password'}
                  >
                    <span className="material-symbols-outlined">
                      {showNew ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>
                <PasswordStrengthBar password={newPw} />
              </div>

              {/* Confirm Password */}
              <div className="auth-field">
                <label htmlFor="confirm-password" className="auth-label">Confirm Password</label>
                <div className="auth-input-wrap">
                  <span className="material-symbols-outlined auth-input-icon">lock</span>
                  <input
                    id="confirm-password"
                    type={showConfirm ? 'text' : 'password'}
                    className="auth-input auth-input--padded-right"
                    placeholder="Repeat new password"
                    value={confirmPw}
                    onChange={(e) => setConfirmPw(e.target.value)}
                    autoComplete="new-password"
                    required
                  />
                  <button
                    type="button"
                    className="auth-toggle-pw"
                    onClick={() => setShowConfirm((v) => !v)}
                    aria-label={showConfirm ? 'Hide' : 'Show'}
                  >
                    <span className="material-symbols-outlined">
                      {showConfirm ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>
                {confirmPw && !passwordsMatch && (
                  <p className="auth-field-error">
                    <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>error</span>
                    Passwords do not match
                  </p>
                )}
                {confirmPw && passwordsMatch && (
                  <p className="auth-field-success">
                    <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>check_circle</span>
                    Passwords match
                  </p>
                )}
              </div>

              <button
                type="submit"
                className="auth-submit-btn"
                disabled={!canSubmit}
              >
                {isLoading ? (
                  <><span className="auth-spinner" />Updating Password…</>
                ) : (
                  <><span className="material-symbols-outlined">lock_reset</span>Update Password</>
                )}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
