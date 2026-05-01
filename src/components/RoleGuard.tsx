import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { Role } from '../types';
import { Button } from './ui';
import { Settings } from 'lucide-react';

interface RoleGuardProps {
  children: React.ReactNode;
  requiredRoles: Role[];
}

export const RoleGuard: React.FC<RoleGuardProps> = ({ children, requiredRoles }) => {
  const { activeRole } = useAuthStore();
  const location = useLocation();

  if (!activeRole) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!requiredRoles.includes(activeRole)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
};

export const RoleSwitcher: React.FC = () => {
  const { activeRole, userName } = useAuthStore();
  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {isOpen && (
        <div className="absolute bottom-16 right-0 bg-bg-card border border-border p-4 rounded-xl shadow-2xl w-64 space-y-2 animate-in fade-in slide-in-from-bottom-5">
          <h3 className="text-xs font-bold text-text-muted uppercase mb-2">Active Session</h3>
          <div className="w-full text-left px-3 py-2 rounded-lg bg-bg-surface text-sm flex flex-col">
            <span className="font-medium">{activeRole ?? 'Not signed in'}</span>
            <span className="text-[10px] text-text-muted">{userName ?? 'Guest'}</span>
          </div>
        </div>
      )}
      <Button 
        onClick={() => setIsOpen(!isOpen)}
        variant="secondary"
        className="rounded-full h-12 w-12 p-0 flex items-center justify-center shadow-lg border-accent/20"
      >
        <Settings />
      </Button>
    </div>
  );
};
