const express = require('express');
const router = express.Router();
const complaintController = require('../controllers/complaintController');
const { verifyToken, isStudent, isAdmin } = require('../middleware/auth');
const axios = require('axios');

// IMPORTANT: Static/named routes must be defined BEFORE wildcard /:id routes
// Otherwise Express matches 'ai' or 'student' as a complaint ID.

// Student stats (must come before /:id routes)
router.get('/student/stats', verifyToken, isStudent, complaintController.getStudentStatistics);

// AI text analysis proxy (must come before /:id routes)
router.post('/ai/analyze', verifyToken, async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) {
      return res.status(400).json({ message: 'Text is required.' });
    }

    try {
      const aiResponse = await axios.post(
        `${process.env.AI_SERVICE_URL || 'http://127.0.0.1:5000'}/api/ai/analyze`,
        { text },
        { timeout: 4000 }
      );
      return res.status(200).json(aiResponse.data);
    } catch (aiError) {
      console.warn('AI Service is offline, running local fallback analysis.', aiError.message);

      // Local JS fallback (mirrors priority_engine.py logic)
      const lowercaseText = text.toLowerCase();
      const KEYWORD_WEIGHTS = [
        { word: "harassment", weight: 40 }, { word: "ragging", weight: 40 }, { word: "threat", weight: 40 },
        { word: "violence", weight: 40 }, { word: "assault", weight: 40 }, { word: "emergency", weight: 40 },
        { word: "bully", weight: 35 }, { word: "abuse", weight: 40 }, { word: "suicidal", weight: 40 },
        { word: "cockroach", weight: 40 }, { word: "foreign object", weight: 40 }, { word: "fire", weight: 40 },
        { word: "poison", weight: 40 }, { word: "poisoning", weight: 40 }, { word: "poisoned", weight: 40 },
        { word: "poisonous", weight: 40 }, { word: "toxic", weight: 40 }, { word: "contamination", weight: 40 },
        { word: "exam issue", weight: 25 }, { word: "exam", weight: 25 }, { word: "fees", weight: 25 },
        { word: "hygiene", weight: 25 }, { word: "stale food", weight: 25 }, { word: "food poisoning", weight: 40 },
        { word: "repeated", weight: 15 }, { word: "water problem", weight: 15 }, { word: "wifi", weight: 15 },
        { word: "speed", weight: 15 }, { word: "canteen", weight: 15 }, { word: "bus", weight: 15 },
        { word: "fan", weight: 10 }, { word: "light", weight: 10 }, { word: "cleanliness", weight: 10 }
      ];

      let totalScore = 0;
      const matchedKeywords = [];
      const seen = new Set();
      for (const item of KEYWORD_WEIGHTS) {
        if (lowercaseText.includes(item.word) && !seen.has(item.word)) {
          seen.add(item.word);
          totalScore += item.weight;
          matchedKeywords.push(`${item.word} (+${item.weight})`);
        }
      }

      const negWords = ["not", "bad", "worst", "broken", "terrible", "unsafe", "scared", "afraid", "harassed", "fail", "delay", "poor", "unhappy", "angry", "frustrated"];
      const negCount = negWords.filter(w => lowercaseText.includes(w)).length;
      const sentiment = negCount > 0 ? "NEGATIVE" : "NEUTRAL";
      if (sentiment === "NEGATIVE" && totalScore > 0) totalScore += 10;
      if (matchedKeywords.length === 0) totalScore = 5;

      let priority = "LOW";
      let confidencePercent = 30;
      if (totalScore >= 80) {
        priority = "CRITICAL";
        confidencePercent = Math.min(98, Math.max(88, Math.round(88 + ((totalScore - 80) / 40) * 10)));
      } else if (totalScore >= 60) {
        priority = "HIGH";
        confidencePercent = Math.min(87, Math.max(76, Math.round(76 + ((totalScore - 60) / 20) * 11)));
      } else if (totalScore >= 40) {
        priority = "MEDIUM";
        confidencePercent = Math.min(75, Math.max(62, Math.round(62 + ((totalScore - 40) / 20) * 13)));
      } else {
        confidencePercent = totalScore > 0 ? Math.min(60, Math.max(45, Math.round(45 + (totalScore / 40) * 15))) : 30;
      }
      // Food Safety Critical Override Guard
      const isSeriousFood = /poison|cockroach|foreign object|toxic|contaminat/i.test(lowercaseText);
      if (isSeriousFood) {
        priority = "CRITICAL";
        confidencePercent = Math.max(confidencePercent, 94);
      }

      const reason = matchedKeywords.length > 0
        ? `Matched keywords: ${matchedKeywords.join(', ')}.`
        : `General context detected.`;

      return res.status(200).json({
        priority,
        score: Math.round(confidencePercent) / 100,
        confidencePercent,
        matchedKeywords,
        sentiment,
        reason: `${confidencePercent}% — ${priority} — ${reason}`
      });
    }
  } catch (error) {
    res.status(500).json({ message: 'AI Analysis proxy failed.', error: error.message });
  }
});

