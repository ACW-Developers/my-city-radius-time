import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

export default function AdminGuard({ children }: { children: ReactNode }) {
  const { isAdmin, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-pulse text-primary text-lg">Loading...</div>
      </div>
    );
  }

  if (!isAdmin) return <Navigate to="/dashboard" replace />;

  return <>{children}</>;
}
