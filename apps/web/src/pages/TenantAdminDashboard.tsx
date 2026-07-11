import { useEffect, useState } from 'react';
import { AlertFeed, type AlertFeedItem } from '../components/ui/AlertFeed';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { KPICard } from '../components/ui/KPICard';
import { SkeletonCard } from '../components/ui/SkeletonCard';
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

type RequestStatus = 'PENDING' | 'APPROVED';

interface OnboardingRequest {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: RequestStatus;
}

interface BranchPerformanceItem {
  name: string;
  percent: number;
  collected: string;
  target: string;
}

const branchPerformance: BranchPerformanceItem[] = [
  { name: 'Damak', percent: 88, collected: '₹1.76L', target: '₹2.0L' },
  { name: 'Birtamod', percent: 83, collected: '₹1.66L', target: '₹2.0L' },
  { name: 'Charali', percent: 79, collected: '₹1.58L', target: '₹2.0L' },
];

const pendingAlerts: AlertFeedItem[] = [
  { id: 'alert-1', tag: 'Fee', tagVariant: 'gold', description: '12 invoices remain unpaid across Damak and Birtamod branches.', timestamp: '8 min ago' },
  { id: 'alert-2', tag: 'Attendance', tagVariant: 'warning', description: 'Morning attendance sync is pending for Grade 9 in Charali.', timestamp: '19 min ago' },
  { id: 'alert-3', tag: 'Setup', tagVariant: 'info', description: 'RBAC review is still required before the new branch onboarding goes live.', timestamp: '42 min ago' },
  { id: 'alert-4', tag: 'Leave', tagVariant: 'error', description: 'Three leave approvals are pending tenant-level signoff today.', timestamp: '1 hr ago' },
];

const initialProfitLoss: ProfitLossData = {
  revenue: 265000,
  operatingCosts: 217000,
  netMargin: 48000,
  month: 'July 2026',
};

function getRequestVariant(status: RequestStatus) {
  return status === 'PENDING' ? 'warning' : 'success';
}

