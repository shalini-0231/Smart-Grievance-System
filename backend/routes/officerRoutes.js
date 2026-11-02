const express = require('express');
const router = express.Router();
const officerController = require('../controllers/officerController');
const { verifyToken, isAdmin } = require('../middleware/auth');

// ── Module 3: Officer Management Routes ──────────────────────────────────────
router.get('/recommend/:complaintId', verifyToken, isAdmin, officerController.getRecommendedOfficers);
router.get('/', verifyToken, isAdmin, officerController.getAllOfficers);
router.post('/', verifyToken, isAdmin, officerController.createOfficer);
router.put('/:id', verifyToken, isAdmin, officerController.updateOfficer);
router.put('/:id/status', verifyToken, isAdmin, officerController.toggleOfficerStatus);
router.delete('/:id', verifyToken, isAdmin, officerController.deleteOfficer);
router.put('/:id/increment-ticket', verifyToken, isAdmin, officerController.incrementTicket);
router.put('/:id/resolve', verifyToken, officerController.resolveTicket);

module.exports = router;
