import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { useLanguage } from '../context/LanguageContext';
import { ClipboardList, PlusCircle, AlertTriangle, Eye, RefreshCw } from 'lucide-react';
import SLACountdownBadge from '../components/SLACountdownBadge';

const MyComplaints = () => {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const { language, t } = useLanguage();
  const navigate = useNavigate();

  const fetchComplaints = async () => {
    setLoading(true);
    try {
      const data = await api.getComplaints();
      setComplaints(data);
    } catch (err) {
      setError(language === 'ta' ? 'புகார்களைப் பெறுவதில் பிழை ஏற்பட்டது.' : 'Failed to load complaints.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComplaints();
  }, []);

  const getPriorityBadgeClass = (priority) => {
    return `badge badge-priority-${priority.toLowerCase()}`;
  };

  const getStatusBadgeClass = (status) => {
    const formatted = status.toLowerCase().replace(' ', '_');
    return `badge badge-status-${formatted}`;
  };

  const filteredComplaints = complaints.filter(c => {
    if (statusFilter && c.status !== statusFilter) return false;
    return true;
  });

  if (loading && complaints.length === 0) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <h3>{t('loading')}</h3>
      </div>
    );
  }

  return (
    <div>
      <div className="dashboard-header">
        <div>
          <h2>{t('nav.myComplaints')}</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            {language === 'ta' ? 'உங்கள் புகார்களின் தீர்வு முன்னேற்றம் மற்றும் நிலையை அறியவும்.' : 'Review progress, update remarks, or reopen cases.'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn btn-outline" onClick={fetchComplaints} style={{ padding: '0.6rem' }} title="Refresh">
            <RefreshCw size={16} />
          </button>
          <button className="btn btn-blue" onClick={() => navigate('/student/submit')}>
            <PlusCircle size={16} /> {t('dashboard.fileNewComplaint')}
          </button>
        </div>
      </div>

      <div className="filter-bar">
        <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: 600 }}>{t('filter')}:</span>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">{language === 'ta' ? 'அனைத்து நிலைகளும்' : 'All Statuses'}</option>
          <option value="SUBMITTED">{t('statuses.SUBMITTED', 'SUBMITTED')}</option>
          <option value="UNDER REVIEW">{t('statuses.UNDER REVIEW', 'UNDER REVIEW')}</option>
          <option value="IN PROGRESS">{t('statuses.IN PROGRESS', 'IN PROGRESS')}</option>
          <option value="RESOLVED">{t('statuses.RESOLVED', 'RESOLVED')}</option>
          <option value="REOPENED">{t('statuses.REOPENED', 'REOPENED')}</option>
        </select>
      </div>

      {error && (
        <div className="alert-box alert-error">
          <AlertTriangle size={18} />
          <span>{error}</span>
        </div>
      )}

      <div className="glass-card">
        {filteredComplaints.length === 0 ? (
          <div className="empty-state">
            <ClipboardList className="empty-state-icon" size={48} />
            <p>
              {statusFilter 
                ? (language === 'ta' ? 'தேர்ந்தெடுக்கப்பட்ட வடிகட்டலில் புகார்கள் எதுவும் இல்லை.' : 'No complaints match the selected filter.')
                : t('dashboard.noGrievancesYet')}
            </p>
          </div>
        ) : (
          <div className="table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>{t('dashboard.ticketId')}</th>
                  <th>{t('dashboard.title')}</th>
                  <th>{t('category')}</th>
                  <th>{t('priority')}</th>
                  <th>{t('dashboard.slaCountdown')}</th>
                  <th>{language === 'ta' ? 'துறை' : 'Department'}</th>
                  <th>{t('status')}</th>
                  <th>{t('actions')}</th>
                </tr>
              </thead>
              <tbody>
                {filteredComplaints.map((c) => (
                  <tr key={c._id}>
                    <td style={{ fontFamily: 'monospace', fontWeight: 600, color: 'var(--accent-cyan)' }}>{c.complaintId}</td>
                    <td style={{ fontWeight: 500 }}>
                      <div>{c.title}</div>
                    </td>
                    <td>{t(`categories.${c.category}`, c.category)}</td>
                    <td>
                      <span className={getPriorityBadgeClass(c.priority)}>
                        {t(`priorities.${c.priority}`, c.priority)}
                      </span>
                    </td>
                    <td>
                      <SLACountdownBadge
                        deadline={c.slaDeadline}
                        status={c.status}
                        isEscalated={c.isEscalated}
                        size="small"
                      />
                    </td>
                    <td>{c.department}</td>
                    <td>
                      <span className={getStatusBadgeClass(c.status)}>
                        {t(`statuses.${c.status}`, c.status)}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <button 
                          className="btn btn-outline" 
                          onClick={() => navigate(`/complaints/${c._id}`)}
                          style={{ padding: '0.35rem 0.65rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                        >
                          <Eye size={14} /> {t('viewDetails')}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
};

export default MyComplaints;
