import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useLanguage } from '../context/LanguageContext';
import { api } from '../services/api';
import { 
  ArrowLeft, AlertTriangle, ShieldCheck, User, Calendar, Tag, Building2, 
  Brain, Star, CheckCircle, RefreshCcw, Save, MapPin, Paperclip, 
  UserCheck, Phone, Mail, Clock, Zap, ShieldAlert, ArrowUpRight,
  FileText, CheckCircle2, AlertCircle, ExternalLink,
  Eye, FileImage, Download, Upload, Send, Sparkles, Users, Award, Layers
} from 'lucide-react';
import SLACountdownBadge from '../components/SLACountdownBadge';


// Live SLA Countdown Timer Component
const SLATimer = ({ deadline, status, isEscalated, escalatedTo }) => {
  const [timeLeft, setTimeLeft] = useState('');
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    if (!deadline || status === 'RESOLVED') return;

    const updateTimer = () => {
      const now = new Date().getTime();
      const target = new Date(deadline).getTime();
      const diff = target - now;

      if (diff <= 0) {
        setIsExpired(true);
        setTimeLeft('SLA Expired');
      } else {
        setIsExpired(false);
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        setTimeLeft(`${hours}h ${minutes}m ${seconds}s`);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [deadline, status]);

  if (status === 'RESOLVED') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--status-resolved)', fontSize: '0.85rem', fontWeight: 600 }}>
        <CheckCircle size={15} /> SLA Met — Resolved within timeframe
      </div>
    );
  }

  if (isEscalated || status === 'ESCALATED' || isExpired) {
    return (
      <div style={{
        padding: '0.85rem 1rem',
        background: 'rgba(239, 68, 68, 0.12)',
        border: '1px solid rgba(239, 68, 68, 0.4)',
        borderRadius: '8px',
        color: '#f87171',
        marginBottom: '1rem',
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem'
      }}>
        <Zap size={22} color="var(--priority-critical)" style={{ flexShrink: 0 }} />
        <div>
          <div style={{ fontWeight: 700, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span>⚠️ SLA EXPIRED — AUTO-ESCALATED TO HIGHER AUTHORITY</span>
          </div>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
            This grievance was not resolved within the required duration. Case passed over to: <strong>{escalatedTo || 'Principal & Campus Security Management'}</strong>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '0.6rem',
      padding: '0.6rem 0.9rem',
      background: 'rgba(6, 182, 212, 0.08)',
      border: '1px solid rgba(6, 182, 212, 0.25)',
      borderRadius: '8px',
      marginBottom: '1rem'
    }}>
      <Clock size={16} color="var(--accent-cyan)" />
      <div>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>SLA RESOLUTION COUNTDOWN</span>
        <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '1rem', color: 'var(--accent-cyan)' }}>
          {timeLeft || 'Calculating...'}
        </span>
      </div>
    </div>
  );
};

// Visual Status Progress Stepper (5 Steps + Escalation callout)
const STATUS_STEPS = ['SUBMITTED', 'UNDER REVIEW', 'ASSIGNED', 'IN PROGRESS', 'RESOLVED'];
const StatusStepper = ({ currentStatus }) => {
  const activeIdx = ['REOPENED', 'ESCALATED'].includes(currentStatus)
    ? 0
    : STATUS_STEPS.indexOf(currentStatus);

  return (
    <div style={{ padding: '1rem 0 2.5rem 0' }}>
      <div className="status-stepper">
        {STATUS_STEPS.map((step, idx) => {
          const isCompleted = idx < activeIdx;
          const isActive = idx === activeIdx;
          return (
            <div key={step} className="step-item">
              <div style={{ position: 'relative' }}>
                <div className={`step-circle ${isCompleted ? 'completed' : isActive ? 'active' : ''}`}>
                  {isCompleted ? '✓' : idx + 1}
                </div>
                <span className={`step-label ${isCompleted ? 'completed' : isActive ? 'active' : ''}`}>
                  {step.replace(' ', '\u00A0')}
                </span>
              </div>
              {idx < STATUS_STEPS.length - 1 && (
                <div className={`step-line ${isCompleted ? 'completed' : ''}`} />
              )}
            </div>
          );
        })}
      </div>
      {currentStatus === 'REOPENED' && (
        <div style={{ textAlign: 'center', marginTop: '1rem' }}>
          <span className="badge badge-status-reopened">REOPENED — Awaiting Re-review</span>
        </div>
      )}
      {currentStatus === 'ESCALATED' && (
        <div style={{ textAlign: 'center', marginTop: '1rem' }}>
          <span className="badge badge-status-escalated">⚠️ ESCALATED TO HIGHER AUTHORITY</span>
        </div>
      )}
    </div>
  );
};

const departmentsList = [
  'Academic Department',
  'Hostel Administration',
  'Transport Department',
  'IT Department',
  'Maintenance Department',
  'Student Welfare / Anti-Ragging Committee',
  'Canteen & Hospitality',
  'Higher Authority (Principal & Campus Security Management)',
  'General Administration'
];

const statusesList = [
  'SUBMITTED',
  'UNDER REVIEW',
  'ASSIGNED',
  'IN PROGRESS',
  'ESCALATED',
  'RESOLVED',
  'REOPENED'
];

const ComplaintDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addToast } = useToast();
  const { t } = useLanguage();

  const [complaint, setComplaint] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Admin control states
  const [status, setStatus] = useState('');
  const [department, setDepartment] = useState('');
  const [adminRemarks, setAdminRemarks] = useState('');
  const [resolutionRemarks, setResolutionRemarks] = useState('');
  const [updating, setUpdating] = useState(false);
  const [isCertModalOpen, setIsCertModalOpen] = useState(false);

  // Responsible Officer Form State
  const [officerName, setOfficerName] = useState('');
  const [officerRole, setOfficerRole] = useState('');
  const [officerContact, setOfficerContact] = useState('');
  const [officerEmail, setOfficerEmail] = useState('');
  const [assigningOfficer, setAssigningOfficer] = useState(false);
  const [notifyingOfficer, setNotifyingOfficer] = useState(false);

  // Novelty 2: Recommended Officers State
  const [recommendedOfficers, setRecommendedOfficers] = useState([]);
  const [loadingRecommendations, setLoadingRecommendations] = useState(false);
  const [showRecommendations, setShowRecommendations] = useState(false);

  // Novelty 5: Student Confirmation State
  const [confirmingResolved, setConfirmingResolved] = useState(false);

  // Student feedback states
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submittingFeedback, setSubmittingFeedback] = useState(false);

  const loadComplaintDetails = async () => {
    try {
      const data = await api.getComplaintById(id);
      setComplaint(data.complaint);
      setFeedback(data.feedback);

      // Prepopulate admin states
      setStatus(data.complaint.status);
      setDepartment(data.complaint.department);
      setAdminRemarks(data.complaint.adminRemarks || '');
      setResolutionRemarks(data.complaint.resolutionRemarks || '');

      if (data.complaint.assignedOfficer) {
        setOfficerName(data.complaint.assignedOfficer.name || '');
        setOfficerRole(data.complaint.assignedOfficer.role || '');
        setOfficerContact(data.complaint.assignedOfficer.contact || '');
        setOfficerEmail(data.complaint.assignedOfficer.email || '');
      }
    } catch (err) {
      setError('Failed to load grievance details.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadComplaintDetails();
  }, [id]);

  const handleAdminUpdate = async (e) => {
    e.preventDefault();
    setUpdating(true);
    setError('');
    setSuccess('');

    try {
      const updateRes = await api.updateStatus(complaint._id, status, adminRemarks, resolutionRemarks);
      await api.updateDepartment(complaint._id, department);
      
      const notif = updateRes.notification;
      if (notif && notif.sent) {
        addToast(notif.message || 'Status updated & email sent to student!', 'success');
      } else {
        addToast(`Status updated to ${status}`, 'success');
      }

      setSuccess('Grievance status and remarks updated successfully.');
      await loadComplaintDetails();
    } catch (err) {
      setError(err.message || 'Failed to update grievance details.');
      addToast('Update failed. Please try again.', 'error');
    } finally {
      setUpdating(false);
    }
  };

  const handleAssignOfficerSubmit = async (e) => {
    e.preventDefault();
    setAssigningOfficer(true);
    setError('');
    setSuccess('');

    try {
      await api.assignOfficer(complaint._id, {
        name: officerName,
        role: officerRole,
        contact: officerContact,
        email: officerEmail
      });
      setSuccess(`Assigned responsible officer ${officerName} successfully!`);
      addToast(`Assigned to ${officerName} (${officerRole || 'Officer'})`, 'success');
      await loadComplaintDetails();
    } catch (err) {
      const msg = typeof err.message === 'string' && err.message.includes('<!DOCTYPE')
        ? 'Server route error. Please check admin authorization.'
        : (err.message || 'Failed to assign officer.');
      setError(msg);
      addToast(msg, 'error');
    } finally {
      setAssigningOfficer(false);
    }
  };

  const handleNotifyOfficer = async () => {
    setNotifyingOfficer(true);
    setError('');
    try {
      const res = await api.notifyOfficer(complaint._id);
      if (res.fallback) {
        addToast(`ℹ️ Officer notified (Simulated Test Delivery). Check SMTP credentials in backend/.env for real Gmail delivery.`, 'info');
      } else {
        addToast(`📧 Email notification sent to ${complaint.assignedOfficer?.email}!`, 'success');
      }
      // Refresh complaint to reflect notified status + timestamp
      await loadComplaintDetails();
    } catch (err) {
      const msg = err.message || 'Failed to send notification email.';
      setError(msg);
      addToast(msg, 'error');
    } finally {
      setNotifyingOfficer(false);
    }
  };

  const handleFeedbackSubmit = async (e) => {
    e.preventDefault();
    setSubmittingFeedback(true);
    setError('');
    setSuccess('');

    try {
      await api.submitFeedback(complaint._id, rating, comment);
      
      // If student rates 1 or 2 stars (unsatisfactory resolution), auto-reopen with escalated status
      if (rating <= 2) {
        await api.reopenComplaint(complaint._id);
        setSuccess('Unsatisfactory feedback received. Complaint automatically REOPENED with Escalated Priority for review!');
        addToast('⚠️ Low rating (1-2 stars) auto-reopened complaint with high priority!', 'warning');
      } else {
        setSuccess('Feedback submitted. Thank you for rating our resolution!');
        addToast('Feedback submitted successfully!', 'success');
      }
      await loadComplaintDetails();
    } catch (err) {
      setError(err.message || 'Failed to submit feedback.');
      addToast('Failed to submit feedback.', 'error');
    } finally {
      setSubmittingFeedback(false);
    }
  };

  const handleReopen = async () => {
    if (!window.confirm('Are you sure you want to reopen this complaint?')) return;
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      await api.reopenComplaint(complaint._id);
      setSuccess('Grievance reopened. Admins have been notified.');
      addToast('Complaint reopened successfully!', 'warning');
      await loadComplaintDetails();
    } catch (err) {
      setError(err.message || 'Failed to reopen complaint.');
      addToast('Failed to reopen complaint.', 'error');
      setLoading(false);
    }
  };

  // Novelty 2: Recommend Officers Handler
  const handleGetRecommendations = async () => {
    setLoadingRecommendations(true);
    try {
      const res = await api.getRecommendedOfficers(complaint._id);
      setRecommendedOfficers(res.officers || []);
      setShowRecommendations(true);
      if (res.recommended) {
        addToast(`🤖 Top Match: ${res.recommended.name} (Score: ${res.recommended.score.toFixed(1)})`, 'info');
      }
    } catch (err) {
      addToast(err.message || 'Failed to fetch recommendations.', 'error');
    } finally {
      setLoadingRecommendations(false);
    }
  };

  const handleSelectOfficer = (officer) => {
    setOfficerName(officer.name);
    setOfficerRole(officer.role || 'Department Officer');
    setOfficerContact(officer.contact || '');
    setOfficerEmail(officer.email || '');
    addToast(`Selected ${officer.name}. Click 'Assign Officer' to save.`, 'success');
  };

  // Novelty 5: Student Confirm Resolution Handler
  const handleConfirmResolved = async (e) => {
    if (e) e.preventDefault();
    setConfirmingResolved(true);
    setError('');
    setSuccess('');
    try {
      await api.confirmResolved(complaint._id, rating, comment);
      addToast('✅ Grievance verified and confirmed resolved!', 'success');
      setSuccess('Thank you! Resolution confirmed and closed.');
      await loadComplaintDetails();
    } catch (err) {
      setError(err.message || 'Failed to confirm resolution.');
      addToast(err.message || 'Failed to confirm resolution.', 'error');
    } finally {
      setConfirmingResolved(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getPriorityBadgeClass = (p) => `badge badge-priority-${p.toLowerCase()}`;
  const getStatusBadgeClass = (s) => `badge badge-status-${s.toLowerCase().replace(/ /g, '_')}`;
  const getSentimentBadgeClass = (s) => `badge badge-sentiment-${s.toLowerCase()}`;

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <h3>Loading Grievance Details...</h3>
      </div>
    );
  }

  if (!complaint) {
    return (
      <div className="glass-card" style={{ textAlign: 'center', padding: '3rem' }}>
        <AlertTriangle size={48} color="var(--priority-critical)" style={{ marginBottom: '1rem' }} />
        <h3>Complaint Not Found</h3>
        <button className="btn btn-blue" onClick={() => navigate(user.role === 'admin' ? '/admin/dashboard' : '/student/dashboard')} style={{ marginTop: '1.5rem' }}>
          Back to Dashboard
        </button>
      </div>
    );
  }

  const isCritical = ['HIGH', 'CRITICAL'].includes(complaint.priority);

  return (
    <div>
      <div style={{ marginBottom: '1.5rem' }}>
        <button 
          className="btn btn-outline" 
          onClick={() => navigate(user.role === 'admin' ? '/admin/dashboard' : '/student/dashboard')}
          style={{ padding: '0.4rem 0.8rem', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}
        >
          <ArrowLeft size={14} /> Back to Dashboard
        </button>
      </div>

      {/* Title & Priority Header */}
      <div className="dashboard-header" style={{ alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
            <span style={{ fontFamily: 'monospace', fontSize: '1.1rem', fontWeight: 700, color: 'var(--accent-cyan)' }}>
              {complaint.complaintId}
            </span>
            <span className={getPriorityBadgeClass(complaint.priority)}>{t(`priorities.${complaint.priority}`, complaint.priority)}</span>
            <span className={getStatusBadgeClass(complaint.status)}>{t(`statuses.${complaint.status}`, complaint.status)}</span>
            {complaint.confidencePercent > 0 && (
              <span className="badge" style={{ background: 'rgba(6,182,212,0.15)', color: 'var(--accent-cyan)', border: '1px solid rgba(6,182,212,0.3)', fontSize: '0.75rem' }}>
                🎯 {complaint.confidencePercent}% Confidence
              </span>
            )}
            {complaint.isDuplicate && (
              <span className="badge" style={{ background: 'rgba(59,130,246,0.15)', color: '#60a5fa', border: '1px solid rgba(59,130,246,0.3)', fontSize: '0.75rem' }}>
                🔗 Clustered Duplicate
              </span>
            )}
            {complaint.affectedStudentCount > 1 && (
              <span className="badge" style={{ background: 'rgba(245,158,11,0.15)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.3)', fontSize: '0.75rem' }}>
                👥 {complaint.affectedStudentCount} Students Affected
              </span>
            )}
            {complaint.reopenCount > 0 && (
              <span className="badge" style={{ background: 'rgba(239,68,68,0.15)', color: '#f87171', border: '1px solid rgba(239,68,68,0.3)', fontSize: '0.75rem' }}>
                ⚠️ Reopened ×{complaint.reopenCount} {complaint.reopenCount >= 2 ? '(Auto-Escalated)' : ''}
              </span>
            )}
          </div>
          <h2>{complaint.title}</h2>
        </div>
      </div>

      {/* Admin Quick Action Banner for Duplicate Grievance */}
      {(complaint.isDuplicate || complaint.affectedStudentCount > 1) && (
        <div style={{
          background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.16) 0%, rgba(239, 68, 68, 0.12) 100%)',
          border: '1px solid rgba(245, 158, 11, 0.5)',
          borderRadius: '10px',
          padding: '1rem 1.25rem',
          marginBottom: '1.25rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '8px',
              background: 'rgba(245, 158, 11, 0.25)',
              color: '#f59e0b',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.2rem',
              flexShrink: 0
            }}>
              ⚡
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.98rem', color: '#fbbf24', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span>TAKE QUICK ACTION: Recurring Duplicate Cluster</span>
                <span style={{ fontSize: '0.72rem', padding: '2px 8px', borderRadius: '10px', background: '#f59e0b', color: '#000', fontWeight: 800 }}>
                  👥 {complaint.affectedStudentCount || 2} Students Affected
                </span>
              </div>
              <div style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', marginTop: '3px' }}>
                {complaint.isDuplicate
                  ? `This ticket is linked as a duplicate to Parent Ticket ${complaint.parentComplaintId?.complaintId || complaint.parentComplaintId || ''}. Take immediate action on the primary ticket to resolve for all affected students.`
                  : `Multiple students have reported this identical issue. Fast-track officer assignment and update resolution remarks.`}
              </div>
            </div>
          </div>
          {user?.role === 'admin' && (
            <button
              className="btn"
              onClick={() => {
                const el = document.getElementById('admin-actions-card');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }}
              style={{
                background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                color: '#000',
                fontWeight: 700,
                fontSize: '0.85rem',
                padding: '0.5rem 1rem',
                border: 'none',
                borderRadius: '8px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                cursor: 'pointer'
              }}
            >
              ⚡ Fast-Track Resolution
            </button>
          )}
        </div>
      )}

      {/* Duplicate Cluster Notice */}
      {complaint.isDuplicate && (
        <div className="alert-box alert-info" style={{ borderLeft: '4px solid var(--accent-blue)', background: 'rgba(59, 130, 246, 0.08)', marginBottom: '1rem' }}>
          <Layers size={18} color="var(--accent-blue)" />
          <div>
            <strong>CLUSTERED DUPLICATE GRIEVANCE:</strong> This grievance shares context and location with an ongoing campus issue
            {complaint.parentComplaintId && (
              <> (Parent ID: <strong>{complaint.parentComplaintId.complaintId || complaint.parentComplaintId}</strong>)</>
            )}. Linked automatically to streamline departmental resolution.
          </div>
        </div>
      )}

      {/* 48-Hour Resolution Expiry Banner for Students */}
      {complaint.status === 'RESOLVED' && (
        <div style={{
          padding: '0.85rem 1rem',
          background: 'rgba(34, 197, 94, 0.08)',
          border: '1px solid rgba(34, 197, 94, 0.3)',
          borderRadius: '8px',
          marginBottom: '1rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem'
        }}>
          <Clock size={20} color="var(--status-resolved)" style={{ flexShrink: 0 }} />
          <div style={{ fontSize: '0.85rem' }}>
            <strong style={{ color: 'var(--status-resolved)', display: 'block' }}>⏱️ 48-Hour Resolution Verification Loop Active</strong>
            <span style={{ color: 'var(--text-secondary)' }}>
              Please verify if your grievance was solved properly. If not confirmed or rated within 48 hours, the system will automatically reopen the ticket.
            </span>
          </div>
        </div>
      )}

      {/* SLA Countdown Timer & Auto-Escalation Callout */}
      <SLATimer 
        deadline={complaint.slaDeadline} 
        status={complaint.status}
        isEscalated={complaint.isEscalated}
        escalatedTo={complaint.escalatedTo}
      />

      {/* Critical Alert Callout */}
      {isCritical && !complaint.isEscalated && (
        <div className="alert-box alert-error" style={{ borderLeft: '5px solid var(--priority-critical)' }}>
          <ShieldAlert size={20} color="var(--priority-critical)" />
          <div>
            <strong>CRITICAL URGENT GRIEVANCE:</strong> Auto-detected high-priority context. Fast-track SLA timer active.
          </div>
        </div>
      )}

      {/* Status Progress Stepper */}
      <div className="glass-card" style={{ padding: '1.5rem 2rem', marginBottom: '1.5rem' }}>
        <h4 style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0' }}>Complaint Progress</h4>
        <StatusStepper currentStatus={complaint.status} />
      </div>

      {error && (
        <div className="alert-box alert-error">
          <AlertTriangle size={18} />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="alert-box alert-success">
          <CheckCircle size={18} />
          <span>{success}</span>
        </div>
      )}

      <div className="detail-layout">
        {/* Main Details column */}
        <div className="detail-main">
          {/* Core Info card */}
          <div className="glass-card">
            <h3 style={{ marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
              Description
            </h3>
            <p style={{ whiteSpace: 'pre-wrap', color: 'var(--text-secondary)', fontSize: '1.05rem', lineHeight: '1.6' }}>
              {complaint.description}
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1.5rem', marginTop: '2rem', borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '0.25rem' }}>
                  <Calendar size={14} />
                  <span>SUBMITTED DATE</span>
                </div>
                <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{formatDate(complaint.createdAt)}</div>
              </div>

              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '0.25rem' }}>
                  <Clock size={14} color="var(--accent-cyan)" />
                  <span>SLA DEADLINE</span>
                </div>
                <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--accent-cyan)', marginBottom: '0.3rem' }}>
                  {formatDate(complaint.slaDeadline)}
                </div>
                <div>
                  <SLACountdownBadge
                    deadline={complaint.slaDeadline}
                    status={complaint.status}
                    isEscalated={complaint.isEscalated}
                    size="small"
                  />
                </div>
              </div>
              
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '0.25rem' }}>
                  <Tag size={14} />
                  <span>CATEGORY</span>
                </div>
                <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{t(`categories.${complaint.category}`, complaint.category)}</div>
              </div>

              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '0.25rem' }}>
                  <MapPin size={14} color="var(--accent-cyan)" />
                  <span>LOCATION</span>
                </div>
                <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--accent-cyan)' }}>
                  {complaint.location || 'Campus Premises'}
                </div>
              </div>

              {complaint.attachment && (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '0.25rem' }}>
                    <Paperclip size={14} color="var(--accent-blue)" />
                    <span>ATTACHMENT</span>
                  </div>
                  <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--accent-blue)' }}>
                    📎 {complaint.attachment}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Assigned Responsible Officer Card */}
          <div className="glass-card" style={{ border: '1px solid rgba(59,130,246,0.25)', background: 'rgba(59,130,246,0.03)' }}>
            <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.1rem' }}>
              <UserCheck size={18} color="var(--accent-cyan)" /> Responsible Officer / Authority
            </h3>

            {complaint.assignedOfficer && complaint.assignedOfficer.name ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                <div>
                  <div className="detail-meta-label">Officer Name</div>
                  <div style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '0.25rem' }}>
                    {complaint.assignedOfficer.name}
                  </div>
                </div>
                <div>
                  <div className="detail-meta-label">Designation / Role</div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--accent-cyan)', marginTop: '0.25rem' }}>
                    {complaint.assignedOfficer.role || 'Department Officer'}
                  </div>
                </div>
                <div>
                  <div className="detail-meta-label">Official Contact Phone</div>
                  <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <Phone size={13} /> {complaint.assignedOfficer.contact || 'Official Helpline'}
                  </div>
                </div>
                <div>
                  <div className="detail-meta-label">Official Email</div>
                  <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <Mail size={13} /> {complaint.assignedOfficer.email || 'department@scgrs.edu'}
                  </div>
                </div>

                {/* Notification Status Row - Admin only */}
                {user?.role === 'admin' && complaint.assignedOfficer.email && (
                  <div style={{ gridColumn: '1 / -1', paddingTop: '0.75rem', borderTop: '1px dashed var(--border-color)', display: 'flex', alignItems: 'center', gap: '0.85rem', flexWrap: 'wrap' }}>
                    {complaint.assignedOfficer.notified ? (
                      <>
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
                          background: 'rgba(34,197,94,0.1)',
                          color: '#4ade80',
                          border: '1px solid rgba(34,197,94,0.3)',
                          borderRadius: '20px',
                          padding: '0.3rem 0.85rem',
                          fontSize: '0.8rem',
                          fontWeight: 700
                        }}>
                          <CheckCircle2 size={13} /> Notified ✅
                          <span style={{ fontWeight: 400, opacity: 0.75, fontSize: '0.75rem' }}>
                            &mdash;&nbsp;
                            {new Date(complaint.assignedOfficer.notifiedAt).toLocaleString('en-IN', {
                              day: '2-digit', month: 'short', year: 'numeric',
                              hour: '2-digit', minute: '2-digit'
                            })}
                          </span>
                        </span>
                        <button
                          type="button"
                          className="btn btn-outline"
                          disabled={notifyingOfficer}
                          onClick={handleNotifyOfficer}
                          style={{ padding: '0.3rem 0.8rem', fontSize: '0.78rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem', borderColor: 'rgba(6,182,212,0.35)', color: 'var(--accent-cyan)' }}
                        >
                          <Send size={12} /> {notifyingOfficer ? 'Sending…' : 'Resend Email'}
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        className="btn btn-blue"
                        disabled={notifyingOfficer}
                        onClick={handleNotifyOfficer}
                        style={{ padding: '0.4rem 1rem', fontSize: '0.82rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
                      >
                        <Send size={14} />
                        {notifyingOfficer ? 'Sending Email…' : 'Notify Officer 📧'}
                      </button>
                    )}
                    {!complaint.assignedOfficer.notified && (
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                        Officer has not been emailed yet.
                      </span>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontStyle: 'italic' }}>
                No specific officer assigned yet. Department: <strong>{complaint.department}</strong>
              </div>
            )}
          </div>

          {/* AI Engine Metrics Card (XAI - Explainable AI) */}
          <div className="glass-card" style={{ border: '1px solid rgba(6, 182, 212, 0.3)', background: 'rgba(6, 182, 212, 0.02)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.1rem', margin: 0 }}>
                <Brain size={20} color="var(--accent-cyan)" /> AI Explainability & Reasoning (XAI)
              </h3>
              <span className="badge badge-status-assigned" style={{ fontSize: '0.7rem' }}>
                🔍 Transparent Decision Model
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
              <div>
                <div className="detail-meta-label">Detected Sentiment</div>
                <span className={getSentimentBadgeClass(complaint.sentiment)} style={{ marginTop: '0.25rem', display: 'inline-block' }}>
                  {complaint.sentiment}
                </span>
              </div>
              <div>
                <div className="detail-meta-label">AI Priority Grading</div>
                <span className={getPriorityBadgeClass(complaint.priority)} style={{ marginTop: '0.25rem', display: 'inline-block' }}>
                  {complaint.priority}
                </span>
              </div>
              <div>
                <div className="detail-meta-label">Deterministic Confidence</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--accent-cyan)', marginTop: '0.15rem' }}>
                  {complaint.confidencePercent ? `${complaint.confidencePercent}%` : `${(complaint.priorityScore * 100).toFixed(0)}%`}
                </div>
              </div>
            </div>

            {/* Matched Severity Keywords (Novelty 1) */}
            {complaint.matchedKeywords && complaint.matchedKeywords.length > 0 && (
              <div style={{ borderTop: '1px dashed var(--border-color)', paddingTop: '0.85rem', marginBottom: '0.85rem' }}>
                <div className="detail-meta-label" style={{ marginBottom: '0.4rem' }}>
                  🎯 Matched Severity Keywords (Weight Breakdown)
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                  {complaint.matchedKeywords.map((kw, idx) => (
                    <span
                      key={idx}
                      style={{
                        background: 'rgba(6, 182, 212, 0.12)',
                        color: 'var(--accent-cyan)',
                        border: '1px solid rgba(6, 182, 212, 0.3)',
                        borderRadius: '12px',
                        padding: '3px 10px',
                        fontSize: '0.8rem',
                        fontWeight: 600
                      }}
                    >
                      🏷️ {kw}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Extracted Trigger Keywords */}
            {complaint.priorityReason && (
              <div style={{ borderTop: '1px dashed var(--border-color)', paddingTop: '0.85rem' }}>
                <div className="detail-meta-label" style={{ marginBottom: '0.35rem' }}>AI Urgency & Context Explanation</div>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', margin: 0, lineHeight: '1.5' }}>
                  {complaint.priorityReason}
                </p>
              </div>
            )}
          </div>

          {/* Canteen Dish Issue Inspection Card */}
          {(complaint.category === 'Canteen Dish Issue' || complaint.dishName) && (
            <div className="glass-card" style={{ border: '1px solid rgba(234, 179, 8, 0.3)', background: 'rgba(234, 179, 8, 0.02)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.1rem', margin: 0, color: '#eab308' }}>
                  🍲 Canteen Dish & Food Sanitation Report
                </h3>
                {['FOREIGN_OBJECT', 'HYGIENE'].includes(complaint.issueType) && (
                  <span className="badge badge-priority-critical" style={{ fontSize: '0.75rem', fontWeight: 700 }}>
                    🛡️ Food Safety Priority Override
                  </span>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                <div>
                  <div className="detail-meta-label">Canteen / Mess Location</div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)', marginTop: '0.2rem' }}>
                    📍 {complaint.canteenLocation || 'Campus Canteen'}
                  </div>
                </div>

                <div>
                  <div className="detail-meta-label">Dish / Food Item Name</div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--accent-cyan)', marginTop: '0.2rem' }}>
                    🍲 {complaint.dishName || 'Not specified'}
                  </div>
                </div>

                <div>
                  <div className="detail-meta-label">Primary Issue Classification</div>
                  <div style={{ marginTop: '0.2rem' }}>
                    <span style={{
                      padding: '0.2rem 0.6rem',
                      background: ['FOREIGN_OBJECT', 'HYGIENE'].includes(complaint.issueType) ? 'rgba(239, 68, 68, 0.15)' : 'rgba(234, 179, 8, 0.15)',
                      color: ['FOREIGN_OBJECT', 'HYGIENE'].includes(complaint.issueType) ? '#f87171' : '#eab308',
                      border: `1px solid ${['FOREIGN_OBJECT', 'HYGIENE'].includes(complaint.issueType) ? 'rgba(239, 68, 68, 0.3)' : 'rgba(234, 179, 8, 0.3)'}`,
                      borderRadius: '4px',
                      fontSize: '0.8rem',
                      fontWeight: 700
                    }}>
                      {(complaint.issueType || 'QUALITY').replace(/_/g, ' ')}
                    </span>
                  </div>
                </div>

                <div>
                  <div className="detail-meta-label">Meal Serving Time</div>
                  <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                    ⏰ {complaint.mealTime || 'Lunch'}
                  </div>
                </div>
              </div>

              {complaint.dishPhoto && (
                <div style={{ marginTop: '1rem', paddingTop: '0.85rem', borderTop: '1px dashed var(--border-color)' }}>
                  <div className="detail-meta-label">Dish Photo / Attachment Evidence</div>
                  <div style={{ marginTop: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.85rem', color: 'var(--accent-cyan)', fontWeight: 600 }}>
                      📷 {complaint.dishPhoto}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Resolution Remarks Card (if resolved) */}
          {complaint.status === 'RESOLVED' && complaint.resolutionRemarks && (
            <div className="glass-card" style={{ border: '1px solid rgba(34,197,94,0.3)', background: 'rgba(34,197,94,0.04)' }}>
              <h3 style={{ marginBottom: '0.75rem', color: 'var(--status-resolved)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.1rem' }}>
                <CheckCircle size={18} /> Resolution Remarks
              </h3>
              <p style={{ fontSize: '0.95rem', color: 'var(--text-primary)', whiteSpace: 'pre-wrap' }}>
                "{complaint.resolutionRemarks}"
              </p>
            </div>
          )}

          {/* Status Timeline Card */}
          <div className="glass-card">
            <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span>Grievance Lifecycle & Audit Log</span>
              {complaint.studentNotifiedAt && (
                <span style={{ fontSize: '0.75rem', color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '0.35rem', fontWeight: 600 }}>
                  <Mail size={13} /> Student Notified via Email
                </span>
              )}
            </h3>

            <div className="timeline">
              {complaint.statusHistory && complaint.statusHistory.length > 0 ? (
                complaint.statusHistory.map((item, idx) => (
                  <div key={idx} className="timeline-item">
                    <div className={`timeline-dot ${idx === complaint.statusHistory.length - 1 ? 'active' : ''}`}></div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                      <h4 style={{ margin: 0 }}>
                        {item.status}
                      </h4>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        {item.notifiedStudent && (
                          <span style={{ fontSize: '0.72rem', background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', padding: '2px 8px', borderRadius: '12px', border: '1px solid rgba(56, 189, 248, 0.3)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                            <Mail size={11} /> Student Emailed
                          </span>
                        )}
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {formatDate(item.timestamp)}
                        </span>
                      </div>
                    </div>
                    {item.adminRemarks && (
                      <p style={{ marginTop: '0.3rem', color: 'var(--text-secondary)' }}>
                        <strong>Admin Remarks:</strong> {item.adminRemarks}
                      </p>
                    )}
                    {item.resolutionRemarks && (
                      <p style={{ marginTop: '0.3rem', color: 'var(--status-resolved)' }}>
                        <strong>Resolution:</strong> {item.resolutionRemarks}
                      </p>
                    )}
                  </div>
                ))
              ) : (
                <>
                  <div className="timeline-item">
                    <div className="timeline-dot"></div>
                    <h4>Submitted</h4>
                    <p>{formatDate(complaint.createdAt)} - Complaint lodged and automatically assigned to {complaint.department}.</p>
                  </div>

                  {complaint.assignedOfficer && complaint.assignedOfficer.name && (
                    <div className="timeline-item">
                      <div className="timeline-dot"></div>
                      <h4>Assigned Officer</h4>
                      <p>Assigned to {complaint.assignedOfficer.name} ({complaint.assignedOfficer.role || 'Officer'}).</p>
                    </div>
                  )}

                  {complaint.isEscalated && (
                    <div className="timeline-item">
                      <div className="timeline-dot" style={{ background: 'var(--priority-critical)', boxShadow: '0 0 10px var(--priority-critical)' }}></div>
                      <h4 style={{ color: '#f87171' }}>Auto-Escalated to Higher Authority</h4>
                      <p>{formatDate(complaint.escalatedAt)} - SLA timer expired. Automatically escalated to: {complaint.escalatedTo || 'Principal & Campus Security Management'}.</p>
                    </div>
                  )}

                  {complaint.status !== 'SUBMITTED' && (
                    <div className="timeline-item">
                      <div className="timeline-dot"></div>
                      <h4>{complaint.status === 'REOPENED' ? 'Reopened' : 'Reviewed & Processed'}</h4>
                      <p>Status changed to {complaint.status}. Remarks: {complaint.adminRemarks || 'None provided.'}</p>
                    </div>
                  )}

                  {complaint.status === 'RESOLVED' && (
                    <div className="timeline-item">
                      <div className="timeline-dot active"></div>
                      <h4>Resolved</h4>
                      <p>The grievance has been resolved. Student feedback requested.</p>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar settings / feedback column */}
        <div className="detail-sidebar">
          {/* Submitting Student Details (Contact Student) */}
          <div className="glass-card">
            <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.1rem' }}>
              <User size={18} color="var(--accent-blue)" /> Contact Student
            </h3>
            {complaint.anonymous ? (
              <div style={{ padding: '0.85rem', background: 'rgba(245, 158, 11, 0.08)', borderRadius: '6px', border: '1px dashed rgba(245, 158, 11, 0.4)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--priority-medium)', fontWeight: 700, fontSize: '0.85rem', marginBottom: '0.25rem' }}>
                  <ShieldCheck size={16} /> Anonymous Grievance
                </div>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Student identity is protected according to the system's privacy rules. Admin communications must be routed via official administrative notes.
                </p>
              </div>
            ) : (
              <div>
                <div className="detail-meta-label">Student Name</div>
                <div style={{ fontWeight: 600, fontSize: '0.95rem', marginBottom: '0.5rem' }}>
                  {complaint.studentId ? complaint.studentId.name : 'Unknown Student'}
                </div>
                <div className="detail-meta-label">Email Address</div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '0.85rem' }}>
                  {complaint.studentId ? complaint.studentId.email : 'N/A'}
                </div>
                {user.role === 'admin' && (
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <a href={`mailto:${complaint.studentId?.email}`} className="btn btn-outline" style={{ flex: 1, padding: '0.35rem 0.5rem', fontSize: '0.75rem', justifyContent: 'center' }}>
                      <Mail size={13} /> Email Student
                    </a>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Assign Responsible Officer (Admin Panel) */}
          {user.role === 'admin' && (
            <div id="admin-actions-card" className="glass-card" style={{ border: '1px solid rgba(59, 130, 246, 0.3)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.05rem' }}>
                  <UserCheck size={18} color="var(--accent-cyan)" /> Assign Responsible Officer
                </h3>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={handleGetRecommendations}
                  disabled={loadingRecommendations}
                  style={{ padding: '0.25rem 0.65rem', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem', borderColor: 'var(--accent-cyan)', color: 'var(--accent-cyan)' }}
                >
                  <Sparkles size={13} /> {loadingRecommendations ? 'Ranking...' : '🤖 Recommend Officer'}
                </button>
              </div>

              {/* Novelty 2: Recommended Officers List */}
              {showRecommendations && (
                <div style={{ marginBottom: '1rem', padding: '0.75rem', background: 'rgba(6, 182, 212, 0.05)', borderRadius: '8px', border: '1px solid rgba(6, 182, 212, 0.25)' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent-cyan)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span>🏆 Performance-Ranked Officers</span>
                    <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>score = (10-tickets) + (★×2)</span>
                  </div>
                  {recommendedOfficers.length === 0 ? (
                    <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: 0 }}>No officers found for this department.</p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', maxHeight: '200px', overflowY: 'auto' }}>
                      {recommendedOfficers.map((o, idx) => (
                        <div
                          key={o._id}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '0.45rem 0.65rem',
                            background: idx === 0 ? 'rgba(6, 182, 212, 0.12)' : 'rgba(255,255,255,0.03)',
                            borderRadius: '6px',
                            border: idx === 0 ? '1px solid rgba(6, 182, 212, 0.4)' : '1px solid transparent'
                          }}
                        >
                          <div>
                            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                              {idx === 0 && '⭐ Top Match: '}{o.name}
                            </div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                              Score: <strong style={{ color: 'var(--accent-cyan)' }}>{o.score.toFixed(1)}</strong> | Open: {o.openTicketCount} | Rating: ★{o.avgRating}
                            </div>
                          </div>
                          <button
                            type="button"
                            className="btn btn-outline"
                            onClick={() => handleSelectOfficer(o)}
                            style={{ padding: '0.2rem 0.5rem', fontSize: '0.7rem', borderColor: 'var(--accent-cyan)', color: 'var(--accent-cyan)' }}
                          >
                            Select
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <form onSubmit={handleAssignOfficerSubmit}>
                <div className="form-group" style={{ marginBottom: '0.85rem' }}>
                  <label style={{ fontSize: '0.75rem' }}>Officer Name</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. Network Administrator / Mr. Rajesh"
                    value={officerName}
                    onChange={(e) => setOfficerName(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group" style={{ marginBottom: '0.85rem' }}>
                  <label style={{ fontSize: '0.75rem' }}>Designation / Role</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. Student Welfare Officer"
                    value={officerRole}
                    onChange={(e) => setOfficerRole(e.target.value)}
                  />
                </div>
                <div className="form-group" style={{ marginBottom: '0.85rem' }}>
                  <label style={{ fontSize: '0.75rem' }}>Contact Phone</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. +91 98765 43210"
                    value={officerContact}
                    onChange={(e) => setOfficerContact(e.target.value)}
                  />
                </div>
                <div className="form-group" style={{ marginBottom: '1rem' }}>
                  <label style={{ fontSize: '0.75rem' }}>Officer Email</label>
                  <input
                    type="email"
                    className="form-control"
                    placeholder="officer@scgrs.edu"
                    value={officerEmail}
                    onChange={(e) => setOfficerEmail(e.target.value)}
                  />
                </div>
                <button
                  type="submit"
                  className="btn btn-blue"
                  style={{ width: '100%', fontSize: '0.85rem', justifyContent: 'center' }}
                  disabled={assigningOfficer}
                >
                  {assigningOfficer ? 'Assigning...' : 'Assign Officer'}
                </button>

                {/* Notify button shown below the form once officer is assigned */}
                {complaint.assignedOfficer?.name && complaint.assignedOfficer?.email && (
                  <div style={{ marginTop: '0.85rem', paddingTop: '0.85rem', borderTop: '1px dashed var(--border-color)' }}>
                    {complaint.assignedOfficer.notified ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
                          background: 'rgba(34,197,94,0.1)',
                          color: '#4ade80',
                          border: '1px solid rgba(34,197,94,0.3)',
                          borderRadius: '20px',
                          padding: '0.3rem 0.75rem',
                          fontSize: '0.78rem',
                          fontWeight: 700
                        }}>
                          <CheckCircle2 size={12} /> Notified ✅&nbsp;
                          <span style={{ fontWeight: 400, opacity: 0.75, fontSize: '0.72rem' }}>
                            {new Date(complaint.assignedOfficer.notifiedAt).toLocaleString('en-IN', {
                              day: '2-digit', month: 'short',
                              hour: '2-digit', minute: '2-digit'
                            })}
                          </span>
                        </span>
                        <button
                          type="button"
                          className="btn btn-outline"
                          disabled={notifyingOfficer}
                          onClick={handleNotifyOfficer}
                          style={{ width: '100%', fontSize: '0.8rem', justifyContent: 'center', display: 'flex', alignItems: 'center', gap: '0.4rem', borderColor: 'rgba(6,182,212,0.35)', color: 'var(--accent-cyan)' }}
                        >
                          <Send size={13} /> {notifyingOfficer ? 'Sending…' : 'Resend Notification'}
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        className="btn btn-blue"
                        disabled={notifyingOfficer}
                        onClick={handleNotifyOfficer}
                        style={{ width: '100%', fontSize: '0.85rem', justifyContent: 'center', display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'linear-gradient(135deg, rgba(6,182,212,0.25), rgba(59,130,246,0.25))', border: '1px solid rgba(6,182,212,0.5)' }}
                      >
                        <Send size={14} />
                        {notifyingOfficer ? 'Sending Email…' : '📧 Notify Officer via Email'}
                      </button>
                    )}
                  </div>
                )}
              </form>
            </div>
          )}

          {/* Admin Status & Remarks Panel */}
          {user.role === 'admin' && (
            <div className="glass-card">
              <h3 style={{ marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.1rem' }}>
                <Building2 size={18} color="var(--accent-blue)" /> Status Operations
              </h3>
              
              <form onSubmit={handleAdminUpdate}>
                <div className="form-group">
                  <label htmlFor="admin-status">Update Status</label>
                  <select
                    id="admin-status"
                    className="form-control"
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                  >
                    {statusesList.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="admin-dept">Reassign Department</label>
                  <select
                    id="admin-dept"
                    className="form-control"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                  >
                    {departmentsList.map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="admin-remarks">Admin Remarks</label>
                  <textarea
                    id="admin-remarks"
                    className="form-control"
                    rows="3"
                    placeholder="Enter internal process notes..."
                    value={adminRemarks}
                    onChange={(e) => setAdminRemarks(e.target.value)}
                  />
                </div>

                {status === 'RESOLVED' && (
                  <div className="form-group">
                    <label htmlFor="res-remarks" style={{ color: 'var(--status-resolved)' }}>Resolution Remarks (For Student)</label>
                    <textarea
                      id="res-remarks"
                      className="form-control"
                      rows="3"
                      placeholder="e.g. The Wi-Fi router was replaced and connection restored."
                      value={resolutionRemarks}
                      onChange={(e) => setResolutionRemarks(e.target.value)}
                    />
                  </div>
                )}

                <button 
                  type="submit" 
                  className="btn btn-blue" 
                  style={{ width: '100%', display: 'flex', justifyContent: 'center', gap: '0.5rem' }}
                  disabled={updating}
                >
                  <Save size={16} />
                  {updating ? 'Saving...' : 'Save Operations'}
                </button>
              </form>
            </div>
          )}

          {/* Student Action / Feedback Card */}
          {user.role === 'student' && (
            <div className="glass-card">
              <h3 style={{ marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.1rem' }}>
                <Building2 size={18} color="var(--accent-blue)" /> Department Assigned
              </h3>
              <p style={{ fontWeight: 600, color: 'var(--accent-cyan)', marginBottom: '1.5rem' }}>
                {complaint.department}
              </p>

              {complaint.status === 'RESOLVED' && (
                <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem' }}>
                  <h4 style={{ marginBottom: '1rem', color: 'var(--status-resolved)' }}>Case Resolved</h4>
                  
                  {feedback ? (
                    /* Existing feedback */
                    <div style={{ background: 'rgba(34,197,94,0.05)', border: '1px solid rgba(34,197,94,0.15)', padding: '1rem', borderRadius: 'var(--border-radius-sm)', marginBottom: '1rem' }}>
                      <div className="detail-meta-label">Your Rating</div>
                      <div className="rating-display" style={{ margin: '0.25rem 0 0.5rem 0' }}>
                        {[1, 2, 3, 4, 5].map(star => (
                          <Star key={star} size={16} fill={star <= feedback.rating ? 'currentColor' : 'none'} />
                        ))}
                      </div>
                      <div className="detail-meta-label">Your Comment</div>
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
                        {feedback.comment || 'No comment provided.'}
                      </p>
                    </div>
                  ) : (
                    /* Verification & Feedback submission form (Novelty 5) */
                    <div>
                      <div className="form-group" style={{ marginBottom: '0.75rem' }}>
                        <label style={{ fontSize: '0.82rem', fontWeight: 600 }}>Rate the resolution satisfaction:</label>
                        <div className="rating-selector">
                          {[1, 2, 3, 4, 5].map(star => (
                            <button
                              key={star}
                              type="button"
                              className={`rating-star-btn ${star <= (hoverRating || rating) ? 'active' : ''}`}
                              onClick={() => setRating(star)}
                              onMouseEnter={() => setHoverRating(star)}
                              onMouseLeave={() => setHoverRating(0)}
                            >
                              <Star size={24} fill={star <= (hoverRating || rating) ? 'currentColor' : 'none'} />
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="form-group" style={{ marginBottom: '1rem' }}>
                        <label htmlFor="feedback-comment" style={{ fontSize: '0.8rem' }}>Verification Notes / Feedback (Optional)</label>
                        <textarea
                          id="feedback-comment"
                          className="form-control"
                          rows="2"
                          placeholder="e.g. Verified on site, equipment is now working smoothly."
                          value={comment}
                          onChange={(e) => setComment(e.target.value)}
                        />
                      </div>

                      {/* Novelty 5 Action Buttons */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', marginBottom: '0.75rem' }}>
                        <button 
                          type="button" 
                          className="btn btn-green" 
                          style={{ width: '100%', display: 'flex', justifyContent: 'center', gap: '0.5rem', fontWeight: 700 }}
                          onClick={handleConfirmResolved}
                          disabled={confirmingResolved}
                        >
                          <CheckCircle size={16} />
                          {confirmingResolved ? 'Verifying...' : '✅ Confirm Fixed'}
                        </button>

                        <button 
                          type="button" 
                          className="btn btn-red" 
                          style={{ width: '100%', display: 'flex', justifyContent: 'center', gap: '0.5rem' }}
                          onClick={handleReopen}
                        >
                          <RefreshCcw size={16} />
                          ❌ Still Not Fixed (Reopen)
                        </button>
                      </div>

                      <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic', textAlign: 'center', margin: '0.5rem 0 0 0' }}>
                        ⏱️ 48-Hour Auto-Reopen: Tickets unverified after 48h will automatically reopen.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {complaint.status !== 'RESOLVED' && (
                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '4px', borderLeft: '3px solid var(--accent-blue)' }}>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    Your complaint is currently active. You can track updates here and submit feedback or reopen if not satisfied once resolved.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Feedback details (Admin view) */}
          {user.role === 'admin' && feedback && (
            <div className="glass-card">
              <h3 style={{ marginBottom: '1rem', color: 'var(--status-resolved)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.1rem' }}>
                <Star size={18} /> Student Feedback
              </h3>
              <div>
                <div className="detail-meta-label">Satisfaction Rating</div>
                <div className="rating-display" style={{ margin: '0.25rem 0 0.75rem 0' }}>
                  {[1, 2, 3, 4, 5].map(star => (
                    <Star key={star} size={18} fill={star <= feedback.rating ? 'currentColor' : 'none'} />
                  ))}
                </div>
                <div className="detail-meta-label">Comments</div>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
                  "{feedback.comment || 'No comments left.'}"
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* JPG Certificate Modal Lightbox - removed (OD feature deleted) */}
    </div>
  );
};

export default ComplaintDetails;
