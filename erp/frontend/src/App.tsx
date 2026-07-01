import React, { useState, useRef, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Sidebar } from './components/Sidebar';
import { Navbar } from './components/Navbar';
import axios from 'axios';
import { Bot, Send, X } from 'lucide-react';

// Page Imports
import { Login } from './pages/Login';
import { ForgotPassword } from './pages/ForgotPassword';
import { ResetPassword } from './pages/ResetPassword';
import { Dashboard } from './pages/Dashboard';
import { AdminPanel } from './pages/AdminPanel';
import { Products } from './pages/Products';
import { SalesOrders } from './pages/SalesOrders';
import { PurchaseOrders } from './pages/PurchaseOrders';
import { ManufacturingOrders } from './pages/ManufacturingOrders';
import { Boms } from './pages/Boms';
import { Reports } from './pages/Reports';
import { AuditLogs } from './pages/AuditLogs';

// Layout component wrapping protected views
const Layout: React.FC = () => {
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

  return (
    <div className="app-container">
      <Sidebar onChatToggle={() => setChatOpen(v => !v)} chatOpen={chatOpen} />
      <div className="main-content">
        <Navbar />
        <Routes>
          {/* Main Dashboard - accessible to any authorized user */}
          <Route path="/dashboard" element={<Dashboard />} />
          
          {/* Module-specific protected routes */}
          <Route element={<ProtectedRoute permission="products" />}>
            <Route path="/products" element={<Products />} />
          </Route>

          <Route element={<ProtectedRoute permission="sales_order" />}>
            <Route path="/sales" element={<SalesOrders />} />
          </Route>

          <Route element={<ProtectedRoute permission="purchase_order" />}>
            <Route path="/purchases" element={<PurchaseOrders />} />
          </Route>

          <Route element={<ProtectedRoute permission="manufacturing_order" />}>
            <Route path="/manufacturing" element={<ManufacturingOrders />} />
            <Route path="/bom" element={<Boms />} />
          </Route>

          <Route element={<ProtectedRoute permission="accounts" />}>
            <Route path="/reports" element={<Reports />} />
          </Route>

          {/* Protected route block for users with admin panel permissions */}
          <Route element={<ProtectedRoute permission="admin_panel" />}>
            <Route path="/admin" element={<AdminPanel />} />
            {/* The new Audit Logs page is accessible at /audit-logs path */}
            <Route path="/audit-logs" element={<AuditLogs />} />
          </Route>

          {/* Catch-all within layout */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </div>

      {/* ── Collapsible Chatbot Widget ── */}
      {chatOpen && (
        <div style={styles.chatWindow}>
          <div style={styles.chatHeader}>
            <span style={styles.chatHeaderTitle}>
              <Bot size={18} />
              AI ERP Assistant
            </span>
            <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ffffff', padding: '0.2rem', display: 'flex', alignItems: 'center' }} onClick={() => setChatOpen(false)}>
              <X size={18} />
            </button>
          </div>
          <div style={styles.chatMessagesContainer}>
            {chatMessages.map((msg, i) => (
              <div key={i} style={msg.sender === 'user' ? styles.chatBubbleUser : styles.chatBubbleBot}>
                {renderMessageText(msg.text)}
              </div>
            ))}
            {chatLoading && (
              <div style={{ ...styles.chatBubbleBot, fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                Thinking...
              </div>
            )}
            <div ref={chatEndRef} />
          </div>
          <form onSubmit={handleSendChatMessage} style={styles.chatInputForm}>
            <input
              type="text"
              placeholder="Ask stock levels, sales insights..."
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              style={styles.chatInputText}
              disabled={chatLoading}
            />
            <button type="submit" style={styles.chatSendBtn} disabled={chatLoading || !chatInput.trim()}>
              <Send size={14} />
            </button>
          </form>
        </div>
      )}

      {/* Floating chatbot button */}
      <button style={styles.chatFloatingBtn} onClick={() => setChatOpen(v => !v)}>
        {chatOpen ? <X size={24} /> : <Bot size={24} />}
      </button>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  chatFloatingBtn: {
    position: 'fixed',
    bottom: '24px',
    right: '24px',
    width: '56px',
    height: '56px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
    color: '#ffffff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 4px 14px rgba(99,102,241,0.4)',
    cursor: 'pointer',
    zIndex: 999,
    border: 'none',
    transition: 'all 0.2s',
  },
  chatWindow: {
    position: 'fixed',
    bottom: '92px',
    right: '24px',
    width: '380px',
    height: '500px',
    maxHeight: 'calc(100vh - 120px)',
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    border: '1px solid #e2e8f0',
    boxShadow: '0 12px 28px rgba(0,0,0,0.15)',
    zIndex: 999,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  chatHeader: {
    padding: '0.9rem 1.25rem',
    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
    color: '#ffffff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    flexShrink: 0,
  },
  chatHeaderTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    fontWeight: 700,
    fontSize: '0.95rem',
  },
  chatMessagesContainer: {
    flex: 1,
    overflowY: 'auto',
    padding: '1rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
    backgroundColor: '#f8fafc',
  },
  chatBubbleBot: {
    alignSelf: 'flex-start',
    maxWidth: '85%',
    backgroundColor: '#ffffff',
    border: '1px solid #e2e8f0',
    color: '#1e293b',
    padding: '0.65rem 0.85rem',
    borderRadius: '12px 12px 12px 2px',
    fontSize: '0.85rem',
    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
  },
  chatBubbleUser: {
    alignSelf: 'flex-end',
    maxWidth: '85%',
    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
    color: '#ffffff',
    padding: '0.65rem 0.85rem',
    borderRadius: '12px 12px 2px 12px',
    fontSize: '0.85rem',
    boxShadow: '0 2px 6px rgba(99,102,241,0.15)',
  },
  chatInputForm: {
    padding: '0.75rem 1rem',
    borderTop: '1px solid #e2e8f0',
    display: 'flex',
    gap: '0.5rem',
    backgroundColor: '#ffffff',
    flexShrink: 0,
  },
  chatInputText: {
    flex: 1,
    padding: '0.55rem 0.85rem',
    borderRadius: '20px',
    border: '1px solid #d1d5db',
    fontSize: '0.85rem',
    outline: 'none',
  },
  chatSendBtn: {
    width: '34px',
    height: '34px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
    color: '#ffffff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: 'none',
    cursor: 'pointer',
    flexShrink: 0,
  },
};

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Auth Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Navigate to="/login" replace />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />

          {/* Protected Portal Layout */}
          <Route element={<ProtectedRoute />}>
            <Route path="/*" element={<Layout />} />
          </Route>

          {/* Redirect index to login/dashboard */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