export function TenantAdminDashboard() {
  const [pl, setPl] = useState<ProfitLossData>(initialProfitLoss);
  const [vatRate, setVatRate] = useState(13);
  const [gracePeriod, setGracePeriod] = useState(15);
  const [pettyCashCap, setPettyCashCap] = useState(20000);
  const [onboardingRequests, setOnboardingRequests] = useState<OnboardingRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);

  const collectionPercent = 84;
  const pendingAlertCount = pendingAlerts.length;

  const loadDashboardData = async () => {
    setIsLoading(true);
    setErrorMsg('');

    try {
      const [plData, config, requests] = await Promise.all([
        api.finances.getPL() as Promise<ProfitLossData>,
        api.finances.getConfig() as Promise<FinanceConfig>,
        api.onboarding.getRequests() as Promise<OnboardingRequest[]>,
      ]);

      setPl(plData);
      setVatRate(config.vatRate);
      setGracePeriod(config.gracePeriod);
      setPettyCashCap(config.pettyCashCap);
      setOnboardingRequests(requests);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.warn('API error, falling back to local mocks:', message);
      setPl(initialProfitLoss);
      setVatRate(13);
      setGracePeriod(15);
      setPettyCashCap(20000);
      setOnboardingRequests([
        { id: 'req-01', name: 'Mount Everest School', email: 'everest@edu.np', phone: '9841234567', status: 'PENDING' },
        { id: 'req-02', name: 'Lalitpur Academy', email: 'contact@lalitpur.edu.np', phone: '9801234567', status: 'APPROVED' },
        { id: 'req-03', name: 'Janaki Merit Center', email: 'hello@janakimerit.edu.np', phone: '9812345678', status: 'PENDING' },
      ]);
    } finally {
      window.setTimeout(() => setIsLoading(false), 700);
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
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '20px', fontWeight: 600, color: 'var(--color-text)' }}>Enterprise Financial Center</h3>
            <p style={{ marginTop: '4px', color: 'rgba(44, 62, 80, 0.7)', fontSize: '13px' }}>
              Live academic, finance, and operations snapshot across all branches.
            </p>
          </div>
          <Button variant="outline" onClick={() => void loadDashboardData()} disabled={isLoading} style={{ height: '40px' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>refresh</span>
            Refresh Snapshot
          </Button>
        </div>
      </Card>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '18px' }}>
        <KPICard title="Total Students" value="1,248" delta="↑12 this month" icon="school" loading={isLoading} />
        <KPICard title="Active Teachers" value="86" delta="↑2 new hires" icon="badge" loading={isLoading} />
        <Card hoverable={false} style={{ padding: '22px', minHeight: '148px' }}>
          {isLoading ? (
            <SkeletonCard />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '14px' }}>
                <div>
                  <p style={{ color: 'rgba(44, 62, 80, 0.72)', fontSize: '13px', fontWeight: 600 }}>Collection vs Target MTD</p>
                  <div style={{ marginTop: '8px', color: 'var(--color-text)', fontFamily: 'var(--font-display)', fontSize: '24px', fontWeight: 600 }}>
                    {collectionPercent}%
                  </div>
                </div>
                <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(15, 76, 138, 0.08)', color: 'var(--color-primary-light)', display: 'grid', placeItems: 'center' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>payments</span>
                </div>
              </div>
              <div style={{ height: '10px', borderRadius: '999px', background: 'rgba(15, 76, 138, 0.1)', overflow: 'hidden' }}>
                <div style={{ width: `${collectionPercent}%`, height: '100%', borderRadius: '999px', background: 'linear-gradient(90deg, var(--color-primary) 0%, var(--color-primary-light) 100%)', transition: 'width 700ms ease' }} />
              </div>
              <p style={{ color: 'var(--color-primary-light)', fontSize: '12px', fontWeight: 700 }}>₹4.2L of ₹5L (84%)</p>
            </div>
          )}
        </Card>
        <KPICard
          title="Pending Alerts"
          value={pendingAlertCount}
          delta={pendingAlertCount > 0 ? 'Needs review today' : 'All clear'}
          icon="notifications_active"
          accentColor={pendingAlertCount > 0 ? 'var(--color-warning)' : 'var(--color-success)'}
          loading={isLoading}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '18px' }}>
        <Card hoverable={false}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', gap: '12px' }}>
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--color-text)' }}>Branch Performance</h3>
              <p style={{ marginTop: '4px', color: 'rgba(44, 62, 80, 0.68)', fontSize: '13px' }}>Fee collection progress by branch</p>
            </div>
            <StatusBadge variant="info">MTD</StatusBadge>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {branchPerformance.map((branch) => (
              <div key={branch.name} style={{ display: 'grid', gridTemplateColumns: '100px 1fr 120px', gap: '14px', alignItems: 'center' }}>
                <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-text)' }}>{branch.name}</span>
                <div style={{ height: '12px', borderRadius: '999px', background: 'rgba(15, 76, 138, 0.1)', overflow: 'hidden' }}>
                  <div style={{ width: `${branch.percent}%`, height: '100%', borderRadius: '999px', background: 'linear-gradient(90deg, var(--color-primary) 0%, var(--color-primary-light) 100%)' }} />
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-primary)' }}>{branch.percent}%</div>
                  <div style={{ color: 'rgba(44, 62, 80, 0.62)', fontSize: '11px' }}>{branch.collected} / {branch.target}</div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card hoverable={false}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--color-text)' }}>Pending Alerts</h3>
              <p style={{ marginTop: '4px', color: 'rgba(44, 62, 80, 0.68)', fontSize: '13px' }}>Action queue requiring tenant attention</p>
            </div>
            <StatusBadge variant="gold">{pendingAlertCount}</StatusBadge>
          </div>
          <AlertFeed items={pendingAlerts} />
          <button type="button" style={{ marginTop: '14px', border: 'none', background: 'transparent', color: 'var(--color-primary-light)', fontSize: '13px', fontWeight: 700, cursor: 'pointer', padding: 0 }}>
            View All →
          </button>
        </Card>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '18px' }}>
        <Card hoverable={false}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--color-text)' }}>Corporate Profit &amp; Loss Statement</h3>
            <StatusBadge variant="info">{pl.month}</StatusBadge>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '14px' }}>
            <div style={{ padding: '18px', borderRadius: '12px', background: 'rgba(46, 158, 91, 0.08)', border: '1px solid rgba(46, 158, 91, 0.18)' }}>
              <p style={{ color: 'rgba(44, 62, 80, 0.7)', fontSize: '12px', fontWeight: 700 }}>AGGREGATED REVENUE</p>
              <p style={{ marginTop: '8px', fontFamily: 'var(--font-display)', fontSize: '24px', fontWeight: 600, color: 'var(--color-success)' }}>NPR {pl.revenue.toLocaleString()}</p>
              <p style={{ marginTop: '6px', color: 'rgba(44, 62, 80, 0.62)', fontSize: '11px' }}>Aggregated tuition invoices</p>
            </div>
            <div style={{ padding: '18px', borderRadius: '12px', background: 'rgba(214, 69, 69, 0.08)', border: '1px solid rgba(214, 69, 69, 0.18)' }}>
              <p style={{ color: 'rgba(44, 62, 80, 0.7)', fontSize: '12px', fontWeight: 700 }}>OPERATING COSTS</p>
              <p style={{ marginTop: '8px', fontFamily: 'var(--font-display)', fontSize: '24px', fontWeight: 600, color: 'var(--color-error)' }}>NPR {pl.operatingCosts.toLocaleString()}</p>
              <p style={{ marginTop: '6px', color: 'rgba(44, 62, 80, 0.62)', fontSize: '11px' }}>Expenses + payrolls + releases</p>
            </div>
            <div style={{ padding: '18px', borderRadius: '12px', background: 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-light) 100%)', color: '#FFFFFF' }}>
              <p style={{ opacity: 0.78, fontSize: '12px', fontWeight: 700 }}>NET SYSTEM MARGIN</p>
              <p style={{ marginTop: '8px', fontFamily: 'var(--font-display)', fontSize: '24px', fontWeight: 600 }}>NPR {pl.netMargin.toLocaleString()}</p>
              <p style={{ marginTop: '6px', opacity: 0.8, fontSize: '11px' }}>Net surplus for the month</p>
            </div>
          </div>
        </Card>

        <Card hoverable={false}>
          <h3 style={{ marginBottom: '20px', fontSize: '18px', fontWeight: 700, color: 'var(--color-text)' }}>Global Policy Settings</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '18px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-text)' }}>Standard VAT Percentage</label>
              <input
                type="number"
                value={vatRate}
                onChange={(event) => setVatRate(Number(event.target.value))}
                style={{ padding: '12px 14px', borderRadius: '12px', border: '1px solid rgba(15, 76, 138, 0.14)', background: '#FFFFFF', color: 'var(--color-text)', fontFamily: 'var(--font-ui)' }}
              />
              <p style={{ color: 'rgba(44, 62, 80, 0.62)', fontSize: '11px' }}>Required for Nepalese VAT compliance.</p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-text)' }}>Grace Period (Minutes)</label>
              <input
                type="number"
                value={gracePeriod}
                onChange={(event) => setGracePeriod(Number(event.target.value))}
                style={{ padding: '12px 14px', borderRadius: '12px', border: '1px solid rgba(15, 76, 138, 0.14)', background: '#FFFFFF', color: 'var(--color-text)', fontFamily: 'var(--font-ui)' }}
              />
              <p style={{ color: 'rgba(44, 62, 80, 0.62)', fontSize: '11px' }}>Late attendance buffer before automatic mark out.</p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-text)' }}>Monthly Petty Cash Limit</label>
              <input
                type="number"
                value={pettyCashCap}
                onChange={(event) => setPettyCashCap(Number(event.target.value))}
                style={{ padding: '12px 14px', borderRadius: '12px', border: '1px solid rgba(15, 76, 138, 0.14)', background: '#FFFFFF', color: 'var(--color-text)', fontFamily: 'var(--font-ui)' }}
              />
              <p style={{ color: 'rgba(44, 62, 80, 0.62)', fontSize: '11px' }}>Resets automatically on the first day of each month.</p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap', marginTop: '20px' }}>
            <Button onClick={() => void handleSaveConfigs()} style={{ background: 'var(--color-primary-light)' }}>Save Configurations</Button>
            {saveSuccess ? <StatusBadge variant="success">Settings synchronized</StatusBadge> : null}
            {errorMsg ? <StatusBadge variant="error">{errorMsg}</StatusBadge> : null}
          </div>
        </Card>
      </div>

      <Card hoverable={false}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', gap: '12px', flexWrap: 'wrap' }}>
          <div>
            <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--color-text)' }}>Tenant Institution Onboarding Requests</h3>
            <p style={{ marginTop: '4px', color: 'rgba(44, 62, 80, 0.68)', fontSize: '13px' }}>Existing workflow preserved for operations follow-up.</p>
          </div>
          <StatusBadge variant="info">{onboardingRequests.length} active</StatusBadge>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {onboardingRequests.length === 0 ? (
            <p style={{ color: 'rgba(44, 62, 80, 0.64)', fontSize: '14px', textAlign: 'center', padding: '24px 0' }}>No onboarding requests found.</p>
          ) : (
            onboardingRequests.map((request) => (
              <div key={request.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '14px', padding: '14px 16px', borderRadius: '12px', border: '1px solid rgba(15, 76, 138, 0.1)', background: '#FFFFFF', flexWrap: 'wrap' }}>
                <div>
                  <p style={{ fontWeight: 700, fontSize: '15px', color: 'var(--color-text)' }}>{request.name}</p>
                  <p style={{ marginTop: '4px', fontSize: '12px', color: 'rgba(44, 62, 80, 0.68)' }}>Email: {request.email} · Phone: {request.phone}</p>
                </div>
                <StatusBadge variant={getRequestVariant(request.status)}>{request.status}</StatusBadge>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}
