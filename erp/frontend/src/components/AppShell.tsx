import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import {
  Menu, X, ShoppingBag, ShoppingCart,
  Wrench, Package, FileText, Shield, LogOut, ChevronRight, Plus,
  Camera, Phone, MapPin, Briefcase, Mail, User, Pencil, Check, XCircle, Rocket,
  Bot, Send
} from 'lucide-react';

interface AppShellProps {
  children: React.ReactNode;
  pageTitle?: string;
  onNew?: () => void;
  onSearch?: (q: string) => void;
  searchPlaceholder?: string;
}

const MENU_ITEMS = [
  { label: 'Sale Orders',           icon: ShoppingBag,  path: '/sales',         permission: 'sales_order' as const },
  { label: 'Purchase Orders',       icon: ShoppingCart, path: '/purchases',      permission: 'purchase_order' as const },
  { label: 'Manufacturing Orders',  icon: Wrench,       path: '/manufacturing',  permission: 'manufacturing_order' as const },
  { label: 'Bills of Materials',    icon: FileText,     path: '/bom',            permission: 'manufacturing_order' as const },
  { label: 'Products',              icon: Package,      path: '/products',       permission: 'products' as const },
  { label: 'Audit Logs',            icon: Shield,       path: '/admin',          permission: 'admin_panel' as const },
];

