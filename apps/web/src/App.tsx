import React, { useState, useEffect } from 'react';
import './App.css';

type RoleType = 'LOGIN' | 'TENANT_ADMIN' | 'BRANCH_ADMIN' | 'TEACHER' | 'PARENT_STUDENT';

// Mock DB Initial states
const INITIAL_INVOICES = [
  { id: 'inv-01', month: 'June', amount: 5650, status: 'PAID' },
  { id: 'inv-02', month: 'July', amount: 5650, status: 'OVERDUE' },
  { id: 'inv-03', month: 'August', amount: 5650, status: 'UNPAID' }
];

export default function App() {
  const [userRole, setUserRole] = useState<RoleType>('LOGIN');
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  // Credentials form
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  // Tenant Admin States
  const [vatRate, setVatRate] = useState(13);
  const [gracePeriod, setGracePeriod] = useState(15);
  const [pettyCashCap, setPettyCashCap] = useState(20000);
  const [showConfigToast, setShowConfigToast] = useState(false);

  // Branch Admin States - Petty cash L1 review queue
  const [pettyCashRequests, setPettyCashRequests] = useState([
    { id: 'pc-101', amount: 4500, purpose: 'Classroom Whiteboards', status: 'PENDING', branch: 'Baneshwor Branch' },
    { id: 'pc-102', amount: 1500, purpose: 'Science Lab Beakers', status: 'PENDING', branch: 'Baneshwor Branch' }
  ]);
  const [driverLat, setDriverLat] = useState(27.6931);
  const [driverLng, setDriverLng] = useState(85.3445);

  // Teacher States
  const [teacherCheckedIn, setTeacherCheckedIn] = useState(false);
  const [geoStatus, setGeoStatus] = useState<'IDLE' | 'CHECKING' | 'SUCCESS' | 'OUT_OF_BOUNDS'>('IDLE');
  const [lessonSummary, setLessonSummary] = useState('');
  const [dailyUpdateSubmitted, setDailyUpdateSubmitted] = useState(false);
  const [lockoutAlert, setLockoutAlert] = useState(false);
  const [teacherMessage, setTeacherMessage] = useState('');
  const [teacherChatHistory, setTeacherChatHistory] = useState([
    { sender: 'Parent', text: 'Namaste sir, will there be an extra math class this Friday?' },
    { sender: 'Teacher', text: 'Namaste! Yes, we have scheduled a review session at 3 PM.' }
  ]);

  // Parent/Student States
  const [walletBalance, setWalletBalance] = useState(380);
  const [reloadAmount, setReloadAmount] = useState('');
  const [walletPin, setWalletPin] = useState('');
  const [purchaseItem, setPurchaseItem] = useState('Chicken MoMo (NPR 150)');
  const [walletMessage, setWalletMessage] = useState('');
  const invoices = INITIAL_INVOICES;

  // Driver GPS coordinate simulation (updates coordinates dynamically)
  useEffect(() => {
    const interval = setInterval(() => {
      setDriverLat((prev) => prev + (Math.random() - 0.5) * 0.0005);
      setDriverLng((prev) => prev + (Math.random() - 0.5) * 0.0005);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(nextTheme);
    document.documentElement.setAttribute('data-theme', nextTheme);
  };

  // Quick fill credential helper
  const handleQuickSelect = (role: RoleType) => {
    if (role === 'TENANT_ADMIN') {
      setEmail('admin@pinnacle.edu.np');
      setPassword('PinnacleAdmin777!');
    } else if (role === 'BRANCH_ADMIN') {
      setEmail('branch-admin@pinnacle.edu.np');
      setPassword('BaneshworAdmin888!');
    } else if (role === 'TEACHER') {
      setEmail('shyam@pinnacle.edu.np');
      setPassword('PhysicsPass999!');
    } else if (role === 'PARENT_STUDENT') {
      setEmail('parent.shyam@gmail.com');
      setPassword('ShyamParent123!');
    }
  };

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setLoginError('Please enter both email and password.');
      return;
    }
    if (email.includes('admin@pinnacle')) {
      setUserRole('TENANT_ADMIN');
    } else if (email.includes('branch-admin')) {
      setUserRole('BRANCH_ADMIN');
    } else if (email.includes('shyam@pinnacle')) {
      setUserRole('TEACHER');
    } else {
      setUserRole('PARENT_STUDENT');
    }
    setLoginError('');
  };

  // L1 Petty cash approval
  const handleL1Approve = (id: string) => {
    setPettyCashRequests((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: 'APPROVED_LEVEL1' } : r))
    );
  };

  // Teacher Mark IN with update gate validation
  const handleTeacherMarkIn = () => {
    if (!dailyUpdateSubmitted && teacherCheckedIn) {
      setLockoutAlert(true);
      return;
    }
    setGeoStatus('CHECKING');
    setTimeout(() => {
      setGeoStatus('SUCCESS');
      setTeacherCheckedIn(true);
      setLockoutAlert(false);
    }, 1000);
  };

  const handleTeacherMarkOut = () => {
    setTeacherCheckedIn(false);
    setGeoStatus('IDLE');
  };

  const handleLessonUpdateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!lessonSummary) return;
    setDailyUpdateSubmitted(true);
    setLockoutAlert(false);
    alert('Daily Class summary submitted. Log lockouts cleared!');
  };

  const handleSendTeacherMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!teacherMessage) return;
    setTeacherChatHistory((prev) => [...prev, { sender: 'Teacher', text: teacherMessage }]);
    setTeacherMessage('');
  };

  // Cashless wallet canteen payment simulation
  const handleCanteenPurchase = (e: React.FormEvent) => {
    e.preventDefault();
    if (walletPin !== '1234') {
      setWalletMessage('❌ INCORRECT SECURITY PIN. Debit declined.');
      return;
    }
    const cost = 150;
    if (walletBalance < cost) {
      setWalletMessage('❌ INSUFFICIENT BALANCE. Please reload first.');
      return;
    }
    setWalletBalance((prev) => prev - cost);
    setWalletMessage('✅ TRANSACTION COMPLETED! NPR 150 debited successfully.');
    setWalletPin('');
  };

  const handleWalletReload = (e: React.FormEvent) => {
    e.preventDefault();
    const reload = Number(reloadAmount);
    if (!reload || reload <= 0) return;
    setWalletBalance((prev) => prev + reload);
    setReloadAmount('');
    setWalletMessage(`✅ Loaded NPR ${reload} via Nepal Pay mock gateway.`);
  };

  return (
    <div className="fade-in">
      {/* Top App Bar */}
      <header style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '16px 32px',
        background: 'var(--panel-bg)',
        backdropFilter: 'blur(16px)',
        borderBottom: '1px solid var(--border)',
        position: 'sticky',
        top: 0,
        zIndex: 100
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '32px', color: '#4355b9' }}>school</span>
          <div>
            <h1 style={{ fontSize: '20px', fontWeight: 800, letterSpacing: '-0.5px' }}>Tuition Management System</h1>
            <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Multi-Tenant Institution Dashboard</p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button className="btn" style={{
            padding: '8px 16px',
            fontSize: '12px',
            background: 'var(--border)',
            color: 'var(--text)'
          }} onClick={toggleTheme}>
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
              {theme === 'light' ? 'dark_mode' : 'light_mode'}
            </span>
            {theme === 'light' ? 'Dark' : 'Light'}
          </button>

          {userRole !== 'LOGIN' && (
            <button className="btn btn-danger" style={{ padding: '8px 16px', fontSize: '12px' }} onClick={() => setUserRole('LOGIN')}>
              Logout
            </button>
          )}
        </div>
      </header>

      {/* Main View Port */}
      {userRole === 'LOGIN' && (
        <div style={{
          maxWidth: '850px',
          margin: '60px auto',
          display: 'grid',
          gridTemplateColumns: '1.2fr 1fr',
          gap: '32px',
          padding: '0 24px'
        }}>
          {/* Quick Select Panel */}
          <div className="tms-panel" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <h3 style={{ fontSize: '22px' }}>Explore Demo Portals</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
              Select a pre-configured organizational role to instantly load its operational dashboard.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <button className="nav-link" onClick={() => { handleQuickSelect('TENANT_ADMIN'); setEmail('admin@pinnacle.edu.np'); }}>
                <span className="material-symbols-outlined" style={{ color: '#4355b9' }}>domain</span>
                <div style={{ textAlign: 'left' }}>
                  <p style={{ fontWeight: 600 }}>Tenant Corporate Admin</p>
                  <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Institutional P&L & Global Policy controls</p>
                </div>
              </button>

              <button className="nav-link" onClick={() => { handleQuickSelect('BRANCH_ADMIN'); setEmail('branch-admin@pinnacle.edu.np'); }}>
                <span className="material-symbols-outlined" style={{ color: '#00ab9c' }}>location_away</span>
                <div style={{ textAlign: 'left' }}>
                  <p style={{ fontWeight: 600 }}>Branch Admin (Baneshwor)</p>
                  <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Petty Cash approvals & Vehicle Transit tracking</p>
                </div>
              </button>

              <button className="nav-link" onClick={() => { handleQuickSelect('TEACHER'); setEmail('shyam@pinnacle.edu.np'); }}>
                <span className="material-symbols-outlined" style={{ color: '#f59f00' }}>account_circle</span>
                <div style={{ textAlign: 'left' }}>
                  <p style={{ fontWeight: 600 }}>Teacher Portal (Shyam Physics)</p>
                  <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Geo-attendance, Lesson gates & parent chat</p>
                </div>
              </button>

              <button className="nav-link" onClick={() => { handleQuickSelect('PARENT_STUDENT'); setEmail('parent.shyam@gmail.com'); }}>
                <span className="material-symbols-outlined" style={{ color: '#ff6b6b' }}>family_restroom</span>
                <div style={{ textAlign: 'left' }}>
                  <p style={{ fontWeight: 600 }}>Student & Parent Portal</p>
                  <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Digital ID barcode, payment calendars & cashless wallet</p>
                </div>
              </button>
            </div>
          </div>

          {/* Core Login Form */}
          <div className="tms-panel" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <h2 style={{ fontSize: '26px', marginBottom: '8px' }}>Sign In</h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: '24px', fontSize: '14px' }}>Access your Tuition Center workspace</p>

            <form onSubmit={handleLoginSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '13px', fontWeight: 600 }}>Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@institution.edu.np"
                  style={{
                    padding: '12px 16px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border)',
                    background: 'var(--bg)',
                    color: 'var(--text)',
                    fontFamily: 'inherit'
                  }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '13px', fontWeight: 600 }}>Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  style={{
                    padding: '12px 16px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border)',
                    background: 'var(--bg)',
                    color: 'var(--text)',
                    fontFamily: 'inherit'
                  }}
                />
              </div>

              {loginError && <p style={{ color: '#d63031', fontSize: '13px' }}>{loginError}</p>}

              <button className="btn btn-primary" type="submit" style={{ width: '100%', marginTop: '8px' }}>
                Authenticate
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Tenant Admin Dashboard */}
      {userRole === 'TENANT_ADMIN' && (
        <div className="dashboard-grid">
          {/* Sidebar */}
          <aside className="sidebar">
            <h3 style={{ fontSize: '18px', fontWeight: 800 }}>Pinnacle Academy</h3>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '-24px' }}>Tenant Admin Panel</p>
            <ul className="nav-links">
              <li className="nav-link active">
                <span className="material-symbols-outlined">dashboard</span>
                Dashboard
              </li>
              <li className="nav-link">
                <span className="material-symbols-outlined">payments</span>
                Fee Rules
              </li>
              <li className="nav-link">
                <span className="material-symbols-outlined">analytics</span>
                P&L Statement
              </li>
            </ul>
          </aside>

          {/* Main content area */}
          <main style={{ padding: '40px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
              <div>
                <h2>Enterprise Financial Center</h2>
                <p style={{ color: 'var(--text-muted)' }}>Aggregated views across all secondary centers in Nepal</p>
              </div>
            </div>

            {/* P&L Widget */}
            <div className="tms-panel" style={{ marginBottom: '32px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h3>Corporate Profit & Loss Statement (NPR)</h3>
                <span style={{ padding: '6px 12px', background: 'var(--border)', borderRadius: '20px', fontSize: '12px' }}>July 2026</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
                <div style={{ background: 'rgba(55, 178, 77, 0.08)', padding: '20px', borderRadius: 'var(--radius-md)', border: '1px solid rgba(55, 178, 77, 0.2)' }}>
                  <p style={{ color: 'var(--text-muted)', fontSize: '13px', fontWeight: 600 }}>AGGREGATED REVENUE</p>
                  <p style={{ fontSize: '28px', fontWeight: 700, color: '#37b24d', marginTop: '8px' }}>NPR 265,000</p>
                  <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>Invoices + Canteen Reloads</p>
                </div>

                <div style={{ background: 'rgba(214, 48, 49, 0.08)', padding: '20px', borderRadius: 'var(--radius-md)', border: '1px solid rgba(214, 48, 49, 0.2)' }}>
                  <p style={{ color: 'var(--text-muted)', fontSize: '13px', fontWeight: 600 }}>OPERATING COSTS & SALARIES</p>
                  <p style={{ fontSize: '28px', fontWeight: 700, color: '#d63031', marginTop: '8px' }}>NPR 217,000</p>
                  <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>Expenses + Payrolls + Cash Releases</p>
                </div>

                <div style={{ background: 'var(--primary-gradient)', padding: '20px', borderRadius: 'var(--radius-md)', color: '#fff' }}>
                  <p style={{ opacity: 0.8, fontSize: '13px', fontWeight: 600 }}>NET SYSTEM MARGIN</p>
                  <p style={{ fontSize: '28px', fontWeight: 700, marginTop: '8px' }}>NPR 48,000</p>
                  <p style={{ fontSize: '11px', opacity: 0.8, marginTop: '4px' }}>Net Profit Surplus</p>
                </div>
              </div>
            </div>

            {/* Institution configuration policies */}
            <div className="tms-panel">
              <h3 style={{ marginBottom: '20px' }}>Global Policy Settings</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '14px', fontWeight: 600 }}>Standard VAT Percentage</label>
                  <input
                    type="number"
                    value={vatRate}
                    onChange={(e) => setVatRate(Number(e.target.value))}
                    style={{ padding: '10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)' }}
                  />
                  <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Required for Nepalese VAT Compliancy.</p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '14px', fontWeight: 600 }}>Grace Period (Minutes)</label>
                  <input
                    type="number"
                    value={gracePeriod}
                    onChange={(e) => setGracePeriod(Number(e.target.value))}
                    style={{ padding: '10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)' }}
                  />
                  <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Buffer time before automatic mark out.</p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '14px', fontWeight: 600 }}>Monthly Petty Cash Limit (NPR)</label>
                  <input
                    type="number"
                    value={pettyCashCap}
                    onChange={(e) => setPettyCashCap(Number(e.target.value))}
                    style={{ padding: '10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)' }}
                  />
                  <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Resets automatically on the 1st.</p>
                </div>
              </div>

              <button className="btn btn-primary" style={{ marginTop: '24px' }} onClick={() => { setShowConfigToast(true); setTimeout(() => setShowConfigToast(false), 3000); }}>
                Save Configurations
              </button>

              {showConfigToast && (
                <p style={{ color: '#37b24d', fontSize: '14px', marginTop: '12px', fontWeight: 600 }}>
                  ✅ Settings saved and synchronized across all branches!
                </p>
              )}
            </div>
          </main>
        </div>
      )}

      {/* Branch Admin Dashboard */}
      {userRole === 'BRANCH_ADMIN' && (
        <div className="dashboard-grid">
          {/* Sidebar */}
          <aside className="sidebar">
            <h3 style={{ fontSize: '18px', fontWeight: 800 }}>Baneshwor Branch</h3>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '-24px' }}>Branch Manager Portal</p>
            <ul className="nav-links">
              <li className="nav-link active">
                <span className="material-symbols-outlined">dashboard</span>
                Center Dashboard
              </li>
              <li className="nav-link">
                <span className="material-symbols-outlined">local_shipping</span>
                Vehicle Tracker
              </li>
              <li className="nav-link">
                <span className="material-symbols-outlined">receipt_long</span>
                Petty Cash Logs
              </li>
            </ul>
          </aside>

          {/* Main content area */}
          <main style={{ padding: '40px', display: 'flex', flexDirection: 'column', gap: '32px' }}>
            <div>
              <h2>Baneshwor Branch Control Panel</h2>
              <p style={{ color: 'var(--text-muted)' }}>Manage local center logistics, cash approvals, and driver coordinates</p>
            </div>

            {/* Petty cash approval workflow */}
            <div className="tms-panel">
              <h3 style={{ marginBottom: '16px' }}>Petty Cash Level 1 Approvals Queue</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {pettyCashRequests.map((req) => (
                  <div key={req.id} style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '16px',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--bg)'
                  }}>
                    <div>
                      <p style={{ fontWeight: 600, fontSize: '15px' }}>{req.purpose}</p>
                      <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>ID: {req.id} | Amount: NPR {req.amount}</p>
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
                        <button className="btn btn-secondary" style={{ padding: '6px 16px', fontSize: '11px' }} onClick={() => handleL1Approve(req.id)}>
                          Approve L1
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Bus GPS tracker */}
            <div className="tms-panel">
              <h3 style={{ marginBottom: '8px' }}>Active Student Transit GPS Tracking</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '16px' }}>
                Bus Route: <strong>Baneshwor - Tinkune - Koteshwor</strong> | Driver: <strong>Ram Prasad</strong>
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '24px' }}>
                <div className="live-map-tracker">
                  <div className="live-map-pin"></div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '12px' }}>
                  <div style={{ padding: '16px', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}>
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>GPS COORDINATES</p>
                    <p style={{ fontSize: '18px', fontWeight: 700, marginTop: '4px' }}>
                      {driverLat.toFixed(5)}° N, {driverLng.toFixed(5)}° E
                    </p>
                  </div>

                  <div style={{ padding: '16px', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}>
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>CONNECTION STATUS</p>
                    <p style={{ fontSize: '15px', fontWeight: 600, color: '#37b24d', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#37b24d', display: 'inline-block' }}></span>
                      Driver Application Live
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </main>
        </div>
      )}

      {/* Teacher Dashboard */}
      {userRole === 'TEACHER' && (
        <div className="dashboard-grid">
          {/* Sidebar */}
          <aside className="sidebar">
            <h3 style={{ fontSize: '18px', fontWeight: 800 }}>Teacher Workspace</h3>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '-24px' }}>Shyam Bahadur (Physics)</p>
            <ul className="nav-links">
              <li className="nav-link active">
                <span className="material-symbols-outlined">schedule</span>
                My Classes
              </li>
              <li className="nav-link">
                <span className="material-symbols-outlined">chat_bubble</span>
                Parent Chats
              </li>
            </ul>
          </aside>

          {/* Main content area */}
          <main style={{ padding: '40px', display: 'flex', flexDirection: 'column', gap: '32px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2>Daily Academic Log</h2>
                <p style={{ color: 'var(--text-muted)' }}>
                  Verify attendance geofence and submit lesson update checks. (System Status: {geoStatus})
                </p>
              </div>

              <div>
                <button
                  className={`btn ${teacherCheckedIn ? 'btn-danger' : 'btn-primary'}`}
                  onClick={teacherCheckedIn ? handleTeacherMarkOut : handleTeacherMarkIn}
                >
                  <span className="material-symbols-outlined">
                    {teacherCheckedIn ? 'logout' : 'person_pin_circle'}
                  </span>
                  {teacherCheckedIn ? 'Mark OUT' : 'Mark IN'}
                </button>
              </div>
            </div>

            {/* Lockout Alert banner */}
            {lockoutAlert && (
              <div style={{
                background: 'rgba(214, 48, 49, 0.08)',
                border: '1px solid rgba(214, 48, 49, 0.3)',
                padding: '16px 24px',
                borderRadius: 'var(--radius-md)',
                color: '#d63031',
                fontWeight: 600,
                fontSize: '14px'
              }}>
                ⚠️ ATTENDANCE LOCKOUT DETECTED: You cannot mark attendance for today because your previous session's Daily Lesson update is still outstanding. Please submit the update below to clear this lockout.
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px' }}>
              {/* Daily verification form */}
              <div className="tms-panel">
                <h3 style={{ marginBottom: '16px' }}>Submit Daily Lesson Update</h3>
                <form onSubmit={handleLessonUpdateSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '13px', fontWeight: 600 }}>Lesson Summary & Homework Description</label>
                    <textarea
                      value={lessonSummary}
                      onChange={(e) => setLessonSummary(e.target.value)}
                      placeholder="Today we discussed Newton's laws of motion. Assigned problems 1-5 as homework."
                      style={{
                        padding: '12px',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--border)',
                        height: '100px',
                        fontFamily: 'inherit',
                        background: 'var(--bg)',
                        color: 'var(--text)',
                        resize: 'none'
                      }}
                    />
                  </div>

                  <button className="btn btn-primary" type="submit" disabled={dailyUpdateSubmitted}>
                    {dailyUpdateSubmitted ? 'Submitted' : 'Submit Summary'}
                  </button>
                </form>
              </div>

              {/* Messaging board */}
              <div className="tms-panel" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <h3 style={{ marginBottom: '16px' }}>Thread: Parent (Shyam Bahadur)</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '180px', overflowY: 'auto', paddingRight: '8px' }}>
                    {teacherChatHistory.map((chat, idx) => (
                      <div key={idx} style={{
                        alignSelf: chat.sender === 'Teacher' ? 'flex-end' : 'flex-start',
                        background: chat.sender === 'Teacher' ? 'var(--primary-gradient)' : 'var(--border)',
                        color: chat.sender === 'Teacher' ? '#fff' : 'var(--text)',
                        padding: '10px 14px',
                        borderRadius: 'var(--radius-md)',
                        maxWidth: '80%',
                        fontSize: '13px'
                      }}>
                        {chat.text}
                      </div>
                    ))}
                  </div>
                </div>

                <form onSubmit={handleSendTeacherMessage} style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
                  <input
                    type="text"
                    value={teacherMessage}
                    onChange={(e) => setTeacherMessage(e.target.value)}
                    placeholder="Type message..."
                    style={{
                      flexGrow: 1,
                      padding: '10px 16px',
                      borderRadius: '30px',
                      border: '1px solid var(--border)',
                      background: 'var(--bg)',
                      color: 'var(--text)',
                      fontFamily: 'inherit'
                    }}
                  />
                  <button className="btn btn-secondary" style={{ padding: '8px 16px' }} type="submit">
                    Send
                  </button>
                </form>
              </div>
            </div>
          </main>
        </div>
      )}

      {/* Parent & Student Portal */}
      {userRole === 'PARENT_STUDENT' && (
        <div style={{ maxWidth: '1100px', margin: '40px auto', padding: '0 24px', display: 'flex', flexDirection: 'column', gap: '32px' }}>
          <div>
            <h2>Shyam Bahadur — Student Workspace</h2>
            <p style={{ color: 'var(--text-muted)' }}>Track tuition barcode ID, invoice timelines, and canteen wallet balances</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '32px' }}>
            {/* Left Column */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
              {/* Payment Calendar */}
              <div className="tms-panel">
                <h3 style={{ marginBottom: '16px' }}>Payment Due Dates & Invoices</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {invoices.map((inv) => (
                    <div key={inv.id} style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '16px',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-md)',
                      background: 'var(--bg)'
                    }}>
                      <div>
                        <p style={{ fontWeight: 600 }}>{inv.month} Tuition Bill</p>
                        <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Amount: NPR {inv.amount}</p>
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
              </div>

              {/* Cashless wallet Canteen */}
              <div className="tms-panel">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <h3>Canteen Cashless Wallet</h3>
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
                        style={{ padding: '8px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)' }}
                      >
                        <option>Chicken MoMo (NPR 150)</option>
                        <option>Cold Coffee (NPR 100)</option>
                        <option>French Fries (NPR 120)</option>
                      </select>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={{ fontSize: '12px', fontWeight: 600 }}>4-Digit Wallet PIN</label>
                      <input
                        type="password"
                        placeholder="••••"
                        value={walletPin}
                        onChange={(e) => setWalletPin(e.target.value)}
                        style={{ padding: '8px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)' }}
                      />
                    </div>

                    <button className="btn btn-secondary" style={{ padding: '8px', fontSize: '12px' }} type="submit">
                      Pay Cashless
                    </button>
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
                        style={{ padding: '8px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)' }}
                      />
                    </div>

                    <button className="btn btn-primary" style={{ padding: '8px', fontSize: '12px' }} type="submit">
                      Reload Wallet
                    </button>
                  </form>
                </div>

                {walletMessage && (
                  <p style={{ marginTop: '16px', fontSize: '13px', fontWeight: 600 }}>
                    {walletMessage}
                  </p>
                )}
              </div>
            </div>

            {/* Right Column */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
              {/* Digital student ID Card */}
              <div className="digital-id-card">
                <div>
                  <h4 style={{ color: '#fff', fontSize: '14px', letterSpacing: '2px', textTransform: 'uppercase' }}>Student ID Card</h4>
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
                    <h3 style={{ color: '#fff', fontSize: '18px' }}>Shyam Bahadur</h3>
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
              <div className="tms-panel">
                <h3 style={{ marginBottom: '12px' }}>Live Bus GPS Routing</h3>
                <div className="live-map-tracker">
                  <div className="live-map-pin"></div>
                </div>
                <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Status: In Transit</span>
                  <strong>Coords: {driverLat.toFixed(4)}, {driverLng.toFixed(4)}</strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
