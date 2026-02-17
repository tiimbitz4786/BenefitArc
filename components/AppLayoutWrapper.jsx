'use client';

import AppLayout from './AppLayout';
import { useFirmSettings } from './FirmSettingsProvider';

export default function AppLayoutWrapper({ children }) {
  const { firmSettings } = useFirmSettings();
  return <AppLayout firmSettings={firmSettings}>{children}</AppLayout>;
}
