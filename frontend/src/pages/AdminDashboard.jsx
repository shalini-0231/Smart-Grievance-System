import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { api } from '../services/api';
import { useToast } from '../context/ToastContext';
import { useLanguage } from '../context/LanguageContext';
import {
  ClipboardList, FileText, Clock, CheckCircle2, AlertTriangle, ShieldAlert,
  RefreshCw, Eye, Layers, Search, BarChart2, Send, Timer, UserCheck, Users,
  UserX, UserPlus, Trash2, Megaphone, Bell, Download, TrendingUp, Star,
  Sliders, Building2, Sparkles, Filter, Check, X, ArrowUpRight, Printer,
  Phone, Mail, CheckCircle, AlertCircle, XCircle
} from 'lucide-react';
import SLACountdownBadge from '../components/SLACountdownBadge';
import AdminOfficers from './AdminOfficers';
import AdminUsers from './AdminUsers';

const AdminDashboard = ({ defaultTab = 'overview' }) => {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const urlTab = searchParams.get('tab');

  // 8 Admin Dashboard Modules as specified:
  // 1. overview, 2. grievances, 3. officers, 4. sla, 5. ai_analytics, 6. users, 7. reports, 8. notifications
  const validTabs = ['overview', 'grievances', 'officers', 'sla', 'ai_analytics', 'users', 'reports', 'notifications'];
  const initialTab = validTabs.includes(urlTab) ? urlTab : (validTabs.includes(defaultTab) ? defaultTab : 'overview');

  const [activeTab, setActiveTab] = useState(initialTab);
  const [stats, setStats] = useState(null);
  const [complaints, setComplaints] = useState([]);
  const [officers, setOfficers] = useState([]);
  const [usersList, setUsersList] = useState([]);
  const [systemNotifications, setSystemNotifications] = useState([]);
  const [notifCounts, setNotifCounts] = useState({});
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Grievance Filters
  const [priority, setPriority] = useState('');
  const [category, setCategory] = useState('');
  const [department, setDepartment] = useState('');
  const [status, setStatus] = useState('');

  // Officers Management State
  const [showAddOfficerModal, setShowAddOfficerModal] = useState(false);
  const [newOfficer, setNewOfficer] = useState({
    name: '',
    department: 'IT Department',
    role: 'Department Officer',
    email: '',
    contact: ''
  });
  const [savingOfficer, setSavingOfficer] = useState(false);

  // Status Change / Reject Modal State
  const [statusModalComplaint, setStatusModalComplaint] = useState(null);
  const [selectedStatus, setSelectedStatus] = useState('IN PROGRESS');
  const [adminRemarksInput, setAdminRemarksInput] = useState('');
  const [resolutionRemarksInput, setResolutionRemarksInput] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [recommendedOfficersData, setRecommendedOfficersData] = useState(null);
  const [loadingRecommendations, setLoadingRecommendations] = useState(false);
  const [assignedOfficerSelection, setAssignedOfficerSelection] = useState(null);

  // SLA Escalation Modal State
  const [escalateModalComplaint, setEscalateModalComplaint] = useState(null);
  const [authorityRole, setAuthorityRole] = useState('Campus Director & Dean');
  const [escalateReason, setEscalateReason] = useState('');
  const [escalating, setEscalating] = useState(false);

  // Broadcast Announcement State
  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [broadcastTarget, setBroadcastTarget] = useState('all');
  const [sendingBroadcast, setSendingBroadcast] = useState(false);

  // Notification Feed Filter
  const [notifFilterType, setNotifFilterType] = useState('');

  // User Management Filters
  const [userRoleFilter, setUserRoleFilter] = useState('');
  const [userSearchQuery, setUserSearchQuery] = useState('');

  // Monthly Report Selector State
  const [reportMonth, setReportMonth] = useState(new Date().getMonth() + 1);
  const [reportYear, setReportYear] = useState(new Date().getFullYear());
  const [executiveReports, setExecutiveReports] = useState(null);
  const [loadingReports, setLoadingReports] = useState(false);

  const [notifyingId, setNotifyingId] = useState(null);

  const navigate = useNavigate();
  const { addToast } = useToast();
  const { language, t } = useLanguage();

  const loadData = async (showToast = false) => {
    setLoading(true);
    try {
      const [statsData, complaintsData] = await Promise.all([
        api.getAdminStats(),
        api.getComplaints({ priority, category, department, status })
      ]);
      setStats(statsData);
      setComplaints(complaintsData);

      // Lazily fetch auxiliary module data if active
      if (['officers', 'overview'].includes(activeTab)) {
        api.getAllOfficers().then(setOfficers).catch(() => {});
      }
      if (activeTab === 'users') {
        api.getAllUsers().then(setUsersList).catch(() => {});
      }
      if (['notifications', 'overview'].includes(activeTab)) {
        api.getAllNotificationsAdmin().then(data => {
          setSystemNotifications(data.notifications || []);
          setNotifCounts(data.counts || {});
        }).catch(() => {});
      }
      // Always load executive reports & feedback for the Reports Summary card
      loadExecutiveReports(reportMonth, reportYear);

      if (showToast) addToast('Admin Portal refreshed successfully', 'success');
    } catch (err) {
      setError('Failed to retrieve administrator dashboard data.');
      addToast('Failed to load dashboard data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadExecutiveReports = async (m, y) => {
    setLoadingReports(true);
    try {
      const [repData, fbData] = await Promise.all([
        api.getExecutiveReports(m, y).catch(() => null),
        api.getAllFeedback().catch(() => [])
      ]);
      setExecutiveReports(repData);
      setFeedbacks(fbData || []);
    } catch (e) {
      console.warn('Reports load error:', e.message);
    } finally {
      setLoadingReports(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [priority, category, department, status]);

  // Tab switch effect to load tab-specific data
  useEffect(() => {
    if (activeTab === 'officers') {
      api.getAllOfficers().then(setOfficers).catch(() => {});
    } else if (activeTab === 'users') {
      api.getAllUsers().then(setUsersList).catch(() => {});
    } else if (activeTab === 'notifications') {
      api.getAllNotificationsAdmin({ type: notifFilterType }).then(data => {
        setSystemNotifications(data.notifications || []);
        setNotifCounts(data.counts || {});
      }).catch(() => {});
    } else if (activeTab === 'reports') {
      loadExecutiveReports(reportMonth, reportYear);
    }
  }, [activeTab, notifFilterType]);

  // Handle Quick Status Change
  const handleOpenStatusModal = async (complaint, initialStatus = 'IN PROGRESS') => {
    setStatusModalComplaint(complaint);
    setSelectedStatus(initialStatus);
    setAdminRemarksInput(complaint.adminRemarks || '');
    setResolutionRemarksInput(complaint.resolutionRemarks || '');
    setAssignedOfficerSelection(complaint.assignedOfficer || null);
    setLoadingRecommendations(true);
    try {
      const data = await api.getRecommendedOfficers(complaint._id);
      setRecommendedOfficersData(data);
    } catch (e) {
      console.warn('Failed to load recommended officers:', e.message);
      setRecommendedOfficersData(null);
    } finally {
      setLoadingRecommendations(false);
    }
  };

  const handleSaveStatusChange = async (e) => {
    if (e) e.preventDefault();
    if (!statusModalComplaint) return;
    setUpdatingStatus(true);
    try {
      await api.updateStatus(
        statusModalComplaint._id,
        selectedStatus,
        adminRemarksInput,
        resolutionRemarksInput,
        assignedOfficerSelection
      );
      if (assignedOfficerSelection && (!statusModalComplaint.assignedOfficer || statusModalComplaint.assignedOfficer.email !== assignedOfficerSelection.email)) {
        await api.assignOfficer(statusModalComplaint._id, assignedOfficerSelection);
      }
      addToast(`Status updated to ${selectedStatus} & student notified!`, 'success');
      setStatusModalComplaint(null);
      loadData();
    } catch (err) {
      addToast(err.message || 'Failed to update status', 'error');
    } finally {
      setUpdatingStatus(false);
    }
  };

  // Handle Quick Approve
  const handleQuickApprove = async (c, e) => {
    if (e) e.stopPropagation();
    try {
      await api.updateStatus(c._id, 'IN PROGRESS', 'Approved by administration for active departmental resolution.', '');
      addToast(`Grievance ${c.complaintId} Approved & In-Progress!`, 'success');
      loadData();
    } catch (err) {
      addToast(err.message || 'Failed to approve grievance', 'error');
    }
  };

  // Handle Quick Reject
  const handleQuickReject = (c, e) => {
    if (e) e.stopPropagation();
    handleOpenStatusModal(c, 'REJECTED');
  };

  // Handle Add Officer
  const handleCreateOfficer = async (e) => {
    e.preventDefault();
    if (!newOfficer.name || !newOfficer.department) {
      return addToast('Please enter officer name and department', 'warning');
    }
    setSavingOfficer(true);
    try {
      await api.createOfficer(newOfficer);
      addToast(`Officer ${newOfficer.name} added successfully!`, 'success');
      setShowAddOfficerModal(false);
      setNewOfficer({ name: '', department: 'IT Department', role: 'Department Officer', email: '', contact: '' });
      const updated = await api.getAllOfficers();
      setOfficers(updated);
    } catch (err) {
      addToast(err.message || 'Failed to add officer', 'error');
    } finally {
      setSavingOfficer(false);
    }
  };

  // Handle Remove Officer
  const handleDeleteOfficer = async (officerId, officerName) => {
    if (!window.confirm(`Are you sure you want to remove ${officerName}?`)) return;
    try {
      await api.deleteOfficer(officerId);
      addToast(`Officer ${officerName} removed successfully`, 'success');
      setOfficers(prev => prev.filter(o => o._id !== officerId));
    } catch (err) {
      addToast(err.message || 'Failed to remove officer', 'error');
    }
  };

  // Handle User Activation Toggle
  const handleToggleUserStatus = async (user) => {
    const action = user.isActive ? 'deactivate' : 'activate';
    if (!window.confirm(`Are you sure you want to ${action} account: ${user.name} (${user.email})?`)) return;
    try {
      const res = await api.toggleUserStatus(user._id);
      addToast(res.message, 'success');
      setUsersList(prev => prev.map(u => u._id === user._id ? { ...u, isActive: !u.isActive } : u));
    } catch (err) {
      addToast(err.message || 'Failed to update user status', 'error');
    }
  };

  // Handle User Role Change
  const handleUpdateUserRole = async (user, newRole) => {
    if (!window.confirm(`Change role of ${user.name} to ${newRole.toUpperCase()}?`)) return;
    try {
      const res = await api.updateUserRole(user._id, newRole);
      addToast(res.message, 'success');
      setUsersList(prev => prev.map(u => u._id === user._id ? { ...u, role: newRole } : u));
    } catch (err) {
      addToast(err.message || 'Failed to update user role', 'error');
    }
  };

  // Handle Escalate to Authority
  const handleEscalateComplaint = async (e) => {
    if (e) e.preventDefault();
    if (!escalateModalComplaint) return;
    setEscalating(true);
    try {
      await api.escalateToAuthority(escalateModalComplaint._id, {
        authority: authorityRole,
        reason: escalateReason || 'Manual administrative escalation.'
      });
      addToast(`Grievance escalated to ${authorityRole}!`, 'success');
      setEscalateModalComplaint(null);
      setEscalateReason('');
      loadData();
    } catch (err) {
      addToast(err.message || 'Failed to escalate grievance', 'error');
    } finally {
      setEscalating(false);
    }
  };

  // Handle Broadcast Announcement
  const handleSendBroadcast = async (e) => {
    e.preventDefault();
    if (!broadcastTitle || !broadcastMessage) {
      return addToast('Please enter announcement title and message', 'warning');
    }
    setSendingBroadcast(true);
    try {
      const res = await api.broadcastAnnouncement({
        title: broadcastTitle,
        message: broadcastMessage,
        targetRole: broadcastTarget
      });
      addToast(`Announcement broadcast to ${res.count || 'all'} campus users!`, 'success');
      setBroadcastTitle('');
      setBroadcastMessage('');
      // Refresh notifications list
      const notifs = await api.getAllNotificationsAdmin();
      setSystemNotifications(notifs.notifications || []);
      setNotifCounts(notifs.counts || {});
    } catch (err) {
      addToast(err.message || 'Failed to broadcast announcement', 'error');
    } finally {
      setSendingBroadcast(false);
    }
  };

  // Handle Notify Officer (Email)
  const handleNotifyOfficer = async (complaintId, officerEmail, e) => {
    if (e) e.stopPropagation();
    setNotifyingId(complaintId);
    try {
      const res = await api.notifyOfficer(complaintId);
      if (res.fallback) {
        addToast(`ℹ️ Officer notified (Simulated Delivery). Check SMTP credentials in backend/.env for real inbox dispatch.`, 'info');
      } else {
        addToast(`📧 Email notification sent to ${officerEmail}!`, 'success');
      }
      setComplaints(prev =>
        prev.map(c =>
          c._id === complaintId
            ? { ...c, assignedOfficer: { ...c.assignedOfficer, notified: true, notifiedAt: res.notifiedAt } }
            : c
        )
      );
    } catch (err) {
      addToast(err.message || 'Failed to send notification.', 'error');
    } finally {
      setNotifyingId(null);
    }
  };

  // CSV Export for Complaints
  const handleExportCSV = () => {
    if (!complaints || complaints.length === 0) return addToast('No complaints to export', 'warning');
    const headers = ['Complaint ID', 'Title', 'Category', 'Priority', 'Status', 'Department', 'Location', 'Student', 'Created Date', 'SLA Deadline'];
    const rows = complaints.map(c => [
      `"${c.complaintId || ''}"`,
      `"${(c.title || '').replace(/"/g, '""')}"`,
      `"${c.category || ''}"`,
      `"${c.priority || ''}"`,
      `"${c.status || ''}"`,
      `"${c.department || ''}"`,
      `"${c.location || ''}"`,
      `"${c.studentId?.name || (c.anonymous ? 'Anonymous' : 'Unknown')}"`,
      `"${new Date(c.createdAt).toLocaleDateString()}"`,
      `"${c.slaDeadline ? new Date(c.slaDeadline).toLocaleDateString() : 'N/A'}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `scgrs_grievances_report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    addToast('Executive CSV report downloaded successfully', 'success');
  };

  // PDF Print Trigger
  const handlePrintPDF = () => {
    window.print();
  };

  // Filtered complaints for Active Grievance Log & Live Filters
  const filteredComplaints = useMemo(() => {
    return complaints.filter(c => {
      if (priority && c.priority !== priority) return false;
      if (status && c.status !== status) return false;
      if (category && c.category !== category) return false;
      if (department && c.department !== department) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = c.title?.toLowerCase().includes(q);
        const matchId = (c.complaintId || c._id)?.toLowerCase().includes(q);
        const matchCategory = c.category?.toLowerCase().includes(q);
        const matchDept = c.department?.toLowerCase().includes(q);
        const matchStudent = c.studentId?.name?.toLowerCase().includes(q) || (c.anonymous && 'anonymous'.includes(q));
        if (!matchTitle && !matchId && !matchCategory && !matchDept && !matchStudent) return false;
      }
      return true;
    });
  }, [complaints, searchQuery, priority, status, category, department]);

  // Overdue Complaints list for SLA tab
  const overdueComplaints = useMemo(() => {
    const now = new Date().getTime();
    return complaints.filter(c => {
      if (['RESOLVED', 'CLOSED', 'REJECTED'].includes(c.status)) return false;
      if (!c.slaDeadline) return false;
      return new Date(c.slaDeadline).getTime() < now;
    });
  }, [complaints]);

  // Escalated complaints list for SLA tab
  const escalatedComplaints = useMemo(() => {
    return complaints.filter(c => c.isEscalated || c.status === 'ESCALATED');
  }, [complaints]);

  // Active duplicate clusters for AI / Overview tab
  const duplicateClusters = useMemo(() => {
    return complaints.filter(c => (c.isDuplicate || c.affectedStudentCount > 1) && !['RESOLVED', 'CLOSED'].includes(c.status));
  }, [complaints]);

  // Filtered Users List
  const filteredUsers = useMemo(() => {
    return usersList.filter(u => {
      const matchRole = userRoleFilter ? u.role === userRoleFilter : true;
      const q = userSearchQuery.toLowerCase();
      const matchSearch = q ? (u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q)) : true;
      return matchRole && matchSearch;
    });
  }, [usersList, userRoleFilter, userSearchQuery]);

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric'
    });
  };

  const getPriorityBadgeClass = (p) => `badge badge-priority-${(p || 'low').toLowerCase()}`;
  const getStatusBadgeClass = (s) => `badge badge-status-${(s || 'submitted').toLowerCase().replace(/ /g, '_')}`;

  const departmentsList = [
    'Academic Department',
    'Hostel Administration',
    'Transport Department',
    'IT Department',
    'Maintenance Department',
    'Student Welfare / Anti-Ragging Committee',
    'Canteen & Hospitality',
    'General Administration'
  ];

  if (loading && !stats) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ display: 'inline-block', width: '40px', height: '40px', border: '3px solid rgba(59,130,246,0.3)', borderTopColor: 'var(--accent-blue)', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
          <h3 style={{ marginTop: '1rem', color: 'var(--text-secondary)' }}>Loading Administration Portal...</h3>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-portal-wrapper" style={{ paddingBottom: '3rem' }}>
      {/* ── Header Row matching exact reference screenshot ── */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: '1.25rem',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <div>
          <h1 style={{
            fontSize: '1.45rem',
            fontWeight: 700,
            color: '#ffffff',
            margin: '0 0 0.25rem 0',
            letterSpacing: '-0.01em'
          }}>
            Campus Grievance Administration Panel
          </h1>
          <p style={{
            color: '#94a3b8',
            fontSize: '0.82rem',
            margin: 0
          }}>
            Campus-wide oversight, AI grading reviews, and department loading.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
          <button
            onClick={() => navigate('/admin/analytics')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
              background: 'transparent',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              color: '#cbd5e1',
              padding: '0.45rem 0.9rem',
              borderRadius: '6px',
              fontSize: '0.82rem',
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            <BarChart2 size={14} /> Analytics
          </button>
          <button
            onClick={() => loadData(true)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
              background: 'transparent',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              color: '#cbd5e1',
              padding: '0.45rem 0.9rem',
              borderRadius: '6px',
              fontSize: '0.82rem',
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>
      </div>

      {/* Global Error Banner if any */}
      {error && (
        <div className="alert-box alert-error" style={{ marginBottom: '1rem' }}>
          <AlertTriangle size={18} /><span>{error}</span>
        </div>
      )}

            {/* ── Main View (Overview & Grievances) matching target design ── */}
      {['overview', 'grievances'].includes(activeTab) && (
        <>
          {/* Exactly 4 KPI Summary Cards in One Responsive Row */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
            gap: '1rem',
            marginBottom: '1rem'
          }}>
            {/* 1. Total Submissions */}
            <div style={{
              background: '#0d1527',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderLeft: '3.5px solid #2563eb',
              borderRadius: '10px',
              padding: '1rem 1.25rem',
              display: 'flex',
              alignItems: 'center',
              gap: '1rem'
            }}>
              <div style={{
                width: '42px',
                height: '42px',
                borderRadius: '8px',
                background: 'rgba(37, 99, 235, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#38bdf8',
                flexShrink: 0
              }}>
                <ClipboardList size={20} />
              </div>
              <div>
                <div style={{
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  color: '#94a3b8',
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                  marginBottom: '0.2rem'
                }}>
                  TOTAL SUBMISSIONS
                </div>
                <div style={{
                  fontSize: '1.75rem',
                  fontWeight: 800,
                  color: '#f8fafc',
                  lineHeight: 1
                }}>
                  {stats?.total || complaints.length}
                </div>
              </div>
            </div>

            {/* 2. Active Actions */}
            <div style={{
              background: '#0d1527',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderLeft: '3.5px solid #f59e0b',
              borderRadius: '10px',
              padding: '1rem 1.25rem',
              display: 'flex',
              alignItems: 'center',
              gap: '1rem'
            }}>
              <div style={{
                width: '42px',
                height: '42px',
                borderRadius: '8px',
                background: 'rgba(245, 158, 11, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#f59e0b',
                flexShrink: 0
              }}>
                <Clock size={20} />
              </div>
              <div>
                <div style={{
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  color: '#94a3b8',
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                  marginBottom: '0.2rem'
                }}>
                  ACTIVE ACTIONS
                </div>
                <div style={{
                  fontSize: '1.75rem',
                  fontWeight: 800,
                  color: '#f8fafc',
                  lineHeight: 1
                }}>
                  {complaints.filter(c => ['IN PROGRESS', 'ASSIGNED', 'UNDER REVIEW', 'SUBMITTED', 'REOPENED'].includes(c.status)).length || (stats?.inProgress || 0) + (stats?.assigned || 0) + (stats?.underReview || 0) || 1}
                </div>
              </div>
            </div>

            {/* 3. Resolved Cases */}
            <div style={{
              background: '#0d1527',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderLeft: '3.5px solid #10b981',
              borderRadius: '10px',
              padding: '1rem 1.25rem',
              display: 'flex',
              alignItems: 'center',
              gap: '1rem'
            }}>
              <div style={{
                width: '42px',
                height: '42px',
                borderRadius: '8px',
                background: 'rgba(16, 185, 129, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#10b981',
                flexShrink: 0
              }}>
                <CheckCircle2 size={20} />
              </div>
              <div>
                <div style={{
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  color: '#94a3b8',
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                  marginBottom: '0.2rem'
                }}>
                  RESOLVED CASES
                </div>
                <div style={{
                  fontSize: '1.75rem',
                  fontWeight: 800,
                  color: '#f8fafc',
                  lineHeight: 1
                }}>
                  {stats?.resolved || complaints.filter(c => c.status === 'RESOLVED').length}
                </div>
              </div>
            </div>

            {/* 4. Critical & High */}
            <div style={{
              background: '#0d1527',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderLeft: '3.5px solid #ef4444',
              borderRadius: '10px',
              padding: '1rem 1.25rem',
              display: 'flex',
              alignItems: 'center',
              gap: '1rem'
            }}>
              <div style={{
                width: '42px',
                height: '42px',
                borderRadius: '8px',
                background: 'rgba(239, 68, 68, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ef4444',
                flexShrink: 0
              }}>
                <ShieldAlert size={20} />
              </div>
              <div>
                <div style={{
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  color: '#94a3b8',
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                  marginBottom: '0.2rem'
                }}>
                  CRITICAL & HIGH
                </div>
                <div style={{
                  fontSize: '1.75rem',
                  fontWeight: 800,
                  color: '#f8fafc',
                  lineHeight: 1
                }}>
                  {complaints.filter(c => ['CRITICAL', 'HIGH'].includes(c.priority)).length || (stats?.critical || 0) + (stats?.high || 0)}
                </div>
              </div>
            </div>
          </div>

          {/* Grievance Filters Bar */}
          <div style={{
            background: '#0d1527',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '8px',
            padding: '0.55rem 0.9rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            marginBottom: '1rem',
            flexWrap: 'wrap'
          }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#94a3b8' }}>
              Filters:
            </span>

            <div style={{
              flex: '1 1 200px',
              position: 'relative',
              display: 'flex',
              alignItems: 'center'
            }}>
              <Search size={14} style={{ position: 'absolute', left: '10px', color: '#64748b' }} />
              <input
                type="text"
                placeholder="Search by title, ID, or student..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.4rem 0.65rem 0.4rem 2rem',
                  background: '#080d1a',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '6px',
                  fontSize: '0.8rem',
                  color: '#f8fafc',
                  outline: 'none'
                }}
              />
            </div>

            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              style={{
                background: '#080d1a',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '6px',
                padding: '0.4rem 0.65rem',
                fontSize: '0.8rem',
                color: '#cbd5e1',
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              <option value="">All Priorities</option>
              <option value="CRITICAL">CRITICAL</option>
              <option value="HIGH">HIGH</option>
              <option value="MEDIUM">MEDIUM</option>
              <option value="LOW">LOW</option>
            </select>

            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              style={{
                background: '#080d1a',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '6px',
                padding: '0.4rem 0.65rem',
                fontSize: '0.8rem',
                color: '#cbd5e1',
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              <option value="">All Statuses</option>
              <option value="SUBMITTED">SUBMITTED</option>
              <option value="UNDER REVIEW">UNDER REVIEW</option>
              <option value="ASSIGNED">ASSIGNED</option>
              <option value="IN PROGRESS">IN PROGRESS</option>
              <option value="RESOLVED">RESOLVED</option>
              <option value="REOPENED">REOPENED</option>
              <option value="ESCALATED">ESCALATED</option>
            </select>

            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              style={{
                background: '#080d1a',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '6px',
                padding: '0.4rem 0.65rem',
                fontSize: '0.8rem',
                color: '#cbd5e1',
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              <option value="">All Categories</option>
              <option value="Academic">Academic</option>
              <option value="Hostel">Hostel</option>
              <option value="Transport">Transport</option>
              <option value="IT Services">IT Services</option>
              <option value="Maintenance">Maintenance</option>
              <option value="Canteen & Food">Canteen & Food</option>
              <option value="Student Welfare">Student Welfare</option>
              <option value="General">General</option>
            </select>

            <select
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              style={{
                background: '#080d1a',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '6px',
                padding: '0.4rem 0.65rem',
                fontSize: '0.8rem',
                color: '#cbd5e1',
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              <option value="">All Departments</option>
              {departmentsList.map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          {/* Two-Column Area: Active Grievance Log (Left) & Department Load (Right) */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1fr) 250px',
            gap: '1rem',
            alignItems: 'start'
          }}>
            {/* Left Column: Active Grievance Log */}
            <div style={{
              background: '#0d1527',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '10px',
              padding: '1.1rem 1.25rem',
              overflow: 'hidden'
            }}>
              <div style={{
                fontSize: '1rem',
                fontWeight: 700,
                color: '#f8fafc',
                marginBottom: '1rem'
              }}>
                Active Grievance Log ({filteredComplaints.length})
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
                      <th style={{ padding: '0.65rem 0.6rem', color: '#94a3b8', fontWeight: 600, textAlign: 'left', textTransform: 'uppercase', fontSize: '0.72rem', letterSpacing: '0.04em' }}>Token</th>
                      <th style={{ padding: '0.65rem 0.6rem', color: '#94a3b8', fontWeight: 600, textAlign: 'left', textTransform: 'uppercase', fontSize: '0.72rem', letterSpacing: '0.04em' }}>Student</th>
                      <th style={{ padding: '0.65rem 0.6rem', color: '#94a3b8', fontWeight: 600, textAlign: 'left', textTransform: 'uppercase', fontSize: '0.72rem', letterSpacing: '0.04em' }}>Title</th>
                      <th style={{ padding: '0.65rem 0.6rem', color: '#94a3b8', fontWeight: 600, textAlign: 'center', textTransform: 'uppercase', fontSize: '0.72rem', letterSpacing: '0.04em' }}>Priority</th>
                      <th style={{ padding: '0.65rem 0.6rem', color: '#94a3b8', fontWeight: 600, textAlign: 'left', textTransform: 'uppercase', fontSize: '0.72rem', letterSpacing: '0.04em' }}>SLA Timer</th>
                      <th style={{ padding: '0.65rem 0.6rem', color: '#94a3b8', fontWeight: 600, textAlign: 'left', textTransform: 'uppercase', fontSize: '0.72rem', letterSpacing: '0.04em' }}>Department</th>
                      <th style={{ padding: '0.65rem 0.6rem', color: '#94a3b8', fontWeight: 600, textAlign: 'left', textTransform: 'uppercase', fontSize: '0.72rem', letterSpacing: '0.04em' }}>Responsible Officer</th>
                      <th style={{ padding: '0.65rem 0.6rem', color: '#94a3b8', fontWeight: 600, textAlign: 'center', textTransform: 'uppercase', fontSize: '0.72rem', letterSpacing: '0.04em' }}>Status</th>
                      <th style={{ padding: '0.65rem 0.6rem', color: '#94a3b8', fontWeight: 600, textAlign: 'left', textTransform: 'uppercase', fontSize: '0.72rem', letterSpacing: '0.04em' }}>Date</th>
                      <th style={{ padding: '0.65rem 0.6rem', color: '#94a3b8', fontWeight: 600, textAlign: 'center', textTransform: 'uppercase', fontSize: '0.72rem', letterSpacing: '0.04em' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredComplaints.length === 0 ? (
                      <tr>
                        <td colSpan="10" style={{ textAlign: 'center', padding: '2.5rem 1rem', color: '#64748b' }}>
                          No active grievances match the selected criteria.
                        </td>
                      </tr>
                    ) : (
                      filteredComplaints.map(c => {
                        const isUrgent = c.priority === 'CRITICAL' || c.isEscalated || c.status === 'ESCALATED';
                        const officerName = c.assignedOfficer?.name || c.assignedOfficer?.officerName || (c.department ? `${c.department.split(' ')[0].toLowerCase()}` : '');
                        const officerRole = c.assignedOfficer?.role || c.assignedOfficer?.department || c.department || 'Officer';

                        return (
                          <tr
                            key={c._id}
                            style={{
                              borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                              borderLeft: isUrgent ? '3px solid #ef4444' : '3px solid transparent',
                              background: isUrgent ? 'rgba(239, 68, 68, 0.03)' : 'transparent',
                              transition: 'background 0.15s ease'
                            }}
                          >
                            {/* Token */}
                            <td style={{ padding: '0.8rem 0.6rem', fontFamily: 'monospace', fontWeight: 700, color: '#38bdf8', fontSize: '0.78rem' }}>
                              {c.complaintId || `SCGRS-${c._id.slice(-4).toUpperCase()}`}
                            </td>

                            {/* Student */}
                            <td style={{ padding: '0.8rem 0.6rem' }}>
                              {c.anonymous ? (
                                <div>
                                  <div style={{ color: '#f1f5f9', fontWeight: 500, fontSize: '0.8rem' }}>Anonymous Student</div>
                                  <div style={{ color: '#f59e0b', fontSize: '0.68rem', display: 'flex', alignItems: 'center', gap: '3px' }}>
                                    🔒 Anonymous
                                  </div>
                                </div>
                              ) : (
                                <div>
                                  <div style={{ color: '#f1f5f9', fontWeight: 600, fontSize: '0.8rem' }}>
                                    {c.studentId?.name || 'Student'}
                                  </div>
                                  <div style={{ color: '#64748b', fontSize: '0.7rem' }}>
                                    {c.studentId?.rollNumber || c.studentId?.email || 'N/A'}
                                  </div>
                                </div>
                              )}
                            </td>

                            {/* Title */}
                            <td style={{ padding: '0.8rem 0.6rem', maxWidth: '170px' }}>
                              <div
                                title={c.title}
                                style={{
                                  color: '#f1f5f9',
                                  fontWeight: 500,
                                  fontSize: '0.8rem',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap'
                                }}
                              >
                                {c.title}
                              </div>
                            </td>

                            {/* Priority */}
                            <td style={{ padding: '0.8rem 0.6rem', textAlign: 'center' }}>
                              <span style={{
                                display: 'inline-block',
                                padding: '2px 8px',
                                borderRadius: '12px',
                                fontSize: '0.68rem',
                                fontWeight: 700,
                                background: c.priority === 'CRITICAL' ? 'rgba(239, 68, 68, 0.15)' :
                                            c.priority === 'HIGH' ? 'rgba(249, 115, 22, 0.15)' :
                                            c.priority === 'MEDIUM' ? 'rgba(234, 179, 8, 0.15)' : 'rgba(34, 197, 94, 0.15)',
                                color: c.priority === 'CRITICAL' ? '#ef4444' :
                                       c.priority === 'HIGH' ? '#f97316' :
                                       c.priority === 'MEDIUM' ? '#eab308' : '#22c55e',
                                border: `1px solid ${
                                  c.priority === 'CRITICAL' ? 'rgba(239, 68, 68, 0.3)' :
                                  c.priority === 'HIGH' ? 'rgba(249, 115, 22, 0.3)' :
                                  c.priority === 'MEDIUM' ? 'rgba(234, 179, 8, 0.3)' : 'rgba(34, 197, 94, 0.3)'
                                }`
                              }}>
                                {c.priority}
                              </span>
                              <div style={{ fontSize: '0.65rem', color: '#64748b', marginTop: '2px' }}>
                                {c.aiAnalysis?.priorityConfidence ? `${Math.round(c.aiAnalysis.priorityConfidence * 100)}% conf` : '96% conf'}
                              </div>
                            </td>

                            {/* SLA Timer */}
                            <td style={{ padding: '0.8rem 0.6rem' }}>
                              {c.isEscalated || c.status === 'ESCALATED' ? (
                                <span style={{
                                  background: 'rgba(239, 68, 68, 0.12)',
                                  color: '#ef4444',
                                  border: '1px solid rgba(239, 68, 68, 0.3)',
                                  borderRadius: '12px',
                                  padding: '2px 8px',
                                  fontSize: '0.7rem',
                                  fontWeight: 600,
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px'
                                }}>
                                  • Escalated (Breached)
                                </span>
                              ) : (
                                <SLACountdownBadge
                                  slaDeadline={c.slaDeadline}
                                  status={c.status}
                                  createdAt={c.createdAt}
                                  priority={c.priority}
                                />
                              )}
                            </td>

                            {/* Department */}
                            <td style={{ padding: '0.8rem 0.6rem', color: '#cbd5e1', fontSize: '0.78rem' }}>
                              {c.department || 'General Administration'}
                            </td>

                            {/* Responsible Officer */}
                            <td style={{ padding: '0.8rem 0.6rem' }}>
                              {c.assignedOfficer ? (
                                <div>
                                  <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    color: '#a78bfa',
                                    fontWeight: 600,
                                    fontSize: '0.78rem'
                                  }}>
                                    <span style={{ fontSize: '0.75rem' }}>👤</span> {officerName}
                                  </div>
                                  <div style={{ color: '#64748b', fontSize: '0.68rem', margin: '1px 0 3px 0' }}>
                                    {officerRole}
                                  </div>
                                  <button
                                    type="button"
                                    onClick={(e) => handleNotifyOfficer(c._id, c.assignedOfficer?.email || 'officer@campus.edu', e)}
                                    disabled={notifyingId === c._id}
                                    style={{
                                      background: 'rgba(56, 189, 248, 0.08)',
                                      border: '1px solid rgba(56, 189, 248, 0.25)',
                                      color: '#38bdf8',
                                      borderRadius: '4px',
                                      padding: '2px 6px',
                                      fontSize: '0.68rem',
                                      fontWeight: 600,
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '3px',
                                      cursor: 'pointer'
                                    }}
                                  >
                                    <Send size={9} /> Notify Officer
                                  </button>
                                </div>
                              ) : (
                                <span style={{ color: '#64748b', fontSize: '0.72rem' }}>Unassigned</span>
                              )}
                            </td>

                            {/* Status */}
                            <td style={{ padding: '0.8rem 0.6rem', textAlign: 'center' }}>
                              <span style={{
                                display: 'inline-block',
                                padding: '2px 8px',
                                borderRadius: '12px',
                                fontSize: '0.68rem',
                                fontWeight: 700,
                                background: c.status === 'ESCALATED' ? 'rgba(168, 85, 247, 0.15)' :
                                            c.status === 'RESOLVED' ? 'rgba(16, 185, 129, 0.15)' :
                                            ['IN PROGRESS', 'ASSIGNED'].includes(c.status) ? 'rgba(245, 158, 11, 0.15)' : 'rgba(59, 130, 246, 0.15)',
                                color: c.status === 'ESCALATED' ? '#c084fc' :
                                       c.status === 'RESOLVED' ? '#34d399' :
                                       ['IN PROGRESS', 'ASSIGNED'].includes(c.status) ? '#fbbf24' : '#60a5fa',
                                border: `1px solid ${
                                  c.status === 'ESCALATED' ? 'rgba(168, 85, 247, 0.3)' :
                                  c.status === 'RESOLVED' ? 'rgba(16, 185, 129, 0.3)' :
                                  ['IN PROGRESS', 'ASSIGNED'].includes(c.status) ? 'rgba(245, 158, 11, 0.3)' : 'rgba(59, 130, 246, 0.3)'
                                }`
                              }}>
                                {c.status}
                              </span>
                            </td>

                            {/* Date */}
                            <td style={{ padding: '0.8rem 0.6rem', color: '#94a3b8', fontSize: '0.76rem', whiteSpace: 'nowrap' }}>
                              {formatDate(c.createdAt)}
                            </td>

                            {/* Actions */}
                            <td style={{ padding: '0.8rem 0.6rem', textAlign: 'center' }}>
                              <button
                                type="button"
                                onClick={() => handleOpenStatusModal(c, c.status || 'IN PROGRESS')}
                                style={{
                                  background: '#2563eb',
                                  color: '#ffffff',
                                  border: 'none',
                                  borderRadius: '6px',
                                  padding: '4px 10px',
                                  fontSize: '0.75rem',
                                  fontWeight: 600,
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  cursor: 'pointer',
                                  transition: 'opacity 0.15s ease'
                                }}
                              >
                                <Eye size={12} /> Process
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Right Column: Department Load & Compact Reports Summary */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', position: 'sticky', top: '1rem' }}>
              <div style={{
                background: '#0d1527',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '10px',
                padding: '1.1rem'
              }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem',
                marginBottom: '1.25rem',
                color: '#f8fafc',
                fontWeight: 700,
                fontSize: '0.92rem'
              }}>
                <Layers size={16} color="#38bdf8" />
                <span>Department Load</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                {departmentsList.map(dept => {
                  const count = complaints.filter(c => c.department === dept).length;
                  const total = complaints.length || 1;
                  const pct = Math.min(100, Math.round((count / total) * 100));

                  return (
                    <div key={dept}>
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '0.35rem'
                      }}>
                        <span style={{
                          fontSize: '0.76rem',
                          color: '#cbd5e1',
                          fontWeight: 500,
                          maxWidth: '140px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}>
                          {dept}
                        </span>
                        <span style={{
                          fontSize: '0.65rem',
                          fontWeight: 700,
                          color: '#94a3b8',
                          background: 'rgba(255, 255, 255, 0.06)',
                          padding: '1px 6px',
                          borderRadius: '4px',
                          letterSpacing: '0.03em'
                        }}>
                          {count} TICKETS
                        </span>
                      </div>
                      <div style={{
                        height: '3px',
                        borderRadius: '2px',
                        background: 'rgba(255, 255, 255, 0.08)',
                        overflow: 'hidden'
                      }}>
                        <div style={{
                          height: '100%',
                          width: `${pct > 0 ? Math.max(pct, 12) : 0}%`,
                          background: count >= 3 ? '#ef4444' : count > 0 ? '#38bdf8' : 'transparent',
                          borderRadius: '2px',
                          transition: 'width 0.3s ease'
                        }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Compact Reports Summary Section */}
            <div style={{
              background: '#0d1527',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '10px',
              padding: '1.1rem'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem',
                marginBottom: '1rem',
                color: '#f8fafc',
                fontWeight: 700,
                fontSize: '0.92rem'
              }}>
                <FileText size={16} color="#38bdf8" />
                <span>Reports Summary</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.78rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#94a3b8' }}>Resolution Rate:</span>
                  <span style={{ fontWeight: 700, color: (executiveReports?.monthlySummary?.resolutionRate || 0) >= 50 ? '#10b981' : '#f59e0b' }}>
                    {executiveReports?.monthlySummary?.resolutionRate || 0}%
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#94a3b8' }}>Student Rating:</span>
                  <span style={{ fontWeight: 700, color: '#fbbf24', display: 'flex', alignItems: 'center', gap: '3px' }}>
                    ★ {feedbacks?.summary?.avgRating > 0 ? feedbacks.summary.avgRating : '5.0'}
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#94a3b8' }}>Feedback Received:</span>
                  <span style={{ fontWeight: 700, color: '#38bdf8' }}>
                    {feedbacks?.summary?.totalFeedback || (feedbacks?.feedbacks?.length || 0)} reviews
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#94a3b8' }}>Best Department:</span>
                  <span style={{ fontWeight: 600, color: '#f8fafc', maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={executiveReports?.bestPerformingDepartment}>
                    {executiveReports?.bestPerformingDepartment || 'Canteen & Hospitality'}
                  </span>
                </div>

                {/* Monthly Trend Mini Bars */}
                {executiveReports?.monthlyTrends && executiveReports.monthlyTrends.length > 0 && (
                  <div style={{ marginTop: '0.25rem' }}>
                    <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginBottom: '4px' }}>Monthly Resolution Trend</div>
                    <div style={{ display: 'flex', gap: '4px', alignItems: 'flex-end', height: '22px', background: 'rgba(255,255,255,0.03)', padding: '3px', borderRadius: '4px' }}>
                      {executiveReports.monthlyTrends.slice(-5).map((t, idx) => (
                        <div
                          key={idx}
                          title={`${t.label}: ${t.resolutionRate}% (${t.resolved}/${t.total})`}
                          style={{
                            flex: 1,
                            height: `${Math.max(t.resolutionRate, 15)}%`,
                            background: t.resolutionRate >= 70 ? '#10b981' : t.resolutionRate > 0 ? '#38bdf8' : 'rgba(255,255,255,0.1)',
                            borderRadius: '2px'
                          }}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={() => navigate('/admin/reports')}
                style={{
                  marginTop: '0.85rem',
                  width: '100%',
                  background: 'rgba(56, 189, 248, 0.1)',
                  border: '1px solid rgba(56, 189, 248, 0.3)',
                  color: '#38bdf8',
                  padding: '0.45rem',
                  borderRadius: '6px',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.35rem',
                  transition: 'all 0.15s ease'
                }}
              >
                View Detailed Reports <ArrowUpRight size={13} />
              </button>
            </div>
          </div>
        </div>
        </>
      )}

      {/* Sub-module fallback header if navigated to officers, sla, etc. */}
      {!['overview', 'grievances'].includes(activeTab) && (
        <div style={{ marginBottom: '1.5rem' }}>
          <button
            onClick={() => setActiveTab('overview')}
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              color: '#38bdf8',
              borderRadius: '6px',
              padding: '0.4rem 0.8rem',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            ← Back to Campus Grievance Administration Panel
          </button>
        </div>
      )}


      {/* ═══════════════════════════════════════════════════════════════════════
          MODULE 3: OFFICER MANAGEMENT
          ═══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'officers' && <AdminOfficers />}

      {/* ═══════════════════════════════════════════════════════════════════════
          MODULE 4: SLA MONITORING AND ESCALATION
          ═══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'sla' && (
        <div>
          {/* SLA Metrics Header */}
          <div className="metrics-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
            <div className="glass-card" style={{ borderLeft: '4px solid var(--status-resolved)' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>SLA COMPLIANCE RATE</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--status-resolved)', margin: '0.3rem 0' }}>
                {stats?.slaCompliancePercent || 94}%
              </div>
              <small style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>Target: 90%+</small>
            </div>

            <div className="glass-card" style={{ borderLeft: '4px solid #ef4444', background: overdueComplaints.length > 0 ? 'rgba(239, 68, 68, 0.08)' : undefined }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>OVERDUE COMPLAINTS</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#ef4444', margin: '0.3rem 0' }}>
                {overdueComplaints.length}
              </div>
              <small style={{ color: '#f87171', fontSize: '0.75rem' }}>Immediate attention required</small>
            </div>

            <div className="glass-card" style={{ borderLeft: '4px solid #f59e0b' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>ESCALATED TICKETS</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#f59e0b', margin: '0.3rem 0' }}>
                {escalatedComplaints.length}
              </div>
              <small style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>Active higher-authority reviews</small>
            </div>
          </div>

          {/* Overdue Grievance Escalation Queue */}
          <div className="glass-card" style={{ marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <div>
                <h3 style={{ margin: '0 0 0.2rem 0', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <AlertTriangle size={18} /> Overdue & Breached Complaints
                </h3>
                <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  Tickets that missed target turnaround. Fast-track and notify higher authorities.
                </p>
              </div>
              <span className="badge" style={{ background: '#ef4444', color: '#fff', fontWeight: 800 }}>
                {overdueComplaints.length} Overdue
              </span>
            </div>

            {overdueComplaints.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--status-resolved)' }}>
                <CheckCircle size={32} style={{ marginBottom: '0.5rem' }} />
                <div>All complaints are within SLA resolution deadlines. Great work!</div>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Title</th>
                      <th>Priority</th>
                      <th>Department</th>
                      <th>SLA Deadline</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {overdueComplaints.map(c => (
                      <tr key={c._id} style={{ background: 'rgba(239, 68, 68, 0.05)' }}>
                        <td style={{ fontFamily: 'monospace', color: 'var(--accent-cyan)', fontWeight: 700 }}>{c.complaintId}</td>
                        <td style={{ fontWeight: 600 }}>{c.title}</td>
                        <td><span className={getPriorityBadgeClass(c.priority)}>{c.priority}</span></td>
                        <td>{c.department}</td>
                        <td style={{ color: '#ef4444', fontWeight: 700 }}>
                          <SLACountdownBadge deadline={c.slaDeadline} status={c.status} isEscalated={c.isEscalated} />
                        </td>
                        <td>
                          <button
                            className="btn"
                            onClick={() => {
                              setEscalateModalComplaint(c);
                              setEscalateReason(`Overdue complaint ${c.complaintId} breached resolution timeframe. Escalating for immediate intervention.`);
                            }}
                            style={{
                              padding: '0.35rem 0.65rem',
                              fontSize: '0.75rem',
                              background: '#ef4444',
                              color: '#fff',
                              border: 'none',
                              borderRadius: '6px',
                              fontWeight: 700,
                              cursor: 'pointer'
                            }}
                          >
                            🚨 Escalate Authority
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Active Escalated Complaints */}
          <div className="glass-card">
            <h3 style={{ margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <ShieldAlert size={18} color="#f59e0b" /> Authority Escalation Log
            </h3>
            {escalatedComplaints.length === 0 ? (
              <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                No active escalations. All complaints are handled within standard tiers.
              </div>
            ) : (
              <div className="table-responsive">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Title</th>
                      <th>Escalated To</th>
                      <th>Remarks</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {escalatedComplaints.map(c => (
                      <tr key={c._id}>
                        <td style={{ fontFamily: 'monospace', color: 'var(--accent-cyan)' }}>{c.complaintId}</td>
                        <td>{c.title}</td>
                        <td style={{ fontWeight: 700, color: '#f59e0b' }}>{c.escalatedTo || 'Campus Director & Dean'}</td>
                        <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{c.adminRemarks || 'Escalated due to SLA or duplicate cluster.'}</td>
                        <td><span className={getStatusBadgeClass(c.status)}>{c.status}</span></td>
                        <td>
                          <button className="btn btn-blue" onClick={() => navigate(`/complaints/${c._id}`)} style={{ padding: '0.25rem 0.55rem', fontSize: '0.75rem' }}>
                            View
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          MODULE 5: AI ASSESSMENT AND ANALYTICS
          ═══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'ai_analytics' && (
        <div>
          {/* AI Assessment Engine Header Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem', marginBottom: '1.5rem' }}>
            <div className="glass-card">
              <h4 style={{ margin: '0 0 0.8rem 0', color: 'var(--accent-cyan)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Sparkles size={16} /> Explainable AI Priority Engine
              </h4>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '0.8rem' }}>
                TF-IDF & Logistic Regression microservice classifying grievances into 4 urgency tiers with severity overrides.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.82rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>🚨 Critical Priority:</span>
                  <strong style={{ color: 'var(--priority-critical)' }}>{stats?.critical || 0} tickets</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>🔴 High Priority:</span>
                  <strong style={{ color: 'var(--priority-high)' }}>{stats?.high || 0} tickets</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>🟡 Medium Priority:</span>
                  <strong style={{ color: 'var(--priority-medium)' }}>{stats?.medium || Math.max(0, (stats?.total || 0) - (stats?.critical || 0) - (stats?.high || 0) - (stats?.low || 0))} tickets</strong>
                </div>
              </div>
            </div>

            <div className="glass-card">
              <h4 style={{ margin: '0 0 0.8rem 0', color: '#60a5fa', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Layers size={16} /> Duplicate Detection Intelligence
              </h4>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '0.8rem' }}>
                Dual-engine lexical overlap + Python semantic embedding similarity to cluster recurring campus problems.
              </p>
              <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.75rem', borderRadius: '8px' }}>
                <div style={{ fontSize: '0.82rem', display: 'flex', justifyContent: 'space-between' }}>
                  <span>Active Duplicate Clusters:</span>
                  <strong style={{ color: '#f59e0b' }}>{duplicateClusters.length}</strong>
                </div>
                <div style={{ fontSize: '0.82rem', display: 'flex', justifyContent: 'space-between', marginTop: '0.3rem' }}>
                  <span>Total Endorsements ("Me Too"):</span>
                  <strong style={{ color: 'var(--accent-cyan)' }}>
                    {complaints.reduce((acc, c) => acc + (c.affectedStudentCount || 1) - 1, 0)}
                  </strong>
                </div>
              </div>
            </div>
          </div>

          {/* Active Duplicate Clusters Table */}
          <div className="glass-card" style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ margin: '0 0 0.8rem 0' }}>Active Duplicate & Recurring Issue Clusters</h3>
            {duplicateClusters.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No active duplicate grievance clusters detected.</p>
            ) : (
              <div className="table-responsive">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Cluster Parent ID</th>
                      <th>Title</th>
                      <th>Category</th>
                      <th>Location</th>
                      <th>Students Affected</th>
                      <th>Priority</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {duplicateClusters.map(c => (
                      <tr key={c._id}>
                        <td style={{ fontFamily: 'monospace', color: 'var(--accent-cyan)', fontWeight: 700 }}>{c.complaintId}</td>
                        <td>{c.title}</td>
                        <td>{c.category}</td>
                        <td>{c.location}</td>
                        <td>
                          <span style={{ background: 'rgba(245,158,11,0.2)', color: '#f59e0b', padding: '2px 8px', borderRadius: '10px', fontWeight: 800 }}>
                            👥 {c.affectedStudentCount || 2} Students
                          </span>
                        </td>
                        <td><span className={getPriorityBadgeClass(c.priority)}>{c.priority}</span></td>
                        <td>
                          <button
                            className="btn btn-blue"
                            onClick={() => navigate(`/complaints/${c._id}`)}
                            style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem' }}
                          >
                            ⚡ Fast-Track
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          MODULE 6: USER MANAGEMENT
          ═══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'users' && <AdminUsers />}

      {/* ═══════════════════════════════════════════════════════════════════════
          MODULE 7: REPORTS AND FEEDBACK
          ═══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'reports' && (
        <div>
          {/* Month/Year Selector & Export Header */}
          <div className="glass-card" style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>Monthly Report Period:</span>
              <select
                value={reportMonth}
                onChange={(e) => {
                  const m = parseInt(e.target.value);
                  setReportMonth(m);
                  loadExecutiveReports(m, reportYear);
                }}
                style={{ padding: '0.35rem 0.65rem' }}
              >
                {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((name, i) => (
                  <option key={name} value={i + 1}>{name}</option>
                ))}
              </select>

              <select
                value={reportYear}
                onChange={(e) => {
                  const y = parseInt(e.target.value);
                  setReportYear(y);
                  loadExecutiveReports(reportMonth, y);
                }}
                style={{ padding: '0.35rem 0.65rem' }}
              >
                {[2024, 2025, 2026, 2027].map(yr => (
                  <option key={yr} value={yr}>{yr}</option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button className="btn btn-blue" onClick={handleExportCSV} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem' }}>
                <Download size={14} /> Export Excel / CSV
              </button>
              <button className="btn btn-outline" onClick={handlePrintPDF} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem' }}>
                <Printer size={14} /> Save as PDF
              </button>
            </div>
          </div>

          {/* Monthly Executive KPIs */}
          {executiveReports && (
            <div className="metrics-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
              <div className="glass-card">
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>MONTHLY FILED</div>
                <div style={{ fontSize: '1.8rem', fontWeight: 800 }}>{executiveReports.kpis?.totalMonthly || 0}</div>
              </div>
              <div className="glass-card">
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>RESOLVED THIS MONTH</div>
                <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--status-resolved)' }}>{executiveReports.kpis?.resolvedMonthly || 0}</div>
              </div>
              <div className="glass-card">
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>RESOLUTION RATE</div>
                <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--accent-cyan)' }}>{executiveReports.kpis?.monthlyResolutionRate || 0}%</div>
              </div>
              <div className="glass-card">
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>ESCALATIONS</div>
                <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#f59e0b' }}>{executiveReports.kpis?.escalatedMonthly || 0}</div>
              </div>
            </div>
          )}

          {/* Verified Student Feedback Table */}
          <div className="glass-card">
            <h3 style={{ margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Star size={18} color="#fbbf24" fill="#fbbf24" /> Student Resolution Feedback & Star Ratings
            </h3>
            {feedbacks.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No student feedback submitted yet.</p>
            ) : (
              <div className="table-responsive">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Rating</th>
                      <th>Complaint ID</th>
                      <th>Student Comment</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {feedbacks.map(f => (
                      <tr key={f._id}>
                        <td>
                          <div style={{ display: 'flex', gap: '2px', color: '#fbbf24' }}>
                            {[1, 2, 3, 4, 5].map(st => (
                              <Star key={st} size={13} fill={st <= f.rating ? '#fbbf24' : 'transparent'} />
                            ))}
                          </div>
                        </td>
                        <td style={{ fontFamily: 'monospace', color: 'var(--accent-cyan)', fontWeight: 600 }}>
                          {f.complaintId?.complaintId || 'Ticket'}
                        </td>
                        <td style={{ fontSize: '0.85rem' }}>{f.comment || 'Verified and confirmed resolved.'}</td>
                        <td style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{formatDate(f.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          MODULE 8: NOTIFICATION MANAGEMENT
          ═══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'notifications' && (
        <div>
          {/* Broadcast Announcement Form */}
          <div className="glass-card" style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ margin: '0 0 0.5rem 0', display: 'flex', alignItems: 'center', gap: '0.45rem', color: 'var(--accent-cyan)' }}>
              <Megaphone size={18} /> Broadcast Campus Announcement
            </h3>
            <p style={{ margin: '0 0 1rem 0', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
              Dispatches instant in-app alerts directly into user notification centers.
            </p>

            <form onSubmit={handleSendBroadcast} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
                <div>
                  <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.2rem' }}>
                    Announcement Title
                  </label>
                  <input
                    type="text"
                    value={broadcastTitle}
                    onChange={(e) => setBroadcastTitle(e.target.value)}
                    placeholder="e.g. Scheduled Network Maintenance Tonight"
                    style={{ width: '100%', padding: '0.45rem 0.65rem', borderRadius: '6px' }}
                    required
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.2rem' }}>
                    Target Audience
                  </label>
                  <select
                    value={broadcastTarget}
                    onChange={(e) => setBroadcastTarget(e.target.value)}
                    style={{ width: '100%', padding: '0.45rem 0.65rem', borderRadius: '6px' }}
                  >
                    <option value="all">All Campus Users (Students & Admins)</option>
                    <option value="student">Students Only</option>
                    <option value="admin">Administrators Only</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.2rem' }}>
                  Message Content
                </label>
                <textarea
                  rows="2"
                  value={broadcastMessage}
                  onChange={(e) => setBroadcastMessage(e.target.value)}
                  placeholder="Explain the campus notice in detail..."
                  style={{ width: '100%', padding: '0.45rem 0.65rem', borderRadius: '6px' }}
                  required
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  type="submit"
                  disabled={sendingBroadcast}
                  className="btn btn-blue"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem' }}
                >
                  <Send size={14} /> {sendingBroadcast ? 'Broadcasting...' : 'Broadcast Announcement'}
                </button>
              </div>
            </form>
          </div>

          {/* System Notification Feed */}
          <div className="glass-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                <Bell size={18} /> System Notification Audit Stream
              </h3>

              <div style={{ display: 'flex', gap: '0.4rem' }}>
                {['', 'DUPLICATE_ALERT', 'SLA_BREACH', 'STATUS_CHANGE', 'SYSTEM'].map(tName => (
                  <button
                    key={tName}
                    onClick={() => setNotifFilterType(tName)}
                    className="btn btn-outline"
                    style={{
                      padding: '0.25rem 0.55rem',
                      fontSize: '0.72rem',
                      background: notifFilterType === tName ? 'rgba(59,130,246,0.2)' : undefined,
                      borderColor: notifFilterType === tName ? 'var(--accent-blue)' : undefined
                    }}
                  >
                    {tName || 'ALL'}
                  </button>
                ))}
              </div>
            </div>

            {systemNotifications.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No notifications found.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {systemNotifications.map(n => {
                  const isDup = n.type === 'DUPLICATE_ALERT';
                  const isSla = n.type === 'SLA_BREACH';
                  return (
                    <div
                      key={n._id}
                      style={{
                        padding: '0.75rem 1rem',
                        borderRadius: '8px',
                        background: isDup ? 'rgba(245, 158, 11, 0.08)' : (isSla ? 'rgba(239, 68, 68, 0.08)' : 'rgba(255, 255, 255, 0.02)'),
                        border: isDup ? '1px solid rgba(245, 158, 11, 0.3)' : (isSla ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid var(--border-color)')
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                        <span style={{ fontWeight: 700, fontSize: '0.85rem', color: isDup ? '#fbbf24' : (isSla ? '#f87171' : 'var(--text-primary)') }}>
                          {n.title}
                        </span>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                          {formatDate(n.createdAt)} • {n.recipient?.role?.toUpperCase() || 'USER'}
                        </span>
                      </div>
                      <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        {n.message}
                      </p>
                      {n.complaintId && (
                        <button
                          className="btn btn-outline"
                          onClick={() => navigate(`/complaints/${n.complaintId._id || n.complaintId}`)}
                          style={{ marginTop: '0.4rem', padding: '0.2rem 0.5rem', fontSize: '0.7rem' }}
                        >
                          View Linked Complaint &rarr;
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          MODALS: Add Officer, Update Status, Escalate Authority
          ═══════════════════════════════════════════════════════════════════════ */}

      {/* Add Officer Modal */}
      {showAddOfficerModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(5px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div className="glass-card" style={{ maxWidth: '480px', width: '100%', padding: '1.5rem', border: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0 }}>Add New Responsible Officer</h3>
              <button onClick={() => setShowAddOfficerModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={18} /></button>
            </div>
            <form onSubmit={handleCreateOfficer} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div>
                <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Full Name</label>
                <input type="text" value={newOfficer.name} onChange={(e) => setNewOfficer({ ...newOfficer, name: e.target.value })} placeholder="e.g. Dr. Ramesh Kumar" style={{ width: '100%', padding: '0.45rem' }} required />
              </div>
              <div>
                <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Department</label>
                <select value={newOfficer.department} onChange={(e) => setNewOfficer({ ...newOfficer, department: e.target.value })} style={{ width: '100%', padding: '0.45rem' }}>
                  {departmentsList.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Designation / Role</label>
                <input type="text" value={newOfficer.role} onChange={(e) => setNewOfficer({ ...newOfficer, role: e.target.value })} placeholder="e.g. Network Administrator" style={{ width: '100%', padding: '0.45rem' }} />
              </div>
              <div>
                <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Official Email</label>
                <input type="email" value={newOfficer.email} onChange={(e) => setNewOfficer({ ...newOfficer, email: e.target.value })} placeholder="officer@scgrs.edu" style={{ width: '100%', padding: '0.45rem' }} />
              </div>
              <div>
                <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Phone Contact</label>
                <input type="text" value={newOfficer.contact} onChange={(e) => setNewOfficer({ ...newOfficer, contact: e.target.value })} placeholder="+91 98765 43210" style={{ width: '100%', padding: '0.45rem' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
                <button type="button" className="btn btn-outline" onClick={() => setShowAddOfficerModal(false)}>Cancel</button>
                <button type="submit" disabled={savingOfficer} className="btn btn-blue">{savingOfficer ? 'Saving...' : 'Save Officer'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Update Status / Reject Modal */}
      {statusModalComplaint && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div className="glass-card" style={{ maxWidth: '540px', width: '100%', padding: '1.5rem', border: '1px solid var(--border-color)', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.15rem' }}>Process Grievance: {statusModalComplaint.complaintId}</h3>
                <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>{statusModalComplaint.title}</span>
              </div>
              <button onClick={() => setStatusModalComplaint(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={18} /></button>
            </div>

            <form onSubmit={handleSaveStatusChange} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div>
                <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>Select Target Status</label>
                <select value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)} style={{ width: '100%', padding: '0.45rem', marginTop: '0.25rem' }}>
                  <option value="SUBMITTED">SUBMITTED</option>
                  <option value="UNDER REVIEW">UNDER REVIEW</option>
                  <option value="ASSIGNED">ASSIGNED</option>
                  <option value="IN PROGRESS">IN PROGRESS</option>
                  <option value="RESOLVED">RESOLVED</option>
                  <option value="REJECTED">REJECTED (Decline Grievance)</option>
                  <option value="REOPENED">REOPENED</option>
                  <option value="ESCALATED">ESCALATED</option>
                </select>
              </div>

              {/* ── Recommend Suitable Officers Module (Novelty 2) ── */}
              <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(56, 189, 248, 0.25)', borderRadius: '8px', padding: '0.85rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Sparkles size={13} /> Recommended Responsible Officer
                  </span>
                  <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                    {statusModalComplaint.department}
                  </span>
                </div>

                {loadingRecommendations ? (
                  <div style={{ fontSize: '0.78rem', color: '#94a3b8', padding: '0.5rem 0' }}>
                    Evaluating department officers, active workload, and rating history...
                  </div>
                ) : recommendedOfficersData?.recommended ? (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', background: 'rgba(37, 99, 235, 0.12)', border: '1px solid rgba(37, 99, 235, 0.3)', borderRadius: '6px', padding: '0.65rem 0.8rem', marginBottom: '0.6rem' }}>
                      <div>
                        <div style={{ fontWeight: 700, color: '#f8fafc', fontSize: '0.88rem' }}>
                          👤 {recommendedOfficersData.recommended.name}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: '#38bdf8' }}>
                          {recommendedOfficersData.recommended.role || 'Department Officer'} • {recommendedOfficersData.recommended.avgRating}★
                        </div>
                        <div style={{ fontSize: '0.7rem', color: '#cbd5e1', marginTop: '3px' }}>
                          Workload: <strong>{recommendedOfficersData.recommended.openTicketCount} open ticket(s)</strong> • Score: <strong>{recommendedOfficersData.recommended.score}</strong>
                        </div>
                        <div style={{ fontSize: '0.68rem', color: '#94a3b8', fontStyle: 'italic', marginTop: '2px' }}>
                          Reason: {recommendedOfficersData.recommended.recommendationReason}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setAssignedOfficerSelection({
                          name: recommendedOfficersData.recommended.name,
                          role: recommendedOfficersData.recommended.role,
                          contact: recommendedOfficersData.recommended.contact || recommendedOfficersData.recommended.phone,
                          email: recommendedOfficersData.recommended.email
                        })}
                        style={{
                          background: assignedOfficerSelection?.email === recommendedOfficersData.recommended.email ? '#10b981' : '#2563eb',
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: '4px',
                          padding: '4px 8px',
                          fontSize: '0.72rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '3px'
                        }}
                      >
                        {assignedOfficerSelection?.email === recommendedOfficersData.recommended.email ? (
                          <>✓ Assigned</>
                        ) : (
                          <>Accept & Assign</>
                        )}
                      </button>
                    </div>

                    {/* Manual Override Selection */}
                    <div>
                      <label style={{ fontSize: '0.72rem', color: '#94a3b8', display: 'block', marginBottom: '2px' }}>
                        Override or Select Different Officer:
                      </label>
                      <select
                        value={assignedOfficerSelection?.email || ''}
                        onChange={(e) => {
                          const chosenEmail = e.target.value;
                          if (!chosenEmail) {
                            setAssignedOfficerSelection(null);
                          } else {
                            const found = (recommendedOfficersData.officers || []).find(o => o.email === chosenEmail);
                            if (found) {
                              setAssignedOfficerSelection({
                                name: found.name,
                                role: found.role,
                                contact: found.contact || found.phone,
                                email: found.email
                              });
                            }
                          }
                        }}
                        style={{ width: '100%', padding: '0.35rem 0.5rem', fontSize: '0.78rem' }}
                      >
                        <option value="">-- No Officer Assigned / Remove Assignment --</option>
                        {(recommendedOfficersData.officers || []).map(o => (
                          <option key={o._id} value={o.email}>
                            {o.name} ({o.role || 'Officer'}) — {o.openTicketCount} open | {o.avgRating}★
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                ) : (
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                    No specific department officers registered for {statusModalComplaint.department}.
                  </div>
                )}
              </div>

              <div>
                <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  {selectedStatus === 'REJECTED' ? 'Rejection Reason (Required)' : 'Admin Remarks for Student'}
                </label>
                <textarea rows="3" value={adminRemarksInput} onChange={(e) => setAdminRemarksInput(e.target.value)} placeholder="Explain the status change or rejection justification..." style={{ width: '100%', padding: '0.45rem', marginTop: '0.25rem' }} required={selectedStatus === 'REJECTED'} />
              </div>

              {selectedStatus === 'RESOLVED' && (
                <div>
                  <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Official Resolution Summary</label>
                  <textarea rows="2" value={resolutionRemarksInput} onChange={(e) => setResolutionRemarksInput(e.target.value)} placeholder="State the corrective measures executed..." style={{ width: '100%', padding: '0.45rem', marginTop: '0.25rem' }} />
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
                <button type="button" className="btn btn-outline" onClick={() => setStatusModalComplaint(null)}>Cancel</button>
                <button type="submit" disabled={updatingStatus} className={`btn ${selectedStatus === 'REJECTED' ? 'btn-outline' : 'btn-blue'}`} style={selectedStatus === 'REJECTED' ? { color: '#ef4444', borderColor: '#ef4444' } : {}}>
                  {updatingStatus ? 'Updating...' : (selectedStatus === 'REJECTED' ? 'Confirm Rejection' : 'Save & Update')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Escalate to Authority Modal */}
      {escalateModalComplaint && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(5px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div className="glass-card" style={{ maxWidth: '480px', width: '100%', padding: '1.5rem', border: '1px solid rgba(239, 68, 68, 0.4)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0, color: '#ef4444', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <AlertTriangle size={18} /> Escalate: {escalateModalComplaint.complaintId}
              </h3>
              <button onClick={() => setEscalateModalComplaint(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={18} /></button>
            </div>
            <form onSubmit={handleEscalateComplaint} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div>
                <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Escalation Authority Destination</label>
                <select value={authorityRole} onChange={(e) => setAuthorityRole(e.target.value)} style={{ width: '100%', padding: '0.45rem' }}>
                  <option value="Campus Director & Dean">Campus Director & Dean</option>
                  <option value="Principal & Campus Security Management">Principal & Campus Security Management</option>
                  <option value="Student Welfare & Anti-Ragging Committee Head">Student Welfare & Anti-Ragging Committee Head</option>
                  <option value="Chief Estate & Maintenance Officer">Chief Estate & Maintenance Officer</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Escalation Directive / Reason</label>
                <textarea rows="3" value={escalateReason} onChange={(e) => setEscalateReason(e.target.value)} placeholder="Provide context regarding urgency, SLA breach, or safety concerns..." style={{ width: '100%', padding: '0.45rem' }} required />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
                <button type="button" className="btn btn-outline" onClick={() => setEscalateModalComplaint(null)}>Cancel</button>
                <button type="submit" disabled={escalating} className="btn" style={{ background: '#ef4444', color: '#fff', fontWeight: 700 }}>
                  {escalating ? 'Escalating...' : 'Confirm Escalation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
