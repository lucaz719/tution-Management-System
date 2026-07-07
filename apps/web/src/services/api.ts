// API Client Service for Tuition Management System (TMS)
// Scoped contextually by JWT and X-Tenant-Id for row-level isolation

const API_BASE_URL = 'http://localhost:3001/api';

// Helper to get token
export function getAuthToken(): string | null {
  return localStorage.getItem('tms_token');
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
}

// Helper to get current tenantId
export function getTenantId(): string | null {
  return localStorage.getItem('tms_tenant_id');
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
    login: async (email: string, pass: string) => {
      // Direct call to /auth/login
      const data = await request<{ token: string; tenantId: string; user: any }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password: pass }),
      });
      setAuthToken(data.token);
      setTenantId(data.tenantId);
      localStorage.setItem('tms_user', JSON.stringify(data.user));
      return data;
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
    approvePettyCash: async (id: string, action: 'APPROVE_L1' | 'APPROVE_L2') => {
      return request<{ success: boolean; request: any }>(`/finances/petty-cash/${id}/approve`, {
        method: 'POST',
        body: JSON.stringify({ action }),
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

  // Canteen (Cashless Canteen Wallet)
  canteen: {
    getBalance: async () => {
      return request<{ balance: number }>('/canteen/wallet');
    },
    reload: async (amount: number) => {
      return request<{ success: boolean; balance: number }>('/canteen/wallet/reload', {
        method: 'POST',
        body: JSON.stringify({ amount }),
      });
    },
    debit: async (amount: number, pin: string, item: string) => {
      return request<{ success: boolean; balance: number; message: string }>('/canteen/wallet/debit', {
        method: 'POST',
        body: JSON.stringify({ amount, pin, item }),
      });
    }
  },

  // Vehicle Tracking
  vehicles: {
    getRoute: async () => {
      return request<{ routeName: string; driverName: string; status: string; coords: { lat: number; lng: number } }>('/vehicles/route');
    },
    updateLocation: async (lat: number, lng: number) => {
      return request<{ success: boolean }>('/vehicles/location', {
        method: 'POST',
        body: JSON.stringify({ latitude: lat, longitude: lng }),
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

  // Onboarding Requests
  onboarding: {
    getRequests: async () => {
      return request<any[]>('/onboarding/requests');
    }
  }
};
