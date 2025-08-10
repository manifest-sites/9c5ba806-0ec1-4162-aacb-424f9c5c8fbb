import { usePermissions } from '../../hooks/usePermissions';

interface RoleGuardProps {
  children: React.ReactNode;
  allowedRoles?: ('owner' | 'admin' | 'member' | 'viewer')[];
  requireEdit?: boolean;
  requireSettings?: boolean;
  requireStaffOnly?: boolean;
  fallback?: React.ReactNode;
}

export const RoleGuard: React.FC<RoleGuardProps> = ({
  children,
  allowedRoles,
  requireEdit = false,
  requireSettings = false,
  requireStaffOnly = false,
  fallback = null,
}) => {
  const { userRole, canEdit, canManageSettings, canViewStaffOnly } = usePermissions();

  let hasAccess = true;

  if (allowedRoles && !allowedRoles.includes(userRole)) {
    hasAccess = false;
  }

  if (requireEdit && !canEdit()) {
    hasAccess = false;
  }

  if (requireSettings && !canManageSettings()) {
    hasAccess = false;
  }

  if (requireStaffOnly && !canViewStaffOnly()) {
    hasAccess = false;
  }

  if (!hasAccess) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};

export default RoleGuard;