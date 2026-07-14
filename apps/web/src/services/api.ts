// API Client Service for Tuition Management System (TMS)
// Scoped contextually by JWT and X-Tenant-Id for row-level isolation

const API_BASE_URL = 'http://localhost:3001/api';

// Helper to get token
export function getAuthToken(): string | null {
  return sessionStorage.getItem('tms_token') ?? localStorage.getItem('tms_token');
}

// Helper to set token
export function setAuthToken(token: string) {
  localStorage.setItem('tms_token', token);
}

// Helper to remove token
export function removeAuthToken() {
  localStorage.removeItem('tms_token');
  localStorage.removeItem('tms_tenant_id');
  localStorage.removeItem('tms_user');
  localStorage.removeItem('tms_session_scope');
  sessionStorage.removeItem('tms_token');
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

// Generic Request wrapper
async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getAuthToken();
  const tenantId = getTenantId();

  const headers = new Headers(options.headers || {});
  headers.set('Content-Type', 'application/json');
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  if (tenantId) {
    headers.set('X-Tenant-Id', tenantId);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errText = await response.text();
    let parsedErr;
    try {
      parsedErr = JSON.parse(errText);
    } catch {
      parsedErr = { error: errText || 'Network request failed' };
    }
    throw new Error(parsedErr.error || parsedErr.message || 'Request failed');
  }

  // Handle empty responses
  if (response.status === 204) {
    return {} as T;
  }

  return response.json() as Promise<T>;
}

// API Service exports
export const api = {
  // Authentication
  auth: {
    // Session persistence (token/user/tenant scope) is owned by AuthContext,
    // which honours the "remember me" choice.
    login: async (email: string, pass: string) => {
      return request<{ token: string; tenantId?: string; user: any }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password: pass }),
      });
    },
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
    requestTwoFactorCode: async (email: string) => {
      return request<{ success: boolean }>('/auth/2fa/request', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });
    },
    verifyTwoFactorCode: async (email: string, code: string) => {
      return request<{ success: boolean }>('/auth/2fa/verify', {
        method: 'POST',
        body: JSON.stringify({ email, code }),
      });
    },
  },

  // Finances
  finances: {
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
    updateConfig: async (vatRate: number, gracePeriod: number, pettyCashCap: number) => {
      return request<{ success: boolean; tenant: any }>('/finances/config', {
        method: 'PUT',
        body: JSON.stringify({ vatRate, gracePeriod, pettyCashCap }),
      });
    },
    getConfig: async () => {
      return request<{ vatRate: number; gracePeriod: number; pettyCashCap: number }>('/finances/config');
    },
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
    generateInvoices: async () => {
      return request<{ message: string; created: number; billingPeriod: string; skipped: number }>('/finances/generate-invoices', {
        method: 'POST',
      });
    }
  },

  // Teacher workspace
  teacher: {
    getDashboard: async () => {
      return request<{
        teacher: { id: string; name: string };
        branch: { id: string; name: string; latitude: number; longitude: number; radiusMeters: number } | null;
        attendance: { checkedIn: boolean; lastStampType: string | null; lastStampAt: string | null };
        todayClasses: Array<{
          sessionId: string;
          classId: string;
          className: string;
          courseName: string;
          schedule: any;
          status: string;
          dailyUpdateSubmitted: boolean;
          checkInTime: string | null;
          checkOutTime: string | null;
        }>;
        pendingUpdates: Array<{ sessionId: string; classId: string; className: string; courseName: string; date: string }>;
      }>('/teacher/dashboard');
    },
    submitSessionUpdate: async (sessionId: string, updateContent: string) => {
      return request<{ message: string; session: any }>(`/teacher/session/${sessionId}/update`, {
        method: 'POST',
        body: JSON.stringify({ updateContent }),
      });
    },
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
    create: async (payload: { firstName: string; lastName: string; email: string; phone?: string; role: string; branchId: string; gradeId?: string }) => {
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
