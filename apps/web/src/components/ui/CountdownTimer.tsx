import { useState, useEffect, useCallback, useRef } from 'react';

interface CountdownTimerProps {
  /** Initial duration in seconds */
  durationSeconds: number;
  /** Called when timer reaches 0 */
  onExpire?: () => void;
  /** Whether timer is running */
  running?: boolean;
  /** Reset key — change this value to restart the timer */
  resetKey?: number;
}

/**
 * MM:SS countdown timer. PRD §3.2 (OTP timer), §7.1 (2FA), §8.1 (session timeout)
 */
export function CountdownTimer({
  durationSeconds,
  onExpire,
  running = true,
  resetKey = 0,
}: CountdownTimerProps) {
  const [remaining, setRemaining] = useState(durationSeconds);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const expiredRef  = useRef(false);

  const clear = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = null;
  };

  useEffect(() => {
    setRemaining(durationSeconds);
    expiredRef.current = false;
  }, [resetKey, durationSeconds]);

  useEffect(() => {
    if (!running) { clear(); return; }

    intervalRef.current = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          clear();
          if (!expiredRef.current) {
            expiredRef.current = true;
            onExpire?.();
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return clear;
  }, [running, onExpire, resetKey]);

  const mm = String(Math.floor(remaining / 60)).padStart(2, '0');
  const ss = String(remaining % 60).padStart(2, '0');
  const isLow = remaining <= 30;

  return (
    <span
      className={`countdown-timer ${isLow ? 'countdown-timer--low' : ''}`}
      aria-live="polite"
      aria-atomic="true"
      aria-label={`${mm} minutes ${ss} seconds remaining`}
    >
      {mm}:{ss}
    </span>
  );
}

/** Hook version for programmatic usage */
export function useCountdown(durationSeconds: number, onExpire?: () => void) {
  const [remaining, setRemaining] = useState(durationSeconds);
  const [isRunning, setIsRunning] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const start = useCallback(() => {
    setRemaining(durationSeconds);
    setIsRunning(true);
  }, [durationSeconds]);

  const stop  = useCallback(() => { setIsRunning(false); }, []);
  const reset = useCallback(() => { setRemaining(durationSeconds); }, [durationSeconds]);

  useEffect(() => {
    if (!isRunning) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }
    intervalRef.current = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          setIsRunning(false);
          onExpire?.();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isRunning, onExpire]);

  return { remaining, isRunning, isExpired: remaining === 0, start, stop, reset };
}
