import { useId, useState, type ChangeEvent, type InputHTMLAttributes, type ReactNode } from 'react';

export interface TMSInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  label: string;
  value: string | number;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  error?: string;
  helperText?: string;
  endAdornment?: ReactNode;
}

export function TMSInput({
  label,
  value,
  onChange,
  error,
  helperText,
  disabled = false,
  endAdornment,
  id,
  onFocus,
  onBlur,
  style,
  ...props
}: TMSInputProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const helperId = `${inputId}-helper`;
  const [focused, setFocused] = useState(false);
  const hasValue = String(value ?? '').length > 0;
  const isFloating = focused || hasValue;
  const hasMessage = Boolean(error || helperText);

  return (
    <label htmlFor={inputId} style={{ display: 'grid', gap: '6px', width: '100%' }}>
      <span style={{ position: 'relative', display: 'block', paddingTop: '16px' }}>
        <span
          style={{
            position: 'absolute',
            left: 0,
            top: '16px',
            color: error ? 'var(--color-error)' : isFloating ? 'var(--color-primary-light)' : 'rgba(44, 62, 80, 0.68)',
            fontSize: isFloating ? '12px' : '14px',
            fontWeight: isFloating ? 700 : 500,
            transform: isFloating ? 'translateY(-16px)' : 'translateY(0)',
            transformOrigin: 'left top',
            transition: 'transform 200ms var(--ease-silk), color 200ms var(--ease-silk), font-size 200ms var(--ease-silk)',
            pointerEvents: 'none',
          }}
        >
          {label}
        </span>
        <input
          id={inputId}
          value={value}
          onChange={onChange}
          disabled={disabled}
          aria-invalid={Boolean(error)}
          aria-describedby={hasMessage ? helperId : undefined}
          onFocus={(event) => {
            setFocused(true);
            onFocus?.(event);
          }}
          onBlur={(event) => {
            setFocused(false);
            onBlur?.(event);
          }}
          style={{
            width: '100%',
            border: 'none',
            borderBottom: `2px solid ${error ? 'var(--color-error)' : focused ? 'var(--color-primary-light)' : 'rgba(15, 76, 138, 0.18)'}`,
            background: 'transparent',
            padding: `0 ${endAdornment ? '36px' : '0'} 8px 0`,
            color: 'var(--color-text)',
            outline: 'none',
            transition: 'border-color 200ms var(--ease-silk), color 200ms var(--ease-silk)',
            opacity: disabled ? 0.64 : 1,
            ...style,
          }}
          {...props}
        />
        {endAdornment ? (
          <span
            style={{
              position: 'absolute',
              right: 0,
              bottom: '8px',
              display: 'inline-flex',
              alignItems: 'center',
              color: error ? 'var(--color-error)' : 'var(--color-primary-light)',
              pointerEvents: 'auto',
            }}
          >
            {endAdornment}
          </span>
        ) : null}
      </span>
      {hasMessage ? (
        <span
          id={helperId}
          style={{
            fontSize: '12px',
            lineHeight: 1.4,
            color: error ? 'var(--color-error)' : 'rgba(44, 62, 80, 0.68)',
            fontWeight: error ? 500 : 400,
          }}
        >
          {error ?? helperText}
        </span>
      ) : null}
    </label>
  );
}
