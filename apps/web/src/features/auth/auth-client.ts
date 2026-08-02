import { createAuthClient } from 'better-auth/react';
import { twoFactorClient } from 'better-auth/client/plugins';

export const authClient = createAuthClient({
  baseURL: (import.meta as any).env?.VITE_API_ORIGIN || 'http://localhost:3001',
  plugins: [twoFactorClient()],
  fetchOptions: {
    credentials: 'include',
  },
});
