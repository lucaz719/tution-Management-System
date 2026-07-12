import { StatusBadge, type StatusBadgeVariant } from './StatusBadge';

export interface TimetableListItem {
  id: string;
  time: string;
  title: string;
  subtitle?: string;
  room: string;
  detail: string;
  status: string;
  statusVariant?: StatusBadgeVariant;
}

interface TimetableListProps {
  items: TimetableListItem[];
}

export function TimetableList({ items }: TimetableListProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {items.map((item) => (
        <div key={item.id} style={{ overflowX: 'auto' }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '84px minmax(160px, 1.35fr) minmax(110px, 0.8fr) minmax(140px, 1fr) auto',
              gap: '12px',
              alignItems: 'center',
              minWidth: '620px',
              padding: '14px 16px',
              borderRadius: '12px',
              border: '1px solid rgba(21, 96, 189, 0.1)',
              background: '#FFFFFF',
            }}
          >
            <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-primary-light)' }}>{item.time}</div>
            <div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-text)' }}>{item.title}</div>
              {item.subtitle ? (
                <div style={{ marginTop: '4px', fontSize: '12px', color: 'rgba(44, 62, 80, 0.68)' }}>{item.subtitle}</div>
              ) : null}
            </div>
            <div style={{ fontSize: '13px', color: 'rgba(44, 62, 80, 0.72)' }}>{item.room}</div>
            <div style={{ fontSize: '13px', color: 'rgba(44, 62, 80, 0.72)' }}>{item.detail}</div>
            <StatusBadge variant={item.statusVariant ?? 'info'}>{item.status}</StatusBadge>
          </div>
        </div>
      ))}
    </div>
  );
}
