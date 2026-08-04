import {
  tenantAcademicEventsMock,
  tenantDashboardMock,
  tenantExpensesMock,
  tenantForecastMock,
  tenantProfitLossMock,
  tenantSuggestionsMock,
} from './tenantPortalData';

const branches = [
  { id: 'demo-main', name: 'TMS Main Center', address: 'Putalisadak, Kathmandu', latitude: 27.7041, longitude: 85.3238, radiusMeters: 120, gracePeriodMinutes: 15, createdAt: '2025-04-15T05:00:00.000Z', staffCount: 28, courseCount: 12 },
  { id: 'demo-lakeside', name: 'Lakeside Learning Hub', address: 'Lakeside Road, Pokhara', latitude: 28.2096, longitude: 83.9856, radiusMeters: 100, gracePeriodMinutes: 15, createdAt: '2025-07-08T05:00:00.000Z', staffCount: 19, courseCount: 9 },
  { id: 'demo-east', name: 'East Wing Academy', address: 'Itahari Chowk, Sunsari', latitude: 26.6636, longitude: 87.2747, radiusMeters: 110, gracePeriodMinutes: 10, createdAt: '2026-01-12T05:00:00.000Z', staffCount: 15, courseCount: 8 },
];

const grades = [
  { id: 'demo-grade-8', name: 'Class 8', sortOrder: 8, monthlyFee: 3200, studentCount: 92, courseCount: 4 },
  { id: 'demo-grade-9', name: 'Class 9', sortOrder: 9, monthlyFee: 3600, studentCount: 84, courseCount: 4 },
  { id: 'demo-grade-10', name: 'Class 10', sortOrder: 10, monthlyFee: 4200, studentCount: 78, courseCount: 5 },
  { id: 'demo-grade-11', name: 'Class 11', sortOrder: 11, monthlyFee: 4800, studentCount: 66, courseCount: 5 },
  { id: 'demo-grade-12', name: 'Class 12', sortOrder: 12, monthlyFee: 5200, studentCount: 58, courseCount: 5 },
];

const people = [
  { id: 'demo-teacher-1', studentId: null, name: 'Anita Shrestha', email: 'anita.shrestha@example.edu', status: 'ACTIVE', roles: [{ role: 'Teacher', branchId: 'demo-main', branchName: 'TMS Main Center' }], createdAt: '2025-05-10T05:00:00.000Z' },
  { id: 'demo-teacher-2', studentId: null, name: 'Ramesh Adhikari', email: 'ramesh.adhikari@example.edu', status: 'ACTIVE', roles: [{ role: 'Teacher', branchId: 'demo-lakeside', branchName: 'Lakeside Learning Hub' }], createdAt: '2025-06-18T05:00:00.000Z' },
  { id: 'demo-accountant-1', studentId: null, name: 'Sunita Karki', email: 'sunita.karki@example.edu', status: 'ACTIVE', roles: [{ role: 'Accountant', branchId: 'demo-main', branchName: 'TMS Main Center' }], createdAt: '2025-05-12T05:00:00.000Z' },
  { id: 'demo-admin-1', studentId: null, name: 'Bikash Rai', email: 'bikash.rai@example.edu', status: 'ACTIVE', roles: [{ role: 'Branch Admin', branchId: 'demo-east', branchName: 'East Wing Academy' }], createdAt: '2026-01-15T05:00:00.000Z' },
  { id: 'demo-user-student-1', studentId: 'demo-student-1', name: 'Aarav Gautam', email: 'aarav.gautam@example.edu', status: 'ACTIVE', roles: [{ role: 'Student', branchId: 'demo-main', branchName: 'TMS Main Center' }], createdAt: '2025-05-20T05:00:00.000Z' },
  { id: 'demo-user-student-2', studentId: 'demo-student-2', name: 'Saanvi Joshi', email: 'saanvi.joshi@example.edu', status: 'ACTIVE', roles: [{ role: 'Student', branchId: 'demo-lakeside', branchName: 'Lakeside Learning Hub' }], createdAt: '2025-06-22T05:00:00.000Z' },
  { id: 'demo-user-student-3', studentId: 'demo-student-3', name: 'Pratik Thapa', email: 'pratik.thapa@example.edu', status: 'ACTIVE', roles: [{ role: 'Student', branchId: 'demo-east', branchName: 'East Wing Academy' }], createdAt: '2026-01-20T05:00:00.000Z' },
  { id: 'demo-parent-1', studentId: null, name: 'Maya Gautam', email: 'maya.gautam@example.edu', status: 'ACTIVE', roles: [{ role: 'Parent', branchId: 'demo-main', branchName: 'TMS Main Center' }], createdAt: '2025-05-20T05:00:00.000Z' },
];

