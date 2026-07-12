import type { CSSProperties, ReactNode } from 'react';
import { Card } from './Card';
import { SkeletonCard } from './SkeletonCard';

export interface KPICardProps {
  title: string;
  value: ReactNode;
  delta?: string;
  loading?: boolean;
  icon?: ReactNode;
  accentColor?: string;
  children?: ReactNode;
}

function resolveDeltaStyle(delta: string | undefined, accentColor: string): CSSProperties | undefined {
  if (!delta) {
    return undefined;
  }

  if (delta.trim().startsWith('-')) {
    return { color: 'var(--color-error)' };
  }

  if (delta.trim().startsWith('+')) {
    return { color: 'var(--color-success)' };
  }

  return { color: accentColor };
}

function renderIcon(icon: ReactNode, accentColor: string) {
  return (
    <div
      style={{
        width: '44px',
        height: '44px',
        borderRadius: '12px',
        display: 'grid',
        placeItems: 'center',
        // Tint the badge with the card's own accent so each KPI reads as a set.
        background: `color-mix(in srgb, ${accentColor} 12%, transparent)`,
        color: accentColor,
        flexShrink: 0,
      }}
    >
      {typeof icon === 'string' ? (
        <span className='material-symbols-outlined' style={{ fontSize: '22px' }}>
          {icon}
        </span>
      ) : (
        icon
      )}
    </div>
  );
}

export function KPICard({
  title,
  value,
  delta,
  loading = false,
  icon,
  accentColor = 'var(--color-primary-light)',
  children,
}: KPICardProps) {
  return (
    <Card hoverable={false} style={{ padding: '24px', minHeight: '148px', background: 'var(--color-bg)', boxShadow: 'var(--shadow-card)' }}>
      {loading ? (
        <SkeletonCard rows={3} height={16} />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px' }}>
            <div>
              <p style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{title}</p>
              <div
                style={{
                  marginTop: '8px',
                  color: 'var(--color-text)',
                  fontFamily: 'var(--font-display)',
                  fontSize: '24px',
                  fontWeight: 600,
                  lineHeight: 1.1,
                }}
              >
                {value}
              </div>
            </div>
            {icon ? renderIcon(icon, accentColor) : null}
          </div>
          {children}
          {delta ? (
            <div style={{ fontSize: '12px', fontWeight: 700, ...resolveDeltaStyle(delta, accentColor) }}>
              {delta}
            </div>
          ) : null}
        </div>
      )}
    </Card>
  );
}
