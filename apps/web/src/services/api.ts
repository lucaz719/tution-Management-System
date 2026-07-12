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
    }
  },

  // Attendance
  attendance: {
    markIn: async (lat: number, lng: number) => {
      return request<{ success: boolean; session: any }>('/attendance/mark-in', {
        method: 'POST',
        body: JSON.stringify({ latitude: lat, longitude: lng }),
      });
    },
    markOut: async () => {
      return request<{ success: boolean; session: any }>('/attendance/mark-out', {
        method: 'POST',
      });
    },
    submitDailySummary: async (summary: string) => {
      return request<{ success: boolean }>('/courses/lesson-update', {
        method: 'POST',
        body: JSON.stringify({ summary }),
      });
    }
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
    createBranchAdmin: async (payload: { firstName: string; lastName: string; email: string; phone?: string; branchId: string }) => {
      return request<{ message: string; user: any; temporaryPassword: string }>('/users/branch-admin', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    create: async (payload: { firstName: string; lastName: string; email: string; phone?: string; role: string; branchId: string }) => {
      return request<{ message: string; user: any; temporaryPassword: string }>('/users', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
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
