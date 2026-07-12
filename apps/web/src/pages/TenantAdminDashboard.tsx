import { useEffect, useState } from 'react';
import { AlertFeed, type AlertFeedItem } from '../components/ui/AlertFeed';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { KPICard } from '../components/ui/KPICard';
import { StatusBadge } from '../components/ui/StatusBadge';
import { api } from '../services/api';

interface ProfitLossData {
  revenue: number;
  operatingCosts: number;
  netMargin: number;
  month: string;
}

interface FinanceConfig {
  vatRate: number;
  gracePeriod: number;
  pettyCashCap: number;
}

interface BranchSummaryItem {
  branchId: string;
  branchName: string;
  activeStudents: number;
  staffRoles: number;
}

interface TenantDashboardData {
  activeStudentsCount: number;
  activeTeachersCount: number;
  totalOverdueAmountNpr: number;
  pendingLeaveRequestsCount: number;
  branchSummary: BranchSummaryItem[];
}

function buildAlerts(dashboard: TenantDashboardData | null): AlertFeedItem[] {
  if (!dashboard) {
    return [];
  }

  const alerts: AlertFeedItem[] = [];

  if (dashboard.totalOverdueAmountNpr > 0) {
    alerts.push({
      id: 'alert-overdue',
      tag: 'Fee',
      tagVariant: 'gold',
      description: `NPR ${dashboard.totalOverdueAmountNpr.toLocaleString()} in overdue invoices needs follow-up.`,
      timestamp: 'live',
    });
  }

  if (dashboard.pendingLeaveRequestsCount > 0) {
    alerts.push({
      id: 'alert-leaves',
      tag: 'Leave',
      tagVariant: 'warning',
      description: `${dashboard.pendingLeaveRequestsCount} leave request${dashboard.pendingLeaveRequestsCount === 1 ? '' : 's'} awaiting approval.`,
      timestamp: 'live',
    });
  }

  if (dashboard.activeStudentsCount === 0) {
    alerts.push({
      id: 'alert-no-students',
      tag: 'Setup',
      tagVariant: 'info',
      description: 'No students enrolled yet. Add students to start attendance and billing.',
      timestamp: 'live',
    });
  }

  return alerts;
}

