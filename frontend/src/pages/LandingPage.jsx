import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { Brain, ShieldCheck, Zap, MessageSquareQuote, Mic } from 'lucide-react';

const LandingPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { language, t } = useLanguage();

  const handleGetStarted = () => {
    if (user) {
      if (user.role === 'admin') navigate('/admin/dashboard');
      else navigate('/student/dashboard');
    } else {
      navigate('/login');
    }
  };

  const isTamil = language === 'ta';

  return (
    <div className="landing-container">
      <div className="hero-section">
        <div className="hero-tagline">
          {isTamil ? '🤖 AI & குரல் வழி இயங்கும் குறைதீர்ப்பு தளம்' : 'AI-Powered Grievance Redressal'}
        </div>
        <h1 className="hero-title">{t('systemTitle')}</h1>
        <p className="hero-desc">
          {isTamil 
            ? 'மாணவர்கள் தங்கள் வளாகக் குறைகளை குரல் வழியாகவோ அல்லது தட்டச்சு வழியாகவோ பதிவு செய்ய உதவும் நுண்ணறிவுத் தளம். SCGRS தானாகவே புகாரின் தீவிரத்தை மதிப்பிட்டு, சரியான துறை அதிகாரிகளுக்கு உடனடியாக வழியனுப்புகிறது.'
            : 'An automated, intelligent portal enabling students to voice grievances. SCGRS pre-processes complaint texts, executes rule-based sentiment scoring, automatically assigns severity priorities, and maps cases directly to responsible department administrators.'}
        </p>
        <div className="hero-cta">
          <button className="btn btn-blue" onClick={handleGetStarted} style={{ fontSize: '1.05rem', padding: '0.9rem 2rem' }}>
            {isTamil ? 'தொடங்குக' : 'Get Started'}
          </button>
          {!user && (
            <button className="btn btn-outline" onClick={() => navigate('/register')} style={{ fontSize: '1.05rem', padding: '0.9rem 2rem' }}>
              {t('auth.createAccount')}
            </button>
          )}
        </div>
      </div>

      <div className="features-grid">
        <div className="feature-card">
          <div className="feature-icon-wrap">
            <Mic size={24} />
          </div>
          <h3>{isTamil ? 'குரல் வழி உள்ளீடு (Voice Input)' : 'Speech-to-Text Entry'}</h3>
          <p>
            {isTamil 
              ? 'ஆங்கிலம் மற்றும் தமிழ் மொழிகளில் பேசி புகாரை உடனடியாக பதிவு செய்யலாம். AI தானாகவே புகாரின் பிரிவைக் கண்டறிந்து விரிவான விளக்கத்தை உருவாக்குகிறது.'
              : 'Students can speak grievances in English or Tamil. Web Speech API automatically captures speech, identifies category, and generates description.'}
          </p>
        </div>

        <div className="feature-card">
          <div className="feature-icon-wrap">
            <Brain size={24} />
          </div>
          <h3>{isTamil ? 'AI முன்னுரிமை கணிப்பு' : 'AI Priority Engine'}</h3>
          <p>
            {isTamil
              ? 'அவசர நிலை சொற்கள் மற்றும் உணவு பாதுகாப்பு விதிகளை ஆய்வு செய்து முன்னுரிமையை (குறைவு, நடுத்தரம், அதிகம், மிக அவசரம்) கணக்கிடுகிறது.'
              : 'Scans complaint text for urgency keywords to classify severity levels (Low, Medium, High, Critical) in real time.'}
          </p>
        </div>

        <div className="feature-card">
          <div className="feature-icon-wrap">
            <Zap size={24} />
          </div>
          <h3>{isTamil ? 'தானியங்கி துறை ஒதுக்கீடு' : 'Auto-Department Routing'}</h3>
          <p>
            {isTamil
              ? 'புகாரின் பிரிவுக்கேற்ப சம்பந்தப்பட்ட துறைக்கு (கல்வி, விடுதி, இணையம், போக்குவரத்து, மாணவர் நலம்) தானாகவே அனுப்புகிறது.'
              : 'Directs submissions straight to the relevant department (e.g. IT, Hostel, Student Welfare) depending on category rules.'}
          </p>
        </div>

        <div className="feature-card">
          <div className="feature-icon-wrap">
            <ShieldCheck size={24} />
          </div>
          <h3>{isTamil ? 'அநாமதேய புகார் முறை' : 'Anonymous Submit'}</h3>
          <p>
            {isTamil
              ? 'மாணவர்கள் தங்கள் அடையாளத்தை மறைத்து ரகசியமாக புகாரளிக்க அனுமதிக்கிறது.'
              : 'Allows students to mask their identities in the portal, hiding name/email details from admin screens.'}
          </p>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;