const courses = [
  { id: 'demo-course-math-10', name: 'Class 10 Mathematics', description: 'Core mathematics and exam preparation.', type: 'REGULAR', branchId: 'demo-main', branchName: 'TMS Main Center', gradeId: 'demo-grade-10', gradeName: 'Class 10', feeStructure: { monthlyBase: 4200 }, isTaxExempt: true, taxPercentage: 0, classCount: 2, enrollmentCount: 64, createdAt: '2025-05-01T05:00:00.000Z' },
  { id: 'demo-course-science-10', name: 'Class 10 Science', description: 'Physics, chemistry, and biology support.', type: 'REGULAR', branchId: 'demo-main', branchName: 'TMS Main Center', gradeId: 'demo-grade-10', gradeName: 'Class 10', feeStructure: { monthlyBase: 4500 }, isTaxExempt: true, taxPercentage: 0, classCount: 2, enrollmentCount: 61, createdAt: '2025-05-01T05:00:00.000Z' },
  { id: 'demo-course-english-9', name: 'Class 9 English', description: 'Grammar, writing, and literature.', type: 'REGULAR', branchId: 'demo-lakeside', branchName: 'Lakeside Learning Hub', gradeId: 'demo-grade-9', gradeName: 'Class 9', feeStructure: { monthlyBase: 3600 }, isTaxExempt: true, taxPercentage: 0, classCount: 2, enrollmentCount: 52, createdAt: '2025-07-10T05:00:00.000Z' },
  { id: 'demo-course-music', name: 'Keyboard and Music Theory', description: 'Weekend practical music programme.', type: 'MUSIC', branchId: 'demo-east', branchName: 'East Wing Academy', gradeId: null, gradeName: null, feeStructure: { monthlyBase: 2800 }, isTaxExempt: false, taxPercentage: 13, classCount: 1, enrollmentCount: 18, createdAt: '2026-02-01T05:00:00.000Z' },
];

const classes = [
  { id: 'demo-class-1', name: 'Mathematics Morning A', schedule: [{ day: 'Sun', startTime: '07:00', endTime: '08:30' }, { day: 'Tue', startTime: '07:00', endTime: '08:30' }, { day: 'Thu', startTime: '07:00', endTime: '08:30' }], courseId: 'demo-course-math-10', courseName: 'Class 10 Mathematics', courseType: 'REGULAR', gradeName: 'Class 10', branchId: 'demo-main', branchName: 'TMS Main Center', teacherId: 'demo-teacher-1', teacherName: 'Anita Shrestha', enrollmentCount: 32, sessionCount: 36, createdAt: '2025-05-03T05:00:00.000Z' },
  { id: 'demo-class-2', name: 'Science Evening B', schedule: [{ day: 'Mon', startTime: '16:30', endTime: '18:00' }, { day: 'Wed', startTime: '16:30', endTime: '18:00' }, { day: 'Fri', startTime: '16:30', endTime: '18:00' }], courseId: 'demo-course-science-10', courseName: 'Class 10 Science', courseType: 'REGULAR', gradeName: 'Class 10', branchId: 'demo-main', branchName: 'TMS Main Center', teacherId: 'demo-teacher-2', teacherName: 'Ramesh Adhikari', enrollmentCount: 30, sessionCount: 34, createdAt: '2025-05-03T05:00:00.000Z' },
  { id: 'demo-class-3', name: 'English Foundation', schedule: [{ day: 'Sun', startTime: '15:00', endTime: '16:30' }, { day: 'Tue', startTime: '15:00', endTime: '16:30' }], courseId: 'demo-course-english-9', courseName: 'Class 9 English', courseType: 'REGULAR', gradeName: 'Class 9', branchId: 'demo-lakeside', branchName: 'Lakeside Learning Hub', teacherId: 'demo-teacher-2', teacherName: 'Ramesh Adhikari', enrollmentCount: 26, sessionCount: 29, createdAt: '2025-07-12T05:00:00.000Z' },
];

const feeStudents = [
  { studentId: 'demo-student-1', userId: 'demo-user-student-1', name: 'Aarav Gautam', email: 'aarav.gautam@example.edu', branchId: 'demo-main', branchName: 'TMS Main Center', totalBilled: 50400, totalPaid: 46200, totalDue: 4200, overdueCount: 1, overdueAmount: 4200, invoiceCount: 12 },
  { studentId: 'demo-student-2', userId: 'demo-user-student-2', name: 'Saanvi Joshi', email: 'saanvi.joshi@example.edu', branchId: 'demo-lakeside', branchName: 'Lakeside Learning Hub', totalBilled: 43200, totalPaid: 43200, totalDue: 0, overdueCount: 0, overdueAmount: 0, invoiceCount: 12 },
  { studentId: 'demo-student-3', userId: 'demo-user-student-3', name: 'Pratik Thapa', email: 'pratik.thapa@example.edu', branchId: 'demo-east', branchName: 'East Wing Academy', totalBilled: 46800, totalPaid: 37800, totalDue: 9000, overdueCount: 2, overdueAmount: 9000, invoiceCount: 12 },
];

