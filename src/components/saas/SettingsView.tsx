'use client';

import { useAppStore } from '@/store/use-app-store';
import ErrorBoundary from './ErrorBoundary';
import AIProviderSection from './AIProviderSection';
import RoleManagement from '@/components/settings/RoleManagement';
import UsageDashboard from './UsageDashboard';
import WorkspaceSettings from './WorkspaceSettings';
import WebhookSettings from './WebhookSettings';
import PWAInstallSection from './PWAInstallSection';

export default function SettingsView() {
  const user = useAppStore((s) => s.user);
  const isAdmin = (user?.role || '').toLowerCase() === 'admin';

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h2 className="text-lg font-bold">Paramètres</h2>

      <ErrorBoundary><UsageDashboard /></ErrorBoundary>
      <ErrorBoundary><WorkspaceSettings /></ErrorBoundary>
      <ErrorBoundary><WebhookSettings /></ErrorBoundary>
      {isAdmin && <ErrorBoundary><AIProviderSection /></ErrorBoundary>}
      {isAdmin && <ErrorBoundary><RoleManagement /></ErrorBoundary>}
      <ErrorBoundary><PWAInstallSection /></ErrorBoundary>
    </div>
  );
}
