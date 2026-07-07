import { lazy, Suspense, useMemo } from 'react';
import {
  createBrowserRouter,
  RouterProvider,
  Navigate,
  Outlet,
  useNavigate,
} from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { SessionTimeoutDialog } from '../components/ui/SessionTimeoutDialog';
import { PageShell, type NavItem } from '../components/patterns/PageShell';

// ── Lazy-loaded pages ────────────────────────────────────────────────────────
const LoginPage          = lazy(() => import('../pages/auth/LoginPage').then(m => ({ default: m.LoginPage })));
const ForgotPasswordPage = lazy(() => import('../pages/auth/ForgotPasswordPage').then(m => ({ default: m.ForgotPasswordPage })));
const ResetPasswordPage  = lazy(() => import('../pages/auth/ResetPasswordPage').then(m => ({ default: m.ResetPasswordPage })));
const TwoFactorPage      = lazy(() => import('../pages/auth/TwoFactorPage').then(m => ({ default: m.TwoFactorPage })));
const TenantSetupWizard  = lazy(() => import('../pages/setup/TenantSetupWizard').then(m => ({ default: m.TenantSetupWizard })));
const BranchSetupWizard  = lazy(() => import('../pages/setup/BranchSetupWizard').then(m => ({ default: m.BranchSetupWizard })));

const TenantAdminDashboard  = lazy(() => import('../pages/TenantAdminDashboard').then(m => ({ default: m.TenantAdminDashboard })));
const BranchAdminDashboard  = lazy(() => import('../pages/BranchAdminDashboard').then(m => ({ default: m.BranchAdminDashboard })));
const TeacherPortal         = lazy(() => import('../pages/TeacherPortal').then(m => ({ default: m.TeacherPortal })));
const ParentStudentPortal   = lazy(() => import('../pages/ParentStudentPortal').then(m => ({ default: m.ParentStudentPortal })));

// ── Route Guards ─────────────────────────────────────────────────────────────

/** Redirect to /login if not authenticated */
function RequireAuth() {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return <FullPageSpinner />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return (
    <>
      <SessionTimeoutDialog />
      <Outlet />
    </>
  );
}

/** Wraps authenticated sub-routes with the PageShell sidebar navigation (PRD §10.3) */
function AuthenticatedLayout() {
  const { user, logout } = useAuth();

  if (!user) return <Navigate to="/login" replace />;

  const isSetupRoute = window.location.pathname.startsWith('/setup');

  const navItems = useMemo((): NavItem[] => {
    if (user.role === 'TENANT_ADMIN') {
      return [
        { label: 'Dashboard', icon: 'dashboard', path: '/tenant/dashboard', section: 'MAIN' },
        { label: 'Branches', icon: 'domain', path: '/tenant/branches', section: 'MAIN' },
        { label: 'Staff Overview', icon: 'badge', path: '/tenant/staff', section: 'OPERATIONS' },
        { label: 'Consolidated Finance', icon: 'analytics', path: '/tenant/finance', section: 'FINANCE' },
        { label: 'HR Management', icon: 'groups', path: '/tenant/hr', section: 'OPERATIONS' },
        { label: 'Tenant Settings', icon: 'settings', path: '/tenant/settings', section: 'SETTINGS' },
      ];
    }
    if (user.role === 'BRANCH_ADMIN') {
      return [
        { label: 'Dashboard', icon: 'dashboard', path: '/branch/dashboard', section: 'MAIN' },
        { label: 'Students', icon: 'groups', path: '/branch/students', section: 'ACADEMIC' },
        { label: 'Teachers', icon: 'person', path: '/branch/teachers', section: 'ACADEMIC' },
        { label: 'Timetable', icon: 'calendar_today', path: '/branch/timetable', section: 'ACADEMIC' },
        { label: 'Attendance', icon: 'co_present', path: '/branch/attendance', section: 'ACADEMIC' },
        { label: 'Fee & Billing', icon: 'payments', path: '/branch/fees', section: 'FINANCE' },
        { label: 'Leave Requests', icon: 'event_busy', path: '/branch/leave', section: 'OPERATIONS' },
        { label: 'Resource Logs', icon: 'description', path: '/branch/resources', section: 'OPERATIONS' },
        { label: 'Appointments', icon: 'event', path: '/branch/appointments', section: 'OPERATIONS' },
        { label: 'Social Media', icon: 'share', path: '/branch/social', section: 'COMMUNICATION' },
      ];
    }
    if (user.role === 'TEACHER') {
      return [
        { label: 'Dashboard', icon: 'dashboard', path: '/teacher/dashboard', section: 'OVERVIEW' },
        { label: 'My Classes', icon: 'class', path: '/teacher/classes', section: 'OVERVIEW' },
        { label: 'Homework Manager', icon: 'edit_document', path: '/teacher/homework', section: 'CLASSROOM' },
        { label: 'Results Entry', icon: 'task', path: '/teacher/results', section: 'CLASSROOM' },
      ];
    }
    return [];
  }, [user.role]);

  if (isSetupRoute) {
    return <Outlet />;
  }

  const title = user.role === 'TENANT_ADMIN' ? 'Pinnacle Academy' : 'Baneshwor Branch';
  const subtitle = user.role === 'TENANT_ADMIN' ? 'Tenant Corporate Admin' : 'Branch Manager Portal';

  return (
    <PageShell
      title={title}
      subtitle={subtitle}
      userRole={user.role}
      userName={user.name}
      onLogout={logout}
      navItems={navItems}
    >
      <Outlet />
    </PageShell>
  );
}

