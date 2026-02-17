'use client';

import { DemoProvider } from './DemoProvider';
import { AuthProvider } from './AuthProvider';
import { KpiProvider } from './KpiProvider';
import { FirmSettingsProvider } from './FirmSettingsProvider';
import AppLayoutWrapper from './AppLayoutWrapper';

export default function AuthWrapper({ children }) {
  return (
    <DemoProvider>
      <AuthProvider>
        <KpiProvider>
          <FirmSettingsProvider>
            <AppLayoutWrapper>{children}</AppLayoutWrapper>
          </FirmSettingsProvider>
        </KpiProvider>
      </AuthProvider>
    </DemoProvider>
  );
}
