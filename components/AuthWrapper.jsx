'use client';

import { AuthProvider } from './AuthProvider';

export default function AuthWrapper({ children }) {
  return <AuthProvider>{children}</AuthProvider>;
}
