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
  onClick?: () => void;
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
        width: '38px',
        height: '38px',
        borderRadius: '11px',
        display: 'grid',
        placeItems: 'center',
        // Tint the badge with the card's own accent so each KPI reads as a set.
        background: `color-mix(in srgb, ${accentColor} 12%, transparent)`,
        color: accentColor,
        flexShrink: 0,
      }}
    >
      {typeof icon === 'string' ? (
        <span className='material-symbols-outlined' style={{ fontSize: '20px' }}>
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
  onClick,
}: KPICardProps) {
  const clickable = Boolean(onClick);
  return (
    <Card
      hoverable={clickable}
      onClick={onClick}
      role={clickable ? 'button' : undefined}
      tabIndex={clickable ? 0 : undefined}
      onKeyDown={clickable ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick?.(); } } : undefined}
      style={{ padding: '18px', minHeight: '112px', background: 'var(--color-bg)', boxShadow: 'var(--shadow-card)' }}
    >
      {loading ? (
        <SkeletonCard rows={3} height={16} />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', height: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '14px' }}>
            <div>
              <p style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{title}</p>
              <div
                style={{
                  marginTop: '8px',
                  color: 'var(--color-text)',
                  fontFamily: 'var(--font-display)',
                  fontSize: '23px',
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
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginTop: 'auto' }}>
            {delta ? (
              <div style={{ fontSize: '12px', fontWeight: 700, ...resolveDeltaStyle(delta, accentColor) }}>
                {delta}
              </div>
            ) : <span />}
            {clickable ? (
              <span className="material-symbols-outlined" style={{ fontSize: '18px', color: 'var(--text-muted)' }}>chevron_right</span>
            ) : null}
          </div>
        </div>
      )}
    </Card>
  );
}
