import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { useToast } from '../context/ToastContext';
import { useLanguage } from '../context/LanguageContext';
import { normalizeCampusSpeech } from '../utils/speechNormalizer';
import { 
  Send, AlertTriangle, ArrowLeft, Brain, Sparkles, FileText, CheckCircle2, Users, ThumbsUp,
  Mic, Square, XCircle, Languages, AlertCircle
} from 'lucide-react';

const categories = [
  'Academic',
  'Hostel',
  'Transport',
  'Infrastructure',
  'Internet/Wi-Fi',
  'Harassment',
  'Ragging',
  'Safety',
  'Canteen Dish Issue',
  'Other'
];

const getTargetDepartment = (cat) => {
  switch (cat) {
    case 'Academic': return 'Academic Department';
    case 'Hostel': return 'Hostel Administration';
    case 'Transport': return 'Transport Department';
    case 'Internet/Wi-Fi': return 'IT Department';
    case 'Infrastructure': return 'Maintenance Department';
    case 'Harassment':
    case 'Ragging':
    case 'Safety': return 'Student Welfare / Anti-Ragging Committee';
    case 'Canteen Dish Issue': return 'Canteen & Hospitality';
    default: return 'General Administration';
  }
};

const SubmitComplaint = () => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Academic');
  const [locationName, setLocationName] = useState('');
  const [attachment, setAttachment] = useState('');
  const [anonymous, setAnonymous] = useState(false);
  
  // Canteen Dish Issue Specific State
  const [canteenLocation, setCanteenLocation] = useState('Block A Canteen');
  const [dishName, setDishName] = useState('');
  const [issueType, setIssueType] = useState('QUALITY');
  const [mealTime, setMealTime] = useState('Lunch');
  const [dishPhoto, setDishPhoto] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { addToast } = useToast();
  const { language, t } = useLanguage();

  // Speech-to-Text & Automatic Field Population State
  const [isRecording, setIsRecording] = useState(false);
  const [voiceLang, setVoiceLang] = useState(language === 'ta' ? 'ta-IN' : 'en-IN'); // Syncs with preferred language
  const [speechError, setSpeechError] = useState('');
  const [speechSupported, setSpeechSupported] = useState(true);
  const [autoPopulating, setAutoPopulating] = useState(false);

  useEffect(() => {
    setVoiceLang(language === 'ta' ? 'ta-IN' : 'en-IN');
  }, [language]);

  const recognitionRef = useRef(null);
  const isRecordingRef = useRef(false);
  const isCancelledRef = useRef(false);
  const preRecordingTextRef = useRef('');
  const currentSpokenTextRef = useRef('');

  // Check browser Web Speech API support and cleanup on unmount
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setSpeechSupported(false);
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // ignore unmount abort error
        }
      }
    };
  }, []);

  // AI live preview state
  const [aiPreview, setAiPreview] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);

  // Novelty 3: Duplicate detection state
  const [duplicateWarning, setDuplicateWarning] = useState(null);
  const [checkingDuplicates, setCheckingDuplicates] = useState(false);
  const [upvotingId, setUpvotingId] = useState(null);

  // Trigger AI preview and Duplicate Detection when description changes
  const triggerAIAnalysis = async (overrideDesc, overrideCat) => {
    const textToAnalyze = (overrideDesc !== undefined ? overrideDesc : description).trim();
    const catToUse = overrideCat !== undefined ? overrideCat : category;

    if (textToAnalyze.length < 8) {
      setAiPreview(null);
      setDuplicateWarning(null);
      return;
    }
    
    setAiLoading(true);
    setCheckingDuplicates(true);
    try {
      const [aiRes, dupRes] = await Promise.allSettled([
        api.analyzeText(
          textToAnalyze, 
          undefined,
          catToUse === 'Canteen Dish Issue' ? issueType : undefined
        ),
        api.checkDuplicate(title, textToAnalyze, catToUse, locationName)
      ]);

      if (aiRes.status === 'fulfilled') {
        setAiPreview(aiRes.value);
      }
      if (dupRes.status === 'fulfilled' && dupRes.value?.hasDuplicate) {
        setDuplicateWarning(dupRes.value.matches || []);
      } else {
        setDuplicateWarning(null);
      }
    } catch (err) {
      console.warn('Analysis/Duplicate check error on preview:', err.message);
    } finally {
      setAiLoading(false);
      setCheckingDuplicates(false);
    }
  };

  // Automated Field Population Workflow after Voice Capture
  const handleVoiceFinished = async (spokenText) => {
    const cleanSpoken = normalizeCampusSpeech((spokenText || '').trim());
    if (cleanSpoken.length < 3) return;

    setAutoPopulating(true);
    try {
      const result = await api.processVoiceComplaint(cleanSpoken, voiceLang);
      if (result) {
        // 1. Automatically identify and select the matching Category
        let matchedCat = result.category;
        if (matchedCat && categories.includes(matchedCat)) {
          setCategory(matchedCat);
        } else {
          matchedCat = category;
        }

        // 2. Automatically generate detailed description preserving original meaning
        const generatedDesc = result.description || cleanSpoken;
        setDescription(generatedDesc);

        // 3. Immediately trigger Live AI Assessment on the generated description
        triggerAIAnalysis(generatedDesc, matchedCat);

        addToast('Voice captured! Category identified & Detailed Description auto-populated.', 'success');
      }
    } catch (err) {
      console.warn('Voice auto-population error:', err.message);
      // Fallback: If auto-generation unavailable, use recognized speech as description
      if (!description || description.trim() === '') {
        setDescription(cleanSpoken);
        triggerAIAnalysis(cleanSpoken, category);
      }
    } finally {
      setAutoPopulating(false);
    }
  };

  // Speech Recognition Start Handler (Integrated into Complaint Title)
  const startSpeechRecognition = () => {
    setSpeechError('');
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setSpeechSupported(false);
      setSpeechError('Speech recognition is not supported in this browser. Please use Google Chrome, Microsoft Edge, or Safari, or continue typing manually.');
      return;
    }

    // Once we start to re-record, erase previous speech-to-text & generated fields for a clean slate
    setTitle('');
    setDescription('');
    setAiPreview(null);
    setDuplicateWarning(null);
    preRecordingTextRef.current = '';
    currentSpokenTextRef.current = '';
    isCancelledRef.current = false;

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = voiceLang;
      recognition.maxAlternatives = 3;

      recognition.onstart = () => {
        setIsRecording(true);
        isRecordingRef.current = true;
        setSpeechError('');
      };

      recognition.onresult = (event) => {
        if (isCancelledRef.current) return;

        let interimTranscript = '';
        let finalTranscript = '';

        // Prevent duplicate text by iterating through results and accumulating final & interim segments
        for (let i = 0; i < event.results.length; i++) {
          let transcriptChunk = event.results[i][0].transcript;

          // Check alternatives: if an alternative has a known campus keyword that alt 0 missed, prefer it
          for (let a = 1; a < event.results[i].length; a++) {
            const altText = event.results[i][a].transcript;
            if (/\b(wifi|wi-fi|mess|canteen|geyser|ragging|hostel)\b/i.test(altText) && !/\b(wifi|wi-fi|mess|canteen|geyser|ragging|hostel)\b/i.test(transcriptChunk)) {
              transcriptChunk = altText;
              break;
            }
          }

          if (event.results[i].isFinal) {
            finalTranscript += transcriptChunk + ' ';
          } else {
            interimTranscript += transcriptChunk;
          }
        }

        const rawSpoken = (finalTranscript + interimTranscript).trim();
        // Domain speech normalization: corrects acoustic confusions (e.g. wife -> Wi-Fi, mens -> mess)
        const speechSpoken = normalizeCampusSpeech(rawSpoken);

        // Update title and speech ref with the normalized campus speech
        setTitle(speechSpoken);
        currentSpokenTextRef.current = speechSpoken;
      };

      recognition.onerror = (event) => {
        console.warn('Speech recognition error event:', event.error);
        if (isCancelledRef.current) return;

        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          setSpeechError('Microphone access was denied. Please allow microphone permissions in your browser site settings or address bar to use voice input.');
        } else if (event.error === 'no-speech') {
          setSpeechError('No speech was detected. Please check your microphone and speak clearly.');
        } else if (event.error === 'audio-capture') {
          setSpeechError('No microphone detected. Please connect or enable an audio input device.');
        } else if (event.error === 'network') {
          setSpeechError('Network error connecting to speech recognition service. Please check your internet connection.');
        } else if (event.error !== 'aborted') {
          setSpeechError(`Speech recognition issue: ${event.error}. You can continue typing manually.`);
        }
        setIsRecording(false);
        isRecordingRef.current = false;
      };

      recognition.onend = () => {
        setIsRecording(false);
        isRecordingRef.current = false;
        if (!isCancelledRef.current) {
          const finalText = (currentSpokenTextRef.current || title || '').trim();
          if (finalText.length >= 3) {
            handleVoiceFinished(finalText);
          }
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.error('Failed to start speech recognition:', err);
      setSpeechError('Could not start microphone. Please check browser permissions or continue typing manually.');
      setIsRecording(false);
      isRecordingRef.current = false;
    }
  };

  // Speech Recognition Stop Handler
  const stopSpeechRecognition = () => {
    if (recognitionRef.current && isRecordingRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        console.warn('Error stopping speech recognition:', e);
      }
    }
    setIsRecording(false);
    isRecordingRef.current = false;
  };

  // Speech Recognition Cancel Handler
  const cancelSpeechRecognition = () => {
    isCancelledRef.current = true;
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch (e) {
        console.warn('Error cancelling speech recognition:', e);
      }
    }
    setTitle('');
    setDescription('');
    currentSpokenTextRef.current = '';
    preRecordingTextRef.current = '';
    setAiPreview(null);
    setDuplicateWarning(null);
    setIsRecording(false);
    isRecordingRef.current = false;
    setSpeechError('');
  };

  const handleUpvoteDuplicate = async (complaintId) => {
    setUpvotingId(complaintId);
    try {
      const res = await api.upvoteComplaint(complaintId);
      addToast(res.message || 'Endorsed successfully! Tracking issue.', 'success');
      navigate('/student/complaints');
    } catch (err) {
      addToast(err.message || 'Could not endorse complaint', 'error');
    } finally {
      setUpvotingId(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title || !description || !category) {
      setError('Please fill in all required fields.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const payload = { 
        title, 
        description, 
        category, 
        location: locationName || 'Campus Premises', 
        attachment, 
        anonymous 
      };

      if (category === 'Canteen Dish Issue') {
        payload.canteenLocation = canteenLocation;
        payload.dishName = dishName;
        payload.issueType = issueType;
        payload.mealTime = mealTime;
        payload.dishPhoto = dishPhoto;
      }

      const result = await api.createComplaint(payload);
      addToast(`Grievance ${result.complaintId} submitted successfully!`, 'success');
      navigate('/student/dashboard');
    } catch (err) {
      setError(err.message || 'Failed to submit grievance.');
      addToast('Submission failed. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const getPriorityBadgeClass = (priority) => {
    return `badge badge-priority-${priority.toLowerCase()}`;
  };

  const getSentimentBadgeClass = (sentiment) => {
    return `badge badge-sentiment-${sentiment.toLowerCase()}`;
  };

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <button 
          className="btn btn-outline" 
          onClick={() => navigate('/student/dashboard')}
          style={{ padding: '0.4rem 0.8rem', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}
        >
          <ArrowLeft size={14} /> {t('back')}
        </button>
      </div>

      <div className="dashboard-header">
        <div>
          <h2>{t('submitForm.pageTitle')}</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            {t('submitForm.pageSubtitle')}
          </p>
        </div>
      </div>

      {error && (
        <div className="alert-box alert-error">
          <AlertTriangle size={18} />
          <span>{error}</span>
        </div>
      )}

      <div className="detail-layout">
        {/* Form Column */}
        <div className="glass-card">
          <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {t('submitForm.grievanceForm')}
          </h3>
          <form onSubmit={handleSubmit}>
            {/* 1. Complaint Title with Integrated Voice Input Controls */}
            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <label htmlFor="title" style={{ margin: 0, fontWeight: 600 }}>
                  {t('submitForm.complaintTitle')} <span style={{ color: 'var(--priority-critical)' }}>*</span>
                </label>

                {/* Voice Input Controls beside Complaint Title */}
                <div className="voice-toolbar">
                  {speechSupported ? (
                    !isRecording ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                          <Languages size={14} style={{ color: 'var(--text-muted)' }} />
                          <select
                            id="voice-language-select"
                            aria-label="Voice Input Language"
                            className="voice-lang-select"
                            value={voiceLang}
                            onChange={(e) => setVoiceLang(e.target.value)}
                            title="Select language for speech recognition"
                          >
                            <option value="en-IN">English (India)</option>
                            <option value="ta-IN">தமிழ் / Tamil (India)</option>
                          </select>
                        </div>

                        <button
                          type="button"
                          className="voice-btn-record"
                          onClick={startSpeechRecognition}
                          title={title ? `Click to re-record complaint in ${voiceLang === 'ta-IN' ? 'Tamil' : 'English'} (erases previous text)` : `Click to speak complaint in ${voiceLang === 'ta-IN' ? 'Tamil' : 'English'}`}
                        >
                          <Mic size={14} />
                          <span>{title ? t('submitForm.reRecord') : t('submitForm.voiceInput')}</span>
                        </button>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div className="voice-recording-badge">
                          <span className="voice-recording-dot"></span>
                          <span>{t('submitForm.listening')} ({voiceLang === 'ta-IN' ? 'Tamil' : 'English'})...</span>
                        </div>

                        <button
                          type="button"
                          className="voice-btn-stop"
                          onClick={stopSpeechRecognition}
                          title="Stop recording and auto-populate Category & Description"
                        >
                          <Square size={12} fill="currentColor" />
                          <span>{t('submitForm.stop')}</span>
                        </button>

                        <button
                          type="button"
                          className="voice-btn-cancel"
                          onClick={cancelSpeechRecognition}
                          title="Cancel voice recording"
                        >
                          <XCircle size={14} />
                          <span>{t('submitForm.cancelVoice')}</span>
                        </button>
                      </div>
                    )
                  ) : (
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }} title="Web Speech API not supported in this browser">
                      🎙️ Voice input unavailable in this browser (type manually)
                    </span>
                  )}
                </div>
              </div>

              {/* Speech Recognition Error Banner */}
              {speechError && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '0.5rem',
                  padding: '0.5rem 0.75rem',
                  marginBottom: '0.5rem',
                  borderRadius: '6px',
                  background: 'rgba(239, 68, 68, 0.12)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  color: '#f87171',
                  fontSize: '0.8rem'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <AlertCircle size={15} style={{ flexShrink: 0 }} />
                    <span>{speechError}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSpeechError('')}
                    style={{ background: 'transparent', border: 'none', color: '#f87171', cursor: 'pointer', padding: '2px', display: 'flex', alignItems: 'center' }}
                    title="Dismiss notification"
                  >
                    <XCircle size={14} />
                  </button>
                </div>
              )}

              {/* Active Recording Banner */}
              {isRecording && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.45rem 0.75rem',
                  marginBottom: '0.5rem',
                  borderRadius: '6px',
                  background: 'rgba(59, 130, 246, 0.1)',
                  border: '1px solid rgba(59, 130, 246, 0.3)',
                  color: '#93c5fd',
                  fontSize: '0.8rem'
                }}>
                  <span className="voice-recording-dot"></span>
                  <span>
                    Microphone active: Speak your complaint in <strong>{voiceLang === 'ta-IN' ? 'Tamil (தமிழ்)' : 'English'}</strong>. Your spoken words will populate the Title, and AI will automatically identify the Category and generate the Detailed Description. Click <strong>Stop</strong> when finished.
                  </span>
                </div>
              )}

              {/* Auto-Populating Status Banner */}
              {autoPopulating && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.45rem 0.75rem',
                  marginBottom: '0.5rem',
                  borderRadius: '6px',
                  background: 'rgba(6, 182, 212, 0.12)',
                  border: '1px solid rgba(6, 182, 212, 0.3)',
                  color: 'var(--accent-cyan)',
                  fontSize: '0.8rem'
                }}>
                  <Sparkles size={15} />
                  <span>AI analyzing spoken complaint: Identifying Category and generating Detailed Description...</span>
                </div>
              )}

              <input
                type="text"
                id="title"
                className="form-control"
                placeholder={
                  isRecording
                    ? `Listening for ${voiceLang === 'ta-IN' ? 'Tamil' : 'English'} speech... Speak your complaint now.`
                    : "Brief summary of the issue (e.g. Wi-Fi down in library, hostel water shortage)"
                }
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                style={isRecording ? { borderColor: 'rgba(239, 68, 68, 0.5)', boxShadow: '0 0 10px rgba(239, 68, 68, 0.15)' } : {}}
              />
              <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                Tip: Speak in English or Tamil. Your voice populates the title, identifies the category, and generates the description automatically.
              </p>
            </div>

            {/* 2. Category Dropdown (Auto-Identified by AI, Editable by Student) */}
            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                <label htmlFor="category" style={{ margin: 0, fontWeight: 600 }}>
                  {t('submitForm.category')} <span style={{ color: 'var(--priority-critical)' }}>*</span>
                </label>
                {autoPopulating && (
                  <span style={{ fontSize: '0.75rem', color: 'var(--accent-cyan)' }}>
                    {language === 'ta' ? 'பிரிவு கண்டறியப்படுகிறது...' : 'Auto-identifying category...'}
                  </span>
                )}
              </div>
              <select
                id="category"
                className="form-control"
                value={category}
                onChange={(e) => {
                  const newCat = e.target.value;
                  setCategory(newCat);
                  if (description.length >= 8) {
                    triggerAIAnalysis(description, newCat);
                  }
                }}
                required
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat}>{t(`categories.${cat}`, cat)}</option>
                ))}
              </select>
            </div>

            {/* Canteen Dish Issue Specific Fields */}
            {category === 'Canteen Dish Issue' && (
              <div style={{ 
                padding: '1.25rem', 
                background: 'rgba(234, 179, 8, 0.04)', 
                border: '1px solid rgba(234, 179, 8, 0.3)', 
                borderRadius: '8px', 
                marginBottom: '1.5rem' 
              }}>
                <h4 style={{ color: '#eab308', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.95rem' }}>
                  <FileText size={18} /> Canteen & Food Quality Inspection Details
                </h4>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label style={{ fontSize: '0.8rem' }}>Canteen / Mess Location *</label>
                    <select
                      className="form-control"
                      value={canteenLocation}
                      onChange={(e) => setCanteenLocation(e.target.value)}
                      required={category === 'Canteen Dish Issue'}
                    >
                      <option value="Block A Canteen">Block A Main Canteen</option>
                      <option value="Block B Snacks Bar">Block B Snacks Bar</option>
                      <option value="Hostel Boys Mess">Hostel Boys Mess</option>
                      <option value="Hostel Girls Mess">Hostel Girls Mess</option>
                      <option value="Central Food Court">Central Food Court</option>
                      <option value="Library Cafe">Library Cafe</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label style={{ fontSize: '0.8rem' }}>Dish / Food Item Name *</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. Chicken Biryani, Paneer Butter Masala, Tea"
                      value={dishName}
                      onChange={(e) => setDishName(e.target.value)}
                      required={category === 'Canteen Dish Issue'}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem', marginTop: '0.5rem' }}>
                  <div className="form-group">
                    <label style={{ fontSize: '0.8rem' }}>Primary Issue Type *</label>
                    <select
                      className="form-control"
                      value={issueType}
                      onChange={(e) => {
                        const newType = e.target.value;
                        setIssueType(newType);
                        if (description.length >= 10) {
                          api.analyzeText(description, undefined, newType).then(res => setAiPreview(res)).catch(() => {});
                        }
                      }}
                    >
                      <option value="QUALITY">Poor Quality / Taste</option>
                      <option value="HYGIENE">Hygiene / Sanitation Concern (HIGH Priority)</option>
                      <option value="FOREIGN_OBJECT">Foreign Object / Contamination (CRITICAL Priority)</option>
                      <option value="PRICING">Overpricing / Bill Discrepancy</option>
                      <option value="AVAILABILITY">Item Unavailable Despite Menu</option>
                      <option value="OTHER">Other Food Issue</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label style={{ fontSize: '0.8rem' }}>Meal Time</label>
                    <select
                      className="form-control"
                      value={mealTime}
                      onChange={(e) => setMealTime(e.target.value)}
                    >
                      <option value="Breakfast">Breakfast</option>
                      <option value="Lunch">Lunch</option>
                      <option value="Snacks">Snacks</option>
                      <option value="Dinner">Dinner</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label style={{ fontSize: '0.8rem' }}>Dish Photo / Attachment Link</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. dish_photo.jpg or image URL"
                      value={dishPhoto}
                      onChange={(e) => setDishPhoto(e.target.value)}
                    />
                  </div>
                </div>

                {(issueType === 'FOREIGN_OBJECT' || issueType === 'HYGIENE') && (
                  <div style={{ marginTop: '0.5rem', padding: '0.65rem 0.85rem', background: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '6px', color: '#f87171', fontSize: '0.8rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <span>🛡️ Health Safety Override Active: Food safety issues trigger automatic HIGH or CRITICAL priority escalation.</span>
                  </div>
                )}
              </div>
            )}

            <div className="form-group">
              <label htmlFor="location">{t('submitForm.location')}</label>
              <input
                type="text"
                id="location"
                className="form-control"
                placeholder={t('submitForm.locationPlaceholder')}
                value={locationName}
                onChange={(e) => setLocationName(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label htmlFor="attachment">{t('submitForm.attachment')}</label>
              <input
                type="text"
                id="attachment"
                className="form-control"
                placeholder={t('submitForm.attachmentPlaceholder')}
                value={attachment}
                onChange={(e) => setAttachment(e.target.value)}
              />
            </div>

            {/* 3. Detailed Description (Auto-Populated from Voice, Fully Editable) */}
            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <label htmlFor="description" style={{ margin: 0, fontWeight: 600 }}>
                  {t('submitForm.detailedDescription')} <span style={{ color: 'var(--priority-critical)' }}>*</span>
                </label>
                {autoPopulating && (
                  <span style={{ fontSize: '0.75rem', color: 'var(--accent-cyan)' }}>
                    {language === 'ta' ? 'விளக்கம் உருவாக்கப்படுகிறது...' : 'Generating description...'}
                  </span>
                )}
              </div>

              <textarea
                id="description"
                className="form-control"
                rows="6"
                placeholder={t('submitForm.descriptionPlaceholder')}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                onBlur={() => triggerAIAnalysis()}
                required
              />
              <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '0.25rem', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap' }}>
                <span>{t('submitForm.descriptionTip')}</span>
              </p>
            </div>

            {/* Novelty 3: Real-Time Duplicate & Recurring-Issue Warning */}
            {checkingDuplicates && (
              <div style={{ fontSize: '0.8rem', color: 'var(--accent-cyan)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span>🔍 Checking for similar complaints in your department/hostel...</span>
              </div>
            )}

            {duplicateWarning && duplicateWarning.length > 0 && (
              <div style={{
                background: 'rgba(245, 158, 11, 0.08)',
                border: '1px solid rgba(245, 158, 11, 0.4)',
                borderRadius: '10px',
                padding: '1.2rem',
                marginBottom: '1.5rem',
                boxShadow: '0 4px 20px rgba(245, 158, 11, 0.1)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: '#fbbf24', fontWeight: 700, marginBottom: '0.5rem' }}>
                  <AlertTriangle size={19} />
                  <span>Similar Grievance Already Reported</span>
                  <span style={{ fontSize: '0.7rem', background: 'rgba(245, 158, 11, 0.25)', color: '#fde68a', padding: '2px 8px', borderRadius: '12px', marginLeft: 'auto', fontWeight: 600 }}>
                    Novelty 3: Duplicate Clustering
                  </span>
                </div>
                <p style={{ fontSize: '0.84rem', color: '#cbd5e1', marginBottom: '0.9rem', lineHeight: '1.45' }}>
                  A similar issue has already been reported. You can <strong>endorse ("Me Too")</strong> the existing complaint to automatically boost its priority without creating duplicate queue clutter:
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {duplicateWarning.map(dup => (
                    <div key={dup.id} style={{
                      background: 'rgba(15, 23, 42, 0.75)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '8px',
                      padding: '0.85rem 1rem',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: '1rem',
                      flexWrap: 'wrap'
                    }}>
                      <div style={{ flex: '1 1 240px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem', flexWrap: 'wrap' }}>
                          <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.9rem' }}>{dup.title}</span>
                          <span style={{ fontSize: '0.75rem', color: 'var(--accent-cyan)' }}>({dup.complaintId})</span>
                          <span style={{ fontSize: '0.7rem', padding: '1px 6px', background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', borderRadius: '4px', fontWeight: 600 }}>
                            {dup.similarity}% match
                          </span>
                        </div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                          📍 {dup.location} • Status: <strong style={{ color: '#38bdf8' }}>{dup.status}</strong> • Endorsed by: <strong style={{ color: '#fbbf24' }}>{dup.affectedStudentCount} students</strong>
                        </div>
                      </div>

                      <button
                        type="button"
                        className="btn btn-sm"
                        style={{
                          fontSize: '0.8rem',
                          padding: '0.45rem 0.9rem',
                          background: dup.alreadyUpvoted ? 'rgba(16, 185, 129, 0.15)' : 'rgba(56, 189, 248, 0.15)',
                          color: dup.alreadyUpvoted ? '#34d399' : '#38bdf8',
                          border: dup.alreadyUpvoted ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid rgba(56, 189, 248, 0.4)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.4rem',
                          cursor: dup.alreadyUpvoted ? 'default' : 'pointer'
                        }}
                        disabled={dup.alreadyUpvoted || upvotingId === dup.id}
                        onClick={() => handleUpvoteDuplicate(dup.id)}
                      >
                        <ThumbsUp size={14} />
                        {dup.alreadyUpvoted ? '✓ Already Endorsed' : (upvotingId === dup.id ? 'Endorsing...' : 'I Have This Too')}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="form-group">
              <label className="checkbox-group">
                <input
                  type="checkbox"
                  checked={anonymous}
                  onChange={(e) => setAnonymous(e.target.checked)}
                />
                <span>Submit Grievance Anonymously</span>
              </label>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginLeft: '1.6rem', marginTop: '0.1rem' }}>
                If checked, your name and email will be hidden on administration portals.
              </p>
            </div>

            <button 
              type="submit" 
              className="btn btn-blue" 
              style={{ width: '100%', marginTop: '1rem', display: 'flex', justifyContent: 'center', gap: '0.5rem' }} 
              disabled={loading}
            >
              <Send size={18} />
              {loading ? t('submitForm.submittingButton') : t('submitForm.submitButton')}
            </button>
          </form>
        </div>

        {/* AI Preview Column */}
        <div className="detail-sidebar">
          <div className="glass-card" style={{ border: '1px solid rgba(59, 130, 246, 0.25)', position: 'relative' }}>
            <div style={{ position: 'absolute', top: '1rem', right: '1rem', color: 'var(--accent-cyan)' }}>
              <Sparkles size={18} />
            </div>

            <h3 style={{ marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.1rem' }}>
              <Brain size={18} color="var(--accent-cyan)" /> {t('aiAssessment.panelTitle')}
            </h3>

            {aiLoading ? (
              <div style={{ padding: '2rem 0', textAlign: 'center', color: 'var(--text-muted)' }}>
                <p>{language === 'ta' ? 'புகார் உரையை AI ஆய்வு செய்கிறது...' : 'Analyzing complaint text...'}</p>
              </div>
            ) : aiPreview ? (
              <div>
                <div className="detail-meta-item">
                  <div className="detail-meta-label">{t('aiAssessment.calculatedPriority')}</div>
                  <div className="detail-meta-val" style={{ marginTop: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span className={getPriorityBadgeClass(aiPreview.priority)}>
                      {t(`priorities.${aiPreview.priority}`, aiPreview.priority)}
                    </span>
                    {(aiPreview.isFoodSafetyOverride || (category === 'Canteen Dish Issue' && (issueType === 'FOREIGN_OBJECT' || issueType === 'HYGIENE'))) && (
                      <span style={{ fontSize: '0.7rem', padding: '0.15rem 0.45rem', background: 'rgba(239, 68, 68, 0.2)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.4)', borderRadius: '4px', fontWeight: 700 }}>
                        🛡️ {language === 'ta' ? 'உணவு பாதுகாப்பு அவசர முன்னுரிமை' : 'Food Safety Priority Override'}
                      </span>
                    )}
                  </div>
                </div>

                <div className="detail-meta-item">
                  <div className="detail-meta-label">{t('aiAssessment.urgencyScore')}</div>
                  <div className="detail-meta-val" style={{ marginTop: '0.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                      <span>{t('aiAssessment.severityWeight')}:</span>
                      <span>{(aiPreview.score * 100).toFixed(0)}%</span>
                    </div>
                    <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.06)', borderRadius: '4px', overflow: 'hidden' }}>
                      <div 
                        style={{ 
                          width: `${aiPreview.score * 100}%`, 
                          height: '100%', 
                          background: `linear-gradient(to right, var(--accent-blue), var(--priority-${aiPreview.priority.toLowerCase()}))`,
                          transition: 'width 0.4s ease'
                        }}
                      />
                    </div>
                  </div>
                </div>

                <div className="detail-meta-item">
                  <div className="detail-meta-label">{t('aiAssessment.sentiment')}</div>
                  <div className="detail-meta-val" style={{ marginTop: '0.25rem' }}>
                    <span className={getSentimentBadgeClass(aiPreview.sentiment)}>{aiPreview.sentiment}</span>
                  </div>
                </div>

                <div className="detail-meta-item">
                  <div className="detail-meta-label">{t('aiAssessment.assignedDepartment')}</div>
                  <div className="detail-meta-val" style={{ color: 'var(--accent-cyan)', fontSize: '0.95rem', marginTop: '0.15rem' }}>
                    {getTargetDepartment(category)}
                  </div>
                </div>

                <div className="detail-meta-item" style={{ borderStyle: 'dashed' }}>
                  <div className="detail-meta-label">
                    {language === 'ta' ? 'AI பகுப்பாய்வு விளக்கம்' : 'AI Logic Explanation'}
                  </div>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.25rem', lineHeight: '1.4' }}>
                    {aiPreview.reason}
                  </p>
                </div>
              </div>
            ) : (
              <div className="empty-state" style={{ padding: '2rem 1rem' }}>
                <Brain size={36} style={{ opacity: 0.15, marginBottom: '0.5rem' }} />
                <p style={{ fontSize: '0.85rem' }}>
                  {language === 'ta' 
                    ? 'புகாரின் தலைப்பில் பேசவும் அல்லது தட்டச்சு செய்யவும். AI தானாகவே பிரிவு, விரிவான விளக்கம் மற்றும் முன்னுரிமையை பகுப்பாய்வு செய்யும்.'
                    : 'Speak or type in Complaint Title to see automatic Category, Description, and live AI priority assessment.'}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SubmitComplaint;
