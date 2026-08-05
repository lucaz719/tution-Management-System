// API Client Service for Tuition Management System (TMS)
// Tenant scope is authoritative from the signed session on the API.
import { request } from './api/client';

export interface AccountantWorkspace {
  branches: Array<{ id: string; name: string }>;
  pettyCashCap: number;
  pettyCashUsage: Array<{ branchId: string; committed: number }>;
  summary: {
    collected: number;
    outstanding: number;
    overdueAmount: number;
    invoiceCount: number;
    openPettyCash: number;
    awaitingReceipt: number;
  };
  pettyCash: Array<{
    id: string;
    branchId: string;
    branchName: string;
    purpose: string;
    amount: number;
    status: 'PENDING' | 'APPROVED_LEVEL1' | 'REJECTED' | 'RELEASED' | 'RECEIPT_SUBMITTED' | 'CLOSED';
    receiptProofUrl: string | null;
    approvalChain: Array<{ role?: string; action?: string; timestamp?: string; comment?: string }>;
    createdAt: string;
    updatedAt: string;
  }>;
  invoices: Array<{
    id: string;
    studentId: string;
    studentName: string;
    branchId: string | null;
    branchName: string | null;
    amount: number;
    discount: number;
    netPayable: number;
    status: string;
    overdue: boolean;
    billingCycleStart: string;
    billingCycleEnd: string;
    dueDate: string;
    paymentDate: string | null;
    transactionId: string | null;
  }>;
  reports: { revenue: number; operatingCosts: number; netMargin: number; expenseCount: number; ledgerEntryCount: number };
}

