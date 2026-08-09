import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { useToast } from '../../components/ui/Toast';

function SealMotif() {
  return (
    <div className="auth-seal" aria-hidden="true">
      <svg viewBox="0 0 240 240" fill="none">
        <defs>
          <path id="seal-path" d="M120 28a92 92 0 1 1 0 184a92 92 0 0 1 0-184Z" />
        </defs>
        <circle cx="120" cy="120" r="102" stroke="rgba(255,255,255,0.28)" strokeWidth="2" />
        <circle cx="120" cy="120" r="82" stroke="rgba(255,255,255,0.18)" strokeWidth="1.5" />
        <text fill="rgba(255,255,255,0.88)" fontFamily="Roboto, sans-serif" fontSize="11" letterSpacing="2">
          <textPath href="#seal-path" startOffset="3%">
            SANSKARDIP SHIKSHALAYA • TUITION MANAGEMENT SYSTEM • 
          </textPath>
        </text>
        <circle cx="120" cy="120" r="46" fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.18)" />
        <path
          d="M106 130V96h8v8h14v-8h8v34h-8v-20h-14v20h-8zm0 18v-8h30v8h-30z"
          fill="rgba(255,255,255,0.85)"
        />
      </svg>
    </div>
  );
}

export function ForceChangePasswordPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();
  
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // If user somehow gets here without needing a password change, redirect to login
  if (!user || !user.requiresPasswordChange) {
    navigate('/login', { replace: true });
    return null;
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (newPassword !== confirmPassword) {
      showToast('New passwords do not match.', 'error');
      return;
    }
    if (newPassword.length < 8) {
      showToast('Password must be at least 8 characters.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      // Use the changePassword API with the temporary password
      await api.auth.changePassword(currentPassword, newPassword);
      showToast('Password changed successfully. Please log in again with your new password.', 'success');
      
      // Navigate to login so they can log in with the new password
      navigate('/login', { replace: true });
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Failed to change password. Make sure the current password is correct.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-split">
        <section className="auth-hero">
          <div className="auth-hero-content">
            <div className="auth-wordmark">
              <div className="auth-wordmark-mark">
                <span className="material-symbols-outlined">lock_reset</span>
              </div>
              <div>
                <div className="auth-wordmark-title">TMS Security</div>
                <p className="auth-wordmark-subtitle">Action required.</p>
              </div>
            </div>

            <h1 className="auth-hero-title">Reset Required</h1>
            <p className="auth-hero-description">
              You logged in using a temporary password. For security reasons, you must set a new, permanent password before continuing to your portal.
            </p>

            <SealMotif />
          </div>
        </section>

        <section className="auth-form-panel">
          <div className="auth-form-inner">
            <div className="auth-form-heading">
              <h2 className="auth-form-title">Set New Password</h2>
              <p className="auth-form-subtitle">Choose a strong password that you haven't used before.</p>
            </div>

            <form className="auth-form" onSubmit={handleSubmit} noValidate>
              <div className="auth-field">
                <label className="auth-label" htmlFor="current-password">Temporary Password</label>
                <div className="auth-input-wrap">
                  <span className="material-symbols-outlined auth-input-icon">key</span>
                  <input
                    id="current-password"
                    className="auth-input auth-input--with-leading-icon"
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter the temporary password"
                    required
                  />
                </div>
              </div>

              <div className="auth-field">
                <label className="auth-label" htmlFor="new-password">New Password</label>
                <div className="auth-input-wrap">
                  <span className="material-symbols-outlined auth-input-icon">lock</span>
                  <input
                    id="new-password"
                    className="auth-input auth-input--with-leading-icon"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="At least 8 characters"
                    minLength={8}
                    required
                  />
                </div>
              </div>

              <div className="auth-field">
                <label className="auth-label" htmlFor="confirm-password">Confirm New Password</label>
                <div className="auth-input-wrap">
                  <span className="material-symbols-outlined auth-input-icon">lock</span>
                  <input
                    id="confirm-password"
                    className="auth-input auth-input--with-leading-icon"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat new password"
                    minLength={8}
                    required
                  />
                </div>
              </div>

              <button type="submit" className="auth-submit-btn" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <span className="auth-spinner" aria-hidden="true" />
                    Updating…
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>check_circle</span>
                    Set Password & Continue
                  </>
                )}
              </button>
            </form>
          </div>
        </section>
      </div>
    </div>
  );
}
