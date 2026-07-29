import { Button } from '../ui/Button';
import { Card } from '../ui/Card';

export function RemoteState({ kind, message, onRetry }: { kind: 'loading' | 'empty' | 'error' | 'denied' | 'unavailable'; message?: string; onRetry?: () => void }) {
  const content = {
    loading: ['progress_activity', 'Loading…'],
    empty: ['inbox', message || 'No records found.'],
    error: ['error', message || 'The page could not be loaded.'],
    denied: ['lock', message || 'You do not have access to this workspace.'],
    unavailable: ['schedule', message || 'This workflow is not available yet.'],
  }[kind];
  return <Card hoverable={false}><div role={kind === 'error' ? 'alert' : 'status'} style={{ minHeight: 170, display: 'grid', placeItems: 'center', textAlign: 'center', gap: 10, color: 'var(--text-muted)' }}>
    <span className="material-symbols-outlined" style={{ fontSize: 38 }}>{content[0]}</span><p>{content[1]}</p>
    {onRetry ? <Button variant="outline" onClick={onRetry}>Retry</Button> : null}
  </div></Card>;
}