const pettyCash = [
  { id: 'demo-cash-1', branchId: 'demo-main', branch: { name: 'TMS Main Center' }, amount: 18500, purpose: 'Science laboratory consumables', status: 'APPROVED_LEVEL1', approvalChain: [{ role: 'Branch Admin', action: 'APPROVED', timestamp: '2026-08-03T09:15:00.000Z', comment: 'Required for practical classes.' }], receiptProofUrl: null, createdAt: '2026-08-03T07:30:00.000Z' },
  { id: 'demo-cash-2', branchId: 'demo-lakeside', branch: { name: 'Lakeside Learning Hub' }, amount: 7200, purpose: 'Printer toner and examination paper', status: 'RECEIPT_SUBMITTED', approvalChain: [{ role: 'Tenant Admin', action: 'RELEASED', timestamp: '2026-08-01T10:00:00.000Z', comment: 'Approved.' }], receiptProofUrl: 'https://example.com/demo-receipt.pdf', createdAt: '2026-07-30T06:30:00.000Z' },
];

const payrolls = [
  { id: 'demo-payroll-1', month: 8, year: 2026, baseSalary: 52000, attendanceDeductions: 0, bonuses: 3000, netPayable: 55000, status: 'PENDING', staffRecord: { id: 'demo-staff-1', designation: 'Senior Mathematics Teacher', user: { firstName: 'Anita', lastName: 'Shrestha', email: 'anita.shrestha@example.edu' } } },
  { id: 'demo-payroll-2', month: 8, year: 2026, baseSalary: 48000, attendanceDeductions: 1200, bonuses: 2000, netPayable: 48800, status: 'APPROVED_FOR_MANUAL_PAYMENT', staffRecord: { id: 'demo-staff-2', designation: 'Science Teacher', user: { firstName: 'Ramesh', lastName: 'Adhikari', email: 'ramesh.adhikari@example.edu' } } },
  { id: 'demo-payroll-3', month: 8, year: 2026, baseSalary: 42000, attendanceDeductions: 0, bonuses: 1500, netPayable: 43500, status: 'PAID', settlementReference: 'BANK-DEMO-2041', staffRecord: { id: 'demo-staff-3', designation: 'Accountant', user: { firstName: 'Sunita', lastName: 'Karki', email: 'sunita.karki@example.edu' } } },
];

const documentAlerts = [
  { id: 'demo-document-1', documentType: 'Teaching License', fileUrl: 'documents/anita-teaching-license.pdf', expiryDate: '2026-08-22T00:00:00.000Z', staffRecordId: 'demo-staff-1' },
  { id: 'demo-document-2', documentType: 'Employment Contract', fileUrl: 'documents/ramesh-contract.pdf', expiryDate: '2026-08-29T00:00:00.000Z', staffRecordId: 'demo-staff-2' },
];

const config = { vatRate: 13, gracePeriod: 15, pettyCashCap: 25000, refundPolicy: 'PRO_RATA', lateFeeEnabled: true, lateFeeMode: 'FLAT', lateFeeValue: 250, lateFeeGraceDays: 5, appointmentWindowHours: 24, maintenanceEscalationDays: 3, leavePolicy: { annualDays: 18, sickDays: 12 }, performanceWeights: { attendance: 20, updateCompliance: 20, feedback: 20, leaveCompliance: 20, taskCompletion: 20 } };

const isEmptyArrayField = (value: unknown, key: string) => !value || typeof value !== 'object' || !Array.isArray((value as Record<string, unknown>)[key]) || ((value as Record<string, unknown>)[key] as unknown[]).length === 0;

