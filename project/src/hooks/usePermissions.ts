import { useContext } from 'react';
import { AppContext } from '../App';

export const usePermissions = () => {
  const { userRole } = useContext(AppContext);

  const canView = () => true; // All roles can view

  const canEdit = () => {
    return ['owner', 'admin', 'member'].includes(userRole);
  };

  const canDelete = () => {
    return ['owner', 'admin', 'member'].includes(userRole);
  };

  const canManageSettings = () => {
    return ['owner', 'admin'].includes(userRole);
  };

  const canViewStaffOnly = () => {
    return ['owner', 'admin', 'member'].includes(userRole);
  };

  const canManageOrganization = () => {
    return userRole === 'owner';
  };

  return {
    userRole,
    canView,
    canEdit,
    canDelete,
    canManageSettings,
    canViewStaffOnly,
    canManageOrganization,
    isOwner: userRole === 'owner',
    isAdmin: userRole === 'admin',
    isMember: userRole === 'member',
    isViewer: userRole === 'viewer',
  };
};

export default usePermissions;