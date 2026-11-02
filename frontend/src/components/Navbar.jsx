import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { api } from '../services/api';
import {
  ShieldAlert, LogOut, PlusCircle, LayoutDashboard, ClipboardList,
  LogIn, UserPlus, BarChart2, Bell, Languages, TrendingUp, UserCheck,
  Timer, Sparkles, Users, FileText, LayoutGrid
} from 'lucide-react';

const Navbar = () => {
  const { user, logout } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();

  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifs, setShowNotifs] = useState(false);

  const fetchNotifications = async () => {
    if (!user) return;
    try {
      const data = await api.getNotifications();
      if (data) {
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch (e) {
      // Quiet fail if not logged in or network error
    }
  };

  useEffect(() => {
    if (user) {
      fetchNotifications();
      const interval = setInterval(fetchNotifications, 30000); // Poll every 30s
      return () => clearInterval(interval);
    }
  }, [user]);

  const handleMarkAllRead = async () => {
    try {
      await api.markAllNotificationsRead();
      setUnreadCount(0);
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch (e) {
      console.warn('Failed to mark all as read:', e.message);
    }
  };

  const handleNotificationClick = async (notif) => {
    if (!notif.isRead) {
      try {
        await api.markNotificationRead(notif._id);
        setUnreadCount(prev => Math.max(0, prev - 1));
        setNotifications(prev => prev.map(n => n._id === notif._id ? { ...n, isRead: true } : n));
      } catch (e) {
        console.warn('Failed to mark notification as read:', e.message);
      }
    }
    if (notif.complaintId) {
      setShowNotifs(false);
      navigate(`/complaints/${notif.complaintId}`);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="navbar">
      <div className="nav-logo" onClick={() => navigate('/')}>
        <ShieldAlert size={26} color="var(--accent-cyan)" />
        <span>SCGRS</span>
      </div>

      <ul className="nav-links">
        {/* Public Landing Link */}
        <li className="nav-link" onClick={() => navigate('/')}>{t('nav.home')}</li>

        {user ? (
          <>
            {/* Student Links */}
            {user.role === 'student' && (
              <>
                <li
                  className={`nav-link ${isActive('/student/dashboard') ? 'active' : ''}`}
                  onClick={() => navigate('/student/dashboard')}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <LayoutDashboard size={16} /> {t('nav.dashboard')}
                  </span>
                </li>
                <li
                  className={`nav-link ${isActive('/student/complaints') ? 'active' : ''}`}
                  onClick={() => navigate('/student/complaints')}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <ClipboardList size={16} /> {t('nav.myComplaints')}
                  </span>
                </li>
                <li
                  className={`nav-link btn-primary ${isActive('/student/submit') ? 'active' : ''}`}
                  onClick={() => navigate('/student/submit')}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <PlusCircle size={16} /> {t('nav.fileGrievance')}
                  </span>
                </li>
              </>
            )}

            {/* Admin Links: Home, Admin Panel, Analytics, Reports & Feedback, Officer Management, User Management */}
            {user.role === 'admin' && (
              <>
                <li
                  className={`nav-link ${location.pathname === '/admin/dashboard' ? 'active' : ''}`}
                  onClick={() => navigate('/admin/dashboard')}
                  style={{
                    padding: '0.45rem 0.85rem',
                    fontSize: '0.88rem',
                    fontWeight: location.pathname === '/admin/dashboard' ? 600 : 500,
                    border: location.pathname === '/admin/dashboard' ? '1px solid rgba(59, 130, 246, 0.4)' : '1px solid transparent',
                    background: location.pathname === '/admin/dashboard' ? 'rgba(37, 99, 235, 0.2)' : 'transparent',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    color: location.pathname === '/admin/dashboard' ? '#ffffff' : '#94a3b8',
                    transition: 'all 0.15s ease',
                    whiteSpace: 'nowrap'
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                    <LayoutGrid size={16} /> Admin Panel
                  </span>
                </li>

                <li
                  className={`nav-link ${location.pathname === '/admin/analytics' ? 'active' : ''}`}
                  onClick={() => navigate('/admin/analytics')}
                  style={{
                    padding: '0.45rem 0.85rem',
                    fontSize: '0.88rem',
                    fontWeight: location.pathname === '/admin/analytics' ? 600 : 500,
                    border: location.pathname === '/admin/analytics' ? '1px solid rgba(59, 130, 246, 0.4)' : '1px solid transparent',
                    background: location.pathname === '/admin/analytics' ? 'rgba(37, 99, 235, 0.2)' : 'transparent',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    color: location.pathname === '/admin/analytics' ? '#ffffff' : '#94a3b8',
                    transition: 'all 0.15s ease',
                    whiteSpace: 'nowrap'
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                    <BarChart2 size={16} /> Analytics
                  </span>
                </li>

                <li
                  className={`nav-link ${location.pathname === '/admin/reports' ? 'active' : ''}`}
                  onClick={() => navigate('/admin/reports')}
                  style={{
                    padding: '0.45rem 0.85rem',
                    fontSize: '0.88rem',
                    fontWeight: location.pathname === '/admin/reports' ? 600 : 500,
                    border: location.pathname === '/admin/reports' ? '1px solid rgba(59, 130, 246, 0.4)' : '1px solid transparent',
                    background: location.pathname === '/admin/reports' ? 'rgba(37, 99, 235, 0.2)' : 'transparent',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    color: location.pathname === '/admin/reports' ? '#ffffff' : '#94a3b8',
                    transition: 'all 0.15s ease',
                    whiteSpace: 'nowrap'
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                    <FileText size={16} /> Reports & Feedback
                  </span>
                </li>

                <li
                  className={`nav-link ${location.pathname === '/admin/officers' ? 'active' : ''}`}
                  onClick={() => navigate('/admin/officers')}
                  style={{
                    padding: '0.45rem 0.85rem',
                    fontSize: '0.88rem',
                    fontWeight: location.pathname === '/admin/officers' ? 600 : 500,
                    border: location.pathname === '/admin/officers' ? '1px solid rgba(59, 130, 246, 0.4)' : '1px solid transparent',
                    background: location.pathname === '/admin/officers' ? 'rgba(37, 99, 235, 0.2)' : 'transparent',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    color: location.pathname === '/admin/officers' ? '#ffffff' : '#94a3b8',
                    transition: 'all 0.15s ease',
                    whiteSpace: 'nowrap'
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                    <Users size={16} /> Officer Management
                  </span>
                </li>

                <li
                  className={`nav-link ${location.pathname === '/admin/users' ? 'active' : ''}`}
                  onClick={() => navigate('/admin/users')}
                  style={{
                    padding: '0.45rem 0.85rem',
                    fontSize: '0.88rem',
                    fontWeight: location.pathname === '/admin/users' ? 600 : 500,
                    border: location.pathname === '/admin/users' ? '1px solid rgba(59, 130, 246, 0.4)' : '1px solid transparent',
                    background: location.pathname === '/admin/users' ? 'rgba(37, 99, 235, 0.2)' : 'transparent',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    color: location.pathname === '/admin/users' ? '#ffffff' : '#94a3b8',
                    transition: 'all 0.15s ease',
                    whiteSpace: 'nowrap'
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                    <UserCheck size={16} /> User Management
                  </span>
                </li>
              </>
            )}
            {/* Notifications Dropdown */}
            <div className="nav-notifications-wrapper" style={{ position: 'relative' }}>
              <button
                type="button"
                onClick={() => {
                  setShowNotifs(!showNotifs);
                  if (!showNotifs) fetchNotifications();
                }}
                style={{
                  background: showNotifs ? 'rgba(56, 189, 248, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  color: showNotifs ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                  borderRadius: '50%',
                  width: '36px',
                  height: '36px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  position: 'relative'
                }}
                title={t('nav.notifications')}
              >
                <Bell size={18} />
                {unreadCount > 0 && (
                  <span style={{
                    position: 'absolute',
                    top: '-4px',
                    right: '-4px',
                    background: '#ef4444',
                    color: '#ffffff',
                    fontSize: '0.68rem',
                    fontWeight: 700,
                    borderRadius: '9999px',
                    padding: '1px 5px',
                    minWidth: '16px',
                    textAlign: 'center',
                    boxShadow: '0 0 8px rgba(239, 68, 68, 0.6)'
                  }}>
                    {unreadCount}
                  </span>
                )}
              </button>

              {/* Notifications Dropdown Panel */}
              {showNotifs && (
                <div style={{
                  position: 'absolute',
                  top: '46px',
                  right: '0',
                  width: '340px',
                  maxHeight: '420px',
                  overflowY: 'auto',
                  background: '#0f172a',
                  border: '1px solid rgba(56, 189, 248, 0.3)',
                  borderRadius: '12px',
                  boxShadow: '0 12px 30px rgba(0, 0, 0, 0.6)',
                  zIndex: 1000,
                  padding: '0.75rem'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '0.6rem', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', marginBottom: '0.6rem' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                      {t('nav.notifications')} {unreadCount > 0 && `(${unreadCount})`}
                    </span>
                    {unreadCount > 0 && (
                      <button
                        type="button"
                        onClick={handleMarkAllRead}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: 'var(--accent-cyan)',
                          fontSize: '0.75rem',
                          cursor: 'pointer',
                          padding: '2px 6px'
                        }}
                      >
                        {t('nav.markAllRead')}
                      </button>
                    )}
                  </div>

                  {notifications.length === 0 ? (
                    <div style={{ padding: '1.5rem 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                      {t('nav.noNotifications')}
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                      {notifications.map(n => {
                        const isDupAlert = n.type === 'DUPLICATE_ALERT' || (n.title && n.title.includes('Duplicate'));
                        return (
                          <div
                            key={n._id}
                            onClick={() => handleNotificationClick(n)}
                            style={{
                              padding: '0.65rem 0.8rem',
                              borderRadius: '8px',
                              background: isDupAlert
                                ? 'linear-gradient(135deg, rgba(245, 158, 11, 0.16) 0%, rgba(239, 68, 68, 0.12) 100%)'
                                : (n.isRead ? 'rgba(255, 255, 255, 0.02)' : 'rgba(56, 189, 248, 0.08)'),
                              border: isDupAlert
                                ? '1px solid rgba(245, 158, 11, 0.45)'
                                : (n.isRead ? '1px solid rgba(255, 255, 255, 0.04)' : '1px solid rgba(56, 189, 248, 0.25)'),
                              boxShadow: isDupAlert && !n.isRead ? '0 0 10px rgba(245, 158, 11, 0.2)' : 'none',
                              cursor: n.complaintId ? 'pointer' : 'default',
                              transition: 'all 0.2s'
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem', gap: '0.4rem', flexWrap: 'wrap' }}>
                              <span style={{ fontSize: '0.82rem', fontWeight: 700, color: isDupAlert ? '#fbbf24' : (n.isRead ? 'var(--text-primary)' : 'var(--accent-cyan)') }}>
                                {n.title}
                              </span>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                {isDupAlert && (
                                  <span style={{
                                    fontSize: '0.62rem',
                                    fontWeight: 800,
                                    padding: '2px 5px',
                                    borderRadius: '4px',
                                    background: '#f59e0b',
                                    color: '#000',
                                    letterSpacing: '0.3px'
                                  }}>
                                    ⚡ QUICK ACTION
                                  </span>
                                )}
                                {!n.isRead && (
                                  <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: isDupAlert ? '#ef4444' : '#38bdf8' }}></span>
                                )}
                              </div>
                            </div>
                            <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                              {n.message}
                            </p>
                            <div style={{ marginTop: '0.35rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              {isDupAlert && (
                                <span style={{ fontSize: '0.72rem', color: '#fbbf24', fontWeight: 600 }}>
                                  Click to Take Action &rarr;
                                </span>
                              )}
                              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginLeft: 'auto' }}>
                                {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Language Switcher in Navbar */}
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              borderRadius: '20px',
              padding: '2px 4px',
              gap: '2px'
            }}>
              <button
                type="button"
                onClick={() => setLanguage('en')}
                style={{
                  background: language === 'en' ? 'var(--accent-cyan)' : 'transparent',
                  color: language === 'en' ? '#0f172a' : 'var(--text-secondary)',
                  fontWeight: language === 'en' ? 700 : 500,
                  border: 'none',
                  borderRadius: '16px',
                  padding: '3px 8px',
                  fontSize: '0.72rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                title="Switch to English"
              >
                EN
              </button>
              <button
                type="button"
                onClick={() => setLanguage('ta')}
                style={{
                  background: language === 'ta' ? 'var(--accent-cyan)' : 'transparent',
                  color: language === 'ta' ? '#0f172a' : 'var(--text-secondary)',
                  fontWeight: language === 'ta' ? 700 : 500,
                  border: 'none',
                  borderRadius: '16px',
                  padding: '3px 8px',
                  fontSize: '0.72rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                title="தமிழுக்கு மாற்றவும் (Tamil)"
              >
                தமிழ்
              </button>
            </div>

            {/* User Session Info */}
            <div className="nav-user">
              <span className="user-badge">{user.role}</span>
              <span style={{ color: 'var(--text-primary)', fontSize: '0.9rem', fontWeight: 600 }}>
                {user.name.split(' ')[0]}
              </span>
              <button
                onClick={handleLogout}
                className="btn btn-outline"
                style={{ padding: '0.35rem 0.65rem', display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.8rem' }}
              >
                <LogOut size={13} />
                {t('nav.logout')}
              </button>
            </div>
          </>
        ) : (
          <>
            {/* Language Switcher for Guests */}
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              borderRadius: '20px',
              padding: '2px 4px',
              gap: '2px'
            }}>
              <button
                type="button"
                onClick={() => setLanguage('en')}
                style={{
                  background: language === 'en' ? 'var(--accent-cyan)' : 'transparent',
                  color: language === 'en' ? '#0f172a' : 'var(--text-secondary)',
                  fontWeight: language === 'en' ? 700 : 500,
                  border: 'none',
                  borderRadius: '16px',
                  padding: '3px 8px',
                  fontSize: '0.72rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                EN
              </button>
              <button
                type="button"
                onClick={() => setLanguage('ta')}
                style={{
                  background: language === 'ta' ? 'var(--accent-cyan)' : 'transparent',
                  color: language === 'ta' ? '#0f172a' : 'var(--text-secondary)',
                  fontWeight: language === 'ta' ? 700 : 500,
                  border: 'none',
                  borderRadius: '16px',
                  padding: '3px 8px',
                  fontSize: '0.72rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                தமிழ்
              </button>
            </div>

            {/* Guest Links */}
            <button
              className="btn btn-outline"
              onClick={() => navigate('/login')}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              <LogIn size={16} /> {t('nav.login')}
            </button>
            <button
              className="btn btn-blue"
              onClick={() => navigate('/register')}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              <UserPlus size={16} /> {t('nav.register')}
            </button>
          </>
        )}
      </ul>
    </nav>
  );
};

export default Navbar;
