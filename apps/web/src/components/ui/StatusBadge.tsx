import type { ReactNode } from 'react';

export type StatusBadgeVariant = 'success' | 'warning' | 'error' | 'info' | 'gold';

export interface StatusBadgeProps {
  status?: StatusBadgeVariant;
  variant?: StatusBadgeVariant;
  children?: ReactNode;
}

const badgeStyles: Record<StatusBadgeVariant, { background: string; color: string }> = {
  success: { background: 'rgba(0, 171, 102, 0.14)', color: 'var(--color-success)' },
  warning: { background: 'rgba(224, 142, 0, 0.14)', color: 'var(--color-warning)' },
  error: { background: 'rgba(214, 69, 69, 0.14)', color: 'var(--color-error)' },
  info: { background: 'rgba(47, 111, 237, 0.12)', color: 'var(--color-info)' },
  gold: { background: 'var(--color-gold-bg)', color: 'var(--color-gold-text)' },
};

function formatLabel(status: StatusBadgeVariant) {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

export function StatusBadge({ status, variant, children }: StatusBadgeProps) {
  const resolvedStatus = status ?? variant ?? 'info';
  const style = badgeStyles[resolvedStatus];

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '28px',
        padding: '4px 12px',
        borderRadius: 'var(--radius-full)',
        background: style.background,
        color: style.color,
        fontSize: '12px',
        fontWeight: 700,
        lineHeight: 1,
        whiteSpace: 'nowrap',
      }}
    >
      {children ?? formatLabel(resolvedStatus)}
    </span>
  );
}
