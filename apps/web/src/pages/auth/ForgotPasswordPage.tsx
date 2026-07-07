import React, { useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { OTPInput } from '../../components/ui/OTPInput';
import { CountdownTimer } from '../../components/ui/CountdownTimer';
import { useToast } from '../../components/ui/Toast';

type Step = 'email' | 'otp';

const OTP_DURATION_SECONDS = 5 * 60; // 5 min (PRD §3.3)

export function ForgotPasswordPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [step, setStep]           = useState<Step>('email');
  const [email, setEmail]         = useState('');
  const [otp, setOtp]             = useState<string[]>(Array(6).fill(''));
  const [isLoading, setIsLoading] = useState(false);
  const [otpExpired, setOtpExpired] = useState(false);
  const [resendKey, setResendKey] = useState(0);
  const [otpAttempts, setOtpAttempts] = useState(3);

  // ── Step 1: Send OTP ──────────────────────────────────────────────────────

  const handleSendOTP = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      // TODO: replace with api.auth.sendOtp(email)
      await new Promise((res) => setTimeout(res, 900));
      setStep('otp');
      setOtpExpired(false);
      showToast(`OTP sent to ${email.replace(/(.{2}).*@/, '$1***@')}`, 'success');
    } catch {
      showToast('Failed to send OTP. Please check your email and try again.', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [email, showToast]);

  // ── Step 2: Verify OTP ────────────────────────────────────────────────────

  const handleVerifyOTP = useCallback(async (otpStr: string) => {
    if (otpAttempts <= 0) return;
    setIsLoading(true);
    try {
      // TODO: replace with api.auth.verifyOtp(email, otpStr)
      await new Promise((res) => setTimeout(res, 700));
      showToast('OTP verified! Set your new password.', 'success');
      navigate('/reset-password', { state: { email, otp: otpStr } });
    } catch {
      const remaining = otpAttempts - 1;
      setOtpAttempts(remaining);
      if (remaining === 0) {
        showToast('Too many failed attempts. Please request a new OTP.', 'error');
        setOtp(Array(6).fill(''));
      } else {
        showToast(`Incorrect OTP. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.`, 'error');
      }
    } finally {
      setIsLoading(false);
    }
  }, [otpAttempts, navigate, email, showToast]);

  const handleResend = useCallback(async () => {
    setIsLoading(true);
    try {
      await new Promise((res) => setTimeout(res, 700));
      setOtp(Array(6).fill(''));
      setOtpExpired(false);
      setOtpAttempts(3);
      setResendKey((k) => k + 1);
      showToast('New OTP sent successfully.', 'success');
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

  // Masked email for display
  const maskedEmail = email.replace(/(.{2}).*@/, '$1***@');

  return (
    <div className="auth-page">
      <div className="auth-centered-card">
        {/* Back link */}
        <Link to="/login" className="auth-back-link">
          <span className="material-symbols-outlined">arrow_back</span>
          Back to Sign In
        </Link>

        {step === 'email' ? (
          <>
            <div className="auth-icon-circle auth-icon-circle--primary">
              <span className="material-symbols-outlined">key</span>
            </div>
            <h2 className="auth-form-title">Forgot Password?</h2>
            <p className="auth-form-sub">
              Enter your registered email address. We'll send you an OTP to reset your password.
            </p>

            <form onSubmit={handleSendOTP} className="auth-form">
              <div className="auth-field">
                <label htmlFor="forgot-email" className="auth-label">Email Address</label>
                <div className="auth-input-wrap">
                  <span className="material-symbols-outlined auth-input-icon">mail</span>
                  <input
                    id="forgot-email"
                    type="email"
                    className="auth-input"
                    placeholder="you@institution.edu.np"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoFocus
                  />
                </div>
              </div>

              <button
                type="submit"
                className="auth-submit-btn"
                disabled={isLoading || !email}
              >
                {isLoading ? (
                  <><span className="auth-spinner" aria-hidden="true" />Sending OTP…</>
                ) : (
                  <><span className="material-symbols-outlined">send</span>Send OTP</>
                )}
              </button>
            </form>
          </>
        ) : (
          <>
            <div className="auth-icon-circle auth-icon-circle--success">
              <span className="material-symbols-outlined">mark_email_read</span>
            </div>
            <h2 className="auth-form-title">Enter OTP</h2>
            <p className="auth-form-sub">
              A 6-digit OTP has been sent to <strong>{maskedEmail}</strong> and your
              registered phone number.
            </p>

            <div className="auth-form">
              <OTPInput
                value={otp}
                onChange={setOtp}
                onComplete={handleVerifyOTP}
                disabled={isLoading || otpExpired || otpAttempts === 0}
                error={otpAttempts < 3}
              />

              <div className="auth-otp-meta">
                {otpExpired || otpAttempts === 0 ? (
                  <span className="auth-otp-expired">OTP expired</span>
                ) : (
                  <span className="auth-otp-timer">
                    Expires in{' '}
                    <CountdownTimer
                      durationSeconds={OTP_DURATION_SECONDS}
                      onExpire={() => setOtpExpired(true)}
                      resetKey={resendKey}
                    />
                  </span>
                )}

                <button
                  type="button"
                  className="auth-link"
                  onClick={handleResend}
                  disabled={!otpExpired && otpAttempts > 0}
                  style={{ opacity: (!otpExpired && otpAttempts > 0) ? 0.4 : 1 }}
                >
                  Resend OTP
                </button>
              </div>

              <button
                type="button"
                className="auth-submit-btn"
                disabled={otp.join('').length < 6 || isLoading || otpExpired || otpAttempts === 0}
                onClick={() => handleVerifyOTP(otp.join(''))}
              >
                {isLoading ? (
                  <><span className="auth-spinner" aria-hidden="true" />Verifying…</>
                ) : (
                  <><span className="material-symbols-outlined">verified</span>Verify OTP</>
                )}
              </button>

              <button
                type="button"
                className="auth-text-btn"
                onClick={() => { setStep('email'); setOtp(Array(6).fill('')); }}
              >
                Change email address
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
