import { lazy, Suspense } from 'react';
import {
  createBrowserRouter,
  RouterProvider,
  Navigate,
  Outlet,
  useLocation,
  useNavigate,
} from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { DashboardShell } from '../components/patterns/DashboardShell';
import { findNavigationItem, mapAuthRoleToDashboardRole, type DashboardRole } from '../components/patterns/dashboardNavigation';
import { SessionTimeoutDialog } from '../components/ui/SessionTimeoutDialog';
import type { UserRole } from '../features/auth/types';

const LoginPage = lazy(() => import('../pages/auth/LoginPage').then((module) => ({ default: module.LoginPage })));
const ForgotPasswordPage = lazy(() => import('../pages/auth/ForgotPasswordPage').then((module) => ({ default: module.ForgotPasswordPage })));
const ResetPasswordPage = lazy(() => import('../pages/auth/ResetPasswordPage').then((module) => ({ default: module.ResetPasswordPage })));
const TwoFactorPage = lazy(() => import('../pages/auth/TwoFactorPage').then((module) => ({ default: module.TwoFactorPage })));
const TenantSetupWizard = lazy(() => import('../pages/setup/TenantSetupWizard').then((module) => ({ default: module.TenantSetupWizard })));
const BranchSetupWizard = lazy(() => import('../pages/setup/BranchSetupWizard').then((module) => ({ default: module.BranchSetupWizard })));

const SuperAdminDashboard = lazy(() => import('../pages/SuperAdminDashboard').then((module) => ({ default: module.SuperAdminDashboard })));
const SuperAdminTenants = lazy(() => import('../pages/SuperAdminTenants').then((module) => ({ default: module.SuperAdminTenants })));
const TenantAdminDashboard = lazy(() => import('../pages/TenantAdminDashboard').then((module) => ({ default: module.TenantAdminDashboard })));
const TenantBranches = lazy(() => import('../pages/TenantBranches').then((module) => ({ default: module.TenantBranches })));
const PeopleDirectory = lazy(() => import('../pages/PeopleDirectory').then((module) => ({ default: module.PeopleDirectory })));
const AcademicCourses = lazy(() => import('../pages/AcademicCourses').then((module) => ({ default: module.AcademicCourses })));
const AcademicTimetables = lazy(() => import('../pages/AcademicTimetables').then((module) => ({ default: module.AcademicTimetables })));
const AcademicStudents = lazy(() => import('../pages/AcademicRoster').then((module) => ({ default: module.AcademicStudents })));
const AcademicTeachers = lazy(() => import('../pages/AcademicRoster').then((module) => ({ default: module.AcademicTeachers })));
const AcademicFees = lazy(() => import('../pages/AcademicFees').then((module) => ({ default: module.AcademicFees })));
const AcademicGrades = lazy(() => import('../pages/AcademicGrades').then((module) => ({ default: module.AcademicGrades })));
const BranchAdminDashboard = lazy(() => import('../pages/BranchAdminDashboard').then((module) => ({ default: module.BranchAdminDashboard })));
const TeacherPortal = lazy(() => import('../pages/TeacherPortal').then((module) => ({ default: module.TeacherPortal })));
const ParentStudentPortal = lazy(() => import('../pages/ParentStudentPortal').then((module) => ({ default: module.ParentStudentPortal })));

function RequireAuth() {
  const { isAuthenticated, isLoading, isTwoFactorPending } = useAuth();

  if (isLoading) {
    return <FullPageSpinner />;
  }

  if (isTwoFactorPending) {
    return <Navigate to="/2fa" replace />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <>
      <SessionTimeoutDialog />
      <Outlet />
    </>
  );
}

function RequireRole({ allowedRoles }: { allowedRoles: UserRole[] }) {
  const { user, roleRedirectPath } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!allowedRoles.includes(user.role)) {
    return <Navigate to={roleRedirectPath()} replace />;
  }

  return <Outlet />;
}

