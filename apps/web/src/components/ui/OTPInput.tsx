import { useRef, useEffect, useCallback, type ClipboardEvent, type KeyboardEvent } from 'react';

interface OTPInputProps {
  length?: number;
  value: string[];
  onChange: (value: string[]) => void;
  onComplete?: (otp: string) => void;
  disabled?: boolean;
  error?: boolean;
}

/**
 * 6-box OTP input — auto-focuses next field on entry, auto-submits on last digit,
 * handles paste, backspace navigation. PRD §3.2, §7.1
 */
export function OTPInput({
  length = 6,
  value,
  onChange,
  onComplete,
  disabled = false,
  error = false,
}: OTPInputProps) {
  const refs = useRef<Array<HTMLInputElement | null>>([]);

  // Focus first empty box on mount
  useEffect(() => {
    refs.current[0]?.focus();
  }, []);

  const handleChange = useCallback(
    (idx: number, char: string) => {
      if (!/^\d?$/.test(char)) return; // numeric only
      const next = [...value];
      next[idx] = char;
      onChange(next);
      if (char && idx < length - 1) {
        refs.current[idx + 1]?.focus();
      }
      if (char && idx === length - 1) {
        const otp = next.join('');
        if (otp.length === length) onComplete?.(otp);
      }
    },
    [value, onChange, onComplete, length]
  );

  const handleKeyDown = useCallback(
    (idx: number, e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Backspace') {
        if (value[idx]) {
          const next = [...value];
          next[idx] = '';
          onChange(next);
        } else if (idx > 0) {
          refs.current[idx - 1]?.focus();
        }
      } else if (e.key === 'ArrowLeft' && idx > 0) {
        refs.current[idx - 1]?.focus();
      } else if (e.key === 'ArrowRight' && idx < length - 1) {
        refs.current[idx + 1]?.focus();
      }
    },
    [value, onChange, length]
  );

  const handlePaste = useCallback(
    (e: ClipboardEvent<HTMLInputElement>) => {
      e.preventDefault();
      const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length);
      const next = Array.from({ length }, (_, i) => pasted[i] ?? '');
      onChange(next);
      const focusIdx = Math.min(pasted.length, length - 1);
      refs.current[focusIdx]?.focus();
      if (pasted.length === length) onComplete?.(pasted);
    },
    [onChange, onComplete, length]
  );

  return (
    <div className="otp-input-group" aria-label="OTP input">
      {Array.from({ length }).map((_, idx) => (
        <input
          key={idx}
          ref={(el) => { refs.current[idx] = el; }}
          className={`otp-box${error ? ' otp-box--error' : ''}`}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={1}
          value={value[idx] ?? ''}
          onChange={(e) => handleChange(idx, e.target.value.slice(-1))}
          onKeyDown={(e) => handleKeyDown(idx, e)}
          onPaste={handlePaste}
          onFocus={(e) => e.target.select()}
          disabled={disabled}
          autoComplete="one-time-code"
          aria-label={`Digit ${idx + 1} of ${length}`}
        />
      ))}
    </div>
  );
}
