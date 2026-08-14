import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Eye, EyeOff, Rocket, CheckCircle2 } from 'lucide-react';

interface LoginProps {
  initialMode?: 'signin' | 'signup';
}

export const Login: React.FC<LoginProps> = ({ initialMode = 'signin' }) => {
  const [authTab, setAuthTab] = useState<'signin' | 'signup'>(initialMode);
  const [mode, setMode] = useState<'user' | 'admin'>('user');
  
  // Form states
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // Status states
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleTabChange = (tab: 'signin' | 'signup') => {
    setAuthTab(tab);
    setError(null);
    setSuccess(null);
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!username.trim() || !password.trim()) {
      setError('Please enter both Email Address and Password');
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
        setError('Access denied: Selected account is not an Administrator');
        setSubmitting(false);
        return;
      }

      login(access_token, user);
      navigate('/dashboard');
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Invalid Email Address or Password';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!name.trim()) {
      setError('Please enter your full name');
      return;
    }

    if (!username.trim()) {
      setError('Please enter your email address');
      return;
    }

    if (!password) {
      setError('Please enter a password');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setSubmitting(true);
    try {
      const roleToAssign = mode === 'admin' ? 'Admin' : 'User';
      
      await axios.post('/api/auth/register', {
        name: name.trim(),
        username: username.trim(),
        email: username.trim(),
        password: password,
        role: roleToAssign,
      });

      setSuccess(`Account created successfully as ${roleToAssign}! Please sign in.`);
      setAuthTab('signin');
      setPassword('');
      setConfirmPassword('');
      setError(null);
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Failed to create account. Email or username may already be registered.';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const isAdmin = mode === 'admin';
  const isSignUp = authTab === 'signup';

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

        {/* Tab Switcher */}
        <div style={styles.tabContainer}>
          <button
            type="button"
            style={{
              ...styles.tabBtn,
              ...(authTab === 'signin' ? styles.tabBtnActive : {}),
            }}
            onClick={() => handleTabChange('signin')}
          >
            SIGN IN
          </button>
          <button
            type="button"
            style={{
              ...styles.tabBtn,
              ...(authTab === 'signup' ? styles.tabBtnActive : {}),
            }}
            onClick={() => handleTabChange('signup')}
          >
            SIGN UP
          </button>
        </div>

        {/* Role Mode Badge */}
        <div style={{ textAlign: 'center' }}>
          <span style={{ ...styles.modeBadge, background: isAdmin ? '#fef3c7' : '#ede9fe', color: isAdmin ? '#92400e' : '#5b21b6' }}>
            {isSignUp
              ? (isAdmin ? 'Sign Up for System Administrator' : 'Sign Up for System User')
              : (isAdmin ? 'Login for System Administrator' : 'Login for System User')}
          </span>
        </div>

        <h2 style={styles.title}>{isSignUp ? 'Create Account' : 'Welcome Back'}</h2>

        {/* Success Message */}
        {success && (
          <div style={styles.successBox}>
            <CheckCircle2 size={16} color="#15803d" />
            <span>{success}</span>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div style={styles.errorBox}>
            {error}
          </div>
        )}

        {/* --- SIGN IN FORM --- */}
        {!isSignUp ? (
          <form onSubmit={handleSignIn} style={styles.form} autoComplete="off">
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
              style={{ ...styles.submitBtn, opacity: submitting ? 0.7 : 1 }}
            >
              {submitting ? 'Signing In...' : 'SIGN IN'}
            </button>

            <div style={styles.links}>
              <Link to="/forgot-password" style={styles.link}>Forget Password?</Link>
            </div>
          </form>
        ) : (
          /* --- SIGN UP FORM --- */
          <form onSubmit={handleSignUp} style={styles.form} autoComplete="off">
            <div style={styles.formGroup}>
              <label style={styles.label}>Full Name</label>
              <input
                id="signup-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={styles.input}
                placeholder="Enter Full Name"
                autoComplete="off"
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Email Address</label>
              <input
                id="signup-email"
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
                  id="signup-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{ ...styles.input, paddingRight: '2.5rem' }}
                  placeholder="Create Password (min 6 chars)"
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

            <div style={styles.formGroup}>
              <label style={styles.label}>Confirm Password</label>
              <input
                id="signup-confirm-password"
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                style={styles.input}
                placeholder="Confirm Password"
                autoComplete="new-password"
              />
            </div>

            <button
              id="sign-up-btn"
              type="submit"
              disabled={submitting}
              style={{ ...styles.submitBtn, opacity: submitting ? 0.7 : 1 }}
            >
              {submitting ? 'Creating Account...' : `CREATE ${isAdmin ? 'ADMIN' : 'USER'} ACCOUNT`}
            </button>
          </form>
        )}

        {/* Switch Auth Tab prompt */}
        <div style={styles.bottomPrompt}>
          {!isSignUp ? (
            <span>
              Don't have an account?{' '}
              <button
                type="button"
                onClick={() => handleTabChange('signup')}
                style={styles.inlineLinkBtn}
              >
                Sign Up
              </button>
            </span>
          ) : (
            <span>
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => handleTabChange('signin')}
                style={styles.inlineLinkBtn}
              >
                Sign In
              </button>
            </span>
          )}
        </div>

        {/* Role Mode Toggle Footer */}
        <div style={styles.modeToggle}>
          <button
            id="toggle-mode-btn"
            onClick={() => { setMode(isAdmin ? 'user' : 'admin'); setError(null); setSuccess(null); }}
            style={styles.modeToggleBtn}
          >
            {isAdmin ? 'Switch to System User' : 'Switch to System Administrator'}
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
    maxWidth: '420px',
    background: '#ffffff',
    borderRadius: '16px',
    border: '1px solid #e5e7eb',
    padding: '2.25rem 2rem',
    boxShadow: '0 20px 40px rgba(0,0,0,0.08)',
    display: 'flex',
    flexDirection: 'column',
    gap: '1.1rem',
  },
  logoArea: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '0.4rem',
  },
  logoBox: {
    height: '46px',
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
  tabContainer: {
    display: 'flex',
    background: '#f1f5f9',
    borderRadius: '10px',
    padding: '4px',
    gap: '4px',
  },
  tabBtn: {
    flex: 1,
    padding: '0.5rem 0',
    border: 'none',
    borderRadius: '7px',
    background: 'transparent',
    color: '#64748b',
    fontWeight: 600,
    fontSize: '0.825rem',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    letterSpacing: '0.03em',
  },
  tabBtnActive: {
    background: '#ffffff',
    color: '#4f46e5',
    boxShadow: '0 2px 4px rgba(0,0,0,0.06)',
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
    fontSize: '1.35rem',
    fontWeight: 700,
    color: '#111827',
    fontFamily: "'Outfit', sans-serif",
    margin: 0,
  },
  successBox: {
    background: '#f0fdf4',
    border: '1px solid #bbf7d0',
    color: '#15803d',
    borderRadius: '8px',
    padding: '0.65rem 1rem',
    fontSize: '0.85rem',
    fontWeight: 500,
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  },
  errorBox: {
    background: '#fef2f2',
    border: '1px solid #fecaca',
    color: '#b91c1c',
    borderRadius: '8px',
    padding: '0.65rem 1rem',
    fontSize: '0.85rem',
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
    fontSize: '0.925rem',
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
  submitBtn: {
    marginTop: '0.5rem',
    padding: '0.75rem',
    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    fontWeight: 700,
    fontSize: '0.925rem',
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
    marginTop: '0.25rem',
  },
  link: {
    color: '#6366f1',
    fontWeight: 500,
    textDecoration: 'none',
  },
  bottomPrompt: {
    textAlign: 'center',
    fontSize: '0.875rem',
    color: '#6b7280',
  },
  inlineLinkBtn: {
    background: 'none',
    border: 'none',
    color: '#6366f1',
    fontWeight: 600,
    cursor: 'pointer',
    padding: 0,
    textDecoration: 'underline',
  },
  modeToggle: {
    textAlign: 'center',
    borderTop: '1px solid #f3f4f6',
    paddingTop: '0.85rem',
  },
  modeToggleBtn: {
    background: 'none',
    border: 'none',
    color: '#6366f1',
    fontSize: '0.85rem',
    fontWeight: 600,
    cursor: 'pointer',
    textDecoration: 'underline',
    textUnderlineOffset: '2px',
    padding: 0,
  },
};

