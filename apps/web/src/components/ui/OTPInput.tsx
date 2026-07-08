import { useEffect, useRef, useState, type ClipboardEvent, type KeyboardEvent } from 'react';

interface OTPInputBaseProps {
  digits?: number;
  disabled?: boolean;
  error?: boolean;
}

export interface LegacyOTPInputProps extends OTPInputBaseProps {
  value: string[];
  onChange: (value: string[]) => void;
  onComplete?: (code: string) => void;
  length?: number;
}

export interface ModernOTPInputProps extends OTPInputBaseProps {
  value?: string;
  onChange?: (value: string) => void;
  onComplete: (code: string) => void;
  length?: never;
}

export type OTPInputProps = LegacyOTPInputProps | ModernOTPInputProps;

function isLegacyProps(props: OTPInputProps): props is LegacyOTPInputProps {
  return Array.isArray((props as LegacyOTPInputProps).value);
}

function normalizeValue(source: string | string[] | undefined, digits: number): string[] {
  const text = Array.isArray(source) ? source.join('') : source ?? '';
  return Array.from({ length: digits }, (_, index) => text[index] ?? '');
}

export function OTPInput(props: OTPInputProps) {
  const digitCount = 'length' in props && typeof props.length === 'number' ? props.length : props.digits ?? 6;
  const legacy = isLegacyProps(props);
  const [internalValue, setInternalValue] = useState<string[]>(() => normalizeValue(props.value, digitCount));
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
  const refs = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => {
    if (!legacy) {
      setInternalValue(normalizeValue(props.value, digitCount));
    }
  }, [digitCount, legacy, props.value]);

  useEffect(() => {
    refs.current[0]?.focus();
  }, []);

  const currentValues = legacy ? normalizeValue(props.value, digitCount) : internalValue;

  const publish = (next: string[]) => {
    if (legacy) {
      props.onChange(next);
      return;
    }

    setInternalValue(next);
    props.onChange?.(next.join(''));
  };

  const maybeComplete = (next: string[]) => {
    if (next.every((digit) => digit !== '')) {
      props.onComplete?.(next.join(''));
    }
  };

  const handleDigitChange = (index: number, rawValue: string) => {
    const nextChar = rawValue.replace(/\D/g, '').slice(-1);
    if (!nextChar && rawValue) {
      return;
    }

    const next = [...currentValues];
    next[index] = nextChar;
    publish(next);

    if (nextChar && index < digitCount - 1) {
      refs.current[index + 1]?.focus();
    }

    if (nextChar && index === digitCount - 1) {
      maybeComplete(next);
    }
  };

  const handleKeyDown = (index: number, event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Backspace' || event.key === 'Delete') {
      event.preventDefault();
      const next = [...currentValues];

      if (next[index]) {
        next[index] = '';
        publish(next);
        return;
      }

      if (index > 0) {
        refs.current[index - 1]?.focus();
      }
      return;
    }

    if (event.key === 'ArrowLeft' && index > 0) {
      event.preventDefault();
      refs.current[index - 1]?.focus();
    }

    if (event.key === 'ArrowRight' && index < digitCount - 1) {
      event.preventDefault();
      refs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (event: ClipboardEvent<HTMLInputElement>) => {
    event.preventDefault();
    const pasted = event.clipboardData.getData('text').replace(/\D/g, '').slice(0, digitCount);
    if (!pasted) {
      return;
    }

    const next = normalizeValue(pasted, digitCount);
    publish(next);
    refs.current[Math.min(pasted.length, digitCount) - 1]?.focus();
    if (pasted.length === digitCount) {
      maybeComplete(next);
    }
  };

  return (
    <div aria-label='OTP input' style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
      {Array.from({ length: digitCount }, (_, index) => {
        const hasValue = currentValues[index] !== '';
        const isFocused = focusedIndex === index;

        return (
          <input
            key={index}
            ref={(element) => {
              refs.current[index] = element;
            }}
            type='text'
            inputMode='numeric'
            pattern='[0-9]*'
            maxLength={1}
            value={currentValues[index] ?? ''}
            onChange={(event) => handleDigitChange(index, event.target.value)}
            onKeyDown={(event) => handleKeyDown(index, event)}
            onPaste={handlePaste}
            onFocus={(event) => {
              setFocusedIndex(index);
              event.target.select();
            }}
            onBlur={() => setFocusedIndex((current) => (current === index ? null : current))}
            disabled={props.disabled}
            autoComplete='one-time-code'
            aria-label={`Digit ${index + 1} of ${digitCount}`}
            style={{
              width: 'clamp(40px, 12vw, 48px)',
              height: '56px',
              borderRadius: 'var(--radius-sm)',
              border: `1.5px solid ${props.error ? 'var(--color-error)' : hasValue || isFocused ? 'var(--color-primary-light)' : 'rgba(15, 76, 138, 0.18)'}`,
              background: props.disabled ? 'rgba(15, 76, 138, 0.04)' : '#FFFFFF',
              color: hasValue ? 'var(--color-primary-light)' : 'var(--color-text)',
              textAlign: 'center',
              fontFamily: 'var(--font-ui)',
              fontSize: '22px',
              fontWeight: 700,
              outline: 'none',
              boxShadow: props.error
                ? '0 0 0 3px rgba(214, 69, 69, 0.12)'
                : isFocused
                  ? '0 0 0 3px rgba(27, 95, 167, 0.12)'
                  : 'none',
              transition: 'border-color 200ms var(--ease-silk), box-shadow 200ms var(--ease-silk), color 200ms var(--ease-silk)',
            }}
          />
        );
      })}
    </div>
  );
}
