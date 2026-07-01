import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  LayoutDashboard, 
  ShoppingBag, 
  ShoppingCart, 
  Wrench, 
  Package, 
  ShieldAlert, 
  Shield,
  BarChart3, 
  LogOut,
  Rocket,
  FileText,
  Bot
} from 'lucide-react';

interface SidebarProps {
  onChatToggle?: () => void;
  chatOpen?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({ onChatToggle, chatOpen }) => {
  const { user, logout, hasPermission } = useAuth();

  if (!user) return null;

  return (
    <aside className="sidebar">
      <div className="sidebar-logo" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
        <div style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', padding: '0.4rem', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Rocket size={20} color="#fff" />
        </div>
        <span style={{ fontWeight: 800, fontSize: '1.2rem', color: 'var(--text-primary)', letterSpacing: '0.02em' }}>ERP</span>
      </div>
      <ul className="sidebar-menu">
        <li>
          <NavLink 
            to="/dashboard" 
            className={({ isActive }) => `sidebar-item-link ${isActive ? 'active' : ''}`}
          >
            <LayoutDashboard />
            Dashboard
          </NavLink>
        </li>

        {hasPermission('products') && (
          <li>
            <NavLink 
              to="/products" 
              className={({ isActive }) => `sidebar-item-link ${isActive ? 'active' : ''}`}
            >
              <Package />
              Products
            </NavLink>
          </li>
        )}

        {hasPermission('sales_order') && (
          <li>
            <NavLink 
              to="/sales" 
              className={({ isActive }) => `sidebar-item-link ${isActive ? 'active' : ''}`}
            >
              <ShoppingBag />
              Sales Orders
            </NavLink>
          </li>
        )}

        {hasPermission('purchase_order') && (
          <li>
            <NavLink 
              to="/purchases" 
              className={({ isActive }) => `sidebar-item-link ${isActive ? 'active' : ''}`}
            >
              <ShoppingCart />
              Purchase Orders
            </NavLink>
          </li>
        )}

        {hasPermission('manufacturing_order') && (
          <>
            <li>
              <NavLink 
                to="/manufacturing" 
                className={({ isActive }) => `sidebar-item-link ${isActive ? 'active' : ''}`}
              >
                <Wrench />
                Manufacturing
              </NavLink>
            </li>
            <li>
              <NavLink 
                to="/bom" 
                className={({ isActive }) => `sidebar-item-link ${isActive ? 'active' : ''}`}
              >
                <FileText />
                Bills of Materials
              </NavLink>
            </li>
          </>
        )}

        {hasPermission('accounts') && (
          <li>
            <NavLink 
              to="/reports" 
              className={({ isActive }) => `sidebar-item-link ${isActive ? 'active' : ''}`}
            >
              <BarChart3 />
              Executive Reports
            </NavLink>
          </li>
        )}

        {/* Show Admin Portal and Audit Logs links only if the logged-in user has admin permission */}
        {hasPermission('admin_panel') && (
          <>
            <li>
              <NavLink 
                to="/admin" 
                className={({ isActive }) => `sidebar-item-link ${isActive ? 'active' : ''}`}
              >
                <ShieldAlert />
                Admin Portal
              </NavLink>
            </li>
            {/* The new Audit Logs sidebar link using Shield icon */}
            <li>
              <NavLink 
                to="/audit-logs" 
                className={({ isActive }) => `sidebar-item-link ${isActive ? 'active' : ''}`}
              >
                <Shield />
                Audit Logs
              </NavLink>
            </li>
          </>
        )}
        {/* AI Chatbot Option as last item */}
        {onChatToggle && (
          <li>
            <button
              onClick={onChatToggle}
              className={`sidebar-item-link ${chatOpen ? 'active' : ''}`}
              style={{ background: 'none', border: 'none', width: '100%', cursor: 'pointer', textAlign: 'left', display: 'flex', gap: '0.75rem', alignItems: 'center' }}
            >
              <Bot />
              AI Assistant
            </button>
          </li>
        )}
      </ul>

      <div className="sidebar-footer">
        <div className="sidebar-user-info" style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          <span style={{ fontWeight: 600, fontSize: '0.9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.name}</span>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{user.email}</span>
        </div>
        <button 
          onClick={logout} 
          className="btn btn-secondary" 
          style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '0.6rem' }}
        >
          <LogOut size={16} />
          Sign Out
        </button>
      </div>
    </aside>
  );
};