function RequireTwoFactor() {
  const { isAuthenticated, isLoading, isTwoFactorPending, roleRedirectPath } = useAuth();

  if (isLoading) {
    return <FullPageSpinner />;
  }

  if (isAuthenticated) {
    return <Navigate to={roleRedirectPath()} replace />;
  }

  if (!isTwoFactorPending) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}

function PublicAuthLayout() {
  return <Outlet />;
}

function AuthenticatedLayout() {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (location.pathname.startsWith('/setup')) {
    return <Outlet />;
  }

  const dashboardRole = mapAuthRoleToDashboardRole(user.role);

  if (!dashboardRole) {
    return <Outlet />;
  }

  return (
    <DashboardShell role={dashboardRole}>
      <Outlet />
    </DashboardShell>
  );
}

function RedirectIfAuth() {
  const { isAuthenticated, isLoading, isTwoFactorPending, roleRedirectPath } = useAuth();

  if (isLoading) {
    return <FullPageSpinner />;
  }

  if (isTwoFactorPending) {
    return <Navigate to="/2fa" replace />;
  }

  if (isAuthenticated) {
    return <Navigate to={roleRedirectPath()} replace />;
  }

  return <Outlet />;
}

function FullPageSpinner() {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: '16px',
      }}
    >
      <div className="auth-spinner" style={{ width: '40px', height: '40px', borderWidth: '4px' }} />
      <p style={{ color: 'var(--text-muted-foreground)', fontSize: '14px' }}>Loading…</p>
    </div>
  );
}

function PlaceholderPage({ title, description }: { title: string; description?: string }) {
  const navigate = useNavigate();

  return (
    <div style={{ padding: '60px 40px', textAlign: 'center' }}>
      <span className="material-symbols-outlined" style={{ fontSize: '48px', color: 'var(--color-primary-light)' }}>
        construction
      </span>
      <h2 style={{ marginTop: '16px', fontSize: '24px', fontWeight: 700 }}>{title}</h2>
      <p style={{ color: 'rgba(44, 62, 80, 0.68)', marginTop: '8px' }}>{description ?? 'This workspace will be wired to the module flow next.'}</p>
      <button type="button" className="auth-submit-btn" style={{ marginTop: '24px' }} onClick={() => navigate(-1)}>
        Go Back
      </button>
    </div>
  );
}

function RoleWorkspacePlaceholder({ role }: { role: DashboardRole }) {
  const location = useLocation();
  const item = findNavigationItem(role, location.pathname);

  return (
    <PlaceholderPage
      title={item?.label ?? 'Workspace'}
      description={item?.phase ? `This module is planned for Phase ${item.phase}.` : 'Dashboard shell and navigation are ready; feature wiring will follow.'}
    />
  );
}

