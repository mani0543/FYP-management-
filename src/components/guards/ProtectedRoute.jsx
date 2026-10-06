import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';

export default function ProtectedRoute({ children, allowedCapabilities = [], requiredResponsibility }) {
  const { user, activeAssignment, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-gray-500 text-sm">
        Verifying institutional credentials...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Super Admin has global override
  if (user.capabilities?.includes('ADMIN')) {
    return children;
  }

  if (allowedCapabilities.length > 0) {
    const hasCapability = user.capabilities?.some((c) => allowedCapabilities.includes(c));
    if (!hasCapability) {
      return <Navigate to="/login" replace />;
    }
  }

  if (requiredResponsibility && activeAssignment) {
    if (activeAssignment.responsibility !== requiredResponsibility) {
      // If user has capability but different active responsibility, still allow or switch
    }
  }

  return children;
}
