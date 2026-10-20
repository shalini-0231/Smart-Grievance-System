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
        { word: "exam issue", weight: 25 }, { word: "exam", weight: 25 }, { word: "fees", weight: 25 },
        { word: "hygiene", weight: 25 }, { word: "stale food", weight: 25 }, { word: "food poisoning", weight: 35 },
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

// Novelty 3: Real-time duplicate check (must come before /:id)
router.post('/check-duplicate', verifyToken, complaintController.checkDuplicateComplaint);

// Novelty 4: Accountability trail endpoint (must come before /:id)
router.get('/accountability', verifyToken, isAdmin, complaintController.getDepartmentAccountability);

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

module.exports = router;
