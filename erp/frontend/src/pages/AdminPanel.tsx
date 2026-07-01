import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Check, X, RefreshCw, Plus, Eye, EyeOff } from 'lucide-react';

interface User {
  id: number;
  name: string;
  username: string;
  email: string;
  role: string;
  is_approved: boolean;
  created_at: string;
}

interface Permission {
  role: string;
  admin_panel: boolean;
  sales_order: boolean;
  purchase_order: boolean;
  manufacturing_order: boolean;
  products: boolean;
  accounts: boolean;
  settings: boolean;
}

export const AdminPanel: React.FC = () => {
  const { user: currentUser, refreshUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingPerm, setSavingPerm] = useState<string | null>(null);

  // User Creation Form Modal State
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rePassword, setRePassword] = useState('');
  const [role, setRole] = useState('User'); // Default to "User"
  const [showPassword, setShowPassword] = useState(false);
  const [showRePassword, setShowRePassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);



  const handleNameChange = (val: string) => {
    setName(val);
    const derived = val.toLowerCase().replace(/\s+/g, '');
    if (derived) {
      setUsername(derived);
      setEmail(`${derived}@example.com`);
      setPassword(`${derived}@26`);
      setRePassword(`${derived}@26`);
    } else {
      setUsername('');
      setEmail('');
      setPassword('');
      setRePassword('');
    }
  };

  const handleCreateUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== rePassword) {
      setError('Passwords do not match.');
      return;
    }

    setSubmitting(true);
    try {
      await axios.post('/api/users', {
        name,
        username,
        email,
        password,
        role
      });
      
      // Reset form states
      setName('');
      setUsername('');
      setEmail('');
      setPassword('');
      setRePassword('');
      setRole('User');
      setShowModal(false);
      
      // Refresh the users grid
      fetchData();
      alert('User created successfully and approved!');
    } catch (err: any) {
      const detail = err.response?.data?.detail;
      if (typeof detail === 'string' && detail.toLowerCase().includes('email')) {
        setError('Email ID already exists in the database.');
      } else if (typeof detail === 'string' && detail.toLowerCase().includes('username')) {
        setError('Login ID already taken. Please choose a different one.');
      } else {
        setError(detail || 'Failed to create user. Please check your data.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const usersRes = await axios.get('/api/users');
      const permsRes = await axios.get('/api/users/permissions');
      setUsers(usersRes.data);
      setPermissions(permsRes.data);
    } catch (error) {
      console.error('Error fetching admin data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleApprove = async (userId: number, currentApproved: boolean) => {
    try {
      await axios.put(`/api/users/${userId}/approve`, {
        is_approved: !currentApproved
      });
      fetchData();
      refreshUser();
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Failed to update approval status');
    }
  };

  const handleRoleChange = async (userId: number, newRole: string) => {
    try {
      await axios.put(`/api/users/${userId}/role`, {
        role: newRole
      });
      fetchData();
      refreshUser();
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Failed to update user role');
    }
  };

  const handleDeleteUser = async (userId: number) => {
    if (!window.confirm('Are you sure you want to delete this user request?')) return;
    try {
      await axios.delete(`/api/users/${userId}`);
      fetchData();
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Failed to delete user');
    }
  };

  const handlePermissionToggle = async (role: string, field: keyof Permission) => {
    if (role === 'Admin') return; // Admin permissions cannot be modified
    setSavingPerm(role);

    // Find local permission object
    const pObj = permissions.find(p => p.role === role);
    if (!pObj) return;

    const updatedPerm = {
      ...pObj,
      [field]: !pObj[field]
    };

    try {
      await axios.put(`/api/users/permissions/${role}`, updatedPerm);
      // Update local state
      setPermissions(prev => prev.map(p => p.role === role ? updatedPerm : p));
      refreshUser();
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Failed to save permissions');
    } finally {
      setSavingPerm(null);
    }
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
      
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Admin Portal</h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            Manage user roles, approvals, and authorization matrices.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            onClick={() => {
              setError(null);
              setShowModal(true);
            }}
            className="btn btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <Plus size={16} />
            Create User
          </button>
          <button onClick={fetchData} className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <RefreshCw size={16} />
            Reload Panel
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', color: 'var(--primary)', padding: '3rem' }}>
          Loading admin utilities...
        </div>
      ) : (
        <>
          {/* USER REQUESTS APPROVAL TABLE */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <h2 style={{ fontFamily: 'var(--font-family-title)', fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              👥 User Accounts & Access Requests
            </h2>

            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>User ID</th>
                    <th>Name</th>
                    <th>Username</th>
                    <th>Email</th>
                    <th>Role Group</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.id}>
                      <td style={{ fontWeight: 600 }}>#{u.id}</td>
                      <td>{u.name}</td>
                      <td style={{ color: 'var(--primary)', fontWeight: 500 }}>{u.username}</td>
                      <td>{u.email}</td>
                      <td>
                        <select 
                          value={u.role} 
                          disabled={u.id === currentUser?.id}
                          onChange={(e) => handleRoleChange(u.id, e.target.value)}
                          style={{ padding: '0.35rem 0.5rem', borderRadius: 'var(--border-radius-sm)', border: '1px solid var(--border-color)', fontSize: '0.85rem' }}
                        >
                           {/* Only two roles: Admin and User are permitted */}
                           <option value="Admin">Admin</option>
                           <option value="User">User</option>
                        </select>
                      </td>
                      <td>
                        <span className={`status-pill ${u.is_approved ? 'status-completed' : 'status-pending'}`}>
                          {u.is_approved ? 'Approved' : 'Pending'}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button
                            onClick={() => handleApprove(u.id, u.is_approved)}
                            disabled={u.id === currentUser?.id}
                            className={`btn ${u.is_approved ? 'btn-secondary' : 'btn-success'}`}
                            style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                            title={u.is_approved ? 'Revoke Approval' : 'Approve User'}
                          >
                            {u.is_approved ? <X size={14} /> : <Check size={14} />}
                            {u.is_approved ? 'Revoke' : 'Approve'}
                          </button>
                          <button
                            onClick={() => handleDeleteUser(u.id)}
                            disabled={u.id === currentUser?.id}
                            className="btn btn-danger"
                            style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
                          >
                            Remove
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* DYNAMIC ROLE PERMISSIONS MATRIX */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div>
              <h2 style={{ fontFamily: 'var(--font-family-title)', fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                🛡️ Role Authorization Matrix
              </h2>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                Configure access flags for modules dynamically. Changes take effect on active sessions immediately.
              </p>
            </div>

            <div className="table-container">
              <table className="permission-matrix">
                <thead>
                  <tr>
                    <th>Role Name</th>
                    <th style={{ textAlign: 'center' }}>Admin Portal</th>
                    <th style={{ textAlign: 'center' }}>Sales module</th>
                    <th style={{ textAlign: 'center' }}>Purchase module</th>
                    <th style={{ textAlign: 'center' }}>Manufacturing</th>
                    <th style={{ textAlign: 'center' }}>Products catalog</th>
                    <th style={{ textAlign: 'center' }}>Accounts / Reports</th>
                    <th style={{ textAlign: 'center' }}>Settings</th>
                  </tr>
                </thead>
                <tbody>
                  {permissions.map(p => (
                    <tr key={p.role}>
                      <td style={{ fontWeight: 700 }}>
                        {p.role} {savingPerm === p.role && <span style={{ fontSize: '0.75rem', fontWeight: 400, color: 'var(--text-tertiary)' }}>(Saving...)</span>}
                      </td>
                      
                      <td style={{ textAlign: 'center' }}>
                        <input 
                          type="checkbox" 
                          className="permission-checkbox"
                          checked={p.admin_panel} 
                          disabled={p.role === 'Admin'}
                          onChange={() => handlePermissionToggle(p.role, 'admin_panel')}
                        />
                      </td>

                      <td style={{ textAlign: 'center' }}>
                        <input 
                          type="checkbox" 
                          className="permission-checkbox"
                          checked={p.sales_order} 
                          disabled={p.role === 'Admin'}
                          onChange={() => handlePermissionToggle(p.role, 'sales_order')}
                        />
                      </td>

                      <td style={{ textAlign: 'center' }}>
                        <input 
                          type="checkbox" 
                          className="permission-checkbox"
                          checked={p.purchase_order} 
                          disabled={p.role === 'Admin'}
                          onChange={() => handlePermissionToggle(p.role, 'purchase_order')}
                        />
                      </td>

                      <td style={{ textAlign: 'center' }}>
                        <input 
                          type="checkbox" 
                          className="permission-checkbox"
                          checked={p.manufacturing_order} 
                          disabled={p.role === 'Admin'}
                          onChange={() => handlePermissionToggle(p.role, 'manufacturing_order')}
                        />
                      </td>

                      <td style={{ textAlign: 'center' }}>
                        <input 
                          type="checkbox" 
                          className="permission-checkbox"
                          checked={p.products} 
                          disabled={p.role === 'Admin'}
                          onChange={() => handlePermissionToggle(p.role, 'products')}
                        />
                      </td>

                      <td style={{ textAlign: 'center' }}>
                        <input 
                          type="checkbox" 
                          className="permission-checkbox"
                          checked={p.accounts} 
                          disabled={p.role === 'Admin'}
                          onChange={() => handlePermissionToggle(p.role, 'accounts')}
                        />
                      </td>

                      <td style={{ textAlign: 'center' }}>
                        <input 
                          type="checkbox" 
                          className="permission-checkbox"
                          checked={p.settings} 
                          disabled={p.role === 'Admin'}
                          onChange={() => handlePermissionToggle(p.role, 'settings')}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* CREATE USER MODAL OVERLAY */}
      {showModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backdropFilter: 'blur(4px)'
        }}>
          <div className="card animate-fade-in" style={{ width: '100%', maxWidth: '480px', display: 'flex', flexDirection: 'column', gap: '1.5rem', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontFamily: 'var(--font-family-title)', fontSize: '1.4rem' }}>
                Create New User
              </h2>
              <button onClick={() => setShowModal(false)} className="btn btn-secondary btn-icon">
                <X size={16} />
              </button>
            </div>

            {error && (
              <div style={{
                background: 'var(--danger-bg)',
                border: '1px solid var(--border-color)',
                color: 'var(--danger-text)',
                borderRadius: 'var(--border-radius-sm)',
                padding: '0.75rem 1rem',
                fontSize: '0.875rem',
                fontWeight: 500
              }}>
                {error}
              </div>
            )}

            <form onSubmit={handleCreateUserSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div className="form-group">
                <label htmlFor="create-name">Full Name</label>
                <input
                  id="create-name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="e.g. John Doe"
                />
              </div>

              <div className="form-group">
                <label htmlFor="create-username">Login</label>
                <input
                  id="create-username"
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Login ID (autogenerated)"
                />
              </div>

              <div className="form-group">
                <label htmlFor="create-email">Email Address</label>
                <input
                  id="create-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. john@example.com"
                />
              </div>

              <div className="form-group">
                <label htmlFor="create-role">Role</label>
                <select
                  id="create-role"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  style={{ width: '100%' }}
                >
                  <option value="User">User (Standard Access)</option>
                  <option value="Admin">Admin (Full Access)</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="create-password">Password</label>
                <div style={{ position: 'relative' }}>
                  <input
                    id="create-password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Password (autogenerated)"
                    style={{ width: '100%', paddingRight: '2.5rem' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: 'absolute',
                      right: '0.65rem',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: 'var(--text-tertiary)',
                      display: 'flex',
                      alignItems: 'center'
                    }}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="create-repassword">Repeat Password</label>
                <div style={{ position: 'relative' }}>
                  <input
                    id="create-repassword"
                    type={showRePassword ? 'text' : 'password'}
                    required
                    value={rePassword}
                    onChange={(e) => setRePassword(e.target.value)}
                    placeholder="Repeat password"
                    style={{ width: '100%', paddingRight: '2.5rem' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowRePassword(!showRePassword)}
                    style={{
                      position: 'absolute',
                      right: '0.65rem',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: 'var(--text-tertiary)',
                      display: 'flex',
                      alignItems: 'center'
                    }}
                  >
                    {showRePassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Creating...' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
