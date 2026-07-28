import { useState } from 'react';
import { StatusBadge, type StatusBadgeVariant } from './StatusBadge';

export interface AlertFeedItem {
  id: string;
  tag: string;
  tagVariant: StatusBadgeVariant;
  description: string;
  timestamp: string;
  href?: string;
}

interface AlertFeedProps {
  items: AlertFeedItem[];
  onSelect?: (href: string) => void;
}

const borderColorByVariant: Record<StatusBadgeVariant, string> = {
  success: 'var(--color-success)',
  warning: 'var(--color-warning)',
  error: 'var(--color-error)',
  info: 'var(--color-primary-light)',
  gold: 'var(--color-accent)',
};

function AlertRow({ item, onSelect }: { item: AlertFeedItem; onSelect?: (href: string) => void }) {
  const [hovered, setHovered] = useState(false);
  const clickable = Boolean(item.href && onSelect);

  return (
    <div
      role={clickable ? 'button' : undefined}
      tabIndex={clickable ? 0 : undefined}
      onClick={clickable ? () => onSelect!(item.href!) : undefined}
      onKeyDown={clickable ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect!(item.href!); } } : undefined}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '14px',
        padding: '14px 16px',
        borderRadius: '12px',
        borderLeft: `4px solid ${borderColorByVariant[item.tagVariant]}`,
        background: 'rgba(248, 250, 252, 0.7)',
        border: 'none',
        cursor: clickable ? 'pointer' : 'default',
        transform: clickable && hovered ? 'translateX(3px)' : 'translateX(0)',
        transition: 'all 160ms var(--ease-silk)',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', minWidth: 0 }}>
        <StatusBadge variant={item.tagVariant}>{item.tag}</StatusBadge>
        <p style={{ color: 'var(--color-text)', fontSize: '14px', lineHeight: 1.5 }}>{item.description}</p>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
        <span style={{ color: 'var(--text-muted)', fontSize: '12px', fontWeight: 600, whiteSpace: 'nowrap' }}>{item.timestamp}</span>
        {clickable ? (
          <span className="material-symbols-outlined" style={{ fontSize: '18px', color: hovered ? 'var(--color-primary-light)' : 'var(--text-muted)' }}>chevron_right</span>
        ) : null}
      </div>
    </div>
  );
}

export function AlertFeed({ items, onSelect }: AlertFeedProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {items.map((item) => (
        <AlertRow key={item.id} item={item} onSelect={onSelect} />
      ))}
    </div>
  );
}
