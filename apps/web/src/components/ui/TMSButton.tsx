import { useState, type ButtonHTMLAttributes, type CSSProperties, type ReactNode } from 'react';

export interface TMSButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  variant?: 'primary' | 'secondary' | 'text';
  loading?: boolean;
  fullWidth?: boolean;
  children: ReactNode;
}

const baseStyle: CSSProperties = {
  minHeight: '40px',
  minWidth: '40px',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '7px',
  padding: '9px 16px',
  borderRadius: '10px',
  border: '1px solid transparent',
  fontFamily: 'var(--font-ui)',
  fontSize: '14px',
  fontWeight: 600,
  lineHeight: 1,
  letterSpacing: '0',
  textDecoration: 'none',
  cursor: 'pointer',
  transition: 'background-color 180ms var(--ease-silk), border-color 180ms var(--ease-silk), color 180ms var(--ease-silk), box-shadow 180ms var(--ease-silk), transform 180ms var(--ease-silk), opacity 180ms var(--ease-silk)',
};

const spinnerStyle: CSSProperties = {
  width: '16px',
  height: '16px',
  flexShrink: 0,
  animation: 'spin 0.8s linear infinite',
};

function getVariantStyle(variant: TMSButtonProps['variant'], hovered: boolean, disabled: boolean): CSSProperties {
  // Secondary: quiet, tinted-fill button (Apple's soft grey/blue secondary).
  if (variant === 'secondary') {
    return {
      background: hovered && !disabled ? 'color-mix(in srgb, var(--color-primary) 12%, transparent)' : 'color-mix(in srgb, var(--color-primary) 7%, transparent)',
      borderColor: 'transparent',
      color: disabled ? 'color-mix(in srgb, var(--color-primary) 45%, transparent)' : 'var(--color-primary)',
      boxShadow: 'none',
    };
  }

  if (variant === 'text') {
    return {
      background: hovered && !disabled ? 'color-mix(in srgb, var(--color-primary) 8%, transparent)' : 'transparent',
      color: disabled ? 'color-mix(in srgb, var(--color-primary) 45%, transparent)' : 'var(--color-primary)',
      boxShadow: 'none',
      paddingInline: '10px',
    };
  }

  // Primary: solid brand blue, flat and modern (not the gold accent).
  return {
    background: disabled ? 'color-mix(in srgb, var(--color-primary) 45%, transparent)' : hovered ? 'var(--color-primary-light)' : 'var(--color-primary)',
    color: '#FFFFFF',
    boxShadow: disabled ? 'none' : hovered ? '0 4px 14px -4px color-mix(in srgb, var(--color-primary) 60%, transparent)' : '0 1px 2px rgba(16, 24, 40, 0.08)',
    borderColor: 'transparent',
  };
}

export function TMSButton({
  variant = 'primary',
  loading = false,
  disabled = false,
  fullWidth = false,
  type = 'button',
  children,
  style,
  onMouseEnter,
  onMouseLeave,
  ...props
}: TMSButtonProps) {
  const [hovered, setHovered] = useState(false);
  const isDisabled = disabled || loading;

  return (
    <button
      type={type}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      onMouseEnter={(event) => {
        setHovered(true);
        onMouseEnter?.(event);
      }}
      onMouseLeave={(event) => {
        setHovered(false);
        onMouseLeave?.(event);
      }}
      style={{
        ...baseStyle,
        ...getVariantStyle(variant, hovered, isDisabled),
        width: fullWidth ? '100%' : undefined,
        opacity: isDisabled ? 0.88 : 1,
        transform: hovered && !isDisabled ? 'translateY(-1px)' : 'translateY(0)',
        ...style,
      }}
      {...props}
    >
      {loading ? (
        <svg viewBox='0 0 24 24' aria-hidden='true' style={spinnerStyle}>
          <circle cx='12' cy='12' r='9' fill='none' opacity='0.24' stroke='currentColor' strokeWidth='3' />
          <path d='M12 3a9 9 0 0 1 9 9' fill='none' stroke='currentColor' strokeLinecap='round' strokeWidth='3' />
        </svg>
      ) : null}
      <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
        {children}
      </span>
    </button>
  );
}
