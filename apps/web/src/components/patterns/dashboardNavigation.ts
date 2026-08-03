export type DashboardRole = 'super-admin' | 'tenant-admin' | 'branch-admin' | 'teacher' | 'student' | 'parent' | 'receptionist' | 'janitor';

export interface DashboardNavItem {
  label: string;
  icon: string;
  path: string;
  section: string;
  phase?: 2 | 3;
}

const ROLE_LABELS: Record<DashboardRole, string> = {
  'super-admin': 'Super Admin',
  'tenant-admin': 'Tenant Admin',
  'branch-admin': 'Branch Admin',
  teacher: 'Teacher',
  student: 'Student',
  parent: 'Parent',
  receptionist: 'Receptionist',
  janitor: 'Maintenance Staff',
};

export const DASHBOARD_NAVIGATION: Record<DashboardRole, DashboardNavItem[]> = {
  'super-admin': [
    { section: 'Platform', label: 'Overview', icon: 'space_dashboard', path: '/platform/overview' },
    { section: 'Platform', label: 'Tenants', icon: 'domain', path: '/platform/tenants' },
    { section: 'Operations', label: 'Onboarding', icon: 'playlist_add_check', path: '/platform/onboarding' },
    { section: 'Operations', label: 'Support Access', icon: 'support_agent', path: '/platform/support' },
    { section: 'Governance', label: 'Policy Defaults', icon: 'tune', path: '/platform/policies' },
    { section: 'Governance', label: 'Billing', icon: 'receipt_long', path: '/platform/billing' },
    { section: 'Security', label: 'Audit Log', icon: 'policy', path: '/platform/audit' },
  ],
  'tenant-admin': [
    { section: 'Main', label: 'Dashboard', icon: 'dashboard', path: '/tenant/dashboard' },
    { section: 'Main', label: 'Branches', icon: 'domain', path: '/tenant/branches' },
    { section: 'Main', label: 'Staff & Students', icon: 'group', path: '/tenant/people' },
    { section: 'Main', label: 'Admissions', icon: 'person_add', path: '/tenant/admissions' },
    { section: 'Main', label: 'Control Center', icon: 'admin_panel_settings', path: '/tenant/control-center' },
    { section: 'Academic', label: 'Students', icon: 'school', path: '/tenant/students' },
    { section: 'Academic', label: 'Teachers', icon: 'badge', path: '/tenant/teachers' },
    { section: 'Academic', label: 'Grades', icon: 'stairs', path: '/tenant/grades' },
    { section: 'Academic', label: 'Timetables', icon: 'calendar_month', path: '/tenant/timetables' },
    { section: 'Academic', label: 'Courses', icon: 'menu_book', path: '/tenant/courses' },
    { section: 'Finance', label: 'Fee & Billing', icon: 'payments', path: '/tenant/fees' },
    { section: 'Finance', label: 'Payroll', icon: 'account_balance_wallet', path: '/tenant/payroll' },
    { section: 'Finance', label: 'Petty Cash', icon: 'savings', path: '/tenant/petty-cash' },
    { section: 'Finance', label: 'P&L Reports', icon: 'monitoring', path: '/tenant/pl-reports' },
    { section: 'Operations', label: 'Resource Logs', icon: 'inventory_2', path: '/tenant/resource-logs' },
    { section: 'Operations', label: 'HR Management', icon: 'group', path: '/tenant/hr-management' },
    { section: 'Operations', label: 'Academic Calendar', icon: 'date_range', path: '/tenant/academic-calendar' },
    { section: 'Settings', label: 'Tenant Settings', icon: 'settings', path: '/tenant/settings' },
  ],
  'branch-admin': [
    { section: 'Main', label: 'Dashboard', icon: 'dashboard', path: '/branch/dashboard' },
    { section: 'Main', label: 'Staff & Students', icon: 'group', path: '/branch/people' },
    { section: 'Academic', label: 'Students', icon: 'groups', path: '/branch/students' },
    { section: 'Academic', label: 'Teachers', icon: 'person', path: '/branch/teachers' },
    { section: 'Academic', label: 'Timetable', icon: 'calendar_today', path: '/branch/timetable' },
    { section: 'Academic', label: 'Attendance', icon: 'co_present', path: '/branch/attendance' },
    { section: 'Academic', label: 'Personalized Classes', icon: 'group_work', path: '/branch/personalized-classes' },
    { section: 'Academic', label: 'Homework', icon: 'assignment', path: '/branch/homework', phase: 2 },
    { section: 'Academic', label: 'Results', icon: 'emoji_events', path: '/branch/results', phase: 2 },
    { section: 'Finance', label: 'Fee & Billing', icon: 'payments', path: '/branch/fees' },
    { section: 'Finance', label: 'Petty Cash', icon: 'savings', path: '/branch/petty-cash', phase: 3 },
    { section: 'Operations', label: 'Leave Requests', icon: 'event_busy', path: '/branch/leave-requests' },
    { section: 'Operations', label: 'Resource Logs', icon: 'description', path: '/branch/resource-logs' },
    { section: 'Operations', label: 'Appointments', icon: 'event', path: '/branch/appointments', phase: 2 },
    { section: 'Operations', label: 'Certificates', icon: 'workspace_premium', path: '/branch/certificates', phase: 2 },
    { section: 'Communication', label: 'Messages', icon: 'forum', path: '/branch/messages', phase: 2 },
    { section: 'Communication', label: 'Announcements', icon: 'campaign', path: '/branch/announcements', phase: 2 },
    { section: 'Communication', label: 'Social Media', icon: 'share', path: '/branch/social-media', phase: 2 },
    { section: 'Calendar', label: 'Academic Calendar', icon: 'date_range', path: '/branch/academic-calendar', phase: 2 },
  ],
  teacher: [
    { section: 'Overview', label: 'Teacher Dashboard', icon: 'dashboard', path: '/teacher/dashboard' },
    { section: 'Overview', label: 'My Timetable', icon: 'calendar_view_week', path: '/teacher/timetable' },
    { section: 'Overview', label: 'Geo Attendance', icon: 'person_pin_circle', path: '/teacher/geo-attendance' },
    { section: 'Classroom', label: 'Attendance', icon: 'checklist', path: '/teacher/attendance' },
    { section: 'Classroom', label: 'Syllabus', icon: 'menu_book', path: '/teacher/syllabus' },
    { section: 'Classroom', label: 'Daily Update Log', icon: 'note_alt', path: '/teacher/daily-update-log' },
    { section: 'Classroom', label: 'Homework', icon: 'assignment', path: '/teacher/homework' },
    { section: 'Classroom', label: 'Results', icon: 'task', path: '/teacher/results' },
    { section: 'Personal', label: 'My Profile', icon: 'person', path: '/teacher/profile' },
    { section: 'Personal', label: 'Leave Requests', icon: 'time_to_leave', path: '/teacher/leave-requests' },
    { section: 'Personal', label: 'Salary Slips', icon: 'receipt_long', path: '/teacher/salary-slips' },
  ],
  student: [
    { section: 'Overview', label: 'Home', icon: 'home', path: '/student/home' },
    { section: 'Academics', label: 'Timetable', icon: 'calendar_today', path: '/student/timetable' },
    { section: 'Academics', label: 'Homework', icon: 'assignment', path: '/student/homework' },
    { section: 'Academics', label: 'Syllabus Progress', icon: 'menu_book', path: '/student/syllabus' },
    { section: 'Academics', label: 'Results & Insights', icon: 'analytics', path: '/student/results' },
    { section: 'My Record', label: 'Attendance', icon: 'fact_check', path: '/student/attendance' },
    { section: 'My Record', label: 'Fees & Payment', icon: 'payments', path: '/student/fees' },
    { section: 'My Record', label: 'Digital ID', icon: 'badge', path: '/student/digital-id' },
    { section: 'My Record', label: 'Certificates', icon: 'workspace_premium', path: '/student/certificates' },
    { section: 'Calendar', label: 'Academic Calendar', icon: 'date_range', path: '/student/calendar' },
  ],
  parent: [
    { section: 'Family', label: 'Home', icon: 'home', path: '/parent/home' },
    { section: 'Family', label: 'Timetable', icon: 'calendar_view_week', path: '/parent/timetable' },
    { section: 'Family', label: 'Attendance', icon: 'fact_check', path: '/parent/attendance' },
    { section: 'Family', label: 'Performance', icon: 'insights', path: '/parent/performance' },
    { section: 'Connect', label: 'Messages', icon: 'forum', path: '/parent/messages' },
    { section: 'Connect', label: 'Appointments', icon: 'event', path: '/parent/appointments' },
    { section: 'Connect', label: 'Leave', icon: 'event_available', path: '/parent/leave' },
    { section: 'Records', label: 'Fees & Payment', icon: 'payments', path: '/parent/fees' },
    { section: 'Records', label: 'Certificates', icon: 'workspace_premium', path: '/parent/certificates' },
    { section: 'Calendar', label: 'Academic Calendar', icon: 'date_range', path: '/parent/calendar' },
  ],
  receptionist: [
    { section: 'Front desk', label: "Today's desk", icon: 'desk', path: '/staff/reception' },
  ],
  janitor: [
    { section: 'Maintenance', label: 'My Tasks', icon: 'cleaning_services', path: '/staff/tasks' },
  ],
};

export function getDashboardRoleLabel(role: DashboardRole): string {
  return ROLE_LABELS[role];
}

export function mapAuthRoleToDashboardRole(role: string): DashboardRole | null {
  switch (role) {
    case 'SUPER_ADMIN':
      return 'super-admin';
    case 'TENANT_ADMIN':
      return 'tenant-admin';
    case 'BRANCH_ADMIN':
      return 'branch-admin';
    case 'TEACHER':
      return 'teacher';
    case 'STUDENT':
      return 'student';
    case 'PARENT':
      return 'parent';
    case 'RECEPTIONIST':
      return 'receptionist';
    case 'JANITOR':
      return 'janitor';
    default:
      return null;
  }
}

export function getDashboardNavigation(role: DashboardRole): DashboardNavItem[] {
  return DASHBOARD_NAVIGATION[role];
}

export function findNavigationItem(role: DashboardRole, pathname: string): DashboardNavItem | undefined {
  return [...DASHBOARD_NAVIGATION[role]]
    .sort((left, right) => right.path.length - left.path.length)
    .find((item) => pathname === item.path || pathname.startsWith(`${item.path}/`));
}
