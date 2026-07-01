import React, { useEffect, useState } from 'react';
import axios from 'axios';
// Import icons from the lucide-react package to use on our page
import { 
  Filter, 
  RotateCcw, 
  ChevronLeft, 
  ChevronRight, 
  Calendar, 
  User as UserIcon, 
  Folder, 
  Search, 
  Activity
} from 'lucide-react';

// This matches the format of each Audit Log we get from the backend
interface AuditLog {
  id: number;
  timestamp: string;
  user_id: number | null;
  user_name: string | null;
  module: string;
  record_type: string;
  record_id: string;
  action: string;
  field_changed: string | null;
  old_value: string | null;
  new_value: string | null;
}

// Format of the unique choices returned for our dropdown filters
interface FilterChoices {
  users: string[];
  modules: string[];
  actions: string[];
}

export const AuditLogs: React.FC = () => {
  // State to store the list of logs shown in the table
  const [logs, setLogs] = useState<AuditLog[]>([]);
  // State to store the dropdown filter lists fetched from the backend
  const [filterChoices, setFilterChoices] = useState<FilterChoices>({ users: [], modules: [], actions: [] });
  
  const getTodayDateString = () => {
    return new Date().toISOString().split('T')[0];
  };

  // Local input states for the search and filters (what the user selects in the inputs)
  const [selectedUser, setSelectedUser] = useState('All Users');
  const [selectedModule, setSelectedModule] = useState('All Modules');
  const [selectedAction, setSelectedAction] = useState('All Actions');
  const [startDate, setStartDate] = useState('2026-05-01');
  const [endDate, setEndDate] = useState(getTodayDateString());
  const [searchQuery, setSearchQuery] = useState('');
  
  // Applied filters (these states store what was actively confirmed by clicking the "Filter" button)
  const [appliedUser, setAppliedUser] = useState('All Users');
  const [appliedModule, setAppliedModule] = useState('All Modules');
  const [appliedAction, setAppliedAction] = useState('All Actions');
  const [appliedStartDate, setAppliedStartDate] = useState('2026-05-01');
  const [appliedEndDate, setAppliedEndDate] = useState(getTodayDateString());
  const [appliedSearch, setAppliedSearch] = useState('');

  // Pagination states to track the current page, page size, total pages, and record counts
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const limit = 10; // We show 10 logs per page

  // State to show a loading screen while fetching data
  const [loading, setLoading] = useState(true);

  // Fetch unique filter values from backend to populate dropdown elements
  const fetchFilters = async () => {
    try {
      const res = await axios.get('/api/audit-logs/filters');
      setFilterChoices(res.data);
    } catch (err) {
      console.error('Error fetching filters:', err);
    }
  };

  // Fetch paginated and filtered logs from backend
  const fetchLogs = async () => {
    setLoading(true);
    try {
      // Build the query parameters for filtering and paging
      const params: any = {
        page,
        limit,
        module: appliedModule !== 'All Modules' ? appliedModule : undefined,
        user_name: appliedUser !== 'All Users' ? appliedUser : undefined,
        action: appliedAction !== 'All Actions' ? appliedAction : undefined,
        start_date: appliedStartDate || undefined,
        end_date: appliedEndDate || undefined,
        search: appliedSearch || undefined
      };

      const res = await axios.get('/api/audit-logs', { params });
      setLogs(res.data.logs);
      setTotalPages(res.data.total_pages);
      setTotalCount(res.data.total_count);
    } catch (err) {
      console.error('Error fetching audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  // Load the dropdown filter options and counts on page start
  useEffect(() => {
    fetchFilters();
  }, []);

  // Re-fetch the table logs every time pagination page or filters change
  useEffect(() => {
    fetchLogs();
  }, [page, appliedUser, appliedModule, appliedAction, appliedStartDate, appliedEndDate, appliedSearch]);

  // Triggered when user clicks the "Filter" button. Confirms current input values.
  const handleFilter = () => {
    setPage(1); // Reset back to first page
    setAppliedUser(selectedUser);
    setAppliedModule(selectedModule);
    setAppliedAction(selectedAction);
    setAppliedStartDate(startDate);
    setAppliedEndDate(endDate);
    setAppliedSearch(searchQuery);
  };

  // Triggered when user clicks the "Reset" button. Reverts filters to initial default values.
  const handleReset = () => {
    setSelectedUser('All Users');
    setSelectedModule('All Modules');
    setSelectedAction('All Actions');
    setStartDate('2026-05-01');
    setEndDate(getTodayDateString());
    setSearchQuery('');

    setPage(1);
    setAppliedUser('All Users');
    setAppliedModule('All Modules');
    setAppliedAction('All Actions');
    setAppliedStartDate('2026-05-01');
    setAppliedEndDate(getTodayDateString());
    setAppliedSearch('');
  };

  // Formats raw date string (e.g. 2026-05-26T11:42:00) into friendly layout (e.g. 26 May 2026, 11:42 AM)
  const formatDate = (dateStr: string) => {
    try {
      const dateObj = new Date(dateStr);
      if (isNaN(dateObj.getTime())) return dateStr;
      
      const day = dateObj.getDate();
      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const month = monthNames[dateObj.getMonth()];
      const year = dateObj.getFullYear();
      
      let hours = dateObj.getHours();
      const minutes = dateObj.getMinutes().toString().padStart(2, '0');
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12;
      hours = hours ? hours : 12;
      
      return `${day} ${month} ${year}, ${hours}:${minutes} ${ampm}`;
    } catch {
      return dateStr;
    }
  };

  // Renders the pagination buttons list (e.g., < 1 2 3 ... 100 >)
  const renderPagination = () => {
    const pages = [];
    const maxVisiblePages = 5;

    let startPage = Math.max(1, page - 2);
    let endPage = Math.min(totalPages, page + 2);

    if (startPage === 1 && totalPages > maxVisiblePages) {
      endPage = maxVisiblePages;
    } else if (endPage === totalPages && totalPages > maxVisiblePages) {
      startPage = totalPages - maxVisiblePages + 1;
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(
        <button
          key={i}
          onClick={() => setPage(i)}
          className={`btn ${page === i ? 'btn-primary' : 'btn-secondary'}`}
          style={{ padding: '0.4rem 0.8rem', minWidth: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          {i}
        </button>
      );
    }

    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
        {/* Previous page arrow button */}
        <button
          disabled={page === 1}
          onClick={() => setPage(prev => Math.max(1, prev - 1))}
          className="btn btn-secondary"
          style={{ padding: '0.4rem 0.6rem', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <ChevronLeft size={16} />
        </button>
        
        {/* Render page '1' shortcut if start of page list is beyond page 1 */}
        {startPage > 1 && (
          <>
            <button onClick={() => setPage(1)} className="btn btn-secondary" style={{ padding: '0.4rem 0.8rem', height: '36px' }}>1</button>
            {startPage > 2 && <span style={{ color: 'var(--text-tertiary)', padding: '0 0.25rem' }}>...</span>}
          </>
        )}

        {/* List of visible page numbers */}
        {pages}

        {/* Render last page shortcut if end of page list is before the last page */}
        {endPage < totalPages && (
          <>
            {endPage < totalPages - 1 && <span style={{ color: 'var(--text-tertiary)', padding: '0 0.25rem' }}>...</span>}
            <button onClick={() => setPage(totalPages)} className="btn btn-secondary" style={{ padding: '0.4rem 0.8rem', height: '36px' }}>{totalPages}</button>
          </>
        )}

        {/* Next page arrow button */}
        <button
          disabled={page === totalPages}
          onClick={() => setPage(prev => Math.min(totalPages, prev + 1))}
          className="btn btn-secondary"
          style={{ padding: '0.4rem 0.6rem', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <ChevronRight size={16} />
        </button>
      </div>
    );
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* 1. Page Header Title Block */}
      <div className="page-header" style={{ marginBottom: '1rem' }}>
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            🛡️ Audit Logs
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
            Track and monitor changes across all operational modules in real-time.
          </p>
        </div>
      </div>

      {/* 3. Control Filter Bar Block */}
      <div className="card" style={{ padding: '1.25rem', border: '1px solid var(--border-color)' }}>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', 
          gap: '1rem',
          alignItems: 'flex-end'
        }}>
          {/* Start and End date range calendars */}
          <div className="form-group" style={{ margin: 0 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.4rem' }}>
              <Calendar size={14} /> Date Range
            </label>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <input 
                type="date" 
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                style={{ padding: '0.5rem', fontSize: '0.85rem', flex: 1, minWidth: 0 }}
              />
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>to</span>
              <input 
                type="date" 
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                style={{ padding: '0.5rem', fontSize: '0.85rem', flex: 1, minWidth: 0 }}
              />
            </div>
          </div>

          {/* User selection dropdown */}
          <div className="form-group" style={{ margin: 0 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.4rem' }}>
              <UserIcon size={14} /> User
            </label>
            <select
              value={selectedUser}
              onChange={e => setSelectedUser(e.target.value)}
              style={{ padding: '0.5rem', fontSize: '0.85rem', width: '100%' }}
            >
              <option value="All Users">All Users</option>
              {filterChoices.users.map(u => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
          </div>

          {/* Module selection dropdown */}
          <div className="form-group" style={{ margin: 0 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.4rem' }}>
              <Folder size={14} /> Module
            </label>
            <select
              value={selectedModule}
              onChange={e => setSelectedModule(e.target.value)}
              style={{ padding: '0.5rem', fontSize: '0.85rem', width: '100%' }}
            >
              <option value="All Modules">All Modules</option>
              {filterChoices.modules.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>

          {/* Action selection dropdown */}
          <div className="form-group" style={{ margin: 0 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.4rem' }}>
              <Activity size={14} /> Actions
            </label>
            <select
              value={selectedAction}
              onChange={e => setSelectedAction(e.target.value)}
              style={{ padding: '0.5rem', fontSize: '0.85rem', width: '100%' }}
            >
              <option value="All Actions">All Actions</option>
              {filterChoices.actions.map(a => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </div>

          {/* Search by record ID text box */}
          <div className="form-group" style={{ margin: 0 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.4rem' }}>
              <Search size={14} /> Search Record ID
            </label>
            <input
              type="text"
              placeholder="e.g. ITEM-0102..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{ padding: '0.5rem', fontSize: '0.85rem', width: '100%' }}
            />
          </div>

          {/* Action buttons block */}
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button 
              onClick={handleFilter}
              className="btn btn-primary"
              style={{ 
                padding: '0.5rem 1rem', 
                fontSize: '0.85rem', 
                flex: 1, 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                gap: '0.35rem',
                height: '38px'
              }}
            >
              <Filter size={14} /> Filter
            </button>
            <button 
              onClick={handleReset}
              className="btn btn-secondary"
              style={{ 
                padding: '0.5rem 1rem', 
                fontSize: '0.85rem', 
                flex: 1, 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                gap: '0.35rem',
                height: '38px',
                backgroundColor: 'rgba(239, 68, 68, 0.08)',
                color: 'var(--danger-text)',
                border: '1px solid rgba(239, 68, 68, 0.15)'
              }}
            >
              <RotateCcw size={14} /> Reset
            </button>
          </div>
        </div>
      </div>

      {/* 4. Logs List Table and Pagination Container */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        
        {/* Pagination status row */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          padding: '0 0.5rem' 
        }}>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Showing {logs.length > 0 ? (page - 1) * limit + 1 : 0} - {Math.min(page * limit, totalCount)} of {totalCount} logs
          </div>
          {totalPages > 1 && renderPagination()}
        </div>

        {/* Logs Table */}
        <div className="table-container" style={{ margin: 0 }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--primary)' }}>
              Loading audit history logs...
            </div>
          ) : logs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-secondary)' }}>
              No audit logs found matching criteria.
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th style={{ padding: '0.75rem 1rem', fontSize: '0.8rem' }}>Date & Time</th>
                  <th style={{ padding: '0.75rem 1rem', fontSize: '0.8rem' }}>User</th>
                  <th style={{ padding: '0.75rem 1rem', fontSize: '0.8rem' }}>Module</th>
                  <th style={{ padding: '0.75rem 1rem', fontSize: '0.8rem' }}>Record Type</th>
                  <th style={{ padding: '0.75rem 1rem', fontSize: '0.8rem' }}>Record ID</th>
                  <th style={{ padding: '0.75rem 1rem', fontSize: '0.8rem' }}>Action</th>
                  <th style={{ padding: '0.75rem 1rem', fontSize: '0.8rem' }}>Field Changed</th>
                  <th style={{ padding: '0.75rem 1rem', fontSize: '0.8rem' }}>Old Value</th>
                  <th style={{ padding: '0.75rem 1rem', fontSize: '0.8rem' }}>New Value</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => {
                  // Determine coloring classes for different action categories
                  let actionClass = '';
                  if (log.action === 'Created') actionClass = 'status-completed'; // Green
                  else if (log.action === 'Updated') actionClass = 'status-planned';   // Orange/Yellow
                  else if (log.action === 'Deleted') actionClass = 'status-cancelled'; // Red

                  return (
                    <tr key={log.id}>
                      <td style={{ padding: '0.85rem 1rem', fontSize: '0.85rem', whiteSpace: 'nowrap' }}>{formatDate(log.timestamp)}</td>
                      <td style={{ padding: '0.85rem 1rem', fontSize: '0.85rem', fontWeight: 500 }}>{log.user_name || 'System'}</td>
                      <td style={{ padding: '0.85rem 1rem', fontSize: '0.85rem' }}>{log.module}</td>
                      <td style={{ padding: '0.85rem 1rem', fontSize: '0.85rem' }}>{log.record_type}</td>
                      <td style={{ padding: '0.85rem 1rem', fontSize: '0.85rem', fontWeight: 600, color: 'var(--primary)' }}>{log.record_id}</td>
                      <td style={{ padding: '0.85rem 1rem', fontSize: '0.85rem' }}>
                        <span className={`status-pill ${actionClass}`} style={{ fontSize: '0.75rem', padding: '0.15rem 0.5rem' }}>
                          {log.action}
                        </span>
                      </td>
                      <td style={{ padding: '0.85rem 1rem', fontSize: '0.85rem', color: log.field_changed && log.field_changed !== '-' ? 'var(--text-primary)' : 'var(--text-tertiary)' }}>
                        {log.field_changed || '-'}
                      </td>
                      <td style={{ padding: '0.85rem 1rem', fontSize: '0.85rem', color: log.old_value && log.old_value !== '-' ? 'var(--danger-text)' : 'var(--text-tertiary)', fontWeight: log.old_value && log.old_value !== '-' ? 500 : 400 }}>
                        {log.old_value || '-'}
                      </td>
                      <td style={{ padding: '0.85rem 1rem', fontSize: '0.85rem', color: log.new_value && log.new_value !== '-' ? 'var(--success-text)' : 'var(--text-tertiary)', fontWeight: log.new_value && log.new_value !== '-' ? 500 : 400 }}>
                        {log.new_value || '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer pagination row (shows only if we have more than 1 page) */}
        {totalPages > 1 && (
          <div style={{ 
            display: 'flex', 
            justifyContent: 'flex-end', 
            alignItems: 'center', 
            marginTop: '0.5rem'
          }}>
            {renderPagination()}
          </div>
        )}
      </div>

    </div>
  );
};
