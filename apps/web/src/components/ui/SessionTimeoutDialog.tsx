import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { CountdownTimer } from '../ui/CountdownTimer';

const IDLE_TIMEOUT_SECONDS = 15 * 60; // 15 min default
const WARN_BEFORE_SECONDS  = 2 * 60;  // show warning 2 min before

const IDLE_EVENTS = ['mousemove', 'keydown', 'touchstart', 'click', 'scroll'] as const;

/**
 * Session timeout idle detector + warning dialog overlay. PRD §8.1
 * Renders as a portal inside any authenticated page.
 */
export function SessionTimeoutDialog() {
  const { logout } = useAuth();
  const [showWarning, setShowWarning] = useState(false);
  const lastActivityRef = useRef(Date.now());
  const checkIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const resetActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
    if (showWarning) setShowWarning(false);
  }, [showWarning]);

  useEffect(() => {
    IDLE_EVENTS.forEach((ev) => window.addEventListener(ev, resetActivity, { passive: true }));
    return () => IDLE_EVENTS.forEach((ev) => window.removeEventListener(ev, resetActivity));
  }, [resetActivity]);

  useEffect(() => {
    checkIntervalRef.current = setInterval(() => {
      const idle = (Date.now() - lastActivityRef.current) / 1000;
      if (idle >= IDLE_TIMEOUT_SECONDS) {
        logout();
      } else if (idle >= IDLE_TIMEOUT_SECONDS - WARN_BEFORE_SECONDS) {
        setShowWarning(true);
      }
    }, 5000); // check every 5 seconds
    return () => { if (checkIntervalRef.current) clearInterval(checkIntervalRef.current); };
  }, [logout]);

  if (!showWarning) return null;

  return (
    <div
      className="auth-dialog-overlay session-timeout-overlay"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="session-timeout-title"
    >
      <div className="auth-dialog session-timeout-dialog">
        <span className="material-symbols-outlined auth-dialog-icon auth-dialog-icon--warning">
          timer
        </span>
        <h3 id="session-timeout-title" className="auth-dialog-title">
          Session Expiring
        </h3>
        <p className="auth-dialog-body">
          Your session will expire in{' '}
          <CountdownTimer
            durationSeconds={WARN_BEFORE_SECONDS}
            onExpire={logout}
            running={showWarning}
          />
          {' '}minutes. Stay signed in?
        </p>
        <div className="auth-dialog-actions">
          <button
            type="button"
            className="auth-submit-btn"
            onClick={resetActivity}
          >
            <span className="material-symbols-outlined">refresh</span>
            Stay Signed In
          </button>
          <button
            type="button"
            className="auth-text-btn"
            style={{ color: 'var(--color-error)' }}
            onClick={logout}
          >
            Sign Out Now
          </button>
        </div>
      </div>
    </div>
  );
}