export function TenantAdminDashboard() {
  const [pl, setPl] = useState<ProfitLossData | null>(null);
  const [dashboard, setDashboard] = useState<TenantDashboardData | null>(null);
  const [vatRate, setVatRate] = useState(13);
  const [gracePeriod, setGracePeriod] = useState(15);
  const [pettyCashCap, setPettyCashCap] = useState(20000);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);

  const alerts = buildAlerts(dashboard);

  const loadDashboardData = async () => {
    setIsLoading(true);
    setErrorMsg('');

    try {
      const [plData, config, summary] = await Promise.all([
        api.finances.getPL() as Promise<ProfitLossData>,
        api.finances.getConfig() as Promise<FinanceConfig>,
        api.tenant.getDashboard(),
      ]);

      setPl(plData);
      setVatRate(config.vatRate);
      setGracePeriod(config.gracePeriod);
      setPettyCashCap(config.pettyCashCap);
      setDashboard(summary);
    } catch (error: unknown) {
      setErrorMsg(error instanceof Error ? error.message : 'Failed to load dashboard data.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadDashboardData();
  }, []);

  const handleSaveConfigs = async () => {
    setSaveSuccess(false);
    setErrorMsg('');

    try {
      await api.finances.updateConfig(vatRate, gracePeriod, pettyCashCap);
      setSaveSuccess(true);
      window.setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error: unknown) {
      setErrorMsg(error instanceof Error ? error.message : 'Failed to save configurations');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <Card hoverable={false} style={{ padding: '18px 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
          <div>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '20px', fontWeight: 600, color: 'var(--color-text)' }}>Institution Overview</h3>
            <p style={{ marginTop: '4px', color: 'rgba(44, 62, 80, 0.7)', fontSize: '13px' }}>
              Live academic, finance, and operations snapshot across all branches.
            </p>
          </div>
          <Button variant="outline" onClick={() => void loadDashboardData()} disabled={isLoading} style={{ height: '40px' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>refresh</span>
            Refresh
          </Button>
        </div>
      </Card>

      {errorMsg ? <StatusBadge variant="error">{errorMsg}</StatusBadge> : null}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '18px' }}>
        <KPICard
          title="Active Students"
          value={dashboard ? dashboard.activeStudentsCount.toLocaleString() : '—'}
          delta="Enrolled across branches"
          icon="school"
          loading={isLoading}
        />
        <KPICard
          title="Active Teachers"
          value={dashboard ? dashboard.activeTeachersCount.toLocaleString() : '—'}
          delta="Teaching staff"
          icon="badge"
          loading={isLoading}
        />
        <KPICard
          title="Overdue Fees"
          value={dashboard ? `NPR ${dashboard.totalOverdueAmountNpr.toLocaleString()}` : '—'}
          delta={dashboard && dashboard.totalOverdueAmountNpr > 0 ? 'Needs follow-up' : 'All clear'}
          icon="payments"
          accentColor={dashboard && dashboard.totalOverdueAmountNpr > 0 ? 'var(--color-warning)' : 'var(--color-success)'}
          loading={isLoading}
        />
        <KPICard
          title="Pending Leaves"
          value={dashboard ? dashboard.pendingLeaveRequestsCount : '—'}
          delta={dashboard && dashboard.pendingLeaveRequestsCount > 0 ? 'Awaiting approval' : 'All clear'}
          icon="event_busy"
          accentColor={dashboard && dashboard.pendingLeaveRequestsCount > 0 ? 'var(--color-warning)' : 'var(--color-success)'}
          loading={isLoading}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '18px' }}>
        <Card hoverable={false}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', gap: '12px' }}>
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--color-text)' }}>Branch Network</h3>
              <p style={{ marginTop: '4px', color: 'rgba(44, 62, 80, 0.68)', fontSize: '13px' }}>Students and staff by center</p>
            </div>
            <StatusBadge variant="info">{dashboard?.branchSummary.length ?? 0} branch{(dashboard?.branchSummary.length ?? 0) === 1 ? '' : 'es'}</StatusBadge>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {!dashboard || dashboard.branchSummary.length === 0 ? (
              <p style={{ color: 'rgba(44, 62, 80, 0.64)', fontSize: '14px', textAlign: 'center', padding: '18px 0' }}>
                {isLoading ? 'Loading branches…' : 'No branches yet.'}
              </p>
            ) : (
              dashboard.branchSummary.map((branch) => (
                <div key={branch.branchId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '14px', padding: '12px 14px', borderRadius: '12px', border: '1px solid rgba(21, 96, 189, 0.1)', background: '#FFFFFF' }}>
                  <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-text)' }}>{branch.branchName}</span>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <StatusBadge variant="info">{branch.activeStudents} students</StatusBadge>
                    <StatusBadge variant="gold">{branch.staffRoles} staff</StatusBadge>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>

        <Card hoverable={false}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--color-text)' }}>Action Queue</h3>
              <p style={{ marginTop: '4px', color: 'rgba(44, 62, 80, 0.68)', fontSize: '13px' }}>Items needing tenant attention</p>
            </div>
            <StatusBadge variant={alerts.length > 0 ? 'gold' : 'success'}>{alerts.length}</StatusBadge>
          </div>
          {alerts.length === 0 ? (
            <p style={{ color: 'rgba(44, 62, 80, 0.64)', fontSize: '14px', textAlign: 'center', padding: '18px 0' }}>
              {isLoading ? 'Checking…' : 'Nothing needs attention right now.'}
            </p>
          ) : (
            <AlertFeed items={alerts} />
          )}
        </Card>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '18px' }}>
        <Card hoverable={false}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--color-text)' }}>Profit &amp; Loss Statement</h3>
            <StatusBadge variant="info">{pl?.month ?? '—'}</StatusBadge>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '14px' }}>
            <div style={{ padding: '18px', borderRadius: '12px', background: 'rgba(0, 171, 102, 0.08)', border: '1px solid rgba(0, 171, 102, 0.18)' }}>
              <p style={{ color: 'rgba(44, 62, 80, 0.7)', fontSize: '12px', fontWeight: 700 }}>COLLECTED REVENUE</p>
              <p style={{ marginTop: '8px', fontFamily: 'var(--font-display)', fontSize: '24px', fontWeight: 600, color: 'var(--color-success)' }}>
                NPR {(pl?.revenue ?? 0).toLocaleString()}
              </p>
              <p style={{ marginTop: '6px', color: 'rgba(44, 62, 80, 0.62)', fontSize: '11px' }}>Paid tuition invoices</p>
            </div>
            <div style={{ padding: '18px', borderRadius: '12px', background: 'rgba(214, 69, 69, 0.08)', border: '1px solid rgba(214, 69, 69, 0.18)' }}>
              <p style={{ color: 'rgba(44, 62, 80, 0.7)', fontSize: '12px', fontWeight: 700 }}>OPERATING COSTS</p>
              <p style={{ marginTop: '8px', fontFamily: 'var(--font-display)', fontSize: '24px', fontWeight: 600, color: 'var(--color-error)' }}>
                NPR {(pl?.operatingCosts ?? 0).toLocaleString()}
              </p>
              <p style={{ marginTop: '6px', color: 'rgba(44, 62, 80, 0.62)', fontSize: '11px' }}>Expenses + payroll + petty cash</p>
            </div>
            <div style={{ padding: '18px', borderRadius: '12px', background: 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-light) 100%)', color: '#FFFFFF' }}>
              <p style={{ opacity: 0.78, fontSize: '12px', fontWeight: 700 }}>NET MARGIN</p>
              <p style={{ marginTop: '8px', fontFamily: 'var(--font-display)', fontSize: '24px', fontWeight: 600 }}>
                NPR {(pl?.netMargin ?? 0).toLocaleString()}
              </p>
              <p style={{ marginTop: '6px', opacity: 0.8, fontSize: '11px' }}>Net surplus for the month</p>
            </div>
          </div>
        </Card>

        <Card hoverable={false}>
          <h3 style={{ marginBottom: '20px', fontSize: '18px', fontWeight: 700, color: 'var(--color-text)' }}>Institution Policy Settings</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '18px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-text)' }}>Standard VAT Percentage</label>
              <input
                type="number"
                value={vatRate}
                onChange={(event) => setVatRate(Number(event.target.value))}
                style={{ padding: '12px 14px', borderRadius: '12px', border: '1px solid rgba(21, 96, 189, 0.14)', background: '#FFFFFF', color: 'var(--color-text)', fontFamily: 'var(--font-ui)' }}
              />
              <p style={{ color: 'rgba(44, 62, 80, 0.62)', fontSize: '11px' }}>Required for Nepalese VAT compliance.</p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-text)' }}>Grace Period (Minutes)</label>
              <input
                type="number"
                value={gracePeriod}
                onChange={(event) => setGracePeriod(Number(event.target.value))}
                style={{ padding: '12px 14px', borderRadius: '12px', border: '1px solid rgba(21, 96, 189, 0.14)', background: '#FFFFFF', color: 'var(--color-text)', fontFamily: 'var(--font-ui)' }}
              />
              <p style={{ color: 'rgba(44, 62, 80, 0.62)', fontSize: '11px' }}>Late attendance buffer before automatic mark out.</p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-text)' }}>Monthly Petty Cash Limit</label>
              <input
                type="number"
                value={pettyCashCap}
                onChange={(event) => setPettyCashCap(Number(event.target.value))}
                style={{ padding: '12px 14px', borderRadius: '12px', border: '1px solid rgba(21, 96, 189, 0.14)', background: '#FFFFFF', color: 'var(--color-text)', fontFamily: 'var(--font-ui)' }}
              />
              <p style={{ color: 'rgba(44, 62, 80, 0.62)', fontSize: '11px' }}>Resets automatically on the first day of each month.</p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap', marginTop: '20px' }}>
            <Button onClick={() => void handleSaveConfigs()} style={{ background: 'var(--color-primary-light)' }}>Save Configurations</Button>
            {saveSuccess ? <StatusBadge variant="success">Settings synchronized</StatusBadge> : null}
          </div>
        </Card>
      </div>
    </div>
  );
}