export interface BranchAdminDashboardData {
  branches: Array<{ id: string; name: string }>;
  selectedBranch: { id: string; name: string };
  generatedAt: string;
  metrics: {
    teacherAttendance: { present: number; total: number; rate: number | null };
    studentAttendance: { present: number; total: number; rate: number | null };
    blockedStudents: number;
    pendingInvoices: number;
    outstandingAmount: number;
  };
  timetable: Array<{ id: string; time: string | null; title: string; detail: string; room: string; status: string }>;
  resources: Array<{ id: string; label: string; detail: string; status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED'; actionRequired: boolean; createdAt: string }>;
  pettyCash: Array<{ id: string; amount: number; purpose: string; status: 'PENDING' }>;
}

// Helper to remove token
export function removeAuthToken() {
  localStorage.removeItem('tms_tenant_id');
  localStorage.removeItem('tms_user');
  localStorage.removeItem('tms_session_scope');
  sessionStorage.removeItem('tms_tenant_id');
  sessionStorage.removeItem('tms_user');
}

// Helper to get current tenantId
export function getTenantId(): string | null {
  return sessionStorage.getItem('tms_tenant_id') ?? localStorage.getItem('tms_tenant_id');
}

export function setTenantId(tenantId: string) {
  localStorage.setItem('tms_tenant_id', tenantId);
}

// API Service exports
export const api = {
  // Authentication
  auth: {
    requestPasswordReset: async (email: string) => {
      return request<{ success: boolean }>('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });
    },
    verifyPasswordResetOtp: async (email: string, otp: string) => {
      return request<{ resetToken: string }>('/auth/verify-reset-otp', {
        method: 'POST',
        body: JSON.stringify({ email, otp }),
      });
    },
    resetPassword: async (resetToken: string, newPassword: string) => {
      return request<{ success: boolean }>('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ resetToken, newPassword }),
      });
    },
  },

  // Finances
  finances: {
    getAccountantWorkspace: async () => request<AccountantWorkspace>('/finances/accountant-workspace'),
    requestPettyCash: async (payload: { branchId: string; purpose: string; amount: number }) =>
      request<{ message: string; pettyCash: AccountantWorkspace['pettyCash'][number] }>('/finances/petty-cash/request', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    resubmitPettyCash: async (id: string, payload: { purpose: string; amount: number }) =>
      request<{ message: string; pettyCash: AccountantWorkspace['pettyCash'][number] }>(`/finances/petty-cash/${id}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      }),
    submitPettyCashReceipt: async (id: string, receiptProofUrl: string) =>
      request<{ message: string; pettyCash: AccountantWorkspace['pettyCash'][number] }>(`/finances/petty-cash/upload-receipt/${id}`, {
        method: 'POST',
        body: JSON.stringify({ receiptProofUrl }),
      }),
    getPL: async () => {
      return request<{
        revenue: number;
        operatingCosts: number;
        netMargin: number;
        month: string;
      }>('/finances/pl');
    },
    getPettyCash: async () => {
      return request<any[]>('/finances/petty-cash');
    },
    approvePettyCash: async (id: string, action: 'APPROVE_L1' | 'APPROVE_L2', remarks?: string) => {
      const level = action === 'APPROVE_L1' ? 'approve-l1' : 'approve-l2';
      return request<{ message: string; pettyCash: any }>(`/finances/petty-cash/${level}/${id}`, {
        method: 'POST',
        body: JSON.stringify({ remarks }),
      });
    },
    updateConfig: async (
      vatRate: number,
      gracePeriod: number,
      pettyCashCap: number,
      policies: {
        refundPolicy: string;
        lateFeeEnabled: boolean;
        lateFeeMode: string;
        lateFeeValue: number;
        lateFeeGraceDays: number;
        appointmentWindowHours: number;
        maintenanceEscalationDays: number;
        leavePolicy: Record<string, unknown>;
        performanceWeights: Record<string, number>;
      },
    ) => {
      return request<{ success: boolean; tenant: any }>('/finances/config', {
        method: 'PUT',
        body: JSON.stringify({
          vatRate,
          gracePeriod,
          pettyCashCap,
          ...policies,
        }),
      });
    },
    decidePettyCash: async (id: string, action: 'REJECT' | 'REVISION', remarks?: string) => {
      return request<{ message: string; pettyCash: any }>(`/finances/petty-cash/decide/${id}`, {
        method: 'POST',
        body: JSON.stringify({ action, remarks }),
      });
    },
    getConfig: async () => {
      return request<{
        vatRate: number; gracePeriod: number; pettyCashCap: number; refundPolicy: string;
        lateFeeEnabled: boolean; lateFeeMode: string | null; lateFeeValue: number | null;
        lateFeeGraceDays: number; appointmentWindowHours: number; maintenanceEscalationDays: number;
        leavePolicy: Record<string, unknown> | null; performanceWeights: Record<string, number> | null;
      }>('/finances/config');
    },
    getForecast: async () => request<any>('/finances/forecast'),
    getSuggestions: async () => request<any>('/finances/suggestions'),
    exportLedger: async () => request<{ format: string; entries: any[] }>('/finances/ledger/export'),
    getBillingPeriod: async () => {
      return request<{ label: string; bsYear: number; bsMonthName: string; bsMonthNameNp: string; daysInMonth: number; cycleStart: string; cycleEnd: string; dueDate: string }>('/finances/billing-period');
    },
    getOverview: async () => {
      return request<{ collected: number; outstanding: number; overdueAmount: number; overdueStudents: number; invoiceCount: number; billingPeriod: string }>('/finances/overview');
    },
    getStudentFees: async () => {
      const data = await request<{ students: Array<{ studentId: string; userId: string; name: string; email: string; branchId: string | null; branchName: string | null; totalBilled: number; totalPaid: number; totalDue: number; overdueCount: number; overdueAmount: number; invoiceCount: number }> }>('/finances/students');
      return data.students ?? [];
    },
    getStudentInvoices: async (studentId: string) => {
      const data = await request<{ invoices: Array<{ id: string; netPayable: number; status: string; overdue: boolean; dueDate: string; billingCycleStart: string; billingCycleEnd: string; paymentDate: string | null }> }>(`/finances/students/${studentId}/invoices`);
      return data.invoices ?? [];
    },
    payInvoice: async (invoiceId: string, transactionId?: string) => {
      return request<{ message: string; invoice: any }>(`/finances/invoices/${invoiceId}/pay`, {
        method: 'POST',
        body: JSON.stringify({ transactionId }),
      });
    },
    initiateConnectIps: async (invoiceId: string) => {
      return request<{
        payment: { txnId: string; invoiceId: string; amountPaisa: string; status: string };
        gatewayUrl: string;
        fields: Record<string, string>;
      }>(`/finances/connectips/initiate/${invoiceId}`, { method: 'POST' });
    },
    getConnectIpsStatus: async (txnId: string) => {
      return request<{
        txnId: string;
        invoiceId: string;
        status: string;
        gatewayStatus: string | null;
        confirmedAt: string | null;
      }>(`/finances/connectips/status/${encodeURIComponent(txnId)}`);
    },
    generateInvoices: async () => {
      return request<{ message: string; created: number; billingPeriod: string; skipped: number }>('/finances/generate-invoices', {
        method: 'POST',
      });
    }
  },

  // Teacher workspace
  teacher: {
    getDashboard: async () => request<any>('/teacher/workspace'),
    submitSessionUpdate: async (sessionId: string, updateContent: string) => {
      return request<{ message: string; session: any }>(`/teacher/session/${sessionId}/update`, {
        method: 'POST',
        body: JSON.stringify({ updateContent }),
      });
    },
    saveClassAttendance: async (classId: string, date: string, records: Array<{ studentId: string; status: 'PRESENT' | 'ABSENT' }>) =>
      request<any>(`/teacher/class/${classId}/attendance`, { method: 'POST', body: JSON.stringify({ date, records }) }),
    createSyllabus: async (payload: { classId: string; subject: string; chapters: string[] }) =>
      request<any>('/teacher/syllabus', { method: 'POST', body: JSON.stringify(payload) }),
    updateSyllabus: async (syllabusId: string, payload: { subject: string; chapters: Array<{ id?: string; title: string }> }) =>
      request<any>(`/teacher/syllabus/${syllabusId}`, { method: 'PATCH', body: JSON.stringify(payload) }),
    updateSyllabusLog: async (syllabusId: string, payload: { chapterId: string; status: 'IN_PROGRESS' | 'COMPLETED' | 'LEFT'; notes?: string; logDate?: string }) =>
      request<any>(`/teacher/syllabus/${syllabusId}/log`, { method: 'POST', body: JSON.stringify(payload) }),
    createHomework: async (payload: { classId: string; subject: string; title: string; description?: string; contentUrl?: string; deadline: string }) =>
      request<any>('/homework', { method: 'POST', body: JSON.stringify(payload) }),
    saveResultDraft: async (payload: any) => request<{ message: string; resultIds: string[] }>('/teacher/results', { method: 'POST', body: JSON.stringify(payload) }),
    shareResults: async (resultIds: string[]) => request<any>('/teacher/results/share', { method: 'POST', body: JSON.stringify({ resultIds }) }),
    requestLeave: async (payload: { branchId: string; leaveType: string; startDate: string; endDate: string; reason: string }) =>
      request<any>('/leaves/request', { method: 'POST', body: JSON.stringify(payload) }),
  },

  // Geo attendance (Teacher)
  attendance: {
    markIn: async (branchId: string, latitude: number, longitude: number, gpsAccuracy: number) => {
      return request<{ message: string; stamp: any; geofenceMeta: any }>('/attendance/in', {
        method: 'POST',
        body: JSON.stringify({ branchId, latitude, longitude, gpsAccuracy }),
      });
    },
    markOut: async (branchId: string, latitude: number, longitude: number, gpsAccuracy: number) => {
      return request<{ message: string; stamp: any }>('/attendance/out', {
        method: 'POST',
        body: JSON.stringify({ branchId, latitude, longitude, gpsAccuracy }),
      });
    },
  },


  // Parent-Teacher Communication Chat
  chat: {
    getMessages: async () => {
      return request<any[]>('/communication/chat');
    },
    sendMessage: async (text: string) => {
      return request<{ success: boolean; message: any }>('/communication/chat', {
        method: 'POST',
        body: JSON.stringify({ text }),
      });
    }
  },

  // Tenant dashboard summary (students, teachers, dues, leaves, per-branch)
  tenant: {
    getDashboard: async () => {
      return request<{
        activeStudentsCount: number;
        activeTeachersCount: number;
        totalOverdueAmountNpr: number;
        pendingLeaveRequestsCount: number;
        branchSummary: Array<{ branchId: string; branchName: string; activeStudents: number; staffRoles: number }>;
      }>('/onboarding/dashboard');
    },
    getDocumentAlerts: async () => request<{ expiringDocs: any[] }>('/hr/documents/alerts'),
    listCalendarEvents: async () => request<{ events: any[] }>('/academic-events'),
    publishCalendarEvent: async (payload: {
      title: string; description?: string; eventType: string; startDate: string; endDate: string;
    }) => request<{ message: string; event: any }>('/academic-events', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  },

  // People / user provisioning (Tenant Admin + Branch Admin)
  people: {
    capabilities: async () => {
      return request<{
        isTenantAdmin: boolean;
        isBranchAdmin: boolean;
        canManagePeople: boolean;
        creatableRoles: string[];
        manageableBranches: Array<{ id: string; name: string }>;
      }>('/users/me');
    },
    list: async () => {
      const data = await request<{ users: any[] }>('/users');
      return data.users ?? [];
    },
    getProfile: async (userId: string) => {
      return request<any>(`/users/${userId}/profile`);
    },
    getAnalytics: async (userId: string) => {
      return request<{
        name: string;
        grade: string | null;
        attendance: {
          present: number; absent: number; excused: number; blocked: number; totalMarked: number; rate: number | null;
          trend: Array<{ month: string; present: number; total: number; rate: number | null }>;
        };
        homework: {
          assigned: number; submitted: number; graded: number; pending: number; overdue: number;
          completionRate: number | null; onTimeRate: number | null;
          timeline: Array<{ id: string; title: string; subject: string; course: string | null; deadline: string; status: 'GRADED' | 'SUBMITTED' | 'OVERDUE' | 'PENDING'; late: boolean; grade: string | null; submittedAt: string | null }>;
        };
        fees: { paid: number; due: number; overdue: number; collectionRate: number | null };
        activeCourses: string[];
        perCourse: Array<{ course: string; className: string; teacher: string | null; status: string; attendanceRate: number | null; homeworkAssigned: number; homeworkSubmitted: number }>;
        activity: Array<{ type: string; date: string; label: string; detail?: string }>;
        connections: { courses: string[]; teachers: string[]; parents: string[] };
      }>(`/users/${userId}/analytics`);
    },
    update: async (userId: string, changes: { firstName?: string; lastName?: string; phone?: string; status?: string; gradeId?: string | null }) => {
      return request<{ message: string; droppedEnrollments?: number }>(`/users/${userId}`, { method: 'PUT', body: JSON.stringify(changes) });
    },
    deactivate: async (userId: string) => {
      return request<{ message: string }>(`/users/${userId}`, { method: 'DELETE' });
    },
    createBranchAdmin: async (payload: { firstName: string; lastName: string; email: string; phone?: string; branchId: string }) => {
      return request<{ message: string; user: any; temporaryPassword: string }>('/users/branch-admin', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    create: async (payload: { firstName: string; lastName: string; email: string; phone?: string; role: string; branchId: string; gradeId?: string; studentId?: string }) => {
      return request<{ message: string; user: any; temporaryPassword: string }>('/users', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    bulkCreateStudents: async (students: Array<Record<string, string>>) => {
      return request<{
        createdCount: number;
        errorCount: number;
        results: Array<{ row: number; name: string; email: string; status: 'created' | 'error'; temporaryPassword?: string; parentEmail?: string; parentTemporaryPassword?: string; error?: string }>;
      }>('/users/bulk-students', {
        method: 'POST',
        body: JSON.stringify({ students }),
      });
    },
  },

  // Grade levels (Nursery … Class 12)
  grades: {
    list: async () => {
      const data = await request<{ grades: Array<{ id: string; name: string; sortOrder: number; studentCount: number }> }>('/grades');
      return data.grades ?? [];
    },
    seedDefaults: async () => {
      return request<{ message: string; created: number }>('/grades/seed-defaults', { method: 'POST' });
    },
    create: async (name: string, sortOrder?: number, monthlyFee?: number) => {
      return request<{ message: string; grade: any }>('/grades', { method: 'POST', body: JSON.stringify({ name, sortOrder, monthlyFee }) });
    },
    update: async (id: string, changes: { name?: string; sortOrder?: number; monthlyFee?: number }) => {
      return request<{ message: string; grade: any }>(`/grades/${id}`, { method: 'PUT', body: JSON.stringify(changes) });
    },
    remove: async (id: string) => {
      return request<{ message: string }>(`/grades/${id}`, { method: 'DELETE' });
    },
    getDetail: async (id: string) => {
      return request<{
        id: string;
        name: string;
        studentCount: number;
        courseCount: number;
        teacherCount: number;
        students: Array<{ studentId: string; userId: string; name: string; email: string }>;
        courses: Array<{ id: string; name: string; branchName: string; classCount: number; enrollmentCount: number }>;
        teachers: Array<{ id: string; name: string }>;
      }>(`/grades/${id}`);
    },
  },

  // Academics — courses & classes (Tenant Admin / Branch Admin)
  academics: {
    listCourses: async () => {
      const data = await request<{ courses: any[] }>('/courses');
      return data.courses ?? [];
    },
    createCourse: async (payload: {
      branchId: string;
      gradeId?: string;
      name: string;
      description?: string;
      type: string;
      feeStructure: Record<string, unknown>;
      isTaxExempt?: boolean;
      taxPercentage?: number;
    }) => {
      return request<{ message: string; course: any }>('/courses', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    bulkCreateCourses: async (payload: {
      branchId: string;
      items: Array<{ name: string; gradeId?: string | null; type?: string; monthlyBase: number; isTaxExempt?: boolean; description?: string }>;
    }) => {
      return request<{
        message: string;
        created: number;
        skipped: number;
        results: Array<{ index: number; name: string; status: 'created' | 'skipped' | 'error'; error?: string }>;
      }>('/courses/bulk', { method: 'POST', body: JSON.stringify(payload) });
    },
    listClasses: async () => {
      const data = await request<{ classes: any[] }>('/courses/classes');
      return data.classes ?? [];
    },
    createClass: async (payload: { courseId: string; name: string; schedule: unknown }) => {
      return request<{ message: string; class: any }>('/courses/classes', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    updateCourse: async (id: string, changes: { name?: string; description?: string | null; type?: string; feeStructure?: Record<string, unknown>; isTaxExempt?: boolean; taxPercentage?: number; gradeId?: string | null }) => {
      return request<{ message: string; course: any }>(`/courses/${id}`, {
        method: 'PUT',
        body: JSON.stringify(changes),
      });
    },
    deleteCourse: async (id: string) => {
      return request<{ message: string }>(`/courses/${id}`, { method: 'DELETE' });
    },
    enroll: async (studentId: string, courseId: string, classId: string) => {
      return request<{ message: string; enrollment: any; monthlyDelta: number }>('/courses/enroll', {
        method: 'POST',
        body: JSON.stringify({ studentId, courseId, classId }),
      });
    },
    unenroll: async (enrollmentId: string) => {
      return request<{ message: string }>(`/courses/enrollments/${enrollmentId}`, { method: 'DELETE' });
    },
    updateClass: async (id: string, changes: { name?: string; schedule?: unknown; teacherId?: string | null }) => {
      return request<{ message: string; class: any }>(`/courses/classes/${id}`, {
        method: 'PUT',
        body: JSON.stringify(changes),
      });
    },
    deleteClass: async (id: string) => {
      return request<{ message: string }>(`/courses/classes/${id}`, { method: 'DELETE' });
    },
  },

  // Branch management (Tenant Admin)
  branches: {
    list: async () => {
      const data = await request<{ branches: any[] }>('/branches');
      return data.branches ?? [];
    },
    create: async (branch: {
      name: string;
      address: string;
      latitude: number;
      longitude: number;
      radiusMeters?: number;
      gracePeriodMinutes?: number;
    }) => {
      return request<{ message: string; branch: any }>('/branches', {
        method: 'POST',
        body: JSON.stringify(branch),
      });
    },
    update: async (id: string, changes: Record<string, unknown>) => {
      return request<{ message: string; branch: any }>(`/branches/${id}`, {
        method: 'PUT',
        body: JSON.stringify(changes),
      });
    },
  },

  // Branch Admin operations. Authorization and branch scoping are enforced by the API.
  branchAdmin: {
    getDashboard: async (branchId?: string) => request<BranchAdminDashboardData>(`/branch-admin/dashboard${branchId ? `?branchId=${encodeURIComponent(branchId)}` : ''}`),
    decideLeave: async (leaveId: string, action: 'APPROVE' | 'REJECT', remarks?: string) =>
      request<{ message: string; leave: any }>(`/leaves/approve/${leaveId}`, { method: 'POST', body: JSON.stringify({ action, remarks }) }),
    emergencyDeparture: async (payload: { studentId: string; branchId: string; reason: string; collectedBy?: string; departureTime?: string }) =>
      request<{ message: string; leave: any }>('/leaves/emergency-out', { method: 'POST', body: JSON.stringify(payload) }),
    addRemark: async (payload: { studentId: string; subject: string; message: string; parentVisible: boolean }) =>
      request<{ message: string; remark: any }>('/performance/student/remarks', { method: 'POST', body: JSON.stringify(payload) }),
    createPersonalizedClass: async (payload: { branchId: string; name: string; courseId: string; schedule: unknown; feeStructure: unknown }) =>
      request<{ message: string; class: any }>('/classes/personalized', { method: 'POST', body: JSON.stringify(payload) }),
    createCalendarEvent: async (payload: { branchId: string; title: string; description?: string; eventType: string; startDate: string; endDate: string }) =>
      request<{ message: string; event: any }>('/academic-events', { method: 'POST', body: JSON.stringify(payload) }),
    issueCertificate: async (payload: { studentId: string; templateId: string; branchId: string }) =>
      request<{ message: string; certificate: any }>('/certificates/issue', { method: 'POST', body: JSON.stringify(payload) }),
    completeMaintenanceTask: async (taskId: string) =>
      request<{ message: string; task: any }>(`/resources/tasks/complete/${taskId}`, { method: 'POST' }),
    grantFeeOverride: async (payload: { studentId: string; branchId: string; scope: 'ONE_SESSION' | 'ONE_DAY'; reason: string }) =>
      request<{ message: string; override: any }>('/branch-admin/fee-overrides', { method: 'POST', body: JSON.stringify(payload) }),
    createSocialDraft: async (payload: { branchId: string; text: string; platforms: string[]; mediaUrls: string[]; proposedTime?: string }) =>
      request<{ message: string; draft: any }>('/branch-admin/social-drafts', { method: 'POST', body: JSON.stringify(payload) }),
  },

  // Onboarding & tenant provisioning (Super Admin)
  onboarding: {
    getRequests: async () => {
      const data = await request<{ requests: any[] }>('/onboarding/requests');
      return data.requests ?? [];
    },
    approveRequest: async (id: string, defaultBranchName?: string) => {
      return request<{
        message: string;
        provisioned: {
          tenantId: string;
          tenantName: string;
          primaryAdminUser: string;
          defaultBranch: string;
          temporaryPassword: string;
        };
      }>(`/onboarding/approve/${id}`, {
        method: 'POST',
        body: JSON.stringify({ defaultBranchName }),
      });
    },
    rejectRequest: async (id: string) => {
      return request<{ message: string; request: any }>(`/onboarding/reject/${id}`, {
        method: 'POST',
      });
    },
    getTenants: async () => {
      const data = await request<{ tenants: any[] }>('/onboarding/tenants');
      return data.tenants ?? [];
    },
  }
};
