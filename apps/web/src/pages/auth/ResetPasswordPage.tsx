import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { PasswordStrengthBar } from '../../components/ui/PasswordStrengthBar';
import { useToast } from '../../components/ui/Toast';
import { AuthFlowError, getResetRequestByToken, resetPassword } from '../../features/auth/service';
import { getPasswordRuleResults } from '../../features/auth/utils';

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { token = '' } = useParams();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [formError, setFormError] = useState('');

  const resetRequest = useMemo(() => (token ? getResetRequestByToken(token) : null), [token]);
  const ruleResults = getPasswordRuleResults(newPassword);
  const allRulesPassed = ruleResults.every(Boolean);
  const passwordsMatch = confirmPassword.length > 0 && newPassword === confirmPassword;
  const canSubmit = allRulesPassed && passwordsMatch && Boolean(token) && !isSubmitting;

  useEffect(() => {
    if (!success) {
      return undefined;
    }

    const redirectTimer = window.setTimeout(() => {
      navigate('/login', { replace: true });
    }, 1400);

    return () => window.clearTimeout(redirectTimer);
  }, [navigate, success]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!token || !canSubmit) {
      return;
    }

    setIsSubmitting(true);
    setFormError('');

    try {
      await resetPassword(token, newPassword);
      setSuccess(true);
      showToast('Password reset successful. Redirecting to sign in…', 'success');
    } catch (error) {
      const message =
        error instanceof AuthFlowError ? error.message : 'Unable to reset the password right now. Please try again.';
      setFormError(message);
      showToast(message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!resetRequest) {
    return (
      <div className="auth-page">
        <div className="auth-centered-card">
          <div className="auth-step-shell">
            <h1 className="auth-form-title">Set new password</h1>
            <p className="auth-form-subtitle">
              This reset link is invalid or has expired. Request a new password reset to continue.
            </p>
            <Link to="/forgot-password" className="auth-submit-btn" style={{ textDecoration: 'none' }}>
              Request new reset link
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-centered-card">
        <Link to="/forgot-password" className="auth-back-link">
          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
            arrow_back
          </span>
          Back
        </Link>

        {success ? (
          <div className="auth-success-state">
            <span className="material-symbols-outlined" style={{ fontSize: '46px', color: 'var(--color-success)' }}>
              check_circle
            </span>
            <h1 className="auth-form-title">Password updated</h1>
            <p className="auth-form-subtitle">Your password has been changed successfully.</p>
          </div>
        ) : (
          <div className="auth-step-shell">
            <div className="auth-form-heading">
              <h1 className="auth-form-title">Set new password</h1>
              <p className="auth-form-subtitle">Choose a strong password for your account.</p>
            </div>

            <form className="auth-form" onSubmit={handleSubmit} noValidate>
              <div className="auth-field">
                <label className="auth-label" htmlFor="reset-new-password">
                  New Password
                </label>
                <div className="auth-input-wrap">
                  <input
                    id="reset-new-password"
                    className="auth-input"
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(event) => setNewPassword(event.target.value)}
                    autoComplete="new-password"
                    placeholder="Enter a new password"
                    required
                  />
                  <button
                    type="button"
                    className="auth-password-toggle"
                    onClick={() => setShowNewPassword((current) => !current)}
                    aria-label={showNewPassword ? 'Hide new password' : 'Show new password'}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                      {showNewPassword ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>
                <PasswordStrengthBar password={newPassword} />
              </div>

              <div className="auth-field">
                <label className="auth-label" htmlFor="reset-confirm-password">
                  Confirm Password
                </label>
                <div className="auth-input-wrap">
                  <input
                    id="reset-confirm-password"
                    className={`auth-input${confirmPassword && !passwordsMatch ? ' auth-input-invalid' : ''}`}
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    autoComplete="new-password"
                    placeholder="Re-enter your new password"
                    required
                  />
                  <button
                    type="button"
                    className="auth-password-toggle"
                    onClick={() => setShowConfirmPassword((current) => !current)}
                    aria-label={showConfirmPassword ? 'Hide confirmed password' : 'Show confirmed password'}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                      {showConfirmPassword ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>
                <p className={`auth-helper-text${passwordsMatch ? ' auth-helper-text--success' : ' auth-helper-text--error'}`}>
                  {passwordsMatch ? '✓ Passwords match' : '✗ Passwords must match'}
                </p>
              </div>

              {formError ? <p className="auth-helper-text auth-helper-text--error">{formError}</p> : null}

              <button type="submit" className="auth-submit-btn" disabled={!canSubmit}>
                {isSubmitting ? (
                  <>
                    <span className="auth-spinner" aria-hidden="true" />
                    Resetting…
                  </>
                ) : (
                  'Reset Password'
                )}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
