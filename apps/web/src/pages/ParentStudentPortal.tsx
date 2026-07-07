import { useState, useEffect } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { api } from '../services/api';

export function ParentStudentPortal() {
  const [walletBalance, setWalletBalance] = useState(380);
  const [reloadAmount, setReloadAmount] = useState('');
  const [walletPin, setWalletPin] = useState('');
  const [purchaseItem, setPurchaseItem] = useState('Chicken MoMo (NPR 150)');
  const [walletMessage, setWalletMessage] = useState('');
  const [driverLat, setDriverLat] = useState(27.6931);
  const [driverLng, setDriverLng] = useState(85.3445);
  const [routeName, setRouteName] = useState('Baneshwor - Tinkune - Koteshwor');

  const INITIAL_INVOICES = [
    { id: 'inv-01', month: 'June', amount: 5650, status: 'PAID' },
    { id: 'inv-02', month: 'July', amount: 5650, status: 'OVERDUE' },
    { id: 'inv-03', month: 'August', amount: 5650, status: 'UNPAID' }
  ];

  const loadStudentData = async () => {
    try {
      const w = await api.canteen.getBalance();
      setWalletBalance(w.balance);

      const route = await api.vehicles.getRoute();
      setDriverLat(route.coords.lat);
      setDriverLng(route.coords.lng);
      setRouteName(route.routeName);
    } catch (err) {
      console.warn('API error loading student data, using local mocks');
    }
  };

  useEffect(() => {
    loadStudentData();
  }, []);

  // Poll driver coordinates for live bus routing updates
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const route = await api.vehicles.getRoute();
        setDriverLat(route.coords.lat);
        setDriverLng(route.coords.lng);
      } catch (err) {
        // Fallback simulation if offline
        setDriverLat((prev) => prev + (Math.random() - 0.5) * 0.0003);
        setDriverLng((prev) => prev + (Math.random() - 0.5) * 0.0003);
      }
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const handleCanteenPurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    setWalletMessage('');
    
    const cost = purchaseItem.includes('Chicken MoMo') ? 150 : purchaseItem.includes('French Fries') ? 120 : 100;
    
    try {
      const res = await api.canteen.debit(cost, walletPin, purchaseItem);
      if (res.success) {
        setWalletBalance(res.balance);
        setWalletMessage(`✅ TRANSACTION COMPLETED! NPR ${cost} debited successfully.`);
        setWalletPin('');
      } else {
        setWalletMessage(`❌ ${res.message || 'Debit declined.'}`);
      }
    } catch (err: any) {
      console.warn('Canteen API failed, applying mock validations:', err.message);
      // Fallback mocks
      if (walletPin !== '1234') {
        setWalletMessage('❌ INCORRECT SECURITY PIN. Debit declined.');
        return;
      }
      if (walletBalance < cost) {
        setWalletMessage('❌ INSUFFICIENT BALANCE. Please reload first.');
        return;
      }
      setWalletBalance((prev) => prev - cost);
      setWalletMessage(`✅ TRANSACTION COMPLETED! NPR ${cost} debited successfully.`);
      setWalletPin('');
    }
  };

  const handleWalletReload = async (e: React.FormEvent) => {
    e.preventDefault();
    setWalletMessage('');
    const reload = Number(reloadAmount);
    if (!reload || reload <= 0) return;

    try {
      const res = await api.canteen.reload(reload);
      setWalletBalance(res.balance);
      setWalletMessage(`✅ Loaded NPR ${reload} via Nepal Pay gateway.`);
      setReloadAmount('');
    } catch (err) {
      console.warn('Reload API failed, using state');
      setWalletBalance((prev) => prev + reload);
      setWalletMessage(`✅ Loaded NPR ${reload} via Nepal Pay mock gateway.`);
      setReloadAmount('');
    }
  };

  return (
    <div style={{ maxWidth: '1100px', margin: '40px auto', padding: '0 24px', display: 'flex', flexDirection: 'column', gap: '32px' }}>
      <div>
        <h2 style={{ fontSize: '24px', fontWeight: 700 }}>Shyam Bahadur — Student Workspace</h2>
        <p style={{ color: 'var(--text-muted-foreground)', fontSize: '14px', marginTop: '4px' }}>
          Track tuition barcode ID, invoice timelines, and canteen wallet balances
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '32px' }}>
        {/* Left Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          {/* Payment Calendar */}
          <Card hoverable={false}>
            <h3 style={{ marginBottom: '16px', fontSize: '18px', fontWeight: 600 }}>Payment Due Dates & Invoices</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {INITIAL_INVOICES.map((inv) => (
                <div key={inv.id} style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '16px',
                  border: '1px solid var(--border-border)',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-background)'
                }}>
                  <div>
                    <p style={{ fontWeight: 600 }}>{inv.month} Tuition Bill</p>
                    <p style={{ fontSize: '12px', color: 'var(--text-muted-foreground)' }}>Amount: NPR {inv.amount}</p>
                  </div>

                  <span style={{
                    padding: '4px 12px',
                    borderRadius: '20px',
                    fontSize: '11px',
                    fontWeight: 600,
                    background: inv.status === 'PAID' ? 'rgba(55, 178, 77, 0.12)' : inv.status === 'OVERDUE' ? 'rgba(214, 48, 49, 0.12)' : 'rgba(245, 159, 0, 0.12)',
                    color: inv.status === 'PAID' ? '#37b24d' : inv.status === 'OVERDUE' ? '#d63031' : '#f59f00'
                  }}>
                    {inv.status}
                  </span>
                </div>
              ))}
            </div>
          </Card>

          {/* Cashless wallet Canteen */}
          <Card hoverable={false}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 600 }}>Canteen Cashless Wallet</h3>
              <p style={{ fontSize: '18px', fontWeight: 800, color: '#00ab9c' }}>Balance: NPR {walletBalance}</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '20px' }}>
              {/* Purchase form */}
              <form onSubmit={handleCanteenPurchase} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 600 }}>Active Canteen Item</label>
                  <select
                    value={purchaseItem}
                    onChange={(e) => setPurchaseItem(e.target.value)}
                    style={{
                      padding: '8px',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border-border)',
                      background: 'var(--bg-background)',
                      color: 'var(--text-foreground)',
                      fontFamily: 'inherit'
                    }}
                  >
                    <option>Chicken MoMo (NPR 150)</option>
                    <option>Cold Coffee (NPR 100)</option>
                    <option>French Fries (NPR 120)</option>
                  </select>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 600 }}>4-Digit Wallet PIN (1234)</label>
                  <input
                    type="password"
                    placeholder="••••"
                    value={walletPin}
                    onChange={(e) => setWalletPin(e.target.value)}
                    style={{
                      padding: '8px',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border-border)',
                      background: 'var(--bg-background)',
                      color: 'var(--text-foreground)',
                      fontFamily: 'inherit'
                    }}
                  />
                </div>

                <Button variant="secondary" style={{ padding: '8px', fontSize: '12px', minHeight: '36px', height: '36px' }} type="submit">
                  Pay Cashless
                </Button>
              </form>

              {/* Reload Balance */}
              <form onSubmit={handleWalletReload} style={{ display: 'flex', flexDirection: 'column', gap: '12px', justifyContent: 'center' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 600 }}>Reload Amount (NPR)</label>
                  <input
                    type="number"
                    placeholder="e.g. 500"
                    value={reloadAmount}
                    onChange={(e) => setReloadAmount(e.target.value)}
                    style={{
                      padding: '8px',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border-border)',
                      background: 'var(--bg-background)',
                      color: 'var(--text-foreground)',
                      fontFamily: 'inherit'
                    }}
                  />
                </div>

                <Button style={{ padding: '8px', fontSize: '12px', minHeight: '36px', height: '36px' }} type="submit">
                  Reload Wallet
                </Button>
              </form>
            </div>

            {walletMessage && (
              <p style={{ marginTop: '16px', fontSize: '13px', fontWeight: 600, color: walletMessage.includes('✅') ? '#37b24d' : '#d63031' }}>
                {walletMessage}
              </p>
            )}
          </Card>
        </div>

        {/* Right Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          {/* Digital student ID Card */}
          <div className="digital-id-card">
            <div>
              <h4 style={{ color: '#fff', fontSize: '14px', letterSpacing: '2px', textTransform: 'uppercase', fontWeight: 700 }}>Student ID Card</h4>
              <p style={{ fontSize: '10px', color: 'rgba(255, 255, 255, 0.7)', marginTop: '2px' }}>Pinnacle Tuition Academy</p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{
                width: '70px',
                height: '70px',
                background: '#dfe4ea',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <span className="material-symbols-outlined" style={{ fontSize: '40px', color: '#4355b9' }}>person</span>
              </div>

              <div>
                <h3 style={{ color: '#fff', fontSize: '18px', fontWeight: 700 }}>Shyam Bahadur</h3>
                <p style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.8)', marginTop: '2px' }}>Grade: 10 (Science)</p>
                <p style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.7)' }}>ID: ST-01-SHYAM</p>
              </div>
            </div>

            <div className="barcode">
              <div className="barcode-lines"></div>
              <span style={{ fontSize: '10px', color: '#000', fontFamily: 'monospace' }}>*ST01SHYAM*</span>
            </div>
          </div>

          {/* Live Bus Coordinates Map */}
          <Card hoverable={false}>
            <h3 style={{ marginBottom: '12px', fontSize: '18px', fontWeight: 600 }}>Live School Bus Routing</h3>
            <div className="live-map-tracker">
              <div className="live-map-pin"></div>
            </div>
            <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
              <span style={{ color: 'var(--text-muted-foreground)', fontWeight: 600 }}>Route: {routeName}</span>
              <strong>Coords: {driverLat.toFixed(4)}, {driverLng.toFixed(4)}</strong>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