export const AppShell: React.FC<AppShellProps> = ({
  children,
  pageTitle,
  onNew,
  onSearch,
  searchPlaceholder = 'Search orders, products…',
}) => {
  const { user, logout, hasPermission, refreshUser } = useAuth();
  const [menuOpen, setMenuOpen]     = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [searchVal, setSearchVal]   = useState('');
  const [editing, setEditing]       = useState(false);
  const [saving, setSaving]         = useState(false);
  const [saveErr, setSaveErr]       = useState('');
  const [form, setForm] = useState({
    name: '', phone: '', address: '', position: '', photo_url: '',
  });
  const navigate  = useNavigate();
  const location  = useLocation();
  const profileRef = useRef<HTMLDivElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  // AI Chatbot states
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<Array<{ sender: 'user' | 'bot'; text: string }>>([
    { sender: 'bot', text: 'Hi! I am your ERP AI Assistant. How can I help you analyze Shiv Furniture Works today? Try asking me about:\n- **Low stock alerts**\n- **Sales revenue breakdown**\n- **Recent database changes**\n- or type **"give me erp insights"** for a high-level summary dashboard.' }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Scroll to chat bottom when messages or open state changes
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, chatOpen]);

  const handleSendChatMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    const userMsg = chatInput;
    setChatInput('');
    setChatMessages(prev => [...prev, { sender: 'user', text: userMsg }]);
    setChatLoading(true);
    try {
      const res = await axios.post('/api/chat', { message: userMsg });
      setChatMessages(prev => [...prev, { sender: 'bot', text: res.data.reply }]);
    } catch (err: any) {
      console.error(err);
      setChatMessages(prev => [...prev, { sender: 'bot', text: '⚠️ Failed to connect to the assistant. Please make sure the backend is running.' }]);
    } finally {
      setChatLoading(false);
    }
  };

  const renderMessageText = (text: string) => {
    const lines = text.split('\n');
    let inTable = false;
    let tableHeaders: string[] = [];
    let tableRows: string[][] = [];
    const elements: React.ReactNode[] = [];

    const parseLine = (line: string, key: string | number) => {
      const parts: React.ReactNode[] = [];
      let temp = line;
      let boldRegex = /\*\*(.*?)\*\*/g;
      let lastIndex = 0;
      let match;
      while ((match = boldRegex.exec(temp)) !== null) {
        if (match.index > lastIndex) {
          parts.push(temp.substring(lastIndex, match.index));
        }
        parts.push(<strong key={`b-${match.index}`}>{match[1]}</strong>);
        lastIndex = boldRegex.lastIndex;
      }
      if (lastIndex < temp.length) {
        parts.push(temp.substring(lastIndex));
      }
      
      const formattedParts: React.ReactNode[] = [];
      parts.forEach((part) => {
        if (typeof part === 'string') {
          let codeRegex = /`(.*?)`/g;
          let cLastIdx = 0;
          let cMatch;
          let cTemp = part;
          while ((cMatch = codeRegex.exec(cTemp)) !== null) {
            if (cMatch.index > cLastIdx) {
              formattedParts.push(cTemp.substring(cLastIdx, cMatch.index));
            }
            formattedParts.push(
              <code key={`c-${cMatch.index}`} style={{ backgroundColor: '#f1f5f9', padding: '0.1rem 0.3rem', borderRadius: '4px', fontStyle: 'normal', color: 'var(--primary)', fontWeight: 600 }}>
                {cMatch[1]}
              </code>
            );
            cLastIdx = codeRegex.lastIndex;
          }
          if (cLastIdx < cTemp.length) {
            formattedParts.push(cTemp.substring(cLastIdx));
          }
        } else {
          formattedParts.push(part);
        }
      });
      return <span key={key}>{formattedParts.length > 0 ? formattedParts : line}</span>;
    };

    lines.forEach((line, idx) => {
      const trimmed = line.trim();
      if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
        inTable = true;
        const cols = line.split('|').map(c => c.trim()).filter((_, i, arr) => i > 0 && i < arr.length - 1);
        if (trimmed.includes('---')) return;
        if (tableHeaders.length === 0) {
          tableHeaders = cols;
        } else {
          tableRows.push(cols);
        }
        return;
      } else if (inTable) {
        elements.push(
          <div key={`table-${idx}`} style={{ overflowX: 'auto', margin: '0.75rem 0', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                  {tableHeaders.map((h, i) => (
                    <th key={i} style={{ padding: '0.5rem', textAlign: 'left', fontWeight: 600 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tableRows.map((row, ri) => (
                  <tr key={ri} style={{ borderBottom: ri === tableRows.length - 1 ? 'none' : '1px solid #f1f5f9' }}>
                    {row.map((val, vi) => (
                      <td key={vi} style={{ padding: '0.5rem' }}>{parseLine(val, `cell-${ri}-${vi}`)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
        inTable = false;
        tableHeaders = [];
        tableRows = [];
      }

      if (trimmed.startsWith('###')) {
        elements.push(<h4 key={idx} style={{ margin: '0.6rem 0 0.3rem 0', fontWeight: 700, fontSize: '0.875rem', color: '#1e293b' }}>{parseLine(trimmed.replace('###', '').trim(), idx)}</h4>);
      } else if (trimmed.startsWith('-')) {
        elements.push(
          <div key={idx} style={{ display: 'flex', gap: '0.5rem', margin: '0.2rem 0', paddingLeft: '0.5rem' }}>
            <span>•</span>
            <span style={{ flex: 1 }}>{parseLine(trimmed.substring(1).trim(), idx)}</span>
          </div>
        );
      } else if (trimmed !== '') {
        elements.push(<p key={idx} style={{ margin: '0.4rem 0', lineHeight: 1.4 }}>{parseLine(line, idx)}</p>);
      }
    });

    if (inTable && tableHeaders.length > 0) {
      elements.push(
        <div key="table-final" style={{ overflowX: 'auto', margin: '0.75rem 0', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                {tableHeaders.map((h, i) => (
                  <th key={i} style={{ padding: '0.5rem', textAlign: 'left', fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tableRows.map((row, ri) => (
                <tr key={ri} style={{ borderBottom: ri === tableRows.length - 1 ? 'none' : '1px solid #f1f5f9' }}>
                  {row.map((val, vi) => (
                    <td key={vi} style={{ padding: '0.5rem' }}>{parseLine(val, `cell-f-${ri}-${vi}`)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }
    return elements;
  };

  // Sync form with user data when profile opens
  useEffect(() => {
    if (profileOpen && user) {
      setForm({
        name:      user.name      ?? '',
        phone:     user.phone     ?? '',
        address:   user.address   ?? '',
        position:  user.position  ?? '',
        photo_url: user.photo_url ?? '',
      });
      setEditing(false);
      setSaveErr('');
    }
  }, [profileOpen, user]);

  // Close profile panel on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
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
      await refreshUser();
      setEditing(false);
    } catch (e: any) {
      setSaveErr(e?.response?.data?.detail ?? 'Save failed.');
    } finally {
      setSaving(false);
    }
  };

  // Convert uploaded file to base64 data URL (stored as photo_url)
  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setForm(f => ({ ...f, photo_url: reader.result as string }));
    reader.readAsDataURL(file);
  };

  const navigateTo = (path: string) => { setMenuOpen(false); navigate(path); };
  const initial = user?.name?.charAt(0).toUpperCase() ?? '?';

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
    <div style={s.root}>
      {/* ── Overlays ── */}
      {(menuOpen || profileOpen) && (
        <div style={s.overlay} onClick={() => { setMenuOpen(false); setProfileOpen(false); }} />
      )}

      {/* ── Slide-in Master Menu ── */}
      <nav style={{ ...s.masterMenu, transform: menuOpen ? 'translateX(0)' : 'translateX(-100%)' }}>
        <div style={s.menuHeader}>
          <span style={s.menuTitle}>Master Menu</span>
          <button style={s.iconBtn} onClick={() => setMenuOpen(false)}><X size={20} /></button>
        </div>
        <div style={s.menuItems}>
          {MENU_ITEMS.map(item => {
            const Icon = item.icon;
            const active = location.pathname === item.path;
            if (!hasPermission(item.permission)) return null;
            return (
              <button key={item.path}
                style={{ ...s.menuItem, ...(active ? s.menuItemActive : {}) }}
                onClick={() => navigateTo(item.path)}
              >
                <Icon size={18} />
                <span style={{ flex: 1, textAlign: 'left' }}>{item.label}</span>
                <ChevronRight size={14} style={{ opacity: 0.4 }} />
              </button>
            );
          })}
          {/* AI Chatbot Option */}
          <button
            style={{ ...s.menuItem, ...(chatOpen ? s.menuItemActive : {}) }}
            onClick={() => {
              setChatOpen(true);
              setMenuOpen(false);
            }}
          >
            <Bot size={18} />
            <span style={{ flex: 1, textAlign: 'left' }}>AI Assistant</span>
            <ChevronRight size={14} style={{ opacity: 0.4 }} />
          </button>
        </div>
        <div style={s.menuFooter}>
          <div style={s.menuUserRow}>
            {avatar(38, user?.photo_url)}
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{user?.name}</div>
              <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>{user?.role}</div>
            </div>
          </div>
          <button style={s.logoutBtn} onClick={() => { logout(); navigate('/login'); }}>
            <LogOut size={16} /> Sign Out
          </button>
        </div>
      </nav>

      {/* ── Rich Profile Side Panel ── */}
      <aside style={{ ...s.profilePanel, transform: profileOpen ? 'translateX(0)' : 'translateX(100%)' }}>
        {/* Header */}
        <div style={s.panelHead}>
          <span style={s.panelTitle}>My Profile</span>
          <button style={s.iconBtn} onClick={() => setProfileOpen(false)}><X size={20} /></button>
        </div>

        {/* Parallel Body Container */}
        <div style={s.panelBody}>
          {/* Left Column: Photo & Action Buttons */}
          <div style={s.leftCol}>
            <div style={{ position: 'relative', display: 'inline-flex', marginBottom: '0.85rem' }}>
              {avatar(90, editing ? form.photo_url : user?.photo_url)}
              {editing && (
                <button style={s.cameraBtn} onClick={() => photoInputRef.current?.click()} title="Change photo">
                  <Camera size={14} />
                </button>
              )}
              <input ref={photoInputRef} type="file" accept="image/*"
                style={{ display: 'none' }} onChange={handlePhotoChange} />
            </div>

            {/* Role Badge under photo */}
            <span style={s.rolePill}>{user?.role}</span>

            {/* Action buttons under photo/role */}
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
              icon={<User size={15}/>} label="Name"
              value={editing ? form.name : (user?.name || '—')}
              editing={editing}
              onChange={v => setForm(f => ({ ...f, name: v }))}
            />

            <InfoRow icon={<Mail size={15}/>} label="Email" value={user?.email} readOnly />

            <InfoRow
              icon={<Phone size={15}/>} label="Phone"
              value={editing ? form.phone : (user?.phone || '—')}
              editing={editing}
              onChange={v => setForm(f => ({ ...f, phone: v }))}
            />
            <InfoRow
              icon={<MapPin size={15}/>} label="Address"
              value={editing ? form.address : (user?.address || '—')}
              editing={editing}
              onChange={v => setForm(f => ({ ...f, address: v }))}
            />
            <InfoRow
              icon={<Briefcase size={15}/>} label="Position"
              value={editing ? form.position : (user?.position || '—')}
              editing={editing}
              onChange={v => setForm(f => ({ ...f, position: v }))}
            />
          </div>
        </div>

        {/* Error */}
        {saveErr && <div style={{ ...s.errMsg, marginBottom: '1rem' }}>{saveErr}</div>}

        {/* Sign Out */}
        <div style={{ padding: '0 1.25rem 1.5rem' }}>
          <button style={s.logoutBtn} onClick={() => { logout(); navigate('/login'); }}>
            <LogOut size={16} /> Sign Out
          </button>
        </div>
      </aside>

      {/* ── Top Bar ── */}
      <header style={s.topBar}>
        <button id="master-menu-btn" style={s.iconBtn} onClick={() => setMenuOpen(true)}>
          <Menu size={22} />
        </button>

        <button style={s.logoBtn} onClick={() => navigate('/dashboard')}>
          <div style={s.logoBox}>
            <Rocket size={14} style={{ color: '#fff' }} />
            <span style={s.logoText}>ERP</span>
          </div>
          <span style={s.logoName}>{pageTitle ?? 'Dashboard'}</span>
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {onNew && (
            <button id="new-btn" style={s.newBtn} onClick={onNew}>
              <Plus size={15} /> New
            </button>
          )}
          {/* Avatar button — shows photo or initial */}
          <div ref={profileRef}>
            <button
              id="profile-btn"
              style={s.avatarCircle}
              onClick={() => setProfileOpen(v => !v)}
              title="My Profile"
            >
              {user?.photo_url
                ? <img src={user.photo_url} alt="avatar"
                    style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover' }} />
                : <div style={s.avatarInitial}>{initial}</div>
              }
            </button>
          </div>
        </div>
      </header>

      {/* ── Search Bar ── */}
      {onSearch && (
        <div style={s.searchBar}>
          <input
            id="main-search"
            value={searchVal}
            onChange={e => { setSearchVal(e.target.value); onSearch(e.target.value); }}
            placeholder={searchPlaceholder}
            style={s.searchInput}
          />
        </div>
      )}

      {/* ── Page Content ── */}
      <main style={s.content}>{children}</main>

      {/* ── Chatbot Panel Widget ── */}
      {chatOpen && (
        <div style={s.chatWindow}>
          <div style={s.chatHeader}>
            <span style={s.chatHeaderTitle}>
              <Bot size={18} />
              AI ERP Assistant
            </span>
            <button style={{ ...s.iconBtn, color: '#ffffff', padding: '0.2rem' }} onClick={() => setChatOpen(false)}>
              <X size={18} />
            </button>
          </div>
          <div style={s.chatMessagesContainer}>
            {chatMessages.map((msg, i) => (
              <div key={i} style={msg.sender === 'user' ? s.chatBubbleUser : s.chatBubbleBot}>
                {renderMessageText(msg.text)}
              </div>
            ))}
            {chatLoading && (
              <div style={{ ...s.chatBubbleBot, fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                Thinking...
              </div>
            )}
            <div ref={chatEndRef} />
          </div>
          <form onSubmit={handleSendChatMessage} style={s.chatInputForm}>
            <input
              type="text"
              placeholder="Ask stock levels, sales insights..."
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              style={s.chatInputText}
              disabled={chatLoading}
            />
            <button type="submit" style={s.chatSendBtn} disabled={chatLoading || !chatInput.trim()}>
              <Send size={14} />
            </button>
          </form>
        </div>
      )}

      {/* Floating chatbot button */}
      <button style={s.chatFloatingBtn} onClick={() => setChatOpen(v => !v)}>
        {chatOpen ? <X size={24} /> : <Bot size={24} />}
      </button>
    </div>
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
  root: {
    minHeight: '100vh', background: '#f8fafc',
    display: 'flex', flexDirection: 'column',
    fontFamily: "'Inter', system-ui, sans-serif", position: 'relative',
  },
  overlay: {
    position: 'fixed', inset: 0,
    background: 'rgba(0,0,0,0.35)', zIndex: 199,
  },
  /* Master menu */
  masterMenu: {
    position: 'fixed', top: 0, left: 0, bottom: 0, width: '280px',
    background: '#fff', boxShadow: '4px 0 24px rgba(0,0,0,0.12)',
    zIndex: 200, display: 'flex', flexDirection: 'column',
    transition: 'transform 0.28s cubic-bezier(0.4,0,0.2,1)',
  },
  menuHeader: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '1.25rem 1.5rem', borderBottom: '1px solid #f3f4f6',
  },
  menuTitle: { fontFamily: "'Outfit',sans-serif", fontWeight: 700, fontSize: '1.1rem', color: '#111827' },
  menuItems: {
    flex: 1, overflowY: 'auto', padding: '1rem 0.75rem',
    display: 'flex', flexDirection: 'column', gap: '0.25rem',
  },
  menuItem: {
    display: 'flex', alignItems: 'center', gap: '0.75rem',
    padding: '0.8rem 1rem', borderRadius: '10px', border: 'none',
    background: 'none', cursor: 'pointer', color: '#374151',
    fontSize: '0.9rem', fontWeight: 500, transition: 'background 0.15s', width: '100%',
  },
  menuItemActive: { background: 'rgba(99,102,241,0.1)', color: '#6366f1' },
  menuFooter: {
    padding: '1.25rem 1.5rem', borderTop: '1px solid #f3f4f6',
    display: 'flex', flexDirection: 'column', gap: '0.75rem',
  },
  menuUserRow: { display: 'flex', alignItems: 'center', gap: '0.75rem' },
  logoutBtn: {
    display: 'flex', alignItems: 'center', gap: '0.5rem',
    background: '#fef2f2', color: '#b91c1c', border: 'none',
    borderRadius: '8px', padding: '0.6rem 1rem',
    cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem',
    width: '100%', justifyContent: 'center',
  },
  /* Profile panel */
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
  /* Top bar */
  topBar: {
    position: 'sticky', top: 0, zIndex: 100, height: '60px',
    background: '#fff', borderBottom: '1px solid #e5e7eb',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '0 1rem', boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
  },
  logoBtn: {
    display: 'flex', alignItems: 'center', gap: '0.5rem',
    background: 'none', border: 'none', cursor: 'pointer', padding: '0.25rem',
  },
  logoBox: {
    height: '34px', borderRadius: '9px',
    background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    boxShadow: '0 2px 8px rgba(99,102,241,0.35)',
    padding: '0 0.6rem',
    gap: '0.3rem',
  },
  logoText: { color: '#fff', fontWeight: 800, fontSize: '0.75rem', fontFamily: "'Outfit',sans-serif", letterSpacing: '0.04em' },
  logoName: { fontFamily: "'Outfit',sans-serif", fontWeight: 700, fontSize: '1rem', color: '#111827' },
  iconBtn: {
    background: 'none', border: 'none', cursor: 'pointer', color: '#374151',
    padding: '0.5rem', borderRadius: '8px',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  newBtn: {
    display: 'flex', alignItems: 'center', gap: '0.3rem',
    background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
    color: '#fff', border: 'none', borderRadius: '7px',
    padding: '0.45rem 0.85rem',
    fontWeight: 600, fontSize: '0.82rem', cursor: 'pointer', letterSpacing: '0.02em',
  },
  avatarCircle: {
    width: '36px', height: '36px', borderRadius: '50%',
    border: '2px solid #e5e7eb',
    padding: 0, cursor: 'pointer',
    overflow: 'hidden', background: 'transparent',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  avatarInitial: {
    width: '100%', height: '100%',
    background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
    color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontWeight: 700, fontSize: '0.9rem',
  },
  searchBar: {
    padding: '0.75rem 1rem', background: '#fff', borderBottom: '1px solid #e5e7eb',
  },
  searchInput: {
    width: '100%', padding: '0.6rem 1rem', borderRadius: '8px',
    border: '1px solid #d1d5db', fontSize: '0.9rem',
    background: '#f9fafb', outline: 'none', fontFamily: 'inherit', color: '#111827',
  },
  content: {
    flex: 1, padding: '1.25rem 1rem',
    maxWidth: '900px', width: '100%', margin: '0 auto',
  },
  chatFloatingBtn: {
    position: 'fixed', bottom: '24px', right: '24px',
    width: '56px', height: '56px', borderRadius: '50%',
    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
    color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center',
    boxShadow: '0 4px 14px rgba(99,102,241,0.4)', cursor: 'pointer', zIndex: 999,
    border: 'none', transition: 'all 0.2s',
  },
  chatWindow: {
    position: 'fixed', bottom: '92px', right: '24px',
    width: '380px', height: '500px', maxHeight: 'calc(100vh - 120px)',
    backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0',
    boxShadow: '0 12px 28px rgba(0,0,0,0.15)', zIndex: 999,
    display: 'flex', flexDirection: 'column', overflow: 'hidden',
  },
  chatHeader: {
    padding: '0.9rem 1.25rem',
    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
    color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)', flexShrink: 0,
  },
  chatHeaderTitle: { display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, fontSize: '0.95rem' },
  chatMessagesContainer: {
    flex: 1, overflowY: 'auto', padding: '1rem',
    display: 'flex', flexDirection: 'column', gap: '0.75rem',
    backgroundColor: '#f8fafc',
  },
  chatBubbleBot: {
    alignSelf: 'flex-start', maxWidth: '85%',
    backgroundColor: '#ffffff', border: '1px solid #e2e8f0',
    color: '#1e293b', padding: '0.65rem 0.85rem',
    borderRadius: '12px 12px 12px 2px', fontSize: '0.85rem',
    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
  },
  chatBubbleUser: {
    alignSelf: 'flex-end', maxWidth: '85%',
    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
    color: '#ffffff', padding: '0.65rem 0.85rem',
    borderRadius: '12px 12px 2px 12px', fontSize: '0.85rem',
    boxShadow: '0 2px 6px rgba(99,102,241,0.15)',
  },
  chatInputForm: {
    padding: '0.75rem 1rem', borderTop: '1px solid #e2e8f0',
    display: 'flex', gap: '0.5rem', backgroundColor: '#ffffff', flexShrink: 0,
  },
  chatInputText: {
    flex: 1, padding: '0.55rem 0.85rem', borderRadius: '20px',
    border: '1px solid #d1d5db', fontSize: '0.85rem', outline: 'none',
  },
  chatSendBtn: {
    width: '34px', height: '34px', borderRadius: '50%',
    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
    color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center',
    border: 'none', cursor: 'pointer', flexShrink: 0,
  },
};
