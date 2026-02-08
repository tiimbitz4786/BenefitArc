'use client';

import { AuthProvider } from './AuthProvider';
import { KpiProvider } from './KpiProvider';

export default function AuthWrapper({ children }) {
  return (
    <AuthProvider>
      <KpiProvider>{children}</KpiProvider>
    </AuthProvider>
  );
}
