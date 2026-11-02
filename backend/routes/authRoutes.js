const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { verifyToken, isAdmin } = require('../middleware/auth');

// Public routes
router.post('/register', authController.register);
router.post('/login', authController.login);

// Protected routes
router.get('/me', verifyToken, authController.getCurrentUser);

// Module 6: Admin User Management Routes
router.get('/users', verifyToken, isAdmin, authController.getAllUsers);
router.post('/users', verifyToken, isAdmin, authController.createUser);
router.put('/users/:id', verifyToken, isAdmin, authController.updateUserDetails);
router.put('/users/:id/status', verifyToken, isAdmin, authController.toggleUserStatus);
router.put('/users/:id/role', verifyToken, isAdmin, authController.updateUserRole);
router.delete('/users/:id', verifyToken, isAdmin, authController.deleteUser);

module.exports = router;
