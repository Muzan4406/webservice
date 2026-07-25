import { useAuth } from '@/contexts/AuthContext';
import { useLocation } from 'wouter';
import { useEffect } from 'react';
import { useGetAppSettings } from '@workspace/api-client-react';
import MaintenancePage from '@/pages/maintenance';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const [, setLocation] = useLocation();
  const { data: appSettings } = useGetAppSettings();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      setLocation('/login');
    }
  }, [isAuthenticated, isLoading, setLocation]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  // Show maintenance page to non-admin users when maintenance mode is active
  if (appSettings?.maintenanceMode && !(user as any)?.isAdmin) {
    return <MaintenancePage message={appSettings.maintenanceMessage} />;
  }

  return <>{children}</>;
}
