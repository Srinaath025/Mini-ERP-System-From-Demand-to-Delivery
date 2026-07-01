import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ShieldCheck, ShieldAlert } from 'lucide-react';

export const ResetPassword: React.FC = () => {
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setSubmitting(true);
    // Mimic API update
    setTimeout(() => {
      setSubmitting(false);
      setSuccess(true);
    }, 800);
  };

  if (success) {
    return (
      <div className="auth-page">
        <div className="auth-card animate-fade-in" style={{ textAlign: 'center' }}>
          <div style={{ display: 'inline-flex', padding: '1rem', backgroundColor: 'var(--success-bg)', color: 'var(--success-text)', borderRadius: '50%', marginBottom: '1rem' }}>
            <ShieldCheck size={48} />
          </div>
          <h2 className="auth-title" style={{ fontSize: '1.75rem' }}>Password Updated</h2>
          <p className="auth-subtitle" style={{ marginTop: '0.5rem', marginBottom: '2rem' }}>
            Your password has been successfully reset. You can now log in with your new credentials.
          </p>
          <button onClick={() => navigate('/login')} className="btn btn-primary" style={{ width: '100%' }}>
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-card animate-fade-in">
        <div>
          <h2 className="auth-title">Reset Password</h2>
          <p className="auth-subtitle">Configure a new password for your account</p>
        </div>

        {error && (
          <div 
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.75rem', 
              padding: '0.75rem 1rem', 
              backgroundColor: 'var(--danger-bg)', 
              color: 'var(--danger-text)', 
              borderRadius: 'var(--border-radius-sm)',
              fontSize: '0.9rem',
              fontWeight: 500
            }}
          >
            <ShieldAlert size={20} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div className="form-group">
            <label htmlFor="code">Reset Token / Code</label>
            <input
              id="code"
              type="text"
              required
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Enter recovery code"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">New Password</label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter new password"
            />
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">Confirm New Password</label>
            <input
              id="confirmPassword"
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Repeat new password"
            />
          </div>

          <button 
            type="submit" 
            disabled={submitting} 
            className="btn btn-primary"
            style={{ width: '100%', marginTop: '0.5rem' }}
          >
            {submitting ? 'Resetting Password...' : 'Save New Password'}
          </button>
        </form>

        <div style={{ textAlign: 'center', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
          Remember your password?{' '}
          <Link to="/login" style={{ fontWeight: 600 }}>
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
};
