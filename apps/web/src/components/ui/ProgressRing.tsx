import { useEffect, useMemo, useRef, useState } from 'react';
import { SkeletonCard } from './SkeletonCard';

export interface ProgressRingProps {
  percent: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  animated?: boolean;
  label?: string;
  loading?: boolean;
}

export function ProgressRing({
  percent,
  size = 80,
  strokeWidth = 8,
  color = 'var(--color-accent)',
  animated = true,
  label,
  loading = false,
}: ProgressRingProps) {
  const clampedPercent = Math.max(0, Math.min(100, percent));
  const [displayPercent, setDisplayPercent] = useState(animated ? 0 : clampedPercent);
  const hasAnimated = useRef(false);
  const radius = useMemo(() => (size - strokeWidth) / 2, [size, strokeWidth]);
  const circumference = useMemo(() => 2 * Math.PI * radius, [radius]);

  useEffect(() => {
    if (loading) {
      return;
    }

    if (!animated) {
      setDisplayPercent(clampedPercent);
      return;
    }

    if (hasAnimated.current) {
      setDisplayPercent(clampedPercent);
      return;
    }

    hasAnimated.current = true;
    const frame = window.requestAnimationFrame(() => {
      setDisplayPercent(clampedPercent);
    });

    return () => window.cancelAnimationFrame(frame);
  }, [animated, clampedPercent, loading]);

  if (loading) {
    return <SkeletonCard rows={3} height={14} />;
  }

  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }} aria-hidden='true'>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill='none'
          stroke='rgba(15, 76, 138, 0.1)'
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill='none'
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap='round'
          strokeDasharray={circumference}
          strokeDashoffset={circumference - (displayPercent / 100) * circumference}
          style={{ transition: animated ? 'stroke-dashoffset 900ms var(--ease-silk)' : undefined }}
        />
      </svg>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--color-text)',
          textAlign: 'center',
        }}
      >
        <span style={{ fontFamily: 'var(--font-display)', fontSize: size <= 80 ? '20px' : '24px', fontWeight: 600 }}>
          {Math.round(displayPercent)}%
        </span>
        {label ? <span style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(44, 62, 80, 0.68)' }}>{label}</span> : null}
      </div>
    </div>
  );
}
