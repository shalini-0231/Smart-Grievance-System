import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { UserPlus, AlertCircle, Languages, Check } from 'lucide-react';

const Register = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  const { register } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');

    if (!name || !email || !password || !confirmPassword) {
      setError(language === 'ta' ? 'அனைத்து விவரங்களையும் நிரப்பவும்.' : 'Please fill in all fields.');
      return;
    }

    if (password !== confirmPassword) {
      setError(language === 'ta' ? 'கடவுச்சொற்கள் பொருந்தவில்லை.' : 'Passwords do not match.');
      return;
    }

    setFormLoading(true);

    try {
      await register(name, email, password);
      navigate('/student/dashboard');
    } catch (err) {
      setError(err.message || (language === 'ta' ? 'பதிவு தோல்வியடைந்தது.' : 'Registration failed.'));
    } finally {
      setFormLoading(false);
    }
  };

  return (
    <div className="auth-wrapper">
      <div className="glass-card auth-card">
        {/* Language Selection Header */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '0.45rem',
          background: 'rgba(56, 189, 248, 0.06)',
          border: '1px solid rgba(56, 189, 248, 0.25)',
          borderRadius: '10px',
          padding: '0.75rem 1rem',
          marginBottom: '1.25rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Languages size={15} style={{ color: 'var(--accent-cyan)' }} />
              {t('auth.preferredLanguage')}
            </span>
            <span style={{ fontSize: '0.72rem', color: 'var(--accent-cyan)', fontWeight: 600 }}>
              {language === 'ta' ? 'தமிழ் செயலில் உள்ளது' : 'English Active'}
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginTop: '0.2rem' }}>
            <button
              type="button"
              onClick={() => setLanguage('en')}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.4rem',
                padding: '0.45rem 0.6rem',
                borderRadius: '8px',
                border: language === 'en' ? '2px solid var(--accent-cyan)' : '1px solid rgba(255, 255, 255, 0.1)',
                background: language === 'en' ? 'rgba(56, 189, 248, 0.18)' : 'rgba(255, 255, 255, 0.03)',
                color: language === 'en' ? '#38bdf8' : 'var(--text-secondary)',
                fontWeight: language === 'en' ? 700 : 500,
                cursor: 'pointer',
                transition: 'all 0.2s',
                fontSize: '0.85rem'
              }}
            >
              <span>English</span>
              {language === 'en' && <Check size={14} />}
            </button>

            <button
              type="button"
              onClick={() => setLanguage('ta')}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.4rem',
                padding: '0.45rem 0.6rem',
                borderRadius: '8px',
                border: language === 'ta' ? '2px solid var(--accent-cyan)' : '1px solid rgba(255, 255, 255, 0.1)',
                background: language === 'ta' ? 'rgba(56, 189, 248, 0.18)' : 'rgba(255, 255, 255, 0.03)',
                color: language === 'ta' ? '#38bdf8' : 'var(--text-secondary)',
                fontWeight: language === 'ta' ? 700 : 500,
                cursor: 'pointer',
                transition: 'all 0.2s',
                fontSize: '0.85rem'
              }}
            >
              <span>தமிழ் (Tamil)</span>
              {language === 'ta' && <Check size={14} />}
            </button>
          </div>
        </div>

        <div className="auth-header">
          <h2>{t('auth.createAccount')}</h2>
          <p>{t('auth.registerSubtitle')}</p>
        </div>

        {error && (
          <div className="alert-box alert-error">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleRegister}>
          <div className="form-group">
            <label htmlFor="name">{t('auth.fullName')}</label>
            <input
              type="text"
              id="name"
              className="form-control"
              placeholder="e.g. Anand Kumar"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="email">{t('auth.emailAddress')}</label>
            <input
              type="email"
              id="email"
              className="form-control"
              placeholder="student@scgrs.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">{t('auth.password')}</label>
            <input
              type="password"
              id="password"
              className="form-control"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">{t('auth.confirmPassword')}</label>
            <input
              type="password"
              id="confirmPassword"
              className="form-control"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="btn btn-blue" style={{ width: '100%', marginTop: '0.5rem' }} disabled={formLoading}>
            <UserPlus size={18} />
            {formLoading ? t('auth.registering') : t('auth.createAccount')}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
          {t('auth.alreadyAccount')}{' '}
          <Link to="/login" style={{ color: 'var(--accent-cyan)', fontWeight: 600 }}>
            {t('auth.loginHere')}
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