/** Redirect to dashboard if already authenticated (prevents back-nav to login) */
function RedirectIfAuth() {
  const { isAuthenticated, isLoading, roleRedirectPath } = useAuth();
  if (isLoading) return <FullPageSpinner />;
  if (isAuthenticated) return <Navigate to={roleRedirectPath()} replace />;
  return <Outlet />;
}

// ── Loading fallback ──────────────────────────────────────────────────────────

function FullPageSpinner() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'column',
      gap: '16px',
    }}>
      <div className="auth-spinner" style={{ width: '40px', height: '40px', borderWidth: '4px' }} />
      <p style={{ color: 'var(--text-muted-foreground)', fontSize: '14px' }}>Loading…</p>
    </div>
  );
}

// ── Placeholder for unimplemented pages ───────────────────────────────────────

function PlaceholderPage({ title }: { title: string }) {
  const nav = useNavigate();
  return (
    <div style={{ padding: '60px 40px', textAlign: 'center' }}>
      <span className="material-symbols-outlined" style={{ fontSize: '48px', color: 'var(--brand)' }}>
        construction
      </span>
      <h2 style={{ marginTop: '16px', fontSize: '24px', fontWeight: 700 }}>{title}</h2>
      <p style={{ color: 'var(--text-muted-foreground)', marginTop: '8px' }}>
        This page is coming in the next sprint.
      </p>
      <button type="button" className="auth-submit-btn" style={{ marginTop: '24px' }} onClick={() => nav(-1)}>
        Go Back
      </button>
    </div>
  );
}

// ── Router definition (PRD §10.1) ─────────────────────────────────────────────

