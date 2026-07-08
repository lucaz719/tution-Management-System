import type { CSSProperties } from 'react';

export interface SkeletonCardProps {
  rows?: number;
  height?: number;
  lines?: number;
}

const shimmerStyle: CSSProperties = {
  borderRadius: '999px',
  background: 'linear-gradient(90deg, rgba(15, 76, 138, 0.08) 0%, rgba(15, 76, 138, 0.18) 50%, rgba(15, 76, 138, 0.08) 100%)',
  backgroundSize: '220% 100%',
  animation: 'tms-dashboard-shimmer 1.2s linear infinite',
};

export function SkeletonCard({ rows, height = 14, lines }: SkeletonCardProps) {
  const totalRows = rows ?? lines ?? 3;

  return (
    <>
      <style>
        {`@keyframes tms-dashboard-shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }`}
      </style>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {Array.from({ length: totalRows }, (_, index) => (
          <div
            key={`skeleton-row-${index}`}
            style={{
              ...shimmerStyle,
              height: `${height}px`,
              width: index === 0 ? '56%' : index === totalRows - 1 ? '42%' : '100%',
            }}
          />
        ))}
      </div>
    </>
  );
}
