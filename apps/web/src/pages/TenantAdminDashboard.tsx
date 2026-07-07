import { useState, useEffect } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { api } from '../services/api';

export function TenantAdminDashboard() {
  const [pl, setPl] = useState({ revenue: 265000, operatingCosts: 217000, netMargin: 48000, month: 'July 2026' });
  const [vatRate, setVatRate] = useState(13);
  const [gracePeriod, setGracePeriod] = useState(15);
  const [pettyCashCap, setPettyCashCap] = useState(20000);
  const [onboardingRequests, setOnboardingRequests] = useState<any[]>([]);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);

  const loadDashboardData = async () => {
    setIsLoading(true);
    setErrorMsg('');
    try {
      // 1. Fetch Profit and Loss Statement
      const plData = await api.finances.getPL();
      setPl(plData);

      // 2. Fetch configurations
      const config = await api.finances.getConfig();
      setVatRate(config.vatRate);
      setGracePeriod(config.gracePeriod);
      setPettyCashCap(config.pettyCashCap);

      // 3. Fetch Onboarding requests
      const requests = await api.onboarding.getRequests();
      setOnboardingRequests(requests);
    } catch (err: any) {
      console.warn('API error, falling back to local mocks:', err.message);
      // Fallback mocks
      setOnboardingRequests([
        { id: 'req-01', name: 'Mount Everest School', email: 'everest@edu.np', phone: '9841234567', status: 'PENDING' },
        { id: 'req-02', name: 'Lalitpur Academy', email: 'contact@lalitpur.edu.np', phone: '9801234567', status: 'APPROVED' }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const handleSaveConfigs = async () => {
    setSaveSuccess(false);
    setErrorMsg('');
    try {
      await api.finances.updateConfig(vatRate, gracePeriod, pettyCashCap);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save configurations');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '24px', fontWeight: 700 }}>Enterprise Financial Center</h2>
          <p style={{ color: 'var(--text-muted-foreground)', fontSize: '14px', marginTop: '4px' }}>
            Aggregated views across all secondary centers in Nepal
          </p>
        </div>
        <Button variant="outline" onClick={loadDashboardData} disabled={isLoading} style={{ height: '40px' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>refresh</span>
          Sync Data
        </Button>
      </div>

      {isLoading && (
        <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted-foreground)' }}>
          <span className="material-symbols-outlined" style={{ animation: 'spin 2s linear infinite', fontSize: '32px' }}>sync</span>
          <p style={{ marginTop: '8px' }}>Syncing with tenant backend database...</p>
        </div>
      )}

      {/* P&L Widget */}
      <Card hoverable={false}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 600 }}>Corporate Profit & Loss Statement (NPR)</h3>
          <span style={{ padding: '6px 12px', background: 'var(--border-border)', borderRadius: '20px', fontSize: '12px', fontWeight: 600 }}>
            {pl.month}
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px' }}>
          <div style={{ background: 'rgba(55, 178, 77, 0.08)', padding: '20px', borderRadius: 'var(--radius-md)', border: '1px solid rgba(55, 178, 77, 0.2)' }}>
            <p style={{ color: 'var(--text-muted-foreground)', fontSize: '13px', fontWeight: 600 }}>AGGREGATED REVENUE</p>
            <p style={{ fontSize: '28px', fontWeight: 700, color: '#37b24d', marginTop: '8px' }}>NPR {pl.revenue.toLocaleString()}</p>
            <p style={{ fontSize: '11px', color: 'var(--text-muted-foreground)', marginTop: '4px' }}>Invoices + Canteen Reloads</p>
          </div>

          <div style={{ background: 'rgba(214, 48, 49, 0.08)', padding: '20px', borderRadius: 'var(--radius-md)', border: '1px solid rgba(214, 48, 49, 0.2)' }}>
            <p style={{ color: 'var(--text-muted-foreground)', fontSize: '13px', fontWeight: 600 }}>OPERATING COSTS & SALARIES</p>
            <p style={{ fontSize: '28px', fontWeight: 700, color: '#d63031', marginTop: '8px' }}>NPR {pl.operatingCosts.toLocaleString()}</p>
            <p style={{ fontSize: '11px', color: 'var(--text-muted-foreground)', marginTop: '4px' }}>Expenses + Payrolls + Cash Releases</p>
          </div>

          <div style={{ background: 'var(--primary-gradient)', padding: '20px', borderRadius: 'var(--radius-md)', color: '#fff' }}>
            <p style={{ opacity: 0.8, fontSize: '13px', fontWeight: 600 }}>NET SYSTEM MARGIN</p>
            <p style={{ fontSize: '28px', fontWeight: 700, marginTop: '8px' }}>NPR {pl.netMargin.toLocaleString()}</p>
            <p style={{ fontSize: '11px', opacity: 0.8, marginTop: '4px' }}>Net Profit Surplus</p>
          </div>
        </div>
      </Card>

      {/* Global Configuration settings */}
      <Card hoverable={false}>
        <h3 style={{ marginBottom: '20px', fontSize: '18px', fontWeight: 600 }}>Global Policy Settings</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '24px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '14px', fontWeight: 600 }}>Standard VAT Percentage</label>
            <input
              type="number"
              value={vatRate}
              onChange={(e) => setVatRate(Number(e.target.value))}
              style={{
                padding: '12px 16px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-border)',
                background: 'var(--bg-background)',
                color: 'var(--text-foreground)',
                fontFamily: 'inherit'
              }}
            />
            <p style={{ fontSize: '11px', color: 'var(--text-muted-foreground)' }}>Required for Nepalese VAT Compliancy.</p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '14px', fontWeight: 600 }}>Grace Period (Minutes)</label>
            <input
              type="number"
              value={gracePeriod}
              onChange={(e) => setGracePeriod(Number(e.target.value))}
              style={{
                padding: '12px 16px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-border)',
                background: 'var(--bg-background)',
                color: 'var(--text-foreground)',
                fontFamily: 'inherit'
              }}
            />
            <p style={{ fontSize: '11px', color: 'var(--text-muted-foreground)' }}>Buffer time before automatic mark out.</p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '14px', fontWeight: 600 }}>Monthly Petty Cash Limit (NPR)</label>
            <input
              type="number"
              value={pettyCashCap}
              onChange={(e) => setPettyCashCap(Number(e.target.value))}
              style={{
                padding: '12px 16px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-border)',
                background: 'var(--bg-background)',
                color: 'var(--text-foreground)',
                fontFamily: 'inherit'
              }}
            />
            <p style={{ fontSize: '11px', color: 'var(--text-muted-foreground)' }}>Resets automatically on the 1st of each month.</p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '16px', alignItems: 'center', marginTop: '24px' }}>
          <Button onClick={handleSaveConfigs}>
            Save Configurations
          </Button>
          {saveSuccess && (
            <span style={{ color: '#37b24d', fontSize: '14px', fontWeight: 600 }}>
              ✅ Settings synchronized successfully!
            </span>
          )}
          {errorMsg && (
            <span style={{ color: '#d63031', fontSize: '14px', fontWeight: 600 }}>
              ❌ {errorMsg}
            </span>
          )}
        </div>
      </Card>

      {/* Onboarding Requests Queue */}
      <Card hoverable={false}>
        <h3 style={{ marginBottom: '16px', fontSize: '18px', fontWeight: 600 }}>Tenant Institution Onboarding Requests</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {onboardingRequests.length === 0 ? (
            <p style={{ color: 'var(--text-muted-foreground)', fontSize: '14px', textAlign: 'center', padding: '16px' }}>
              No pending onboarding requests found.
            </p>
          ) : (
            onboardingRequests.map((req) => (
              <div
                key={req.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '16px',
                  border: '1px solid var(--border-border)',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-background)'
                }}
              >
                <div>
                  <p style={{ fontWeight: 600, fontSize: '15px' }}>{req.name}</p>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted-foreground)', marginTop: '2px' }}>
                    Email: {req.email} | Phone: {req.phone}
                  </p>
                </div>
                <span
                  style={{
                    padding: '4px 12px',
                    borderRadius: '20px',
                    fontSize: '11px',
                    fontWeight: 600,
                    background: req.status === 'PENDING' ? 'rgba(245, 159, 0, 0.12)' : 'rgba(55, 178, 77, 0.12)',
                    color: req.status === 'PENDING' ? '#f59f00' : '#37b24d'
                  }}
                >
                  {req.status}
                </span>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}
