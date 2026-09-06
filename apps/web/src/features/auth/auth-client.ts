import { createAuthClient } from 'better-auth/react';
import { twoFactorClient } from 'better-auth/client/plugins';
import { API_ORIGIN } from '../../services/api/client';

export const authClient = createAuthClient({
  // This app is built with Webpack, not Vite. Use the same Docker build-time
  // URL as every other API request so authentication never falls back to the
  // visitor's localhost in a hosted build.
  baseURL: API_ORIGIN,
  plugins: [twoFactorClient()],
  fetchOptions: {
    credentials: 'include',
  },
});
