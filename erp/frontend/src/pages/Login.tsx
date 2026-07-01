import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Eye, EyeOff, Rocket } from 'lucide-react';

export const Login: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [mode, setMode] = useState<'user' | 'admin'>('user');
  const [showPassword, setShowPassword] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!username.trim() || !password.trim()) {
      setError('Invalid Email Address or Password');
      return;
    }

    setSubmitting(true);
    try {
      const params = new URLSearchParams();
      params.append('username', username);
      params.append('password', password);

      const response = await axios.post('/api/auth/login', params, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      });

      const { access_token, user } = response.data;

      // Mode check: admin mode requires Admin role
      if (mode === 'admin' && user.role !== 'Admin') {
        setError('Invalid Email Address or Password');
        setSubmitting(false);
        return;
      }

      login(access_token, user);
      navigate('/dashboard');
    } catch (err: any) {
      setError('Invalid Email Address or Password');
    } finally {
      setSubmitting(false);
    }
  };

  const isAdmin = mode === 'admin';

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        {/* App Logo */}
        <div style={styles.logoArea}>
          <div style={styles.logoBox}>
            <Rocket size={18} color="#fff" />
            <span style={styles.logoText}>ERP</span>
          </div>
          <div style={styles.logoLabel}>Enterprise Resource Planning</div>
        </div>

        {/* Mode Badge */}
        <div style={{ textAlign: 'center' }}>
          <span style={{ ...styles.modeBadge, background: isAdmin ? '#fef3c7' : '#ede9fe', color: isAdmin ? '#92400e' : '#5b21b6' }}>
            {isAdmin ? 'Login for System Administrator' : 'Login for System User'}
          </span>
        </div>

        <h2 style={styles.title}>Login Page</h2>

        {/* Error */}
        {error && (
          <div style={styles.errorBox}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={styles.form} autoComplete="off">
          <div style={styles.formGroup}>
            <label style={styles.label}>Email Address</label>
            <input
              id="login-id"
              type="email"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              style={styles.input}
              placeholder="Enter Email Address"
              autoComplete="off"
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Password</label>
            <div style={styles.inputWrapper}>
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ ...styles.input, paddingRight: '2.5rem' }}
                placeholder="Enter Password"
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={styles.eyeBtn}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button
            id="sign-in-btn"
            type="submit"
            disabled={submitting}
            style={{ ...styles.signInBtn, opacity: submitting ? 0.7 : 1 }}
          >
            {submitting ? 'Signing In...' : 'SIGN IN'}
          </button>
        </form>

        {/* Links */}
        <div style={styles.links}>
          <Link to="/forgot-password" style={styles.link}>Forget Password?</Link>
        </div>

        {/* Mode Toggle */}
        <div style={styles.modeToggle}>
          <button
            id="toggle-mode-btn"
            onClick={() => { setMode(isAdmin ? 'user' : 'admin'); setError(null); }}
            style={styles.modeToggleBtn}
          >
            {isAdmin ? 'Login as User' : 'Login as System Administrator'}
          </button>
        </div>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #f0f4ff 0%, #faf5ff 50%, #f0fdf4 100%)',
    padding: '2rem',
  },
  card: {
    width: '100%',
    maxWidth: '400px',
    background: '#ffffff',
    borderRadius: '16px',
    border: '1px solid #e5e7eb',
    padding: '2.5rem 2rem',
    boxShadow: '0 20px 40px rgba(0,0,0,0.08)',
    display: 'flex',
    flexDirection: 'column',
    gap: '1.25rem',
  },
  logoArea: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '0.5rem',
  },
  logoBox: {
    height: '50px',
    borderRadius: '14px',
    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 4px 14px rgba(99,102,241,0.4)',
    padding: '0 0.8rem',
    gap: '0.4rem',
  },
  logoText: {
    color: '#fff',
    fontWeight: 800,
    fontSize: '1.2rem',
    fontFamily: "'Outfit', sans-serif",
    letterSpacing: '0.05em',
  },
  logoLabel: {
    fontSize: '0.72rem',
    color: '#6b7280',
    fontWeight: 500,
    letterSpacing: '0.04em',
    textTransform: 'uppercase',
  },
  modeBadge: {
    display: 'inline-block',
    padding: '0.25rem 0.85rem',
    borderRadius: '99px',
    fontSize: '0.75rem',
    fontWeight: 600,
  },
  title: {
    textAlign: 'center',
    fontSize: '1.4rem',
    fontWeight: 700,
    color: '#111827',
    fontFamily: "'Outfit', sans-serif",
    margin: 0,
  },
  errorBox: {
    background: '#fef2f2',
    border: '1px solid #fecaca',
    color: '#b91c1c',
    borderRadius: '8px',
    padding: '0.65rem 1rem',
    fontSize: '0.875rem',
    fontWeight: 500,
    textAlign: 'center',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.35rem',
  },
  label: {
    fontSize: '0.85rem',
    fontWeight: 500,
    color: '#374151',
  },
  input: {
    padding: '0.65rem 0.9rem',
    borderRadius: '8px',
    border: '1px solid #d1d5db',
    fontSize: '0.95rem',
    color: '#111827',
    background: '#f9fafb',
    outline: 'none',
    transition: 'border 0.15s',
    fontFamily: 'inherit',
    width: '100%',
  },
  inputWrapper: {
    position: 'relative' as const,
  },
  eyeBtn: {
    position: 'absolute' as const,
    right: '0.65rem',
    top: '50%',
    transform: 'translateY(-50%)',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '0.2rem',
    color: '#9ca3af',
    display: 'flex',
    alignItems: 'center',
    lineHeight: 1,
  },
  signInBtn: {
    marginTop: '0.5rem',
    padding: '0.75rem',
    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    fontWeight: 700,
    fontSize: '0.95rem',
    cursor: 'pointer',
    letterSpacing: '0.06em',
    transition: 'opacity 0.2s',
  },
  links: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem',
    fontSize: '0.875rem',
  },
  link: {
    color: '#6366f1',
    fontWeight: 500,
    textDecoration: 'none',
  },
  divider: {
    color: '#9ca3af',
  },
  modeToggle: {
    textAlign: 'center',
    borderTop: '1px solid #f3f4f6',
    paddingTop: '1rem',
  },
  modeToggleBtn: {
    background: 'none',
    border: 'none',
    color: '#6366f1',
    fontSize: '0.875rem',
    fontWeight: 600,
    cursor: 'pointer',
    textDecoration: 'underline',
    textUnderlineOffset: '2px',
    padding: 0,
  },
};
