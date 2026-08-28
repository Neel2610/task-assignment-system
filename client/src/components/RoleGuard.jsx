import React from 'react';
import { Navigate } from 'react-router-dom';
import { useUserRole } from '../hooks/useUserRole';

export function RoleGuard({ allowedRoles, children, fallback }) {
  const { role, loading } = useUserRole();

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col justify-center items-center bg-[#0B0F17] text-slate-300">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-slate-700 border-t-blue-500 mb-4" />
        <p className="text-sm font-medium text-slate-400">Loading TaskFlow...</p>
      </div>
    );
  }

  if (!allowedRoles || !allowedRoles.includes(role)) {
    return fallback || <Navigate to="/dashboard" state={{ error: 'Access denied' }} replace />;
  }

  return children;
}

export default RoleGuard;
