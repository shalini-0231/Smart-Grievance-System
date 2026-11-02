import React, { createContext, useContext, useState, useEffect } from 'react';

const LanguageContext = createContext(null);

export const translations = {
  en: {
    // Brand & Common
    systemTitle: 'Smart Campus Grievance Redressal System',
    systemShort: 'SCGRS',
    selectLanguage: 'Choose Language',
    language: 'Language',
    english: 'English',
    tamil: 'தமிழ் (Tamil)',
    loading: 'Loading...',
    submit: 'Submit',
    submitting: 'Submitting...',
    cancel: 'Cancel',
    save: 'Save',
    edit: 'Edit',
    delete: 'Delete',
    back: 'Back',
    actions: 'Actions',
    status: 'Status',
    priority: 'Priority',
    category: 'Category',
    date: 'Date',
    search: 'Search',
    filter: 'Filter',
    view: 'View',
    viewDetails: 'View Details',
    close: 'Close',
    success: 'Success',
    error: 'Error',
    warning: 'Warning',
    required: 'Required',
    optional: 'Optional',
    duplicateAlert: 'Duplicate Grievance Detected',
    takeQuickAction: 'Take Quick Action',

    // Navigation
    nav: {
      home: 'Home',
      dashboard: 'Dashboard',
      myComplaints: 'My Complaints',
      fileGrievance: 'File Grievance',
      adminPanel: 'Admin Panel',
      grievances: 'Grievances',
      analytics: 'Analytics',
      notifications: 'Notifications',
      login: 'Login',
      register: 'Register',
      logout: 'Logout',
      markAllRead: 'Mark all as read',
      noNotifications: 'No notifications yet'
    },

    // Auth / Login / Register
    auth: {
      welcomeBack: 'Welcome Back',
      loginSubtitle: 'Login to file grievances and view progress',
      preferredLanguage: 'Preferred Language / விருப்ப மொழி',
      chooseLanguagePrompt: 'Select your preferred language for the system:',
      emailAddress: 'Email Address',
      password: 'Password',
      signIn: 'Sign In',
      loggingIn: 'Logging in...',
      quickDemo: 'Quick Demo Logins',
      quickDemoDesc: 'Click below to automatically log in to demo accounts:',
      studentAccount: 'Student Account',
      adminAccount: 'Admin Account',
      noAccount: "Don't have an account?",
      registerHere: 'Register here',
      alreadyAccount: 'Already have an account?',
      loginHere: 'Login here',
      createAccount: 'Create an Account',
      registerSubtitle: 'Register with campus credentials to file and monitor grievances',
      fullName: 'Full Name',
      confirmPassword: 'Confirm Password',
      role: 'Account Role',
      student: 'Student',
      admin: 'Administrator',
      registering: 'Registering...',
      loginSuccess: 'Login successful! Welcome back',
      loginFailed: 'Login failed. Please check credentials.'
    },

    // Student Dashboard
    dashboard: {
      welcome: 'Welcome',
      studentPortal: 'Student Grievance Redressal Portal',
      totalGrievances: 'Total Grievances',
      resolved: 'Resolved',
      pending: 'Pending',
      criticalHigh: 'Critical & High Priority',
      quickActions: 'Quick Actions',
      fileNewComplaint: 'File New Grievance',
      fileNewDesc: 'Voice or text entry with automated AI routing & category detection',
      viewAllComplaints: 'View My Complaints',
      viewAllDesc: 'Track progress, SLA targets, and resolution certificates',
      recentGrievances: 'Recent Grievances',
      noGrievancesYet: 'No grievances submitted yet. Need help? File your first grievance now!',
      ticketId: 'Ticket ID',
      title: 'Title',
      slaCountdown: 'SLA Target'
    },

    // Submit Grievance
    submitForm: {
      pageTitle: 'Submit Grievance',
      pageSubtitle: 'Voice-enabled AI assistance identifies category and expands description automatically',
      grievanceForm: 'Grievance Form',
      complaintTitle: 'Complaint Title',
      titlePlaceholder: 'Brief summary of the issue (e.g. Wi-Fi down in library, hostel water shortage)',
      titleRecordingPlaceholder: 'Listening for speech... Speak your complaint now.',
      voiceInput: 'Voice Input',
      reRecord: 'Re-record',
      listening: 'Listening',
      stop: 'Stop',
      cancelVoice: 'Cancel',
      category: 'Category',
      selectCategory: 'Select Category',
      location: 'Location / Building / Room No.',
      locationPlaceholder: 'e.g. Academic Block 1 / Room 204',
      attachment: 'Optional General Attachment',
      attachmentPlaceholder: 'e.g. error_screenshot.png or photo_evidence.jpg',
      detailedDescription: 'Detailed Description',
      descriptionPlaceholder: 'Explain the grievance in detail. Voice input automatically expands here, or you can type and edit manually.',
      descriptionTip: 'You can freely edit the generated description before submitting.',
      submitButton: 'Submit Grievance',
      submittingButton: 'Submitting Grievance...',
      fillAllFields: 'Please fill in all required fields.',
      voiceSuccess: 'Voice captured! Category identified & Detailed Description auto-populated.',
      canteenDishSection: 'Canteen Dish Issue Details',
      canteenLocation: 'Canteen Location',
      dishName: 'Dish Name',
      issueType: 'Issue Type',
      mealTime: 'Meal Time',
      dishPhoto: 'Dish Photo Link',
      healthOverrideNotice: '🛡️ Health Safety Override Active: Food safety issues trigger automatic HIGH or CRITICAL priority escalation.'
    },

    // Live AI Assessment Card
    aiAssessment: {
      panelTitle: 'Live AI Assessment',
      calculatedPriority: 'CALCULATED PRIORITY',
      urgencyScore: 'URGENCY SCORE',
      severityWeight: 'Severity weight',
      sentiment: 'SENTIMENT POLARIZED',
      assignedDepartment: 'AUTOMATIC DEPARTMENT ROUTING',
      safetyOverrideActive: 'Food Safety Emergency Override Active'
    },

    // Categories
    categories: {
      'Academic': 'Academic',
      'Hostel': 'Hostel',
      'Transport': 'Transport',
      'Infrastructure': 'Infrastructure',
      'Internet/Wi-Fi': 'Internet/Wi-Fi',
      'Harassment': 'Harassment',
      'Ragging': 'Ragging',
      'Safety': 'Safety',
      'Canteen Dish Issue': 'Canteen Dish Issue',
      'Other': 'Other'
    },

    // Statuses
    statuses: {
      'SUBMITTED': 'Submitted',
      'UNDER REVIEW': 'Under Review',
      'IN PROGRESS': 'In Progress',
      'RESOLVED': 'Resolved',
      'REOPENED': 'Reopened',
      'ESCALATED': 'Escalated'
    },

    // Priorities
    priorities: {
      'LOW': 'Low',
      'MEDIUM': 'Medium',
      'HIGH': 'High',
      'CRITICAL': 'Critical'
    }
  },

  ta: {
    // Brand & Common
    systemTitle: 'திறன்மிகு வளாக குறைதீர்க்கும் முறைமை',
    systemShort: 'SCGRS',
    selectLanguage: 'மொழியைத் தேர்ந்தெடுக்கவும்',
    language: 'மொழி',
    english: 'English',
    tamil: 'தமிழ் (Tamil)',
    loading: 'ஏற்றுகிறது...',
    submit: 'சமர்ப்பி',
    submitting: 'சமர்ப்பிக்கப்படுகிறது...',
    cancel: 'ரத்து செய்',
    save: 'சேமி',
    edit: 'திருத்து',
    delete: 'நீக்கு',
    back: 'பின்செல்க',
    actions: 'செயல்கள்',
    status: 'நிலை',
    priority: 'முன்னுரிமை',
    category: 'பிரிவு',
    date: 'தேதி',
    search: 'தேடுக',
    filter: 'வடிகட்டுக',
    view: 'காண்க',
    viewDetails: 'விவரங்களைக் காண்க',
    close: 'மூடுக',
    success: 'வெற்றி',
    error: 'பிழை',
    warning: 'எச்சரிக்கை',
    required: 'கட்டாயம்',
    optional: 'விருப்பத்தேர்வு',
    duplicateAlert: 'ஒரே மாதிரியான புகார் கண்டறியப்பட்டது',
    takeQuickAction: 'உடனடி நடவடிக்கை எடுக்கவும்',

    // Navigation
    nav: {
      home: 'முகப்பு',
      dashboard: 'கட்டுப்பாட்டறை',
      myComplaints: 'எனது புகார்கள்',
      fileGrievance: 'புதிய புகார்',
      adminPanel: 'நிர்வாக குழு',
      grievances: 'அனைத்து புகார்கள்',
      analytics: 'பகுப்பாய்வு',
      notifications: 'அறிவிப்புகள்',
      login: 'உள்நுழைக',
      register: 'பதிவு செய்க',
      logout: 'வெளியேறு',
      markAllRead: 'அனைத்தையும் படித்ததாகக் குறி',
      noNotifications: 'புதிய அறிவிப்புகள் இல்லை'
    },

    // Auth / Login / Register
    auth: {
      welcomeBack: 'மீண்டும் வருக',
      loginSubtitle: 'புகார்களைப் பதிவு செய்யவும் நிலையை அறியவும் உள்நுழையவும்',
      preferredLanguage: 'விருப்ப மொழி (Preferred Language)',
      chooseLanguagePrompt: 'கணினிக்கான உங்கள் விருப்ப மொழியைத் தேர்ந்தெடுக்கவும்:',
      emailAddress: 'மின்னஞ்சல் முகவரி',
      password: 'கடவுச்சொல்',
      signIn: 'உள்நுழைக',
      loggingIn: 'உள்நுழைகிறது...',
      quickDemo: 'மாதிரி கணக்குகள் (Demo)',
      quickDemoDesc: 'மாதிரி கணக்குகளுக்கு நேரடியாக நுழைய கீழே கிளிக் செய்யவும்:',
      studentAccount: 'மாணவர் கணக்கு',
      adminAccount: 'நிர்வாகி கணக்கு',
      noAccount: 'கணக்கு இல்லையா?',
      registerHere: 'இங்கே பதிவு செய்க',
      alreadyAccount: 'ஏற்கனவே கணக்கு உள்ளதா?',
      loginHere: 'இங்கே உள்நுழைக',
      createAccount: 'புதிய கணக்கு உருவாக்கு',
      registerSubtitle: 'புகார் அளிக்க கல்லூரி சான்றுகளுடன் பதிவு செய்யவும்',
      fullName: 'முழு பெயர்',
      confirmPassword: 'கடவுச்சொல்லை உறுதிசெய்',
      role: 'பயனர் வகை',
      student: 'மாணவர்',
      admin: 'நிர்வாகி',
      registering: 'பதிவாகிறது...',
      loginSuccess: 'உள்நுழைவு வெற்றிகரமானது! மீண்டும் வருக',
      loginFailed: 'உள்நுழைவு தோல்வியடைந்தது. சான்றுகளைச் சரிபார்க்கவும்.'
    },

    // Student Dashboard
    dashboard: {
      welcome: 'வணக்கம்',
      studentPortal: 'மாணவர் குறைதீர்ப்பு தளம்',
      totalGrievances: 'மொத்த புகார்கள்',
      resolved: 'தீர்க்கப்பட்டவை',
      pending: 'நிலுவையில் உள்ளவை',
      criticalHigh: 'அவசர & உயர் முன்னுரிமை',
      quickActions: 'விரைவு செயல்பாடுகள்',
      fileNewComplaint: 'புதிய புகார் பதிவு செய்',
      fileNewDesc: 'குரல் அல்லது தட்டச்சு வழி AI தானியங்கி பகுப்பு & பிரிவு தேர்வு',
      viewAllComplaints: 'எனது புகார்களைப் பார்க்க',
      viewAllDesc: 'புகார் நிலை, காலக்கெடு மற்றும் தீர்வு சான்றிதழ் விவரங்கள்',
      recentGrievances: 'சமீபத்திய புகார்கள்',
      noGrievancesYet: 'இதுவரை புகார்கள் எதுவும் பதிவு செய்யப்படவில்லை. உதவி தேவையா? உங்கள் முதல் புகாரை இப்போதே பதிவு செய்யுங்கள்!',
      ticketId: 'புகார் எண்',
      title: 'தலைப்பு',
      slaCountdown: 'கெடு இலக்கு (SLA)'
    },

    // Submit Grievance
    submitForm: {
      pageTitle: 'வளாக குறைதீர்ப்பு படிவம்',
      pageSubtitle: 'குரல் வழி உள்ளீடு தானாகவே புகாரின் பிரிவைக் கண்டறிந்து விரிவான விளக்கத்தை உருவாக்குகிறது',
      grievanceForm: 'குறைதீர்ப்பு படிவம்',
      complaintTitle: 'புகாரின் தலைப்பு',
      titlePlaceholder: 'பிரச்சனையின் சுருக்கம் (எ.கா. நூலகத்தில் வைஃபை வேலை செய்யவில்லை, விடுதியில் தண்ணீர் தட்டுப்பாடு)',
      titleRecordingPlaceholder: 'பேச்சை கேட்கிறது... உங்கள் புகாரை இப்போது பேசுங்கள்.',
      voiceInput: 'குரல் பதிவு',
      reRecord: 'மீண்டும் பதிவு',
      listening: 'கேட்கிறது',
      stop: 'நிறுத்து',
      cancelVoice: 'ரத்து செய்',
      category: 'புகார் பிரிவு',
      selectCategory: 'பிரிவைத் தேர்ந்தெடுக்கவும்',
      location: 'இருப்பிடம் / கட்டிடம் / அறை எண்',
      locationPlaceholder: 'எ.கா. கல்வி தொகுதி 1 / அறை 204',
      attachment: 'இணைப்பு ஆவணம் (விருப்பத்தேர்வு)',
      attachmentPlaceholder: 'எ.கா. புகைப்படம் அல்லது சான்று இணைப்பு',
      detailedDescription: 'விரிவான விளக்கம்',
      descriptionPlaceholder: 'குறையை விரிவாக விவரிக்கவும். குரல் வழி உள்ளீடு தானாகவே இங்கே விரிவடையும், அல்லது நீங்கள் தட்டச்சு செய்து திருத்தலாம்.',
      descriptionTip: 'சமர்ப்பிப்பதற்கு முன் உருவாக்கப்பட்ட விளக்கத்தை நீங்கள் விரும்பியவாறு திருத்திக் கொள்ளலாம்.',
      submitButton: 'புகாரைச் சமர்ப்பிக்கவும்',
      submittingButton: 'சமர்ப்பிக்கப்படுகிறது...',
      fillAllFields: 'தேவையான அனைத்து விவரங்களையும் நிரப்பவும்.',
      voiceSuccess: 'குரல் பதிவு முடிந்தது! பிரிவு கண்டறியப்பட்டு விரிவான விளக்கம் தானாக நிரப்பப்பட்டது.',
      canteenDishSection: 'உணவக பிரச்சனை விவரங்கள்',
      canteenLocation: 'உணவக இடம்',
      dishName: 'உணவின் பெயர்',
      issueType: 'பிரச்சனை வகை',
      mealTime: 'உணவு நேரம்',
      dishPhoto: 'புகைப்பட இணைப்பு',
      healthOverrideNotice: '🛡️ சுகாதார பாதுகாப்பு முன்னுரிமை: உணவு பாதுகாப்பு குறைபாடுகள் உடனடியாக உயர் முன்னுரிமையாக மாற்றப்படும்.'
    },

    // Live AI Assessment Card
    aiAssessment: {
      panelTitle: 'நேரடி AI மதிப்பீடு',
      calculatedPriority: 'கணக்கிடப்பட்ட முன்னுரிமை',
      urgencyScore: 'அவசர நிலை மதிப்பீடு',
      severityWeight: 'தீவிரத்தன்மை எடை',
      sentiment: 'உணர்வு நிலை (Sentiment)',
      assignedDepartment: 'ஒதுக்கப்படும் துறை',
      safetyOverrideActive: 'உணவு பாதுகாப்பு அவசர விதிமுறை இயக்கத்தில் உள்ளது'
    },

    // Categories
    categories: {
      'Academic': 'கல்வி சார்ந்தது (Academic)',
      'Hostel': 'விடுதி (Hostel)',
      'Transport': 'போக்குவரத்து (Transport)',
      'Infrastructure': 'உள்கட்டமைப்பு (Infrastructure)',
      'Internet/Wi-Fi': 'இணையம் / வைஃபை (Internet/Wi-Fi)',
      'Harassment': 'துன்புறுத்தல் தடுப்பு (Harassment)',
      'Ragging': 'ராகிங் தடுப்பு (Ragging)',
      'Safety': 'பாதுகாப்பு & அவசரநிலை (Safety)',
      'Canteen Dish Issue': 'உணவகம் / மெஸ் (Canteen Dish Issue)',
      'Other': 'இதர (Other)'
    },

    // Statuses
    statuses: {
      'SUBMITTED': 'சமர்ப்பிக்கப்பட்டது',
      'UNDER REVIEW': 'பரிசீலனையில்',
      'IN PROGRESS': 'செயல்பாட்டில்',
      'RESOLVED': 'தீர்க்கப்பட்டது',
      'REOPENED': 'மீண்டும் திறக்கப்பட்டது',
      'ESCALATED': 'மேல்முறையீடு'
    },

    // Priorities
    priorities: {
      'LOW': 'குறைவு (LOW)',
      'MEDIUM': 'நடுத்தரம் (MEDIUM)',
      'HIGH': 'அதிகம் (HIGH)',
      'CRITICAL': 'மிக அவசரம் (CRITICAL)'
    }
  }
};

export const LanguageProvider = ({ children }) => {
  const [language, setLanguageState] = useState(() => {
    return localStorage.getItem('scgrs_language') || 'en';
  });

  const setLanguage = (lang) => {
    const validLang = lang === 'ta' ? 'ta' : 'en';
    setLanguageState(validLang);
    localStorage.setItem('scgrs_language', validLang);
  };

  // Helper t function: t('nav.home') or t('dashboard.welcome')
  const t = (path, defaultVal = '') => {
    const keys = path.split('.');
    let current = translations[language];
    for (const key of keys) {
      if (current && current[key] !== undefined) {
        current = current[key];
      } else {
        // Fallback to English
        let fallback = translations.en;
        for (const fbKey of keys) {
          if (fallback && fallback[fbKey] !== undefined) {
            fallback = fallback[fbKey];
          } else {
            return defaultVal || path;
          }
        }
        return fallback;
      }
    }
    return current;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, translations: translations[language] }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

