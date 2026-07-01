import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { Sun, Moon, X, Camera, Phone, MapPin, Briefcase, Mail, User as UserIcon, Pencil, Check, XCircle } from 'lucide-react';
import axios from 'axios';

export const Navbar: React.FC = () => {
  const { user, refreshUser } = useAuth();
  const [darkMode, setDarkMode] = useState<boolean>(
    localStorage.getItem('erp_dark_mode') === 'true'
  );

  const [profileOpen, setProfileOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveErr, setSaveErr] = useState('');
  const [form, setForm] = useState({
    name: '', phone: '', address: '', position: '', photo_url: '',
  });

  const profileRef = useRef<HTMLDivElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (darkMode) {
      document.body.classList.add('dark');
    } else {
      document.body.classList.remove('dark');
    }
    localStorage.setItem('erp_dark_mode', String(darkMode));
  }, [darkMode]);

  // Sync form with user data when profile opens
  useEffect(() => {
    if (profileOpen && user) {
      setForm({
        name: user.name ?? '',
        phone: user.phone ?? '',
        address: user.address ?? '',
        position: user.position ?? '',
        photo_url: user.photo_url ?? '',
      });
      setEditing(false);
      setSaveErr('');
    }
  }, [profileOpen, user]);

  // Close profile panel on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      // Find the user badge element to avoid closing when clicking it
      const badge = document.querySelector('.header-user-badge');
      if (badge && badge.contains(e.target as Node)) {
        return; // Ignore outside click check for the badge click
      }
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSave = async () => {
    setSaving(true); setSaveErr('');
    try {
      await axios.put('/api/users/me/profile', form);
      if (refreshUser) await refreshUser();
      setEditing(false);
    } catch (e: any) {
      setSaveErr(e?.response?.data?.detail ?? 'Save failed.');
    } finally {
      setSaving(false);
    }
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setForm(f => ({ ...f, photo_url: reader.result as string }));
    reader.readAsDataURL(file);
  };

  if (!user) return null;

  const getBadgeClass = (role: string) => {
    switch (role) {
      case 'Admin': return 'badge-admin';
      case 'Sales Manager': return 'badge-sales';
      case 'Purchase Manager': return 'badge-purchase';
      case 'Production Manager': return 'badge-production';
      case 'Accountant': return 'badge-accountant';
      default: return 'badge-viewer';
    }
  };

  const initial = user.name.charAt(0).toUpperCase();

  const avatar = (size: number, photo?: string | null) =>
    photo ? (
      <img src={photo} alt="avatar" style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover' }} />
    ) : (
      <div style={{
        width: size, height: size, borderRadius: '50%',
        background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
        color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontWeight: 700, fontSize: size * 0.38, flexShrink: 0,
      }}>{initial}</div>
    );

  return (
    <>
      <header className="header">
        <div className="header-left">
          <h2 style={{ fontFamily: 'var(--font-family-title)', fontWeight: 700, fontSize: '1.25rem' }}>
            ERP Operations
          </h2>
        </div>

        <div className="header-right" style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          {/* Dark Mode Toggle */}
          <button 
            onClick={() => setDarkMode(!darkMode)}
            className="btn btn-secondary btn-icon"
            style={{ width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {darkMode ? <Sun size={18} style={{ color: '#fbbf24' }} /> : <Moon size={18} />}
          </button>

          {/* User Profile Info */}
          <div 
            className="header-user-badge" 
            style={{ cursor: 'pointer' }} 
            onClick={(e) => {
              e.stopPropagation(); // Prevent bubbling up to document listeners
              setProfileOpen(prev => !prev); // Toggle profile panel
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
              <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{user.name}</span>
              <span className={`badge ${getBadgeClass(user.role)}`} style={{ marginTop: '0.15rem' }}>
                {user.role}
              </span>
            </div>
            {user.photo_url ? (
              <img src={user.photo_url} alt="avatar" style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--border-color)' }} />
            ) : (
              <div 
                style={{ 
                  width: '40px', 
                  height: '40px', 
                  borderRadius: '50%', 
                  backgroundColor: 'var(--primary-glow)', 
                  color: 'var(--primary)', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontFamily: 'var(--font-family-title)',
                  fontSize: '1rem',
                  border: '2px solid var(--border-color)'
                }}
              >
                {initial}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Profile Overlays */}
      {profileOpen && (
        <div style={s.overlay} onClick={() => setProfileOpen(false)} />
      )}

      {/* Rich Profile Side Panel */}
      <aside ref={profileRef} style={{ ...s.profilePanel, transform: profileOpen ? 'translateX(0)' : 'translateX(100%)' }}>
        <div style={s.panelHead}>
          <span style={s.panelTitle}>My Profile</span>
          <button style={s.iconBtn} onClick={() => setProfileOpen(false)}><X size={20} /></button>
        </div>

        <div style={s.panelBody}>
          {/* Left Column: Photo & Action Buttons */}
          <div style={s.leftCol}>
            <div style={{ position: 'relative', display: 'inline-flex', marginBottom: '0.85rem' }}>
              {avatar(90, editing ? form.photo_url : user.photo_url)}
              {editing && (
                <button style={s.cameraBtn} onClick={() => photoInputRef.current?.click()} title="Change photo">
                  <Camera size={14} />
                </button>
              )}
              <input ref={photoInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePhotoChange} />
            </div>

            <span style={s.rolePill}>{user.role}</span>

            <div style={s.colActions}>
              {editing ? (
                <>
                  <button style={s.saveBtn} onClick={handleSave} disabled={saving}>
                    <Check size={14} /> {saving ? 'Saving…' : 'Save'}
                  </button>
                  <button style={s.cancelBtn} onClick={() => { setEditing(false); setSaveErr(''); }}>
                    <XCircle size={14} /> Cancel
                  </button>
                </>
              ) : (
                <button style={s.editBtn} onClick={() => setEditing(true)}>
                  <Pencil size={14} /> Edit Profile
                </button>
              )}
            </div>
          </div>

          {/* Right Column: Profile Info Fields */}
          <div style={s.rightCol}>
            <InfoRow
              icon={<UserIcon size={15}/>} label="Name"
              value={editing ? form.name : (user.name || '—')}
              editing={editing}
              onChange={v => setForm(f => ({ ...f, name: v }))}
            />
            <InfoRow icon={<Mail size={15}/>} label="Email" value={user.email} readOnly />
            <InfoRow
              icon={<Phone size={15}/>} label="Phone"
              value={editing ? form.phone : (user.phone || '—')}
              editing={editing}
              onChange={v => setForm(f => ({ ...f, phone: v }))}
            />
            <InfoRow
              icon={<MapPin size={15}/>} label="Address"
              value={editing ? form.address : (user.address || '—')}
              editing={editing}
              onChange={v => setForm(f => ({ ...f, address: v }))}
            />
            <InfoRow
              icon={<Briefcase size={15}/>} label="Position"
              value={user.role}
              readOnly
            />
          </div>
        </div>

        {saveErr && <div style={{ ...s.errMsg, marginBottom: '1rem' }}>{saveErr}</div>}
      </aside>
    </>
  );
};

/* ── Info Row sub-component ── */
interface InfoRowProps {
  icon: React.ReactNode;
  label: string;
  value?: string;
  editing?: boolean;
  readOnly?: boolean;
  onChange?: (v: string) => void;
}
const InfoRow: React.FC<InfoRowProps> = ({ icon, label, value, editing, readOnly, onChange }) => (
  <div style={ir.row}>
    <div style={ir.iconWrap}>{icon}</div>
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={ir.label}>{label}</div>
      {editing && !readOnly ? (
        <input style={ir.input} value={value ?? ''} onChange={e => onChange?.(e.target.value)} placeholder={label} />
      ) : (
        <div style={ir.value}>{value || '—'}</div>
      )}
    </div>
  </div>
);
const ir: Record<string, React.CSSProperties> = {
  row:     { display: 'flex', alignItems: 'flex-start', gap: '0.75rem', padding: '0.65rem 0', borderBottom: '1px solid #f3f4f6' },
  iconWrap:{ width: 30, height: 30, borderRadius: '8px', background: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6366f1', flexShrink: 0, marginTop: 2 },
  label:   { fontSize: '0.7rem', color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.2rem' },
  value:   { fontSize: '0.875rem', color: '#111827', fontWeight: 500, wordBreak: 'break-word' },
  input:   { width: '100%', fontSize: '0.875rem', padding: '0.35rem 0.5rem', borderRadius: '6px', border: '1px solid #d1d5db', outline: 'none', background: '#f9fafb', color: '#111827' },
};

/* ── Styles ── */
const s: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed', inset: 0,
    background: 'rgba(0,0,0,0.35)', zIndex: 199,
  },
  profilePanel: {
    position: 'fixed', top: 0, right: 0, bottom: 0, width: 'min(500px, 95vw)',
    background: '#fff', boxShadow: '-4px 0 24px rgba(0,0,0,0.12)',
    zIndex: 200, display: 'flex', flexDirection: 'column',
    transition: 'transform 0.28s cubic-bezier(0.4,0,0.2,1)',
    overflowY: 'auto',
  },
  panelHead: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '1.25rem 1.5rem', borderBottom: '1px solid #f3f4f6', flexShrink: 0,
  },
  panelTitle: { fontFamily: "'Outfit',sans-serif", fontWeight: 700, fontSize: '1.05rem', color: '#111827' },
  iconBtn: {
    background: 'none', border: 'none', cursor: 'pointer', color: '#374151',
    padding: '0.5rem', borderRadius: '8px',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  panelBody: {
    display: 'flex', flexDirection: 'row', gap: '1.5rem', padding: '1.5rem', flex: 1, minHeight: 0,
  },
  leftCol: {
    display: 'flex', flexDirection: 'column', alignItems: 'center', width: '130px', flexShrink: 0,
  },
  rightCol: {
    flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '0.25rem',
  },
  colActions: {
    display: 'flex', flexDirection: 'column', gap: '0.5rem', width: '100%', marginTop: '1.25rem',
  },
  cameraBtn: {
    position: 'absolute', bottom: 0, right: 0,
    width: 26, height: 26, borderRadius: '50%',
    background: '#6366f1', color: '#fff',
    border: '2px solid #fff', cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  rolePill: {
    display: 'inline-block',
    padding: '0.2rem 0.7rem', borderRadius: '99px',
    background: 'rgba(99,102,241,0.1)', color: '#6366f1',
    fontSize: '0.72rem', fontWeight: 600, textAlign: 'center',
  },
  errMsg: {
    margin: '0 1.5rem', padding: '0.5rem 0.75rem',
    background: '#fef2f2', color: '#b91c1c',
    borderRadius: '7px', fontSize: '0.8rem', fontWeight: 500,
  },
  editBtn: {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem',
    background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: '#fff',
    border: 'none', borderRadius: '9px', padding: '0.65rem',
    fontWeight: 600, fontSize: '0.82rem', cursor: 'pointer', width: '100%', boxSizing: 'border-box',
  },
  saveBtn: {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem',
    background: '#10b981', color: '#fff',
    border: 'none', borderRadius: '9px', padding: '0.65rem',
    fontWeight: 600, fontSize: '0.82rem', cursor: 'pointer', width: '100%', boxSizing: 'border-box',
  },
  cancelBtn: {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem',
    background: '#f3f4f6', color: '#374151',
    border: '1px solid #e5e7eb', borderRadius: '9px', padding: '0.65rem',
    fontWeight: 600, fontSize: '0.82rem', cursor: 'pointer', width: '100%', boxSizing: 'border-box',
  },
};
