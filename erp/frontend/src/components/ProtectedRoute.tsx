import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface ProtectedRouteProps {
  permission?: 'admin_panel' | 'sales_order' | 'purchase_order' | 'manufacturing_order' | 'products' | 'accounts' | 'settings';
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ permission }) => {
  const { token, loading, hasPermission } = useAuth();

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', fontFamily: 'var(--font-family-title)', fontSize: '1.5rem', color: 'var(--primary)' }}>
        Loading ERP Session...
      </div>
    );
  }

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (permission && !hasPermission(permission)) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center', fontFamily: 'var(--font-family-title)' }}>
        <h2 style={{ fontSize: '2rem', color: 'var(--danger)', marginBottom: '1rem' }}>Access Denied</h2>
        <p style={{ color: 'var(--text-secondary)' }}>You do not have the required permissions to view this page.</p>
      </div>
    );
  }

  return <Outlet />;
};
