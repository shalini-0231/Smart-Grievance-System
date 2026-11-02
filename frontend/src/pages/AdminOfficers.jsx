import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { useToast } from '../context/ToastContext';
import {
  Users, UserCheck, UserX, UserPlus, Clock, ClipboardList,
  TrendingUp, Star, Search, RefreshCw, Mail, Phone, Edit,
  Trash2, ShieldCheck, AlertTriangle, X, Check, ArrowLeft,
  Building2, Award, Zap, Download
} from 'lucide-react';

const VALID_DEPARTMENTS = [
  'Academic Department',
  'Hostel Administration',
  'Transport Department',
  'IT Department',
  'Maintenance Department',
  'Student Welfare / Anti-Ragging Committee',
  'Canteen & Hospitality',
  'General Administration'
];

const AdminOfficers = () => {
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [officers, setOfficers] = useState([]);
  const [kpis, setKpis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingOfficer, setEditingOfficer] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    department: 'IT Department',
    role: 'Department Officer',
    designation: 'Department Officer',
    email: '',
    phone: '',
    password: ''
  });

  const loadOfficers = async (showToast = false) => {
    setLoading(true);
    try {
      const data = await api.getAllOfficers();
      if (data && data.officers) {
        setOfficers(data.officers);
        setKpis(data.kpis);
      } else if (Array.isArray(data)) {
        setOfficers(data);
      }
      if (showToast) addToast('Officer directory refreshed successfully', 'success');
    } catch (err) {
      addToast(err.message || 'Failed to load campus officers', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOfficers();
  }, []);

  // Filtered officers list
  const filteredOfficers = useMemo(() => {
    return officers.filter(o => {
      if (departmentFilter && o.department !== departmentFilter) return false;
      if (statusFilter === 'active' && !o.isActive) return false;
      if (statusFilter === 'inactive' && o.isActive) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = o.name?.toLowerCase().includes(q);
        const matchEmail = o.email?.toLowerCase().includes(q);
        const matchRole = (o.role || o.designation)?.toLowerCase().includes(q);
        const matchDept = o.department?.toLowerCase().includes(q);
        if (!matchName && !matchEmail && !matchRole && !matchDept) return false;
      }
      return true;
    });
  }, [officers, searchQuery, departmentFilter, statusFilter]);

  // Derived KPI metrics if not directly returned by backend
  const derivedKpis = useMemo(() => {
    if (kpis) return kpis;
    const totalOfficers = officers.length;
    const activeOfficers = officers.filter(o => o.isActive).length;
    const inactiveOfficers = totalOfficers - activeOfficers;
    const totalAssignedComplaints = officers.reduce((acc, o) => acc + (o.totalAssigned || 0), 0);
    const pendingComplaints = officers.reduce((acc, o) => acc + (o.pending || o.openTicketCount || 0), 0);
    const avgResolutionRate = totalOfficers > 0
      ? Math.round(officers.reduce((acc, o) => acc + (o.resolutionRate || 100), 0) / totalOfficers)
      : 100;
    return {
      totalOfficers,
      activeOfficers,
      inactiveOfficers,
      totalAssignedComplaints,
      pendingComplaints,
      avgResolutionRate
    };
  }, [officers, kpis]);

  // Handle Add Officer
  const handleCreateOfficer = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.department) {
      return addToast('Name, department, and official email are required', 'warning');
    }
    setActionLoading(true);
    try {
      await api.createOfficer({
        name: formData.name,
        department: formData.department,
        role: formData.role || formData.designation,
        designation: formData.designation || formData.role,
        email: formData.email,
        contact: formData.phone,
        phone: formData.phone,
        password: formData.password
      });
      addToast(`Officer "${formData.name}" added successfully!`, 'success');
      setShowAddModal(false);
      setFormData({
        name: '',
        department: 'IT Department',
        role: 'Department Officer',
        designation: 'Department Officer',
        email: '',
        phone: '',
        password: ''
      });
      loadOfficers();
    } catch (err) {
      addToast(err.message || 'Failed to add officer', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Edit Officer
  const handleUpdateOfficer = async (e) => {
    e.preventDefault();
    if (!editingOfficer) return;
    setActionLoading(true);
    try {
      await api.updateOfficer(editingOfficer._id, {
        name: editingOfficer.name,
        department: editingOfficer.department,
        role: editingOfficer.role || editingOfficer.designation,
        designation: editingOfficer.designation || editingOfficer.role,
        email: editingOfficer.email,
        contact: editingOfficer.phone || editingOfficer.contact,
        phone: editingOfficer.phone || editingOfficer.contact,
        isActive: editingOfficer.isActive
      });
      addToast(`Officer "${editingOfficer.name}" updated successfully!`, 'success');
      setEditingOfficer(null);
      loadOfficers();
    } catch (err) {
      addToast(err.message || 'Failed to update officer', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Toggle Active/Inactive Status
  const handleToggleStatus = async (officer) => {
    const action = officer.isActive ? 'deactivate' : 'activate';
    if (!window.confirm(`Are you sure you want to ${action} ${officer.name}? Deactivated officers will not receive new automatic ticket allocations.`)) return;
    try {
      await api.toggleOfficerStatus(officer._id);
      addToast(`Officer ${officer.name} is now ${officer.isActive ? 'Deactivated' : 'Active'}`, 'success');
      loadOfficers();
    } catch (err) {
      addToast(err.message || 'Failed to change officer status', 'error');
    }
  };

  // Handle Safe Remove
  const handleDeleteOfficer = async (officer) => {
    if (officer.totalAssigned > 0 || officer.totalResolved > 0 || officer.openTicketCount > 0) {
      const confirmDeact = window.confirm(
        `Institutional Protection Notice:\n\nOfficer "${officer.name}" has handled or is currently assigned complaints. Deleting this account permanently would corrupt student audit trails.\n\nWould you like to DEACTIVATE this officer instead?`
      );
      if (confirmDeact) {
        handleToggleStatus(officer);
      }
      return;
    }

    if (!window.confirm(`Permanently remove officer "${officer.name}"? This action cannot be undone.`)) return;

    try {
      const res = await api.deleteOfficer(officer._id);
      addToast(res.message || `Officer ${officer.name} removed successfully`, 'success');
      loadOfficers();
    } catch (err) {
      addToast(err.message || 'Failed to remove officer', 'error');
    }
  };
  // Export Officers Directory to CSV
  const handleExportCSV = () => {
    if (!officers || officers.length === 0) return addToast('No officers to export', 'warning');
    const headers = [
      'Name',
      'Department',
      'Designation',
      'Email',
      'Phone',
      'Status',
      'Assigned Complaints',
      'Pending',
      'In Progress',
      'Resolved',
      'Overdue',
      'Current Workload',
      'Resolution Rate (%)',
      'SLA Compliance (%)',
      'Student Rating'
    ];
    const rows = filteredOfficers.map(o => [
      `"${(o.name || '').replace(/"/g, '""')}"`,
      `"${(o.department || '').replace(/"/g, '""')}"`,
      `"${(o.role || o.designation || '').replace(/"/g, '""')}"`,
      `"${o.email || ''}"`,
      `"${o.phone || o.contact || ''}"`,
      `"${o.isActive ? 'Active' : 'Inactive'}"`,
      o.totalAssigned || 0,
      o.pending || 0,
      o.inProgress || 0,
      o.resolved || o.totalResolved || 0,
      o.overdue || 0,
      o.currentWorkload !== undefined ? o.currentWorkload : (o.openTicketCount || 0),
      `${o.resolutionRate !== undefined ? o.resolutionRate : 100}%`,
      `${o.slaComplianceRate !== undefined ? o.slaComplianceRate : 96}%`,
      o.avgRating ? Number(o.avgRating).toFixed(1) : '4.5'
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `scgrs_officers_roster_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    addToast('Officer roster exported successfully', 'success');
  };

  return (
    <div style={{ maxWidth: '1440px', margin: '0 auto', padding: '1.25rem 1rem 3rem 1rem' }}>
      {/* ── Page Header matching Admin Panel Style ── */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: '1.25rem',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.25rem' }}>
            <span style={{
              background: 'rgba(56, 189, 248, 0.12)',
              color: '#38bdf8',
              border: '1px solid rgba(56, 189, 248, 0.3)',
              borderRadius: '4px',
              padding: '2px 8px',
              fontSize: '0.7rem',
              fontWeight: 700,
              letterSpacing: '0.05em'
            }}>
              OFFICER DISPATCH & WORKLOAD
            </span>
          </div>
          <h1 style={{
            fontSize: '1.45rem',
            fontWeight: 700,
            color: '#ffffff',
            margin: '0 0 0.25rem 0',
            letterSpacing: '-0.01em'
          }}>
            Campus Officer Management & Allocation
          </h1>
          <p style={{ color: '#94a3b8', fontSize: '0.82rem', margin: 0 }}>
            Real-time workload balancing, department assignments, resolution rate scoring & safe account deactivation.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={handleExportCSV}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
              background: 'transparent',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              color: '#cbd5e1',
              padding: '0.5rem 0.9rem',
              borderRadius: '6px',
              fontSize: '0.82rem',
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
            title="Download officers directory as CSV"
          >
            <Download size={14} color="#10b981" /> Export Roster
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
              background: '#2563eb',
              border: '1px solid #3b82f6',
              color: '#ffffff',
              padding: '0.5rem 1rem',
              borderRadius: '6px',
              fontSize: '0.82rem',
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: '0 2px 10px rgba(37, 99, 235, 0.3)'
            }}
          >
            <UserPlus size={15} /> Add New Officer
          </button>
          <button
            onClick={() => loadOfficers(true)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
              background: 'transparent',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              color: '#cbd5e1',
              padding: '0.5rem 0.9rem',
              borderRadius: '6px',
              fontSize: '0.82rem',
              fontWeight: 500,
              cursor: 'pointer'
            }}
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>
      </div>

      {/* ── 6 KPI Cards in One Responsive Row ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '0.9rem',
        marginBottom: '1.25rem'
      }}>
        {/* 1. Total Officers */}
        <div style={{
          background: '#0d1527',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderLeft: '3.5px solid #38bdf8',
          borderRadius: '10px',
          padding: '1rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.85rem'
        }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '8px',
            background: 'rgba(56, 189, 248, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#38bdf8',
            flexShrink: 0
          }}>
            <Users size={19} />
          </div>
          <div>
            <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>
              TOTAL OFFICERS
            </div>
            <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#f8fafc', lineHeight: 1.1 }}>
              {derivedKpis.totalOfficers}
            </div>
          </div>
        </div>

        {/* 2. Active Officers */}
        <div style={{
          background: '#0d1527',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderLeft: '3.5px solid #10b981',
          borderRadius: '10px',
          padding: '1rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.85rem'
        }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '8px',
            background: 'rgba(16, 185, 129, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#10b981',
            flexShrink: 0
          }}>
            <UserCheck size={19} />
          </div>
          <div>
            <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>
              ACTIVE OFFICERS
            </div>
            <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#10b981', lineHeight: 1.1 }}>
              {derivedKpis.activeOfficers}
            </div>
          </div>
        </div>

        {/* 3. Inactive Officers */}
        <div style={{
          background: '#0d1527',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderLeft: '3.5px solid #ef4444',
          borderRadius: '10px',
          padding: '1rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.85rem'
        }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '8px',
            background: 'rgba(239, 68, 68, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ef4444',
            flexShrink: 0
          }}>
            <UserX size={19} />
          </div>
          <div>
            <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>
              INACTIVE / ON LEAVE
            </div>
            <div style={{ fontSize: '1.65rem', fontWeight: 800, color: derivedKpis.inactiveOfficers > 0 ? '#ef4444' : '#f8fafc', lineHeight: 1.1 }}>
              {derivedKpis.inactiveOfficers}
            </div>
          </div>
        </div>

        {/* 4. Total Assigned Complaints */}
        <div style={{
          background: '#0d1527',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderLeft: '3.5px solid #6366f1',
          borderRadius: '10px',
          padding: '1rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.85rem'
        }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '8px',
            background: 'rgba(99, 102, 241, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#818cf8',
            flexShrink: 0
          }}>
            <ClipboardList size={19} />
          </div>
          <div>
            <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>
              ASSIGNED COMPLAINTS
            </div>
            <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#f8fafc', lineHeight: 1.1 }}>
              {derivedKpis.totalAssignedComplaints}
            </div>
          </div>
        </div>

        {/* 5. Pending Complaints */}
        <div style={{
          background: '#0d1527',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderLeft: '3.5px solid #f59e0b',
          borderRadius: '10px',
          padding: '1rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.85rem'
        }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '8px',
            background: 'rgba(245, 158, 11, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#f59e0b',
            flexShrink: 0
          }}>
            <Clock size={19} />
          </div>
          <div>
            <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>
              PENDING RESOLUTION
            </div>
            <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#f59e0b', lineHeight: 1.1 }}>
              {derivedKpis.pendingComplaints}
            </div>
          </div>
        </div>

        {/* 6. Average Resolution Rate */}
        <div style={{
          background: '#0d1527',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderLeft: '3.5px solid #10b981',
          borderRadius: '10px',
          padding: '1rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.85rem'
        }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '8px',
            background: 'rgba(16, 185, 129, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#10b981',
            flexShrink: 0
          }}>
            <TrendingUp size={19} />
          </div>
          <div>
            <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>
              AVG RESOLUTION RATE
            </div>
            <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#10b981', lineHeight: 1.1 }}>
              {derivedKpis.avgResolutionRate}%
            </div>
          </div>
        </div>
      </div>

      {/* ── Filters Section matching reference screenshot ── */}
      <div style={{
        background: '#0d1527',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: '8px',
        padding: '0.65rem 1rem',
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        marginBottom: '1.25rem',
        flexWrap: 'wrap'
      }}>
        <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#94a3b8' }}>
          Filters:
        </span>

        <div style={{ flex: '1 1 240px', position: 'relative' }}>
          <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
          <input
            type="text"
            placeholder="Search by officer name, email, or designation..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '6px',
              padding: '0.45rem 0.6rem 0.45rem 2rem',
              color: '#f8fafc',
              fontSize: '0.82rem',
              outline: 'none'
            }}
          />
        </div>

        <select
          value={departmentFilter}
          onChange={(e) => setDepartmentFilter(e.target.value)}
          style={{
            background: 'rgba(255, 255, 255, 0.04)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '6px',
            padding: '0.45rem 0.75rem',
            color: '#f8fafc',
            fontSize: '0.82rem',
            outline: 'none'
          }}
        >
          <option value="" style={{ background: '#0d1527', color: '#f8fafc' }}>All Departments</option>
          {VALID_DEPARTMENTS.map(d => (
            <option key={d} value={d} style={{ background: '#0d1527', color: '#f8fafc' }}>{d}</option>
          ))}
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{
            background: 'rgba(255, 255, 255, 0.04)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '6px',
            padding: '0.45rem 0.75rem',
            color: '#f8fafc',
            fontSize: '0.82rem',
            outline: 'none'
          }}
        >
          <option value="" style={{ background: '#0d1527', color: '#f8fafc' }}>All Statuses</option>
          <option value="active" style={{ background: '#0d1527', color: '#f8fafc' }}>Active Only</option>
          <option value="inactive" style={{ background: '#0d1527', color: '#f8fafc' }}>Inactive / Deactivated Only</option>
        </select>

        {(searchQuery || departmentFilter || statusFilter) && (
          <button
            onClick={() => { setSearchQuery(''); setDepartmentFilter(''); setStatusFilter(''); }}
            style={{
              background: 'transparent',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              color: '#94a3b8',
              borderRadius: '6px',
              padding: '0.45rem 0.75rem',
              fontSize: '0.8rem',
              cursor: 'pointer'
            }}
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* ── Main Officer Workload & Performance Table ── */}
      <div style={{
        background: '#0d1527',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: '10px',
        overflow: 'hidden'
      }}>
        <div style={{
          padding: '0.85rem 1.25rem',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <h2 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#f8fafc', margin: 0 }}>
            Officer Dispatch & Performance Log ({filteredOfficers.length})
          </h2>
          <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
            Auto-assignment scoring: score = (10 - openWorkload) + (rating × 2)
          </span>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.8rem' }}>
            <thead>
              <tr style={{ background: 'rgba(255, 255, 255, 0.02)', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', color: '#94a3b8', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                <th style={{ padding: '0.8rem 1rem' }}>Officer & Designation</th>
                <th style={{ padding: '0.8rem 0.75rem' }}>Department</th>
                <th style={{ padding: '0.8rem 0.75rem' }}>Contact</th>
                <th style={{ padding: '0.8rem 0.75rem', textAlign: 'center' }}>Status</th>
                <th style={{ padding: '0.8rem 0.6rem', textAlign: 'center' }}>Assigned</th>
                <th style={{ padding: '0.8rem 0.6rem', textAlign: 'center' }}>Pending</th>
                <th style={{ padding: '0.8rem 0.6rem', textAlign: 'center' }}>In-Prog</th>
                <th style={{ padding: '0.8rem 0.6rem', textAlign: 'center' }}>Resolved</th>
                <th style={{ padding: '0.8rem 0.6rem', textAlign: 'center' }}>Overdue</th>
                <th style={{ padding: '0.8rem 1rem' }}>Current Workload</th>
                <th style={{ padding: '0.8rem 0.6rem', textAlign: 'center' }}>Resolution %</th>
                <th style={{ padding: '0.8rem 0.6rem', textAlign: 'center' }}>SLA %</th>
                <th style={{ padding: '0.8rem 0.75rem', textAlign: 'center' }}>Rating</th>
                <th style={{ padding: '0.8rem 1rem', textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredOfficers.length === 0 ? (
                <tr>
                  <td colSpan="14" style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
                    No campus officers match the selected criteria.
                  </td>
                </tr>
              ) : (
                filteredOfficers.map(off => {
                  const workload = off.currentWorkload !== undefined ? off.currentWorkload : (off.openTicketCount || 0);
                  const meterColor = workload >= 5 ? '#ef4444' : (workload >= 3 ? '#f59e0b' : '#10b981');
                  const meterPct = Math.min(100, Math.max(12, (workload / 6) * 100));

                  return (
                    <tr
                      key={off._id}
                      style={{
                        borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                        transition: 'background 0.15s ease'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      {/* Officer & Designation */}
                      <td style={{ padding: '0.8rem 1rem' }}>
                        <div style={{ fontWeight: 600, color: '#f8fafc', fontSize: '0.85rem' }}>
                          {off.name}
                        </div>
                        <div style={{ color: '#38bdf8', fontSize: '0.72rem', fontWeight: 500 }}>
                          {off.role || off.designation || 'Department Officer'}
                        </div>
                      </td>

                      {/* Department */}
                      <td style={{ padding: '0.8rem 0.75rem' }}>
                        <span style={{
                          background: 'rgba(59, 130, 246, 0.12)',
                          color: '#93c5fd',
                          border: '1px solid rgba(59, 130, 246, 0.25)',
                          borderRadius: '4px',
                          padding: '2px 7px',
                          fontSize: '0.72rem',
                          fontWeight: 500,
                          display: 'inline-block'
                        }}>
                          {off.department}
                        </span>
                      </td>

                      {/* Contact */}
                      <td style={{ padding: '0.8rem 0.75rem', fontSize: '0.75rem', color: '#94a3b8' }}>
                        {off.email && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '2px' }}>
                            <Mail size={11} color="#64748b" /> {off.email}
                          </div>
                        )}
                        {(off.phone || off.contact) && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Phone size={11} color="#64748b" /> {off.phone || off.contact}
                          </div>
                        )}
                      </td>

                      {/* Status */}
                      <td style={{ padding: '0.8rem 0.75rem', textAlign: 'center' }}>
                        {off.isActive ? (
                          <span style={{
                            background: 'rgba(16, 185, 129, 0.15)',
                            color: '#10b981',
                            border: '1px solid rgba(16, 185, 129, 0.3)',
                            borderRadius: '12px',
                            padding: '2px 8px',
                            fontSize: '0.7rem',
                            fontWeight: 700,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '3px'
                          }}>
                            ● Active
                          </span>
                        ) : (
                          <span style={{
                            background: 'rgba(239, 68, 68, 0.15)',
                            color: '#ef4444',
                            border: '1px solid rgba(239, 68, 68, 0.3)',
                            borderRadius: '12px',
                            padding: '2px 8px',
                            fontSize: '0.7rem',
                            fontWeight: 700,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '3px'
                          }}>
                            ○ Inactive
                          </span>
                        )}
                      </td>

                      {/* Assigned */}
                      <td style={{ padding: '0.8rem 0.6rem', textAlign: 'center', fontWeight: 700, color: '#f8fafc' }}>
                        {off.totalAssigned || 0}
                      </td>

                      {/* Pending */}
                      <td style={{ padding: '0.8rem 0.6rem', textAlign: 'center', fontWeight: 600, color: (off.pending || 0) > 0 ? '#f59e0b' : '#64748b' }}>
                        {off.pending || 0}
                      </td>

                      {/* In-Progress */}
                      <td style={{ padding: '0.8rem 0.6rem', textAlign: 'center', fontWeight: 600, color: (off.inProgress || 0) > 0 ? '#38bdf8' : '#64748b' }}>
                        {off.inProgress || 0}
                      </td>

                      {/* Resolved */}
                      <td style={{ padding: '0.8rem 0.6rem', textAlign: 'center', fontWeight: 700, color: '#10b981' }}>
                        {off.resolved || off.totalResolved || 0}
                      </td>

                      {/* Overdue */}
                      <td style={{ padding: '0.8rem 0.6rem', textAlign: 'center', fontWeight: 700, color: (off.overdue || 0) > 0 ? '#ef4444' : '#64748b' }}>
                        {off.overdue || 0}
                      </td>

                      {/* Workload Meter */}
                      <td style={{ padding: '0.8rem 1rem', minWidth: '130px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.7rem', marginBottom: '3px' }}>
                          <span style={{ color: meterColor, fontWeight: 700 }}>{workload} Open</span>
                          <span style={{ color: '#64748b', fontSize: '0.65rem' }}>
                            {workload >= 5 ? 'High Load' : (workload >= 3 ? 'Moderate' : 'Optimal')}
                          </span>
                        </div>
                        <div style={{ width: '100%', height: '5px', background: 'rgba(255, 255, 255, 0.08)', borderRadius: '3px', overflow: 'hidden' }}>
                          <div style={{ width: `${meterPct}%`, height: '100%', background: meterColor, borderRadius: '3px', transition: 'width 0.3s ease' }}></div>
                        </div>
                      </td>

                      {/* Resolution % */}
                      <td style={{ padding: '0.8rem 0.6rem', textAlign: 'center', fontWeight: 700, color: '#10b981' }}>
                        {off.resolutionRate !== undefined ? off.resolutionRate : 100}%
                      </td>

                      {/* SLA Compliance % */}
                      <td style={{ padding: '0.8rem 0.6rem', textAlign: 'center', fontWeight: 700, color: '#38bdf8' }}>
                        {off.slaComplianceRate !== undefined ? off.slaComplianceRate : 96}%
                      </td>

                      {/* Student Rating */}
                      <td style={{ padding: '0.8rem 0.75rem', textAlign: 'center' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', color: '#fbbf24', fontWeight: 700, fontSize: '0.78rem' }}>
                          <Star size={12} fill="#fbbf24" /> {off.avgRating ? Number(off.avgRating).toFixed(1) : '4.5'}
                        </div>
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '0.8rem 1rem', textAlign: 'center' }}>
                        <div style={{ display: 'inline-flex', gap: '0.35rem' }}>
                          <button
                            title="Edit officer details & department"
                            onClick={() => setEditingOfficer({ ...off })}
                            style={{
                              background: 'rgba(56, 189, 248, 0.1)',
                              border: '1px solid rgba(56, 189, 248, 0.25)',
                              color: '#38bdf8',
                              borderRadius: '4px',
                              padding: '3px 7px',
                              fontSize: '0.72rem',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '3px'
                            }}
                          >
                            <Edit size={11} /> Edit
                          </button>

                          <button
                            title={off.isActive ? 'Deactivate officer account' : 'Reactivate officer account'}
                            onClick={() => handleToggleStatus(off)}
                            style={{
                              background: off.isActive ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                              border: `1px solid ${off.isActive ? 'rgba(239, 68, 68, 0.25)' : 'rgba(16, 185, 129, 0.25)'}`,
                              color: off.isActive ? '#ef4444' : '#10b981',
                              borderRadius: '4px',
                              padding: '3px 7px',
                              fontSize: '0.72rem',
                              cursor: 'pointer'
                            }}
                          >
                            {off.isActive ? 'Deactivate' : 'Activate'}
                          </button>

                          <button
                            title="Remove officer account (Safe Delete)"
                            onClick={() => handleDeleteOfficer(off)}
                            style={{
                              background: 'transparent',
                              border: '1px solid rgba(255, 255, 255, 0.1)',
                              color: '#94a3b8',
                              borderRadius: '4px',
                              padding: '3px 6px',
                              fontSize: '0.72rem',
                              cursor: 'pointer'
                            }}
                          >
                            <Trash2 size={11} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Modal: Add New Officer ── */}
      {showAddModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(6px)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem'
        }}>
          <div style={{
            background: '#0d1527',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            borderRadius: '12px',
            maxWidth: '520px',
            width: '100%',
            padding: '1.5rem',
            boxShadow: '0 20px 40px rgba(0,0,0,0.6)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '6px',
                  background: 'rgba(37, 99, 235, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#38bdf8'
                }}>
                  <UserPlus size={18} />
                </div>
                <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#f8fafc' }}>
                  Register Campus Officer
                </h3>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateOfficer} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', color: '#94a3b8', marginBottom: '0.3rem', fontWeight: 600 }}>
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Dr. S. Ramachandran"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  style={{
                    width: '100%',
                    background: 'rgba(255, 255, 255, 0.04)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '6px',
                    padding: '0.5rem 0.75rem',
                    color: '#f8fafc',
                    fontSize: '0.85rem'
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', color: '#94a3b8', marginBottom: '0.3rem', fontWeight: 600 }}>
                    Assigned Department *
                  </label>
                  <select
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    style={{
                      width: '100%',
                      background: '#0d1527',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '6px',
                      padding: '0.5rem 0.75rem',
                      color: '#f8fafc',
                      fontSize: '0.82rem'
                    }}
                  >
                    {VALID_DEPARTMENTS.map(d => (
                      <option key={d} value={d} style={{ background: '#0d1527', color: '#f8fafc' }}>{d}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', color: '#94a3b8', marginBottom: '0.3rem', fontWeight: 600 }}>
                    Designation / Title
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Hostel Warden"
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value, designation: e.target.value })}
                    style={{
                      width: '100%',
                      background: 'rgba(255, 255, 255, 0.04)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '6px',
                      padding: '0.5rem 0.75rem',
                      color: '#f8fafc',
                      fontSize: '0.85rem'
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', color: '#94a3b8', marginBottom: '0.3rem', fontWeight: 600 }}>
                    Official Email *
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="officer@scgrs.edu"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    style={{
                      width: '100%',
                      background: 'rgba(255, 255, 255, 0.04)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '6px',
                      padding: '0.5rem 0.75rem',
                      color: '#f8fafc',
                      fontSize: '0.85rem'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', color: '#94a3b8', marginBottom: '0.3rem', fontWeight: 600 }}>
                    Contact Phone
                  </label>
                  <input
                    type="text"
                    placeholder="+91 98765 43210"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    style={{
                      width: '100%',
                      background: 'rgba(255, 255, 255, 0.04)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '6px',
                      padding: '0.5rem 0.75rem',
                      color: '#f8fafc',
                      fontSize: '0.85rem'
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', color: '#94a3b8', marginBottom: '0.3rem', fontWeight: 600 }}>
                  Initial Login Password (Optional Account Invitation)
                </label>
                <input
                  type="password"
                  placeholder="Set password to allow officer login..."
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  style={{
                    width: '100%',
                    background: 'rgba(255, 255, 255, 0.04)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '6px',
                    padding: '0.5rem 0.75rem',
                    color: '#f8fafc',
                    fontSize: '0.85rem'
                  }}
                />
                <span style={{ fontSize: '0.7rem', color: '#64748b' }}>
                  If provided, an authenticated officer login account will be provisioned automatically.
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  style={{
                    background: 'transparent',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    color: '#cbd5e1',
                    borderRadius: '6px',
                    padding: '0.45rem 0.9rem',
                    fontSize: '0.82rem',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  style={{
                    background: '#2563eb',
                    border: 'none',
                    color: '#ffffff',
                    borderRadius: '6px',
                    padding: '0.45rem 1rem',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  {actionLoading ? 'Saving...' : 'Add Officer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal: Edit Officer Details ── */}
      {editingOfficer && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(6px)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem'
        }}>
          <div style={{
            background: '#0d1527',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            borderRadius: '12px',
            maxWidth: '500px',
            width: '100%',
            padding: '1.5rem',
            boxShadow: '0 20px 40px rgba(0,0,0,0.6)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Edit size={18} color="#38bdf8" />
                <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#f8fafc' }}>
                  Edit Officer Details
                </h3>
              </div>
              <button
                onClick={() => setEditingOfficer(null)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleUpdateOfficer} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', color: '#94a3b8', marginBottom: '0.3rem', fontWeight: 600 }}>
                  Officer Name
                </label>
                <input
                  type="text"
                  required
                  value={editingOfficer.name}
                  onChange={(e) => setEditingOfficer({ ...editingOfficer, name: e.target.value })}
                  style={{
                    width: '100%',
                    background: 'rgba(255, 255, 255, 0.04)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '6px',
                    padding: '0.5rem 0.75rem',
                    color: '#f8fafc',
                    fontSize: '0.85rem'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', color: '#94a3b8', marginBottom: '0.3rem', fontWeight: 600 }}>
                  Department Assignment
                </label>
                <select
                  value={editingOfficer.department}
                  onChange={(e) => setEditingOfficer({ ...editingOfficer, department: e.target.value })}
                  style={{
                    width: '100%',
                    background: '#0d1527',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '6px',
                    padding: '0.5rem 0.75rem',
                    color: '#f8fafc',
                    fontSize: '0.82rem'
                  }}
                >
                  {VALID_DEPARTMENTS.map(d => (
                    <option key={d} value={d} style={{ background: '#0d1527', color: '#f8fafc' }}>{d}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', color: '#94a3b8', marginBottom: '0.3rem', fontWeight: 600 }}>
                  Role / Designation
                </label>
                <input
                  type="text"
                  value={editingOfficer.role || editingOfficer.designation || ''}
                  onChange={(e) => setEditingOfficer({ ...editingOfficer, role: e.target.value, designation: e.target.value })}
                  style={{
                    width: '100%',
                    background: 'rgba(255, 255, 255, 0.04)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '6px',
                    padding: '0.5rem 0.75rem',
                    color: '#f8fafc',
                    fontSize: '0.85rem'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', color: '#94a3b8', marginBottom: '0.3rem', fontWeight: 600 }}>
                  Official Email
                </label>
                <input
                  type="email"
                  required
                  value={editingOfficer.email}
                  onChange={(e) => setEditingOfficer({ ...editingOfficer, email: e.target.value })}
                  style={{
                    width: '100%',
                    background: 'rgba(255, 255, 255, 0.04)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '6px',
                    padding: '0.5rem 0.75rem',
                    color: '#f8fafc',
                    fontSize: '0.85rem'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', color: '#94a3b8', marginBottom: '0.3rem', fontWeight: 600 }}>
                  Phone / Contact
                </label>
                <input
                  type="text"
                  value={editingOfficer.phone || editingOfficer.contact || ''}
                  onChange={(e) => setEditingOfficer({ ...editingOfficer, phone: e.target.value, contact: e.target.value })}
                  style={{
                    width: '100%',
                    background: 'rgba(255, 255, 255, 0.04)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '6px',
                    padding: '0.5rem 0.75rem',
                    color: '#f8fafc',
                    fontSize: '0.85rem'
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setEditingOfficer(null)}
                  style={{
                    background: 'transparent',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    color: '#cbd5e1',
                    borderRadius: '6px',
                    padding: '0.45rem 0.9rem',
                    fontSize: '0.82rem',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  style={{
                    background: '#2563eb',
                    border: 'none',
                    color: '#ffffff',
                    borderRadius: '6px',
                    padding: '0.45rem 1rem',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  {actionLoading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminOfficers;

