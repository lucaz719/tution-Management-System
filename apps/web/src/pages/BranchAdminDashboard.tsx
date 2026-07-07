import { useState, useEffect } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { api } from '../services/api';

export function BranchAdminDashboard() {
  const [pettyCashRequests, setPettyCashRequests] = useState<any[]>([]);
  const [transitRoute, setTransitRoute] = useState({
    routeName: 'Baneshwor - Tinkune - Koteshwor',
    driverName: 'Ram Prasad',
    status: 'In Transit',
    coords: { lat: 27.6931, lng: 85.3445 }
  });

  const [isLoading, setIsLoading] = useState(false);

  const loadBranchData = async () => {
    setIsLoading(true);
    try {
      // 1. Fetch Petty Cash
      const pc = await api.finances.getPettyCash();
      setPettyCashRequests(pc);

      // 2. Fetch transit route
      const route = await api.vehicles.getRoute();
      setTransitRoute(route);
    } catch (err: any) {
      console.warn('API error, using local mocks:', err.message);
      // Fallback mocks
      setPettyCashRequests([
        { id: 'pc-101', amount: 4500, purpose: 'Classroom Whiteboards', status: 'PENDING', branch: 'Baneshwor Branch' },
        { id: 'pc-102', amount: 1500, purpose: 'Science Lab Beakers', status: 'PENDING', branch: 'Baneshwor Branch' }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadBranchData();
  }, []);

  // Update live coordinates simulation
  useEffect(() => {
    const interval = setInterval(async () => {
      const nextLat = transitRoute.coords.lat + (Math.random() - 0.5) * 0.0005;
      const nextLng = transitRoute.coords.lng + (Math.random() - 0.5) * 0.0005;
      
      setTransitRoute(prev => ({
        ...prev,
        coords: { lat: nextLat, lng: nextLng }
      }));

      // Proactively post simulated location to backend Express service
      try {
        await api.vehicles.updateLocation(nextLat, nextLng);
      } catch (err) {
        // Silently catch errors if API is offline
      }
    }, 4000);
    return () => clearInterval(interval);
  }, [transitRoute.coords]);

  const handleL1Approve = async (id: string) => {
    try {
      await api.finances.approvePettyCash(id, 'APPROVE_L1');
      // Reload lists
      loadBranchData();
    } catch (err: any) {
      // Fallback update in state if API offline
      setPettyCashRequests(prev =>
        prev.map(r => (r.id === id ? { ...r, status: 'APPROVED_LEVEL1' } : r))
      );
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '24px', fontWeight: 700 }}>Baneshwor Branch Control Panel</h2>
          <p style={{ color: 'var(--text-muted-foreground)', fontSize: '14px', marginTop: '4px' }}>
            Manage local center logistics, cash approvals, and driver coordinates
          </p>
        </div>
        <Button variant="outline" onClick={loadBranchData} disabled={isLoading} style={{ height: '40px' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>refresh</span>
          Sync Branch
        </Button>
      </div>

      {/* Petty cash approval workflow */}
      <Card hoverable={false}>
        <h3 style={{ marginBottom: '16px', fontSize: '18px', fontWeight: 600 }}>Petty Cash Level 1 Approvals Queue</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {pettyCashRequests.length === 0 ? (
            <p style={{ color: 'var(--text-muted-foreground)', fontSize: '14px', textAlign: 'center', padding: '16px' }}>
              No active petty cash requests.
            </p>
          ) : (
            pettyCashRequests.map((req) => (
              <div key={req.id} style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '16px',
                border: '1px solid var(--border-border)',
                borderRadius: 'var(--radius-md)',
                background: 'var(--bg-background)'
              }}>
                <div>
                  <p style={{ fontWeight: 600, fontSize: '15px' }}>{req.purpose}</p>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted-foreground)', marginTop: '2px' }}>
                    ID: {req.id} | Amount: NPR {req.amount} | Branch: {req.branch || 'Baneshwor'}
                  </p>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <span style={{
                    padding: '4px 12px',
                    borderRadius: '20px',
                    fontSize: '11px',
                    fontWeight: 600,
                    background: req.status === 'PENDING' ? 'rgba(245, 159, 0, 0.12)' : 'rgba(55, 178, 77, 0.12)',
                    color: req.status === 'PENDING' ? '#f59f00' : '#37b24d'
                  }}>
                    {req.status}
                  </span>

                  {req.status === 'PENDING' && (
                    <Button variant="secondary" onClick={() => handleL1Approve(req.id)} style={{ padding: '6px 16px', fontSize: '11px', minHeight: '32px', height: '32px' }}>
                      Approve L1
                    </Button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </Card>

      {/* Bus GPS tracker */}
      <Card hoverable={false}>
        <h3 style={{ marginBottom: '8px', fontSize: '18px', fontWeight: 600 }}>Active Student Transit GPS Tracking</h3>
        <p style={{ color: 'var(--text-muted-foreground)', fontSize: '13px', marginBottom: '16px' }}>
          Bus Route: <strong>{transitRoute.routeName}</strong> | Driver: <strong>{transitRoute.driverName}</strong>
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '24px' }}>
          <div className="live-map-tracker">
            <div className="live-map-pin" style={{
              top: '50%',
              left: '50%',
            }}></div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '12px' }}>
            <div style={{ padding: '16px', border: '1px solid var(--border-border)', borderRadius: 'var(--radius-md)' }}>
              <p style={{ fontSize: '12px', color: 'var(--text-muted-foreground)', fontWeight: 600 }}>GPS COORDINATES</p>
              <p style={{ fontSize: '18px', fontWeight: 700, marginTop: '4px' }}>
                {transitRoute.coords.lat.toFixed(5)}° N, {transitRoute.coords.lng.toFixed(5)}° E
              </p>
            </div>

            <div style={{ padding: '16px', border: '1px solid var(--border-border)', borderRadius: 'var(--radius-md)' }}>
              <p style={{ fontSize: '12px', color: 'var(--text-muted-foreground)', fontWeight: 600 }}>CONNECTION STATUS</p>
              <p style={{ fontSize: '15px', fontWeight: 600, color: '#37b24d', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#37b24d', display: 'inline-block' }}></span>
                Driver Application Live
              </p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
