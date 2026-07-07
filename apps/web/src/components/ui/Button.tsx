import React from 'react';
import { cn } from './utils';

export interface ButtonProps extends React.ComponentProps<'button'> {
  variant?: 'primary' | 'secondary' | 'danger' | 'outline';
}

export function Button({ variant = 'primary', className, children, ...props }: ButtonProps) {
  return (
    <button
      data-slot="tms-button"
      className={cn(
        'btn',
        {
          'btn-primary': variant === 'primary',
          'btn-secondary': variant === 'secondary',
          'btn-danger': variant === 'danger',
          'btn-outline': variant === 'outline',
        },
        className
      )}
      style={{
        minHeight: '44px',
        minWidth: '44px',
        outlineOffset: '2px',
        cursor: 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        padding: '12px 24px',
        borderRadius: '50px',
        fontWeight: 600,
        fontSize: '14px',
        border: variant === 'outline' ? '1px solid var(--border-border)' : 'none',
        background: variant === 'outline' ? 'transparent' : undefined,
        color: variant === 'outline' ? 'var(--text-foreground)' : '#fff',
        transition: 'transform var(--duration-fast) var(--ease-default), filter var(--duration-fast)',
        ...props.style
      }}
      {...props}
    >
      {children}
    </button>
  );
}
