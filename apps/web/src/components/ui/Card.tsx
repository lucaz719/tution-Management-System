import React from 'react';
import { cn } from './utils';

export interface CardProps extends React.ComponentProps<'div'> {
  hoverable?: boolean;
}

export function Card({ hoverable = true, className, children, ...props }: CardProps) {
  return (
    <div
      data-slot="tms-card"
      className={cn('tms-panel', className)}
      style={{
        background: 'var(--bg-card)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        border: '1px solid var(--border-border)',
        boxShadow: 'var(--shadow-card)',
        borderRadius: '14px',
        padding: '20px',
        transition: 'transform var(--duration-fast) var(--ease-default), box-shadow var(--duration-fast)',
        cursor: hoverable ? 'pointer' : 'default',
        ...props.style
      }}
      {...props}
    >
      {children}
    </div>
  );
}
