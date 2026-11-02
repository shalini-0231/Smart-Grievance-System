import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useLanguage } from '../context/LanguageContext';
import { LogIn, Info, AlertCircle, Languages, Check } from 'lucide-react';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [formLoading, setFormLoading] = useState(false);
  
  const { login } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const navigate = useNavigate();
  const { addToast } = useToast();

  const handleLogin = async (e) => {
    if (e) e.preventDefault();
    if (!email || !password) {
      setError(language === 'ta' ? 'அனைத்து விவரங்களையும் நிரப்பவும்.' : 'Please fill in all fields.');
      return;
    }

    setError('');
    setFormLoading(true);

    try {
      const loggedUser = await login(email, password);
      addToast(
        language === 'ta' 
          ? `மீண்டும் வருக, ${loggedUser.name.split(' ')[0]}!`
          : `Welcome back, ${loggedUser.name.split(' ')[0]}!`, 
        'success'
      );
      if (loggedUser.role === 'admin') navigate('/admin/dashboard');
      else navigate('/student/dashboard');
    } catch (err) {
      setError(err.message || (language === 'ta' ? 'உள்நுழைவு தோல்வியடைந்தது. சான்றுகளைச் சரிபார்க்கவும்.' : 'Login failed. Check your credentials.'));
      addToast(language === 'ta' ? 'உள்நுழைவு தோல்வியடைந்தது.' : 'Login failed. Please check credentials.', 'error');
    } finally {
      setFormLoading(false);
    }
  };

  const handleFillDemo = (role) => {
    setError('');
    const demoEmail = role === 'admin' ? 'admin@scgrs.com' : 'student@scgrs.com';
    const demoPassword = 'password123';
    setEmail(demoEmail);
    setPassword(demoPassword);
    
    // Auto submit using a small timeout so the user sees the filled values
    setTimeout(() => {
      setFormLoading(true);
      login(demoEmail, demoPassword)
        .then((loggedUser) => {
          if (loggedUser.role === 'admin') navigate('/admin/dashboard');
          else navigate('/student/dashboard');
        })
        .catch((err) => {
          setError(err.message || (language === 'ta' ? 'மாதிரி கணக்கு உள்நுழைவு தோல்வியடைந்தது.' : 'Demo Login failed.'));
          setFormLoading(false);
        });
    }, 400);
  };

  return (
    <div className="auth-wrapper">
      <div className="glass-card auth-card">
        {/* Language Selection at Login */}
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
          <h2>{t('auth.welcomeBack')}</h2>
          <p>{t('auth.loginSubtitle')}</p>
        </div>

        {error && (
          <div className="alert-box alert-error">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleLogin}>
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

          <button type="submit" className="btn btn-blue" style={{ width: '100%', marginTop: '0.5rem' }} disabled={formLoading}>
            <LogIn size={18} />
            {formLoading ? t('auth.loggingIn') : t('auth.signIn')}
          </button>
        </form>

        <div className="demo-credentials-helper">
          <h4>
            <Info size={16} /> {t('auth.quickDemo')}
          </h4>
          <p>{t('auth.quickDemoDesc')}</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            <button className="demo-fill-btn" onClick={() => handleFillDemo('student')} disabled={formLoading}>
              {t('auth.studentAccount')}
            </button>
            <button className="demo-fill-btn" onClick={() => handleFillDemo('admin')} disabled={formLoading}>
              {t('auth.adminAccount')}
            </button>
          </div>
        </div>

        <p style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
          {t('auth.noAccount')}{' '}
          <Link to="/register" style={{ color: 'var(--accent-cyan)', fontWeight: 600 }}>
            {t('auth.registerHere')}
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
