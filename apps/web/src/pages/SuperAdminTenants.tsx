import { useEffect, useState } from 'react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { StatusBadge } from '../components/ui/StatusBadge';
import { api } from '../services/api';

interface TenantSummary {
  id: string;
  name: string;
  panNumber: string;
  status: string;
  createdAt: string;
  branchCount: number;
  userCount: number;
}

const cellStyle: React.CSSProperties = {
  padding: '12px 14px',
  fontSize: '13px',
  color: 'var(--color-text)',
  borderBottom: '1px solid rgba(15, 76, 138, 0.08)',
  textAlign: 'left',
  whiteSpace: 'nowrap',
};

const headStyle: React.CSSProperties = {
  ...cellStyle,
  fontSize: '12px',
  fontWeight: 700,
  color: 'rgba(44, 62, 80, 0.7)',
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
};

export function SuperAdminTenants() {
  const [tenants, setTenants] = useState<TenantSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  const loadTenants = async () => {
    setIsLoading(true);
    setErrorMsg('');

    try {
      const tenantList = (await api.onboarding.getTenants()) as TenantSummary[];
      setTenants(tenantList);
    } catch (error: unknown) {
      setErrorMsg(error instanceof Error ? error.message : 'Failed to load tenants.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadTenants();
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <Card hoverable={false} style={{ padding: '18px 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
          <div>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '20px', fontWeight: 600, color: 'var(--color-text)' }}>Tenant Registry</h3>
            <p style={{ marginTop: '4px', color: 'rgba(44, 62, 80, 0.7)', fontSize: '13px' }}>
              Every institution provisioned on the platform.
            </p>
          </div>
          <Button variant="outline" onClick={() => void loadTenants()} disabled={isLoading} style={{ height: '40px' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>refresh</span>
            Refresh
          </Button>
        </div>
      </Card>

      {errorMsg ? <StatusBadge variant="error">{errorMsg}</StatusBadge> : null}

      <Card hoverable={false} style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'rgba(15, 76, 138, 0.04)' }}>
                <th style={headStyle}>Institution</th>
                <th style={headStyle}>PAN</th>
                <th style={headStyle}>Status</th>
                <th style={headStyle}>Branches</th>
                <th style={headStyle}>Users</th>
                <th style={headStyle}>Created</th>
              </tr>
            </thead>
            <tbody>
              {tenants.length === 0 ? (
                <tr>
                  <td style={{ ...cellStyle, textAlign: 'center', padding: '28px' }} colSpan={6}>
                    {isLoading ? 'Loading tenants…' : 'No tenants provisioned yet.'}
                  </td>
                </tr>
              ) : (
                tenants.map((tenant) => (
                  <tr key={tenant.id}>
                    <td style={{ ...cellStyle, fontWeight: 700 }}>{tenant.name}</td>
                    <td style={cellStyle}>{tenant.panNumber}</td>
                    <td style={cellStyle}>
                      <StatusBadge variant={tenant.status === 'ACTIVE' ? 'success' : 'warning'}>{tenant.status}</StatusBadge>
                    </td>
                    <td style={cellStyle}>{tenant.branchCount}</td>
                    <td style={cellStyle}>{tenant.userCount}</td>
                    <td style={cellStyle}>{new Date(tenant.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
