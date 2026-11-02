const Complaint = require('../models/Complaint');
const User = require('../models/User');
const Officer = require('../models/Officer');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Generate JWT Token
const generateToken = (user) => {
  return jwt.sign(
    { id: user._id, role: user.role, name: user.name, email: user.email },
    process.env.JWT_SECRET || 'scgrs_super_secret_jwt_key_2026',
    { expiresIn: '30d' }
  );
};

// Register User
exports.register = async (req, res) => {
  try {
    const { name, email, password, role, department, phone, rollNumber } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email, and password are required.' });
    }

    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        message: 'MongoDB database is not connected. Please ensure MongoDB is running locally or configure a MongoDB Atlas cloud URI in backend/.env.'
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
    if (existingUser) {
      return res.status(400).json({ message: 'User already registered with this email.' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user
    const newUser = new User({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      role: role || 'student',
      department: department || (role === 'admin' ? 'General Administration' : null),
      phone: phone || '',
      rollNumber: rollNumber || '',
      isActive: true
    });

    await newUser.save();

    // Create token
    const token = generateToken(newUser);

    res.status(201).json({
      token,
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        department: newUser.department,
        phone: newUser.phone,
        rollNumber: newUser.rollNumber
      }
    });
  } catch (error) {
    console.error('Registration Error:', error.message);
    const msg = mongoose.connection.readyState !== 1
      ? 'MongoDB database is not running. Please start MongoDB or provide a MongoDB Atlas cloud connection string in backend/.env.'
      : (error.message || 'Error in user registration.');
    res.status(500).json({ message: msg, error: error.message });
  }
};

// Login User
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check user exists
    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials.' });
    }

    if (user.isActive === false) {
      return res.status(403).json({ message: 'Your account has been deactivated by campus administration. Please contact the administrator.' });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials.' });
    }

    // Create token
    const token = generateToken(user);

    res.status(200).json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
        phone: user.phone || '',
        rollNumber: user.rollNumber || ''
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Error in user login.', error: error.message });
  }
};

// Get current user info
exports.getCurrentUser = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }
    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching user profile.', error: error.message });
  }
};

// Seed demo users (run on startup)
exports.seedDemoUsers = async () => {
  try {
    const studentEmail = 'student@scgrs.com';
    const adminEmail = 'admin@scgrs.com';

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('password123', salt);

    // Seed student
    const hasStudent = await User.findOne({ email: studentEmail });
    if (!hasStudent) {
      const student = new User({
        name: 'Demo Student',
        email: studentEmail,
        password: hashedPassword,
        role: 'student',
        department: 'Computer Science & Engineering',
        rollNumber: 'CS2026-042',
        phone: '+91 98765 12345',
        isActive: true
      });
      await student.save();
      console.log('Demo Student account seeded successfully.');
    }

    // Seed admin
    const hasAdmin = await User.findOne({ email: adminEmail });
    if (!hasAdmin) {
      const admin = new User({
        name: 'Demo Administrator',
        email: adminEmail,
        password: hashedPassword,
        role: 'admin',
        department: 'General Administration',
        phone: '+91 99999 00000',
        isActive: true
      });
      await admin.save();
      console.log('Demo Admin account seeded successfully.');
    }
  } catch (error) {
    console.error('Error seeding demo accounts:', error.message);
  }
};

// ── Module 6: User Management Endpoints ─────────────────────────────────────

// GET /api/auth/users — list all users with stats & KPIs
exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });

    const usersWithStats = await Promise.all(users.map(async (u) => {
      const complaintCount = await Complaint.countDocuments({ studentId: u._id });
      return {
        ...u.toObject(),
        complaintCount,
        isActive: u.isActive !== false
      };
    }));

    // Compute KPIs
    const totalUsers = usersWithStats.length;
    const totalStudents = usersWithStats.filter(u => u.role === 'student').length;
    const totalOfficers = usersWithStats.filter(u => u.role === 'officer').length;
    const totalAdmins = usersWithStats.filter(u => u.role === 'admin').length;
    const activeAccounts = usersWithStats.filter(u => u.isActive).length;
    const inactiveAccounts = totalUsers - activeAccounts;

    const kpis = {
      totalUsers,
      totalStudents,
      totalOfficers,
      totalAdmins,
      activeAccounts,
      inactiveAccounts
    };

    res.status(200).json({
      users: usersWithStats,
      kpis
    });
  } catch (err) {
    res.status(500).json({ message: 'Error retrieving users', error: err.message });
  }
};

// POST /api/auth/users — Admin creates a new user account
exports.createUser = async (req, res) => {
  try {
    const { name, email, password, role, department, phone, rollNumber } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email, and initial password are required.' });
    }

    const cleanEmail = email.toLowerCase().trim();
    const existing = await User.findOne({ email: cleanEmail });
    if (existing) {
      return res.status(400).json({ message: `A user account with email ${cleanEmail} already exists.` });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = new User({
      name: name.trim(),
      email: cleanEmail,
      password: hashedPassword,
      role: role || 'student',
      department: department || (role === 'admin' ? 'General Administration' : ''),
      phone: phone || '',
      rollNumber: rollNumber || '',
      isActive: true
    });
    await user.save();

    // If role is officer, also create or sync Officer profile
    if (role === 'officer' && department) {
      const existingOfficer = await Officer.findOne({ email: cleanEmail });
      if (!existingOfficer) {
        await Officer.create({
          name: name.trim(),
          department,
          role: 'Department Officer',
          contact: phone || '',
          email: cleanEmail,
          isActive: true
        });
      }
    }

    res.status(201).json({
      message: `User ${user.name} created successfully!`,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
        phone: user.phone,
        rollNumber: user.rollNumber,
        isActive: user.isActive,
        createdAt: user.createdAt
      }
    });
  } catch (err) {
    res.status(500).json({ message: 'Error creating user', error: err.message });
  }
};

