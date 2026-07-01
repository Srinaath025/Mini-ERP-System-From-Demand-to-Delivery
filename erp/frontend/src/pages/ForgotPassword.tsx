import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';

export const ForgotPassword: React.FC = () => {
  const [loginId, setLoginId] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginId.trim()) return;
    setSubmitting(true);
    // Simulate sending reset instructions
    setTimeout(() => {
      setSubmitting(false);
      setSubmitted(true);
    }, 800);
  };

  if (submitted) {
    return (
      <div style={styles.page}>
        <div style={{ ...styles.card, textAlign: 'center' }}>
          <div style={styles.logoArea}>
            <div style={styles.logoBox}><span style={styles.logoText}>ERP</span></div>
          </div>
          <div style={{ fontSize: '3rem', marginTop: '0.5rem' }}>✉️</div>
          <h2 style={styles.title}>Check Your Email</h2>
          <p style={{ color: '#6b7280', fontSize: '0.9rem', lineHeight: 1.6 }}>
            If <strong>{loginId}</strong> exists in the system, password reset instructions have been sent to the registered email.
          </p>
          <button onClick={() => navigate('/login')} style={{ ...styles.submitBtn, marginTop: '0.5rem' }}>
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        {/* App Logo */}
        <div style={styles.logoArea}>
          <div style={styles.logoBox}><span style={styles.logoText}>ERP</span></div>
          <div style={styles.logoLabel}>Enterprise Resource Planning</div>
        </div>

        <h2 style={styles.title}>Forgot Password</h2>
        <p style={styles.subtitle}>Enter your Login Id to recover access to your account</p>

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.formGroup}>
            <label style={styles.label}>Login Id</label>
            <input
              id="forgot-login-id"
              type="text"
              value={loginId}
              onChange={(e) => setLoginId(e.target.value)}
              style={styles.input}
              placeholder="Enter your Login Id"
              required
              autoFocus
            />
          </div>

          <button
            id="forgot-submit-btn"
            type="submit"
            disabled={submitting}
            style={{ ...styles.submitBtn, opacity: submitting ? 0.7 : 1 }}
          >
            {submitting ? 'Sending...' : 'Send Reset Instructions'}
          </button>
        </form>

        <div style={styles.backLink}>
          Remember your password?{' '}
          <Link to="/login" style={{ color: '#6366f1', fontWeight: 600 }}>Sign In</Link>
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
    gap: '0.4rem',
  },
  logoBox: {
    width: '56px',
    height: '56px',
    borderRadius: '14px',
    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 4px 14px rgba(99,102,241,0.4)',
  },
  logoText: {
    color: '#fff',
    fontWeight: 800,
    fontSize: '1.1rem',
    fontFamily: "'Outfit', sans-serif",
    letterSpacing: '0.05em',
  },
  logoLabel: {
    fontSize: '0.7rem',
    color: '#6b7280',
    fontWeight: 500,
    letterSpacing: '0.04em',
    textTransform: 'uppercase',
  },
  title: {
    textAlign: 'center',
    fontSize: '1.35rem',
    fontWeight: 700,
    color: '#111827',
    fontFamily: "'Outfit', sans-serif",
    margin: 0,
  },
  subtitle: {
    textAlign: 'center',
    fontSize: '0.875rem',
    color: '#6b7280',
    margin: '-0.5rem 0 0',
    lineHeight: 1.5,
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.9rem',
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
    fontFamily: 'inherit',
    width: '100%',
  },
  submitBtn: {
    padding: '0.75rem',
    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    fontWeight: 700,
    fontSize: '0.95rem',
    cursor: 'pointer',
    letterSpacing: '0.04em',
    width: '100%',
    marginTop: '0.25rem',
  },
  backLink: {
    textAlign: 'center',
    fontSize: '0.875rem',
    color: '#6b7280',
  },
};
