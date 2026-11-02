const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const { verifyToken, isAdmin } = require('../middleware/auth');

// Module 8: Admin Notification Management routes
router.get('/all', verifyToken, isAdmin, notificationController.getAllNotificationsAdmin);
router.post('/broadcast', verifyToken, isAdmin, notificationController.broadcastAnnouncement);

// User notification routes
router.get('/', verifyToken, notificationController.getUserNotifications);
router.put('/:id/read', verifyToken, notificationController.markAsRead);
router.put('/read-all', verifyToken, notificationController.markAllAsRead);

module.exports = router;
