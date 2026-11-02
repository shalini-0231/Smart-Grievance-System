import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../services/api';
import { useToast } from '../context/ToastContext';
import {
  Users, UserCheck, UserX, UserPlus, Search, RefreshCw,
  Mail, Phone, Shield, GraduationCap, Edit, Trash2, Eye,
  Building2, Calendar, ClipboardList, Check, X, AlertTriangle,
  Lock, IdCard
} from 'lucide-react';

const VALID_DEPARTMENTS = [
  'Academic Department',
  'Hostel Administration',
  'Transport Department',
  'IT Department',
  'Maintenance Department',
  'Student Welfare / Anti-Ragging Committee',
  'Canteen & Hospitality',
  'General Administration',
  'Computer Science & Engineering',
  'Electronics & Communication Engineering',
  'Mechanical Engineering',
  'Civil Engineering',
  'Biotechnology'
];

const AdminUsers = () => {
  const { addToast } = useToast();

  const [users, setUsers] = useState([]);
  const [kpis, setKpis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [viewingUser, setViewingUser] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Form State
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    password: '',
    role: 'student',
    department: 'Computer Science & Engineering',
    rollNumber: '',
    phone: ''
  });

  const loadUsers = async (showToast = false) => {
    setLoading(true);
    try {
      const data = await api.getAllUsers();
      if (data && data.users) {
        setUsers(data.users);
        setKpis(data.kpis);
      } else if (Array.isArray(data)) {
        setUsers(data);
      }
      if (showToast) addToast('User directory refreshed successfully', 'success');
    } catch (err) {
      addToast(err.message || 'Failed to load user accounts', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  // Filtered users list
  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      if (roleFilter && u.role !== roleFilter) return false;
      if (statusFilter === 'active' && !u.isActive) return false;
      if (statusFilter === 'inactive' && u.isActive) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = u.name?.toLowerCase().includes(q);
        const matchEmail = u.email?.toLowerCase().includes(q);
        const matchRoll = u.rollNumber?.toLowerCase().includes(q);
        const matchDept = u.department?.toLowerCase().includes(q);
        const matchId = u._id?.toLowerCase().includes(q);
        if (!matchName && !matchEmail && !matchRoll && !matchDept && !matchId) return false;
      }
      return true;
    });
  }, [users, searchQuery, roleFilter, statusFilter]);

  // Derived KPIs
  const derivedKpis = useMemo(() => {
    if (kpis) return kpis;
    const totalUsers = users.length;
    const totalStudents = users.filter(u => u.role === 'student').length;
    const totalOfficers = users.filter(u => u.role === 'officer').length;
    const totalAdmins = users.filter(u => u.role === 'admin').length;
    const activeAccounts = users.filter(u => u.isActive).length;
    const inactiveAccounts = totalUsers - activeAccounts;
    return {
      totalUsers,
      totalStudents,
      totalOfficers,
      totalAdmins,
      activeAccounts,
      inactiveAccounts
    };
  }, [users, kpis]);

  // Handle Add User
  const handleCreateUser = async (e) => {
    e.preventDefault();
    if (!newUser.name || !newUser.email || !newUser.password) {
      return addToast('Full name, email address, and initial password are required', 'warning');
    }
    setActionLoading(true);
    try {
      await api.createUser(newUser);
      addToast(`Account for "${newUser.name}" created successfully!`, 'success');
      setShowAddModal(false);
      setNewUser({
        name: '',
        email: '',
        password: '',
        role: 'student',
        department: 'Computer Science & Engineering',
        rollNumber: '',
        phone: ''
      });
      loadUsers();
    } catch (err) {
      addToast(err.message || 'Failed to create user account', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Edit User
  const handleUpdateUser = async (e) => {
    e.preventDefault();
    if (!editingUser) return;
    setActionLoading(true);
    try {
      await api.updateUserDetails(editingUser._id, {
        name: editingUser.name,
        email: editingUser.email,
        role: editingUser.role,
        department: editingUser.department,
        rollNumber: editingUser.rollNumber,
        phone: editingUser.phone,
        isActive: editingUser.isActive
      });
      addToast(`User details for "${editingUser.name}" updated successfully!`, 'success');
      setEditingUser(null);
      loadUsers();
    } catch (err) {
      addToast(err.message || 'Failed to update user', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Toggle Status
  const handleToggleStatus = async (user) => {
    if (user.email === 'admin@scgrs.com') {
      return addToast('The Primary Demo Administrator cannot be deactivated.', 'warning');
    }
    const action = user.isActive ? 'deactivate' : 'activate';
    if (!window.confirm(`Are you sure you want to ${action} account: ${user.name} (${user.email})?`)) return;

    try {
      const res = await api.toggleUserStatus(user._id);
      addToast(res.message || `Account ${action}d successfully`, 'success');
      loadUsers();
    } catch (err) {
      addToast(err.message || 'Failed to update user status', 'error');
    }
  };

  // Handle Safe Remove
  const handleDeleteUser = async (user) => {
    if (user.email === 'admin@scgrs.com') {
      return addToast('The Primary Demo Administrator account cannot be deleted.', 'warning');
    }

    if (user.complaintCount > 0) {
      const deact = window.confirm(
        `Institutional Protection Notice:\n\nUser "${user.name}" has ${user.complaintCount} grievance submissions on file. Deleting this account permanently would violate institutional accountability.\n\nWould you like to DEACTIVATE this user account instead?`
      );
      if (deact) {
        handleToggleStatus(user);
      }
      return;
    }

    if (!window.confirm(`Are you sure you want to permanently delete user account: ${user.name} (${user.email})?`)) return;

    try {
      const res = await api.deleteUser(user._id);
      addToast(res.message || `User account removed successfully`, 'success');
      loadUsers();
    } catch (err) {
      addToast(err.message || 'Failed to delete user', 'error');
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric'
    });
  };

  return (
    <div style={{ maxWidth: '1440px', margin: '0 auto', padding: '1.25rem 1rem 3rem 1rem' }}>
      {/* ── Page Header ── */}
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
              background: 'rgba(99, 102, 241, 0.12)',
              color: '#818cf8',
              border: '1px solid rgba(99, 102, 241, 0.3)',
              borderRadius: '4px',
              padding: '2px 8px',
              fontSize: '0.7rem',
              fontWeight: 700,
              letterSpacing: '0.05em'
            }}>
              AUTHENTICATION & ACCESS DIRECTORY
            </span>
          </div>
          <h1 style={{
            fontSize: '1.45rem',
            fontWeight: 700,
            color: '#ffffff',
            margin: '0 0 0.25rem 0',
            letterSpacing: '-0.01em'
          }}>
            Campus User Account Management
          </h1>
          <p style={{ color: '#94a3b8', fontSize: '0.82rem', margin: 0 }}>
            Directory of student, officer, and administrator credentials with role controls and active account status.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
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
            <UserPlus size={15} /> Add New User
          </button>
          <button
            onClick={() => loadUsers(true)}
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

      {/* ── 5 KPI Cards in One Responsive Row ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '0.9rem',
        marginBottom: '1.25rem'
      }}>
        {/* 1. Total Users */}
        <div style={{
          background: '#0d1527',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderLeft: '3.5px solid #2563eb',
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
            background: 'rgba(37, 99, 235, 0.15)',
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
              TOTAL USERS
            </div>
            <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#f8fafc', lineHeight: 1.1 }}>
              {derivedKpis.totalUsers}
            </div>
          </div>
        </div>

        {/* 2. Total Students */}
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
            <GraduationCap size={19} />
          </div>
          <div>
            <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>
              STUDENTS
            </div>
            <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#38bdf8', lineHeight: 1.1 }}>
              {derivedKpis.totalStudents}
            </div>
          </div>
        </div>

        {/* 3. Total Officers */}
        <div style={{
          background: '#0d1527',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderLeft: '3.5px solid #a855f7',
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
            background: 'rgba(168, 85, 247, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#c084fc',
            flexShrink: 0
          }}>
            <Shield size={19} />
          </div>
          <div>
            <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>
              OFFICERS & ADMINS
            </div>
            <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#c084fc', lineHeight: 1.1 }}>
              {(derivedKpis.totalOfficers || 0) + (derivedKpis.totalAdmins || 0)}
            </div>
          </div>
        </div>

        {/* 4. Active Accounts */}
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
              ACTIVE ACCOUNTS
            </div>
            <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#10b981', lineHeight: 1.1 }}>
              {derivedKpis.activeAccounts}
            </div>
          </div>
        </div>

        {/* 5. Inactive Accounts */}
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
              DEACTIVATED
            </div>
            <div style={{ fontSize: '1.65rem', fontWeight: 800, color: derivedKpis.inactiveAccounts > 0 ? '#ef4444' : '#f8fafc', lineHeight: 1.1 }}>
              {derivedKpis.inactiveAccounts}
            </div>
          </div>
        </div>
      </div>

      {/* ── Filters Section ── */}
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
            placeholder="Search by name, email, roll number, or ID..."
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
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
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
          <option value="" style={{ background: '#0d1527', color: '#f8fafc' }}>All Roles</option>
          <option value="student" style={{ background: '#0d1527', color: '#f8fafc' }}>Students</option>
          <option value="officer" style={{ background: '#0d1527', color: '#f8fafc' }}>Officers</option>
          <option value="admin" style={{ background: '#0d1527', color: '#f8fafc' }}>Administrators</option>
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
          <option value="" style={{ background: '#0d1527', color: '#f8fafc' }}>All Account Status</option>
          <option value="active" style={{ background: '#0d1527', color: '#f8fafc' }}>Active Accounts Only</option>
          <option value="inactive" style={{ background: '#0d1527', color: '#f8fafc' }}>Deactivated Accounts Only</option>
        </select>

        {(searchQuery || roleFilter || statusFilter) && (
          <button
            onClick={() => { setSearchQuery(''); setRoleFilter(''); setStatusFilter(''); }}
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

      {/* ── Main User Account Directory Table ── */}
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
            Registered Campus Users Log ({filteredUsers.length})
          </h2>
          <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
            Protected authentication with RBAC and institutional audit safety
          </span>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.8rem' }}>
            <thead>
              <tr style={{ background: 'rgba(255, 255, 255, 0.02)', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', color: '#94a3b8', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                <th style={{ padding: '0.8rem 1rem' }}>User Name</th>
                <th style={{ padding: '0.8rem 0.75rem' }}>Email Address</th>
                <th style={{ padding: '0.8rem 0.75rem' }}>ID / Roll Number</th>
                <th style={{ padding: '0.8rem 0.75rem', textAlign: 'center' }}>Role</th>
                <th style={{ padding: '0.8rem 0.75rem' }}>Department</th>
                <th style={{ padding: '0.8rem 0.75rem', textAlign: 'center' }}>Account Status</th>
                <th style={{ padding: '0.8rem 0.6rem', textAlign: 'center' }}>Complaints</th>
                <th style={{ padding: '0.8rem 0.75rem' }}>Registration Date</th>
                <th style={{ padding: '0.8rem 1rem', textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan="9" style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
                    No campus user accounts found matching your query.
                  </td>
                </tr>
              ) : (
                filteredUsers.map(u => {
                  const isPrimaryAdmin = u.email === 'admin@scgrs.com';
                  return (
                    <tr
                      key={u._id}
                      style={{
                        borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                        transition: 'background 0.15s ease'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      {/* Name */}
                      <td style={{ padding: '0.8rem 1rem' }}>
                        <div style={{ fontWeight: 600, color: '#f8fafc', fontSize: '0.85rem' }}>
                          {u.name}
                        </div>
                        {isPrimaryAdmin && (
                          <div style={{ color: '#38bdf8', fontSize: '0.68rem', fontWeight: 600 }}>
                            Primary Super Admin
                          </div>
                        )}
                      </td>

                      {/* Email */}
                      <td style={{ padding: '0.8rem 0.75rem', color: '#cbd5e1', fontSize: '0.78rem' }}>
                        {u.email}
                      </td>

                      {/* ID / Roll */}
                      <td style={{ padding: '0.8rem 0.75rem', color: '#94a3b8', fontSize: '0.75rem' }}>
                        {u.rollNumber ? (
                          <span style={{
                            background: 'rgba(255, 255, 255, 0.05)',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            color: '#e2e8f0',
                            fontFamily: 'monospace'
                          }}>
                            {u.rollNumber}
                          </span>
                        ) : (
                          <span style={{ color: '#475569' }}>—</span>
                        )}
                      </td>

                      {/* Role Badge */}
                      <td style={{ padding: '0.8rem 0.75rem', textAlign: 'center' }}>
                        <span style={{
                          display: 'inline-block',
                          padding: '2px 8px',
                          borderRadius: '12px',
                          fontSize: '0.68rem',
                          fontWeight: 700,
                          background: u.role === 'admin' ? 'rgba(59, 130, 246, 0.18)' :
                                      u.role === 'officer' ? 'rgba(168, 85, 247, 0.18)' : 'rgba(56, 189, 248, 0.12)',
                          color: u.role === 'admin' ? '#60a5fa' :
                                 u.role === 'officer' ? '#c084fc' : '#38bdf8',
                          border: `1px solid ${
                            u.role === 'admin' ? 'rgba(59, 130, 246, 0.35)' :
                            u.role === 'officer' ? 'rgba(168, 85, 247, 0.35)' : 'rgba(56, 189, 248, 0.25)'
                          }`
                        }}>
                          {u.role.toUpperCase()}
                        </span>
                      </td>

                      {/* Department */}
                      <td style={{ padding: '0.8rem 0.75rem', color: '#94a3b8', fontSize: '0.76rem' }}>
                        {u.department || 'Campus Student'}
                      </td>

                      {/* Status */}
                      <td style={{ padding: '0.8rem 0.75rem', textAlign: 'center' }}>
                        {u.isActive ? (
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
                            ○ Deactivated
                          </span>
                        )}
                      </td>

                      {/* Complaints */}
                      <td style={{ padding: '0.8rem 0.6rem', textAlign: 'center', fontWeight: 600, color: (u.complaintCount || 0) > 0 ? '#38bdf8' : '#64748b' }}>
                        {u.complaintCount || 0}
                      </td>

                      {/* Date */}
                      <td style={{ padding: '0.8rem 0.75rem', color: '#94a3b8', fontSize: '0.75rem', whiteSpace: 'nowrap' }}>
                        {formatDate(u.createdAt)}
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '0.8rem 1rem', textAlign: 'center' }}>
                        <div style={{ display: 'inline-flex', gap: '0.35rem' }}>
                          {/* View details */}
                          <button
                            title="View complete user profile"
                            onClick={() => setViewingUser(u)}
                            style={{
                              background: 'rgba(255, 255, 255, 0.05)',
                              border: '1px solid rgba(255, 255, 255, 0.12)',
                              color: '#cbd5e1',
                              borderRadius: '4px',
                              padding: '3px 6px',
                              fontSize: '0.72rem',
                              cursor: 'pointer'
                            }}
                          >
                            <Eye size={11} />
                          </button>

                          {/* Edit details */}
                          <button
                            title="Edit user details & role"
                            onClick={() => setEditingUser({ ...u })}
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

                          {/* Toggle active status */}
                          <button
                            title={u.isActive ? 'Deactivate account' : 'Reactivate account'}
                            disabled={isPrimaryAdmin}
                            onClick={() => handleToggleStatus(u)}
                            style={{
                              background: u.isActive ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                              border: `1px solid ${u.isActive ? 'rgba(239, 68, 68, 0.25)' : 'rgba(16, 185, 129, 0.25)'}`,
                              color: u.isActive ? '#ef4444' : '#10b981',
                              borderRadius: '4px',
                              padding: '3px 7px',
                              fontSize: '0.72rem',
                              cursor: isPrimaryAdmin ? 'not-allowed' : 'pointer',
                              opacity: isPrimaryAdmin ? 0.4 : 1
                            }}
                          >
                            {u.isActive ? 'Deactivate' : 'Activate'}
                          </button>

                          {/* Safe Delete */}
                          <button
                            title={isPrimaryAdmin ? 'Primary admin cannot be deleted' : 'Delete user account'}
                            disabled={isPrimaryAdmin}
                            onClick={() => handleDeleteUser(u)}
                            style={{
                              background: 'transparent',
                              border: '1px solid rgba(255, 255, 255, 0.1)',
                              color: '#94a3b8',
                              borderRadius: '4px',
                              padding: '3px 6px',
                              fontSize: '0.72rem',
                              cursor: isPrimaryAdmin ? 'not-allowed' : 'pointer',
                              opacity: isPrimaryAdmin ? 0.3 : 1
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

      {/* ── Modal: View User Details ── */}
      {viewingUser && (
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
            maxWidth: '460px',
            width: '100%',
            padding: '1.5rem',
            boxShadow: '0 20px 40px rgba(0,0,0,0.6)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <IdCard size={18} color="#38bdf8" /> User Account Details
              </h3>
              <button
                onClick={() => setViewingUser(null)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.85rem' }}>
              <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '0.75rem', borderRadius: '8px' }}>
                <div style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase' }}>Full Name</div>
                <div style={{ color: '#ffffff', fontWeight: 600, fontSize: '1rem' }}>{viewingUser.name}</div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '0.75rem', borderRadius: '8px' }}>
                  <div style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase' }}>Role</div>
                  <div style={{ color: '#38bdf8', fontWeight: 700 }}>{viewingUser.role.toUpperCase()}</div>
                </div>
                <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '0.75rem', borderRadius: '8px' }}>
                  <div style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase' }}>Status</div>
                  <div style={{ color: viewingUser.isActive ? '#10b981' : '#ef4444', fontWeight: 700 }}>
                    {viewingUser.isActive ? 'Active' : 'Deactivated'}
                  </div>
                </div>
              </div>

              <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '0.75rem', borderRadius: '8px' }}>
                <div style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase' }}>Email Address</div>
                <div style={{ color: '#cbd5e1' }}>{viewingUser.email}</div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '0.75rem', borderRadius: '8px' }}>
                  <div style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase' }}>Department</div>
                  <div style={{ color: '#cbd5e1' }}>{viewingUser.department || 'Not specified'}</div>
                </div>
                <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '0.75rem', borderRadius: '8px' }}>
                  <div style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase' }}>Roll / Staff ID</div>
                  <div style={{ color: '#cbd5e1' }}>{viewingUser.rollNumber || 'N/A'}</div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '0.75rem', borderRadius: '8px' }}>
                  <div style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase' }}>Phone Contact</div>
                  <div style={{ color: '#cbd5e1' }}>{viewingUser.phone || 'N/A'}</div>
                </div>
                <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '0.75rem', borderRadius: '8px' }}>
                  <div style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase' }}>Grievances Filed</div>
                  <div style={{ color: '#38bdf8', fontWeight: 700 }}>{viewingUser.complaintCount || 0}</div>
                </div>
              </div>

              <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '0.75rem', borderRadius: '8px' }}>
                <div style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase' }}>Account Created On</div>
                <div style={{ color: '#94a3b8' }}>{formatDate(viewingUser.createdAt)}</div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.25rem' }}>
              <button
                onClick={() => setViewingUser(null)}
                style={{
                  background: 'transparent',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  color: '#cbd5e1',
                  borderRadius: '6px',
                  padding: '0.45rem 1rem',
                  fontSize: '0.82rem',
                  cursor: 'pointer'
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Add New User ── */}
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
                <UserPlus size={18} color="#38bdf8" />
                <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#f8fafc' }}>
                  Register Campus User
                </h3>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateUser} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', color: '#94a3b8', marginBottom: '0.3rem', fontWeight: 600 }}>
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Chandra"
                  value={newUser.name}
                  onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
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
                    Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="user@scgrs.com"
                    value={newUser.email}
                    onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
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
                    Initial Password *
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="Min 6 characters"
                    value={newUser.password}
                    onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
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
                    Role Assignment *
                  </label>
                  <select
                    value={newUser.role}
                    onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
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
                    <option value="student" style={{ background: '#0d1527', color: '#f8fafc' }}>Student</option>
                    <option value="officer" style={{ background: '#0d1527', color: '#f8fafc' }}>Officer</option>
                    <option value="admin" style={{ background: '#0d1527', color: '#f8fafc' }}>Administrator</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', color: '#94a3b8', marginBottom: '0.3rem', fontWeight: 600 }}>
                    Department / Academic Branch
                  </label>
                  <select
                    value={newUser.department}
                    onChange={(e) => setNewUser({ ...newUser, department: e.target.value })}
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
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', color: '#94a3b8', marginBottom: '0.3rem', fontWeight: 600 }}>
                    Student Roll No. / Employee ID
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. CS2026-088"
                    value={newUser.rollNumber}
                    onChange={(e) => setNewUser({ ...newUser, rollNumber: e.target.value })}
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
                    placeholder="+91 98765 00000"
                    value={newUser.phone}
                    onChange={(e) => setNewUser({ ...newUser, phone: e.target.value })}
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
                  {actionLoading ? 'Creating...' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal: Edit User Details ── */}
      {editingUser && (
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
                  Edit User Details
                </h3>
              </div>
              <button
                onClick={() => setEditingUser(null)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleUpdateUser} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', color: '#94a3b8', marginBottom: '0.3rem', fontWeight: 600 }}>
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={editingUser.name}
                  onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
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
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  value={editingUser.email}
                  onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
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
                    Role Assignment
                  </label>
                  <select
                    value={editingUser.role}
                    disabled={editingUser.email === 'admin@scgrs.com'}
                    onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value })}
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
                    <option value="student" style={{ background: '#0d1527', color: '#f8fafc' }}>Student</option>
                    <option value="officer" style={{ background: '#0d1527', color: '#f8fafc' }}>Officer</option>
                    <option value="admin" style={{ background: '#0d1527', color: '#f8fafc' }}>Administrator</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', color: '#94a3b8', marginBottom: '0.3rem', fontWeight: 600 }}>
                    Department
                  </label>
                  <select
                    value={editingUser.department || ''}
                    onChange={(e) => setEditingUser({ ...editingUser, department: e.target.value })}
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
                    <option value="" style={{ background: '#0d1527', color: '#f8fafc' }}>None / General</option>
                    {VALID_DEPARTMENTS.map(d => (
                      <option key={d} value={d} style={{ background: '#0d1527', color: '#f8fafc' }}>{d}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', color: '#94a3b8', marginBottom: '0.3rem', fontWeight: 600 }}>
                    Roll Number / Staff ID
                  </label>
                  <input
                    type="text"
                    value={editingUser.rollNumber || ''}
                    onChange={(e) => setEditingUser({ ...editingUser, rollNumber: e.target.value })}
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
                    Phone Contact
                  </label>
                  <input
                    type="text"
                    value={editingUser.phone || ''}
                    onChange={(e) => setEditingUser({ ...editingUser, phone: e.target.value })}
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

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
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

export default AdminUsers;

