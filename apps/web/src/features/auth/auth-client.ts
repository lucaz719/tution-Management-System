import { createAuthClient } from 'better-auth/react';

export const authClient = createAuthClient({
  baseURL: (import.meta as any).env?.VITE_API_ORIGIN || 'http://localhost:3001',
  fetchOptions: {
    credentials: 'include',
  },
});