export function tenantMockResponse(path: string, liveValue?: unknown): unknown | undefined {
  if (typeof window === 'undefined' || !window.location.pathname.startsWith('/tenant/')) return undefined;
  const cleanPath = path.split('?')[0];
  if (cleanPath === '/users/me') return liveValue ?? { isTenantAdmin: true, isBranchAdmin: false, canManagePeople: true, creatableRoles: ['Branch Admin', 'Teacher', 'Accountant', 'Receptionist', 'Janitor', 'Student', 'Parent'], manageableBranches: branches.map(({ id, name }) => ({ id, name })) };
  if (cleanPath === '/users' && isEmptyArrayField(liveValue, 'users')) return { users: people };
  if (cleanPath === '/branches' && isEmptyArrayField(liveValue, 'branches')) return { branches };
  if (cleanPath === '/grades' && isEmptyArrayField(liveValue, 'grades')) return { grades };
  if (/^\/grades\/[^/]+$/.test(cleanPath)) { const grade = grades.find((item) => item.id === cleanPath.split('/').pop()) ?? grades[2]; return { ...grade, teacherCount: 2, students: feeStudents.slice(0, 2).map((student) => ({ studentId: student.studentId, userId: student.userId, name: student.name, email: student.email })), courses: courses.filter((course) => course.gradeId === grade.id).map((course) => ({ id: course.id, name: course.name, branchName: course.branchName, classCount: course.classCount, enrollmentCount: course.enrollmentCount })), teachers: people.filter((person) => person.roles.some((role) => role.role === 'Teacher')).map((person) => ({ id: person.id, name: person.name })) }; }
  if (cleanPath === '/courses/classes' && isEmptyArrayField(liveValue, 'classes')) return { classes };
  if (cleanPath === '/courses' && isEmptyArrayField(liveValue, 'courses')) return { courses };
  if (cleanPath === '/finances/overview') return liveValue && (liveValue as { invoiceCount?: number }).invoiceCount ? liveValue : { collected: 1847500, outstanding: 236000, overdueAmount: 184500, overdueStudents: 23, invoiceCount: 486, billingPeriod: 'Shrawan 2083' };
  if (cleanPath === '/finances/students' && isEmptyArrayField(liveValue, 'students')) return { students: feeStudents };
  if (/^\/finances\/students\/[^/]+\/invoices$/.test(cleanPath) && isEmptyArrayField(liveValue, 'invoices')) return { invoices: [{ id: 'demo-invoice-1', netPayable: 4200, status: 'OVERDUE', overdue: true, dueDate: '2026-08-05T00:00:00.000Z', billingCycleStart: '2026-07-17T00:00:00.000Z', billingCycleEnd: '2026-08-16T00:00:00.000Z', paymentDate: null }, { id: 'demo-invoice-2', netPayable: 4200, status: 'PAID', overdue: false, dueDate: '2026-07-05T00:00:00.000Z', billingCycleStart: '2026-06-16T00:00:00.000Z', billingCycleEnd: '2026-07-16T00:00:00.000Z', paymentDate: '2026-07-02T08:30:00.000Z' }] };
  if (cleanPath === '/finances/petty-cash' && (!Array.isArray(liveValue) || liveValue.length === 0)) return pettyCash;
  if (cleanPath === '/finances/pl') return liveValue && (liveValue as { revenue?: number }).revenue ? liveValue : tenantProfitLossMock;
  if (cleanPath === '/finances/expenses' && isEmptyArrayField(liveValue, 'expenses')) return { expenses: tenantExpensesMock };
  if (cleanPath === '/finances/forecast') return liveValue && (liveValue as { metrics?: unknown }).metrics ? liveValue : tenantForecastMock;
  if (cleanPath === '/finances/suggestions') return liveValue && Array.isArray((liveValue as { alerts?: unknown[] }).alerts) ? liveValue : tenantSuggestionsMock;
  if (cleanPath === '/finances/config') return liveValue ?? config;
  if (cleanPath === '/finances/billing-period') return liveValue ?? { label: 'Shrawan 2083', bsYear: 2083, bsMonthName: 'Shrawan', bsMonthNameNp: 'Shrawan', daysInMonth: 31, cycleStart: '2026-07-17', cycleEnd: '2026-08-16', dueDate: '2026-08-05' };
  if (cleanPath === '/finances/ledger/export' && isEmptyArrayField(liveValue, 'entries')) return { format: 'double-entry', entries: tenantExpensesMock.map((expense) => ({ date: expense.date, accountDebit: expense.category, accountCredit: 'Cash and Bank', amount: Number(expense.amount), description: expense.description })) };
  if (cleanPath === '/onboarding/dashboard') return liveValue ?? tenantDashboardMock;
  if (cleanPath === '/hr/payroll' && isEmptyArrayField(liveValue, 'payrolls')) return { payrolls };
  if (cleanPath === '/hr/documents/alerts' && isEmptyArrayField(liveValue, 'expiringDocs')) return { expiringDocs: documentAlerts };
  if (cleanPath === '/academic-events' && isEmptyArrayField(liveValue, 'events')) return { events: tenantAcademicEventsMock };
  if (cleanPath === '/resources/tasks' && isEmptyArrayField(liveValue, 'tasks')) return { tasks: [{ id: 'demo-task-1', branchId: 'demo-main', description: 'Service classroom projector and replace HDMI cable', assignedStaffId: 'Maintenance Team A', status: 'IN_PROGRESS', escalationDaysSnapshot: 3, createdAt: '2026-08-02T06:00:00.000Z' }, { id: 'demo-task-2', branchId: 'demo-main', description: 'Repair second-floor washroom tap', assignedStaffId: 'Maintenance Team B', status: 'PENDING', escalationDaysSnapshot: 2, createdAt: '2026-08-01T06:00:00.000Z' }] };
  return undefined;
}