// Campus speech phonetic normalizer for voice requests
const normalizeCampusSpeech = (text) => {
  if (!text || typeof text !== 'string') return text || '';
  let s = text;
  s = s.replace(/\b(college|campus|hostel|room|library|department|block|lab|class)\s+wife\b/gi, '$1 Wi-Fi');
  s = s.replace(/\bthe\s+wife\s+(is|not|down|slow|working|broken)\b/gi, 'the Wi-Fi $1');
  s = s.replace(/\bwife\s+(is|not|down|slow|speed|issue|problem|connection|network|signal|password|router|connectivity|working)\b/gi, 'Wi-Fi $1');
  s = s.replace(/\b(connect\s+to|connect|fix\s+the|access\s+the)\s+wife\b/gi, '$1 Wi-Fi');
  s = s.replace(/\bwife\b(?=.*\b(working|signal|router|internet|slow|speed|connect|network|password|down|frequency|connectivity|modem|lan)\b)/gi, 'Wi-Fi');
  s = s.replace(/\b(wi\s*fi|why\s*fi|why-fi|y\s*fi|waif|white\s*fi|why\s*fight)\b/gi, 'Wi-Fi');
  s = s.replace(/\b(college|hostel|campus|boys|girls|block\s+[a-z0-9]+)\s+(mens|men\'s|mesh|mass)\b/gi, '$1 mess');
  s = s.replace(/\b(mens|men\'s|mesh)\s+(food|dish|meal|lunch|dinner|breakfast|canteen|hygiene|taste|quality|timing|menu|hall|cleanliness|cook|caterer|worker|tea|snack|tiffin)\b/gi, 'mess $2');
  s = s.replace(/\b(in|at|to)\s+(the\s+)?(mens|men\'s|mesh)\b/gi, '$1 $2mess');
  s = s.replace(/\b(mens|men\'s)\s+(is|was|has|are|food)\b/gi, 'mess $2');
  s = s.replace(/\b(mens|men\'s)\b/gi, 'mess');
  s = s.replace(/\bcan\s+teen\b/gi, 'canteen');
  s = s.replace(/\bcanteen\s+this\b/gi, 'canteen dish');
  s = s.replace(/\bcontain\s+food\b/gi, 'canteen food');
  s = s.replace(/\b(computer|chemistry|physics|mechanical|electrical|cad|programming|coding|science|hardware|software|networking)\s+lap\b/gi, '$1 lab');
  s = s.replace(/\b(arrow|our|arvo|ar\s*o|r\s*o)\s+water\b/gi, 'RO water');
  s = s.replace(/\b(gyser|gezer|gazer|geaser|gezar)\b/gi, 'geyser');
  s = s.replace(/\bwash\s+basin\b/gi, 'washbasin');
  s = s.replace(/\btube\s+light\b/gi, 'tubelight');
  s = s.replace(/\bwater\s+purifire\b/gi, 'water purifier');
  s = s.replace(/\b(all|whole)\s+ticket\b/gi, 'hall ticket');
  s = s.replace(/\bsemister\b/gi, 'semester');
  s = s.replace(/\b(meet|talk\s+to|inform)\s+hot\b/gi, '$1 HOD');
  s = s.replace(/\b(rag\s+in|ranking)\s+(in|at|by|the)\b/gi, 'ragging $2');
  s = s.replace(/\b(herasment|harasment|herassment)\b/gi, 'harassment');
  return s;
};

// Voice complaint processing proxy (Category detection & Description expansion)
router.post('/ai/voice-process', verifyToken, async (req, res) => {
  try {
    const rawText = req.body.text;
    const lang = req.body.lang || 'en-IN';
    if (!rawText) {
      return res.status(400).json({ message: 'Spoken text is required.' });
    }
    const text = normalizeCampusSpeech(rawText);

    try {
      const aiResponse = await axios.post(
        `${process.env.AI_SERVICE_URL || 'http://127.0.0.1:5000'}/api/ai/voice-process`,
        { text, lang },
        { timeout: 4000 }
      );
      return res.status(200).json(aiResponse.data);
    } catch (aiError) {
      console.warn('AI Service voice-process offline, running local fallback.', aiError.message);

      // Local fallback for Category detection and Description expansion
      const clean = text.toLowerCase();
      let category = 'Other';

      if (/canteen|mess|food|dish|biryani|tea|hygiene|taste|உணவு|சாப்பாடு|கேண்டீன்|மெஸ்/.test(clean)) {
        category = 'Canteen Dish Issue';
      } else if (/wifi|wi-fi|wi fi|why fi|internet|speed|network|router|வைஃபை|இணையம்|நெட்/.test(clean)) {
        category = 'Internet/Wi-Fi';
      } else if (/bus|transport|driver|route|shuttle|பேருந்து|பஸ்/.test(clean)) {
        category = 'Transport';
      } else if (/hostel|room|bed|bathroom|washroom|geyser|விடுதி|தங்குமிடம்|ஹோஸ்டல்|ரூம்/.test(clean)) {
        category = 'Hostel';
      } else if (/fan|light|door|window|leak|water|bench|chair|projector|ac|மின்விசிறி|விளக்கு|மேஜை|ஃபேன்|லைட்|பெஞ்ச்|லிப்ட்/.test(clean)) {
        category = 'Infrastructure';
      } else if (/exam|mark|grade|result|faculty|attendance|syllabus|professor|தேர்வு|மதிப்பெண்|எக்ஸாம்|மார்க்/.test(clean)) {
        category = 'Academic';
      } else if (/ragging|rag|seniors|ராகிங்/.test(clean)) {
        category = 'Ragging';
      } else if (/harass|threat|bully|துன்புறுத்தல்/.test(clean)) {
        category = 'Harassment';
      } else if (/safety|hazard|fire|emergency|பாதுகாப்பு|தீ/.test(clean)) {
        category = 'Safety';
      }

      const isTamil = /[\u0B80-\u0BFF]/.test(text);
      let description = '';

      if (isTamil) {
        description = `புகார் விவரம் (Grievance Description):\n${text}\n\nதுறை மற்றும் தாக்கம் (Department & Impact):\nமேற்குறிப்பிட்ட பிரச்சனை '${category}' பிரிவைச் சார்ந்தது. இது மாணவர்களின் அன்றாட வளாக நடைமுறைகளை பாதிக்கிறது.\n\nகோரிக்கை (Requested Action):\nமாணவர்களின் நலன் கருதி, இப்பிரச்சனையை உடனடியாக ஆய்வு செய்து தகுந்த தீர்வு காணுமாறு கேட்டுக்கொள்கிறேன்.`;
      } else {
        const cleanText = text.trim();
        const capitalized = cleanText ? (cleanText.charAt(0).toUpperCase() + cleanText.slice(1)) : '';
        const sentence = capitalized.endsWith('.') ? capitalized : (capitalized ? capitalized + '.' : '');
        description = `Grievance Summary:\n${sentence}\n\nContext & Impact:\nThe issue described above has been reported under the '${category}' category. This condition is causing disruption to daily campus activities.\n\nRequested Action:\nKindly inspect the reported location/equipment, verify ground conditions, and initiate the necessary corrective measures at the earliest.`;
      }

      return res.status(200).json({
        title: text,
        category,
        description,
        confidence: 0.8
      });
    }
  } catch (error) {
    res.status(500).json({ message: 'Voice processing failed.', error: error.message });
  }
});

// Novelty 3: Real-time duplicate check (must come before /:id)
router.post('/check-duplicate', verifyToken, complaintController.checkDuplicateComplaint);

// Novelty 4: Accountability trail endpoint (must come before /:id)
router.get('/accountability', verifyToken, isAdmin, complaintController.getDepartmentAccountability);

// Reports and Feedback Endpoints for Admin (must come before /:id)
router.get('/reports/executive', verifyToken, isAdmin, complaintController.getExecutiveReports);
router.get('/feedback/all', verifyToken, isAdmin, complaintController.getAllFeedback);

// Root complaint routes
router.post('/', verifyToken, isStudent, complaintController.createComplaint);
router.get('/', verifyToken, complaintController.getComplaints);

// Wildcard /:id routes — must be LAST
router.get('/:id', verifyToken, complaintController.getComplaintById);
router.post('/:id/upvote', verifyToken, isStudent, complaintController.upvoteComplaint);
router.post('/:id/feedback', verifyToken, isStudent, complaintController.submitFeedback);
router.post('/:id/confirm-resolved', verifyToken, isStudent, complaintController.confirmResolved);
router.post('/:id/reopen', verifyToken, isStudent, complaintController.reopenComplaint);
router.put('/:id/status', verifyToken, isAdmin, complaintController.updateStatus);
router.put('/:id/department', verifyToken, isAdmin, complaintController.updateDepartment);
router.put('/:id/assign', verifyToken, isAdmin, complaintController.assignOfficer);
router.put('/:id/notify-officer', verifyToken, isAdmin, complaintController.notifyOfficer);
router.post('/:id/escalate-authority', verifyToken, isAdmin, complaintController.escalateToAuthority);

module.exports = router;
