import { useEffect, useState } from 'react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { KPICard } from '../components/ui/KPICard';
import { StatusBadge } from '../components/ui/StatusBadge';
import { useToast } from '../components/ui/Toast';
import { api } from '../services/api';

type RequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

interface OnboardingRequestItem {
  id: string;
  name: string;
  email: string;
  phone: string;
  panNumber: string;
  remarks?: string | null;
  status: RequestStatus;
  createdAt?: string;
}

interface TenantSummary {
  id: string;
  name: string;
  panNumber: string;
  status: string;
  createdAt: string;
  branchCount: number;
  userCount: number;
}

interface ProvisionedResult {
  tenantId: string;
  tenantName: string;
  primaryAdminUser: string;
  defaultBranch: string;
  temporaryPassword: string;
}

function getRequestVariant(status: RequestStatus): 'warning' | 'success' | 'error' {
  if (status === 'PENDING') return 'warning';
  if (status === 'APPROVED') return 'success';
  return 'error';
}

export function SuperAdminDashboard() {
  const { showToast } = useToast();
  const [requests, setRequests] = useState<OnboardingRequestItem[]>([]);
  const [tenants, setTenants] = useState<TenantSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [busyRequestId, setBusyRequestId] = useState('');
  const [provisioned, setProvisioned] = useState<ProvisionedResult | null>(null);
  const [copied, setCopied] = useState(false);

  const pendingRequests = requests.filter((request) => request.status === 'PENDING');
  const activeTenants = tenants.filter((tenant) => tenant.status === 'ACTIVE');
  const totalUsers = tenants.reduce((sum, tenant) => sum + tenant.userCount, 0);

  const loadData = async () => {
    setIsLoading(true);
    setErrorMsg('');

    try {
      const [requestList, tenantList] = await Promise.all([
        api.onboarding.getRequests() as Promise<OnboardingRequestItem[]>,
        api.onboarding.getTenants() as Promise<TenantSummary[]>,
      ]);
      setRequests(requestList);
      setTenants(tenantList);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to load platform data.';
      setErrorMsg(message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const handleApprove = async (request: OnboardingRequestItem) => {
    setBusyRequestId(request.id);
    setErrorMsg('');

    try {
      const result = await api.onboarding.approveRequest(request.id);
      setProvisioned(result.provisioned);
      setCopied(false);
      showToast(`${request.name} approved and provisioned.`, 'success');
      await loadData();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to approve the request.';
      setErrorMsg(message);
      showToast(message, 'error');
    } finally {
      setBusyRequestId('');
    }
  };

  const handleReject = async (request: OnboardingRequestItem) => {
    setBusyRequestId(request.id);
    setErrorMsg('');

    try {
      await api.onboarding.rejectRequest(request.id);
      showToast(`${request.name} rejected.`, 'info');
      await loadData();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to reject the request.';
      setErrorMsg(message);
      showToast(message, 'error');
    } finally {
      setBusyRequestId('');
    }
  };

  const handleCopyCredentials = async () => {
    if (!provisioned) {
      return;
    }

    try {
      await navigator.clipboard.writeText(
        `TMS access for ${provisioned.tenantName}\nLogin: ${provisioned.primaryAdminUser}\nTemporary password: ${provisioned.temporaryPassword}`
      );
      setCopied(true);
    } catch {
      showToast('Could not copy to clipboard. Copy the credentials manually.', 'error');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <Card hoverable={false} style={{ padding: '18px 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
          <div>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '20px', fontWeight: 600, color: 'var(--color-text)' }}>Platform Control Center</h3>
            <p style={{ marginTop: '4px', color: 'var(--text-muted)', fontSize: '13px' }}>
              Review institution onboarding requests and provision new tenants.
            </p>
          </div>
          <Button variant="outline" onClick={() => void loadData()} disabled={isLoading} style={{ height: '40px' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>refresh</span>
            Refresh
          </Button>
        </div>
      </Card>

      {errorMsg ? <StatusBadge variant="error">{errorMsg}</StatusBadge> : null}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '18px' }}>
        <KPICard
          title="Pending Requests"
          value={pendingRequests.length}
          delta={pendingRequests.length > 0 ? 'Awaiting review' : 'Queue clear'}
          icon="pending_actions"
          accentColor={pendingRequests.length > 0 ? 'var(--color-warning)' : 'var(--color-success)'}
          loading={isLoading}
        />
        <KPICard title="Provisioned Tenants" value={tenants.length} delta="All institutions" icon="domain" loading={isLoading} />
        <KPICard title="Active Tenants" value={activeTenants.length} delta="Currently operating" icon="verified" loading={isLoading} />
        <KPICard title="Total Users" value={totalUsers} delta="Across all tenants" icon="group" loading={isLoading} />
      </div>

      <Card hoverable={false}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', gap: '12px', flexWrap: 'wrap' }}>
          <div>
            <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--color-text)' }}>Institution Onboarding Requests</h3>
            <p style={{ marginTop: '4px', color: 'var(--text-muted)', fontSize: '13px' }}>
              Approving a request provisions the tenant, default branch, and primary admin account.
            </p>
          </div>
          <StatusBadge variant={pendingRequests.length > 0 ? 'warning' : 'success'}>{pendingRequests.length} pending</StatusBadge>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {requests.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '14px', textAlign: 'center', padding: '24px 0' }}>
              {isLoading ? 'Loading requests…' : 'No onboarding requests yet. Institutions can apply via the public onboarding form.'}
            </p>
          ) : (
            requests.map((request) => (
              <div
                key={request.id}
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '14px', padding: '14px 16px', borderRadius: '12px', border: '1px solid var(--border)', background: 'var(--bg)', flexWrap: 'wrap' }}
              >
                <div style={{ minWidth: '220px' }}>
                  <p style={{ fontWeight: 700, fontSize: '15px', color: 'var(--color-text)' }}>{request.name}</p>
                  <p style={{ marginTop: '4px', fontSize: '12px', color: 'var(--text-muted)' }}>
                    {request.email} · {request.phone} · PAN {request.panNumber}
                  </p>
                  {request.remarks ? (
                    <p style={{ marginTop: '4px', fontSize: '12px', color: 'var(--text-muted)' }}>“{request.remarks}”</p>
                  ) : null}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                  <StatusBadge variant={getRequestVariant(request.status)}>{request.status}</StatusBadge>
                  {request.status === 'PENDING' ? (
                    <>
                      <Button
                        onClick={() => void handleApprove(request)}
                        disabled={busyRequestId === request.id}
                        style={{ height: '38px', background: 'var(--color-success)' }}
                      >
                        {busyRequestId === request.id ? 'Provisioning…' : 'Approve'}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => void handleReject(request)}
                        disabled={busyRequestId === request.id}
                        style={{ height: '38px', color: 'var(--color-error)', borderColor: 'rgba(214, 69, 69, 0.4)' }}
                      >
                        Reject
                      </Button>
                    </>
                  ) : null}
                </div>
              </div>
            ))
          )}
        </div>
      </Card>

      <Card hoverable={false}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', gap: '12px', flexWrap: 'wrap' }}>
          <div>
            <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--color-text)' }}>Recent Tenants</h3>
            <p style={{ marginTop: '4px', color: 'var(--text-muted)', fontSize: '13px' }}>Latest provisioned institutions across the platform.</p>
          </div>
          <StatusBadge variant="info">{tenants.length} total</StatusBadge>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {tenants.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '14px', textAlign: 'center', padding: '24px 0' }}>
              {isLoading ? 'Loading tenants…' : 'No tenants provisioned yet.'}
            </p>
          ) : (
            tenants.slice(0, 5).map((tenant) => (
              <div
                key={tenant.id}
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '14px', padding: '14px 16px', borderRadius: '12px', border: '1px solid var(--border)', background: 'var(--bg)', flexWrap: 'wrap' }}
              >
                <div>
                  <p style={{ fontWeight: 700, fontSize: '15px', color: 'var(--color-text)' }}>{tenant.name}</p>
                  <p style={{ marginTop: '4px', fontSize: '12px', color: 'var(--text-muted)' }}>
                    PAN {tenant.panNumber} · {tenant.branchCount} branch{tenant.branchCount === 1 ? '' : 'es'} · {tenant.userCount} user{tenant.userCount === 1 ? '' : 's'}
                  </p>
                </div>
                <StatusBadge variant={tenant.status === 'ACTIVE' ? 'success' : 'warning'}>{tenant.status}</StatusBadge>
              </div>
            ))
          )}
        </div>
      </Card>

      {provisioned ? (
        <div
          role="dialog"
          aria-modal="true"
          style={{ position: 'fixed', inset: 0, zIndex: 60, display: 'grid', placeItems: 'center', background: 'rgba(10, 24, 44, 0.5)', padding: '24px' }}
        >
          <Card hoverable={false} style={{ maxWidth: '480px', width: '100%', padding: '28px' }}>
            <div style={{ textAlign: 'center' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '44px', color: 'var(--color-success)' }}>task_alt</span>
              <h3 style={{ marginTop: '10px', fontSize: '20px', fontWeight: 700, color: 'var(--color-text)' }}>Tenant Provisioned</h3>
              <p style={{ marginTop: '6px', color: 'var(--text-muted)', fontSize: '13px' }}>
                {provisioned.tenantName} is live with branch “{provisioned.defaultBranch}”.
              </p>
            </div>

            <div style={{ marginTop: '18px', padding: '16px', borderRadius: '12px', background: 'rgba(21, 96, 189, 0.06)', border: '1px solid rgba(21, 96, 189, 0.12)' }}>
              <p style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)' }}>PRIMARY ADMIN LOGIN</p>
              <p style={{ marginTop: '8px', fontSize: '14px', fontWeight: 700, color: 'var(--color-text)', wordBreak: 'break-all' }}>{provisioned.primaryAdminUser}</p>
              <p style={{ marginTop: '10px', fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)' }}>TEMPORARY PASSWORD (shown once)</p>
              <p style={{ marginTop: '8px', fontFamily: 'monospace', fontSize: '16px', fontWeight: 700, color: 'var(--color-primary)' }}>{provisioned.temporaryPassword}</p>
            </div>

            <p style={{ marginTop: '12px', fontSize: '12px', color: 'var(--text-muted)' }}>
              Share these credentials securely with the institution. The password is not stored in plain text and cannot be shown again.
            </p>

            <div style={{ display: 'flex', gap: '12px', marginTop: '18px', flexWrap: 'wrap' }}>
              <Button onClick={() => void handleCopyCredentials()} style={{ flex: 1, minWidth: '160px' }}>
                {copied ? 'Copied ✓' : 'Copy Credentials'}
              </Button>
              <Button variant="outline" onClick={() => setProvisioned(null)} style={{ flex: 1, minWidth: '120px' }}>
                Done
              </Button>
            </div>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
