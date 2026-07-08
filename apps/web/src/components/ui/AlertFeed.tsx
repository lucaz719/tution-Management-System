import { StatusBadge, type StatusBadgeVariant } from './StatusBadge';

export interface AlertFeedItem {
  id: string;
  tag: string;
  tagVariant: StatusBadgeVariant;
  description: string;
  timestamp: string;
}

interface AlertFeedProps {
  items: AlertFeedItem[];
}

const borderColorByVariant: Record<StatusBadgeVariant, string> = {
  success: 'var(--color-success)',
  warning: 'var(--color-warning)',
  error: 'var(--color-error)',
  info: 'var(--color-primary-light)',
  gold: 'var(--color-accent)',
};

export function AlertFeed({ items }: AlertFeedProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {items.map((item) => (
        <div
          key={item.id}
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: '14px',
            padding: '14px 16px',
            borderRadius: '12px',
            borderLeft: `4px solid ${borderColorByVariant[item.tagVariant]}`,
            background: '#FFFFFF',
            borderTop: '1px solid rgba(15, 76, 138, 0.08)',
            borderRight: '1px solid rgba(15, 76, 138, 0.08)',
            borderBottom: '1px solid rgba(15, 76, 138, 0.08)',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <StatusBadge variant={item.tagVariant}>{item.tag}</StatusBadge>
            <p style={{ color: 'var(--color-text)', fontSize: '14px', lineHeight: 1.5 }}>{item.description}</p>
          </div>
          <span style={{ color: 'rgba(44, 62, 80, 0.64)', fontSize: '12px', fontWeight: 600, whiteSpace: 'nowrap' }}>
            {item.timestamp}
          </span>
        </div>
      ))}
    </div>
  );
}
