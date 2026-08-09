import { ChangePasswordForm } from '../components/ChangePasswordForm';

export function SecurityPage() {
  return (
    <main style={{ maxWidth: 960, margin: '40px auto', display: 'grid', gap: 20, padding: '0 20px' }}>
      <header>
        <h1 style={{ fontSize: 24, color: 'var(--color-text)' }}>Security Settings</h1>
        <p style={{ marginTop: 6, color: 'var(--color-text-muted, rgba(44,62,80,.7))' }}>
          Manage your account password and security settings.
        </p>
      </header>
      <div style={{ background: 'var(--color-surface, #fff)', border: '1px solid var(--color-border, rgba(21,96,189,.2))', borderRadius: 10, padding: 24 }}>
        <ChangePasswordForm />
      </div>
    </main>
  );
}