export const router = createBrowserRouter([
  // ── Public / Auth routes ──────────────────────────────────────────────────
  {
    element: <RedirectIfAuth />,
    children: [
      { path: '/login',                   element: <Suspense fallback={<FullPageSpinner />}><LoginPage /></Suspense> },
      { path: '/forgot-password',         element: <Suspense fallback={<FullPageSpinner />}><ForgotPasswordPage /></Suspense> },
      { path: '/reset-password',          element: <Suspense fallback={<FullPageSpinner />}><ResetPasswordPage /></Suspense> },
      { path: '/reset-password/:token',   element: <Suspense fallback={<FullPageSpinner />}><ResetPasswordPage /></Suspense> },
    ],
  },
  // 2FA — semi-auth (user is logged in but not fully authorized)
  { path: '/two-factor', element: <Suspense fallback={<FullPageSpinner />}><TwoFactorPage /></Suspense> },

  // ── Authenticated routes ───────────────────────────────────────────────────
  {
    element: <RequireAuth />,
    children: [
      {
        element: <AuthenticatedLayout />,
        children: [
          // Setup wizards (first-login)
          { path: '/setup/tenant', element: <Suspense fallback={<FullPageSpinner />}><TenantSetupWizard /></Suspense> },
          { path: '/setup/branch', element: <Suspense fallback={<FullPageSpinner />}><BranchSetupWizard /></Suspense> },

          // Super Admin
          { path: '/super-admin/dashboard',   element: <PlaceholderPage title="Super Admin Dashboard" /> },
          { path: '/super-admin/tenants',     element: <PlaceholderPage title="Tenant Management" /> },
          { path: '/super-admin/tenants/:id', element: <PlaceholderPage title="Tenant Detail" /> },

          // Tenant Admin
          { path: '/tenant/dashboard',  element: <Suspense fallback={<FullPageSpinner />}><TenantAdminDashboard /></Suspense> },
          { path: '/tenant/branches',   element: <PlaceholderPage title="Branch Management" /> },
          { path: '/tenant/staff',      element: <PlaceholderPage title="Staff Overview" /> },
          { path: '/tenant/finance',    element: <PlaceholderPage title="Consolidated Finance" /> },
          { path: '/tenant/hr',         element: <PlaceholderPage title="HR Management" /> },
          { path: '/tenant/settings',   element: <PlaceholderPage title="Tenant Settings & RBAC" /> },

          // Branch Admin
          { path: '/branch/dashboard',  element: <Suspense fallback={<FullPageSpinner />}><BranchAdminDashboard /></Suspense> },
          { path: '/branch/students',   element: <PlaceholderPage title="Student Management" /> },
          { path: '/branch/teachers',   element: <PlaceholderPage title="Teacher Management" /> },
          { path: '/branch/timetable',  element: <PlaceholderPage title="Timetable Management" /> },
          { path: '/branch/attendance', element: <PlaceholderPage title="Attendance Overview" /> },
          { path: '/branch/fees',       element: <PlaceholderPage title="Fee & Billing" /> },
          { path: '/branch/leave',      element: <PlaceholderPage title="Leave Management" /> },
          { path: '/branch/resources',  element: <PlaceholderPage title="Resource Logging" /> },
          { path: '/branch/appointments', element: <PlaceholderPage title="Appointments" /> },
          { path: '/branch/social',     element: <PlaceholderPage title="Social Media" /> },

          // Teacher
          { path: '/teacher/dashboard', element: <Suspense fallback={<FullPageSpinner />}><TeacherPortal /></Suspense> },
          { path: '/teacher/classes',   element: <PlaceholderPage title="My Classes" /> },
          { path: '/teacher/attendance/:classId', element: <PlaceholderPage title="Mark Attendance" /> },
          { path: '/teacher/homework',  element: <PlaceholderPage title="Homework Manager" /> },
          { path: '/teacher/results',   element: <PlaceholderPage title="Results Entry" /> },

          // Staff
          { path: '/staff/finance',     element: <PlaceholderPage title="Accountant Finance Panel" /> },
          { path: '/staff/reception',   element: <PlaceholderPage title="Reception Dashboard" /> },
          { path: '/staff/tasks',       element: <PlaceholderPage title="Janitor Task Panel" /> },

          // Student / Parent
          { path: '/student/home',      element: <Suspense fallback={<FullPageSpinner />}><ParentStudentPortal /></Suspense> },
          { path: '/parent/home',       element: <Suspense fallback={<FullPageSpinner />}><ParentStudentPortal /></Suspense> },
        ],
      },
    ],
  },

  // Default redirects
  { path: '/', element: <Navigate to="/login" replace /> },
  { path: '*', element: <Navigate to="/login" replace /> },
]);

export function AppRouter() {
  return <RouterProvider router={router} />;
}