// PUT /api/auth/users/:id — Admin updates user details
exports.updateUserDetails = async (req, res) => {
  try {
    const { name, email, role, department, phone, rollNumber, isActive } = req.body;

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found.' });

    // Protect primary admin from role demotion or deactivation
    if (user.email === 'admin@scgrs.com') {
      if (role && role !== 'admin') {
        return res.status(400).json({ message: 'Primary Demo Admin role cannot be demoted.' });
      }
      if (isActive === false) {
        return res.status(400).json({ message: 'Primary Demo Admin cannot be deactivated.' });
      }
    }

    // Check if this is the last admin
    if (user.role === 'admin' && (role && role !== 'admin' || isActive === false)) {
      const activeAdminCount = await User.countDocuments({ role: 'admin', isActive: true });
      if (activeAdminCount <= 1) {
        return res.status(400).json({ message: 'Operation blocked: You cannot demote or deactivate the last active administrator.' });
      }
    }

    // If email is changing, verify uniqueness
    if (email && email.toLowerCase().trim() !== user.email) {
      const cleanEmail = email.toLowerCase().trim();
      const duplicate = await User.findOne({ email: cleanEmail, _id: { $ne: user._id } });
      if (duplicate) {
        return res.status(400).json({ message: `Email ${cleanEmail} is already taken by another account.` });
      }
      user.email = cleanEmail;
    }

    if (name) user.name = name.trim();
    if (role && ['student', 'officer', 'admin'].includes(role)) user.role = role;
    if (department !== undefined) user.department = department;
    if (phone !== undefined) user.phone = phone;
    if (rollNumber !== undefined) user.rollNumber = rollNumber;
    if (isActive !== undefined) user.isActive = isActive;

    await user.save();

    res.status(200).json({
      message: `User ${user.name} updated successfully.`,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
        phone: user.phone,
        rollNumber: user.rollNumber,
        isActive: user.isActive
      }
    });
  } catch (err) {
    res.status(500).json({ message: 'Error updating user details', error: err.message });
  }
};

// PUT /api/auth/users/:id/status — Toggle user activation status (activate / deactivate)
exports.toggleUserStatus = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found.' });

    // Protect demo admin from accidental deactivation
    if (user.email === 'admin@scgrs.com') {
      return res.status(400).json({ message: 'Primary Demo Admin account cannot be deactivated.' });
    }

    // Protect last active administrator
    if (user.role === 'admin' && user.isActive) {
      const activeAdminCount = await User.countDocuments({ role: 'admin', isActive: true });
      if (activeAdminCount <= 1) {
        return res.status(400).json({ message: 'Cannot deactivate the last active administrator in the system.' });
      }
    }

    user.isActive = user.isActive === false ? true : false;
    await user.save();

    res.status(200).json({
      message: `User ${user.name} is now ${user.isActive ? 'Active' : 'Deactivated'}.`,
      user: { id: user._id, name: user.name, email: user.email, role: user.role, isActive: user.isActive }
    });
  } catch (err) {
    res.status(500).json({ message: 'Error toggling user status', error: err.message });
  }
};

// PUT /api/auth/users/:id/role — Update user role & department
exports.updateUserRole = async (req, res) => {
  try {
    const { role, department } = req.body;
    if (!['student', 'officer', 'admin'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role. Must be student, officer, or admin.' });
    }
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found.' });

    if (user.email === 'admin@scgrs.com' && role !== 'admin') {
      return res.status(400).json({ message: 'Cannot change the role of the primary demo administrator.' });
    }

    if (user.role === 'admin' && role !== 'admin') {
      const activeAdminCount = await User.countDocuments({ role: 'admin', isActive: true });
      if (activeAdminCount <= 1) {
        return res.status(400).json({ message: 'Cannot demote the last remaining administrator.' });
      }
    }

    user.role = role;
    if (department !== undefined) user.department = department;
    await user.save();

    res.status(200).json({
      message: `User role updated to ${role}.`,
      user: { id: user._id, name: user.name, email: user.email, role: user.role, department: user.department }
    });
  } catch (err) {
    res.status(500).json({ message: 'Error updating user role', error: err.message });
  }
};

// DELETE /api/auth/users/:id — Safe deletion of user
exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found.' });

    // Primary demo admin protection
    if (user.email === 'admin@scgrs.com') {
      return res.status(400).json({ message: 'The primary Demo Administrator account cannot be deleted.' });
    }

    // Last admin protection
    if (user.role === 'admin') {
      const activeAdminCount = await User.countDocuments({ role: 'admin' });
      if (activeAdminCount <= 1) {
        return res.status(400).json({ message: 'Cannot delete the only remaining administrator account.' });
      }
    }

    // Safe deletion: Check if user has filed complaints
    const complaintsFiled = await Complaint.countDocuments({ studentId: user._id });
    if (complaintsFiled > 0) {
      return res.status(400).json({
        message: `Cannot permanently delete user "${user.name}". This account has ${complaintsFiled} grievance submission(s) on file. Please DEACTIVATE the user instead to preserve campus grievance records and institutional accountability.`
      });
    }

    await User.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: `User account "${user.name}" (${user.email}) deleted successfully.` });
  } catch (err) {
    res.status(500).json({ message: 'Error deleting user', error: err.message });
  }
};
