import { useState, type ButtonHTMLAttributes, type CSSProperties, type ReactNode } from 'react';

export interface TMSButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  variant?: 'primary' | 'secondary' | 'text';
  loading?: boolean;
  fullWidth?: boolean;
  children: ReactNode;
}

const baseStyle: CSSProperties = {
  minHeight: '44px',
  minWidth: '44px',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '8px',
  padding: '12px 24px',
  borderRadius: 'var(--radius-sm)',
  border: '1px solid transparent',
  fontFamily: 'var(--font-ui)',
  fontSize: '14px',
  fontWeight: 700,
  lineHeight: 1,
  textDecoration: 'none',
  cursor: 'pointer',
  transition: 'background-color 200ms var(--ease-silk), border-color 200ms var(--ease-silk), color 200ms var(--ease-silk), box-shadow 200ms var(--ease-silk), transform 200ms var(--ease-silk), opacity 200ms var(--ease-silk)',
};

const spinnerStyle: CSSProperties = {
  width: '16px',
  height: '16px',
  flexShrink: 0,
  animation: 'spin 0.8s linear infinite',
};

function getVariantStyle(variant: TMSButtonProps['variant'], hovered: boolean, disabled: boolean): CSSProperties {
  if (variant === 'secondary') {
    return {
      background: hovered && !disabled ? 'rgba(27, 95, 167, 0.08)' : 'transparent',
      borderColor: hovered && !disabled ? 'rgba(27, 95, 167, 0.48)' : 'rgba(27, 95, 167, 0.28)',
      color: disabled ? 'rgba(27, 95, 167, 0.45)' : 'var(--color-primary-light)',
      boxShadow: 'none',
    };
  }

  if (variant === 'text') {
    return {
      background: hovered && !disabled ? 'rgba(27, 95, 167, 0.06)' : 'transparent',
      color: disabled ? 'rgba(27, 95, 167, 0.45)' : 'var(--color-primary-light)',
      boxShadow: 'none',
      paddingInline: '8px',
    };
  }

  return {
    background: disabled ? 'rgba(203, 169, 111, 0.55)' : hovered ? 'var(--color-accent-hover)' : 'var(--color-accent)',
    color: '#FFFFFF',
    boxShadow: disabled ? 'none' : hovered ? 'var(--shadow-btn-accent)' : 'none',
    borderColor: disabled ? 'rgba(203, 169, 111, 0.55)' : hovered ? 'var(--color-accent-hover)' : 'var(--color-accent)',
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
