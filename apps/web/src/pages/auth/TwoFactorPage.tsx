import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { OTPInput } from '../../components/ui/OTPInput';
import { CountdownTimer } from '../../components/ui/CountdownTimer';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/ui/Toast';

const TWO_FA_DURATION = 5 * 60; // 5 min (PRD §7)

export function TwoFactorPage() {
  const navigate = useNavigate();
  const { user, roleRedirectPath } = useAuth();
  const { showToast } = useToast();

  const [otp, setOtp]               = useState<string[]>(Array(6).fill(''));
  const [trustDevice, setTrustDevice] = useState(false);
  const [isLoading, setIsLoading]   = useState(false);
  const [expired, setExpired]       = useState(false);
  const [attempts, setAttempts]     = useState(3);
  const [resendKey, setResendKey]   = useState(0);

  const maskedPhone = '••••27'; // TODO: get from user profile

  const handleVerify = useCallback(async (code: string) => {
    const otpStr = code;
    if (attempts <= 0 || expired) return;
    setIsLoading(true);
    try {
      console.log('Verifying 2FA code:', otpStr);
      // TODO: replace with api.auth.verify2fa(otpStr)
      await new Promise((res) => setTimeout(res, 700));
      if (trustDevice) {
        document.cookie = `tms_trusted=${Date.now()}; max-age=${30 * 24 * 3600}; path=/; SameSite=Strict`;
      }
      const dest = roleRedirectPath();
      navigate(dest, { replace: true });
    } catch {
      const rem = attempts - 1;
      setAttempts(rem);
      if (rem === 0) {
        showToast('Too many failed attempts. Please request a new code.', 'error');
        setOtp(Array(6).fill(''));
      } else {
        showToast(`Incorrect code. ${rem} attempt${rem === 1 ? '' : 's'} remaining.`, 'error');
      }
    } finally {
      setIsLoading(false);
    }
  }, [attempts, expired, trustDevice, navigate, roleRedirectPath, showToast]);

  const handleResend = useCallback(async () => {
    setIsLoading(true);
    try {
      await new Promise((res) => setTimeout(res, 600));
      setOtp(Array(6).fill(''));
      setExpired(false);
      setAttempts(3);
      setResendKey((k) => k + 1);
      showToast('New code sent to your phone.', 'success');
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

  return (
    <div className="auth-page">
      <div className="auth-centered-card">
        <div className="auth-icon-circle auth-icon-circle--warning">
          <span className="material-symbols-outlined">shield</span>
        </div>

        <h2 className="auth-form-title">Two-Factor Authentication</h2>
        <p className="auth-form-sub">
          A verification code has been sent to your registered phone number ending in{' '}
          <strong>{maskedPhone}</strong>.
        </p>

        {user && (
          <div className="auth-2fa-user">
            <span className="material-symbols-outlined" style={{ color: 'var(--brand)', fontSize: '20px' }}>
              account_circle
            </span>
            <span>{user.name}</span>
          </div>
        )}

        <div className="auth-form">
          <OTPInput
            value={otp}
            onChange={setOtp}
            onComplete={handleVerify}
            disabled={isLoading || expired || attempts === 0}
            error={attempts < 3}
          />

          <div className="auth-otp-meta">
            {expired || attempts === 0 ? (
              <span className="auth-otp-expired">Code expired or locked</span>
            ) : (
              <span className="auth-otp-timer">
                Expires in{' '}
                <CountdownTimer
                  durationSeconds={TWO_FA_DURATION}
                  onExpire={() => setExpired(true)}
                  resetKey={resendKey}
                />
              </span>
            )}
            <button
              type="button"
              className="auth-link"
              onClick={handleResend}
              disabled={!expired && attempts > 0}
              style={{ opacity: (!expired && attempts > 0) ? 0.4 : 1 }}
            >
              Resend Code
            </button>
          </div>

          {/* Trust device */}
          <label className="auth-remember">
            <input
              type="checkbox"
              checked={trustDevice}
              onChange={(e) => setTrustDevice(e.target.checked)}
            />
            <span>Trust this device for 30 days</span>
          </label>

          <button
            type="button"
            className="auth-submit-btn"
            disabled={otp.join('').length < 6 || isLoading || expired || attempts === 0}
            onClick={() => handleVerify(otp.join(''))}
          >
            {isLoading ? (
              <><span className="auth-spinner" />Verifying…</>
            ) : (
              <><span className="material-symbols-outlined">verified_user</span>Verify Code</>
            )}
          </button>
        </div>

        <p className="auth-help-text" style={{ marginTop: '16px' }}>
          Didn't receive the code?{' '}
          <a href="mailto:support@tms.edu.np" className="auth-link">Contact support</a>
        </p>
      </div>
    </div>
  );
}