const router = createBrowserRouter([
  {
    element: <RedirectIfAuth />,
    children: [
      {
        element: <PublicAuthLayout />,
        children: [
          { path: '/login', element: <Suspense fallback={<FullPageSpinner />}><LoginPage /></Suspense> },
          { path: '/forgot-password', element: <Suspense fallback={<FullPageSpinner />}><ForgotPasswordPage /></Suspense> },
          { path: '/reset-password', element: <Navigate to="/forgot-password" replace /> },
          { path: '/reset-password/:token', element: <Suspense fallback={<FullPageSpinner />}><ResetPasswordPage /></Suspense> },
        ],
      },
    ],
  },
  {
    element: <RequireTwoFactor />,
    children: [
      { path: '/2fa', element: <Suspense fallback={<FullPageSpinner />}><TwoFactorPage /></Suspense> },
      { path: '/two-factor', element: <Navigate to="/2fa" replace /> },
    ],
  },
  {
    element: <RequireAuth />,
    children: [
      {
        element: <AuthenticatedLayout />,
        children: [
          { path: '/setup/tenant', element: <Suspense fallback={<FullPageSpinner />}><TenantSetupWizard /></Suspense> },
          { path: '/setup/branch', element: <Suspense fallback={<FullPageSpinner />}><BranchSetupWizard /></Suspense> },

          {
            element: <RequireRole allowedRoles={['SUPER_ADMIN']} />,
            children: [
              { path: '/super-admin/dashboard', element: <Suspense fallback={<FullPageSpinner />}><SuperAdminDashboard /></Suspense> },
              { path: '/super-admin/tenants', element: <Suspense fallback={<FullPageSpinner />}><SuperAdminTenants /></Suspense> },
              { path: '/super-admin/tenants/:id', element: <PlaceholderPage title="Tenant Detail" /> },
            ],
          },

          {
            element: <RequireRole allowedRoles={['TENANT_ADMIN']} />,
            children: [
              { path: '/tenant/dashboard', element: <Suspense fallback={<FullPageSpinner />}><TenantAdminDashboard /></Suspense> },
              { path: '/tenant/branches', element: <Suspense fallback={<FullPageSpinner />}><TenantBranches /></Suspense> },
              { path: '/tenant/people', element: <Suspense fallback={<FullPageSpinner />}><PeopleDirectory /></Suspense> },
              { path: '/tenant/students', element: <Suspense fallback={<FullPageSpinner />}><AcademicStudents /></Suspense> },
              { path: '/tenant/teachers', element: <Suspense fallback={<FullPageSpinner />}><AcademicTeachers /></Suspense> },
              { path: '/tenant/courses', element: <Suspense fallback={<FullPageSpinner />}><AcademicCourses /></Suspense> },
              { path: '/tenant/timetables', element: <Suspense fallback={<FullPageSpinner />}><AcademicTimetables /></Suspense> },
              { path: '/tenant/fees', element: <Suspense fallback={<FullPageSpinner />}><AcademicFees /></Suspense> },
              { path: '/tenant/grades', element: <Suspense fallback={<FullPageSpinner />}><AcademicGrades /></Suspense> },
              { path: '/tenant/*', element: <RoleWorkspacePlaceholder role="tenant-admin" /> },
            ],
          },
          {
            element: <RequireRole allowedRoles={['BRANCH_ADMIN']} />,
            children: [
              { path: '/branch/dashboard', element: <Suspense fallback={<FullPageSpinner />}><BranchAdminDashboard /></Suspense> },
              { path: '/branch/people', element: <Suspense fallback={<FullPageSpinner />}><PeopleDirectory /></Suspense> },
              { path: '/branch/*', element: <RoleWorkspacePlaceholder role="branch-admin" /> },
            ],
          },
          {
            element: <RequireRole allowedRoles={['TEACHER']} />,
            children: [
              { path: '/teacher/dashboard', element: <Suspense fallback={<FullPageSpinner />}><TeacherPortal /></Suspense> },
              { path: '/teacher/*', element: <RoleWorkspacePlaceholder role="teacher" /> },
            ],
          },
          {
            element: <RequireRole allowedRoles={['STUDENT']} />,
            children: [
              { path: '/student/home', element: <Suspense fallback={<FullPageSpinner />}><ParentStudentPortal /></Suspense> },
              { path: '/student/*', element: <RoleWorkspacePlaceholder role="student" /> },
            ],
          },
          {
            element: <RequireRole allowedRoles={['PARENT']} />,
            children: [
              { path: '/parent/home', element: <Suspense fallback={<FullPageSpinner />}><ParentStudentPortal /></Suspense> },
              { path: '/parent/*', element: <RoleWorkspacePlaceholder role="parent" /> },
            ],
          },

          { path: '/staff/finance', element: <PlaceholderPage title="Accountant Finance Panel" /> },
          { path: '/staff/reception', element: <PlaceholderPage title="Reception Dashboard" /> },
          { path: '/staff/tasks', element: <PlaceholderPage title="Janitor Task Panel" /> },
        ],
      },
    ],
  },
  { path: '/', element: <Navigate to="/login" replace /> },
  { path: '*', element: <Navigate to="/login" replace /> },
]);

export function AppRouter() {
  return <RouterProvider router={router} />;
}

