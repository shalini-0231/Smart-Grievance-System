const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;

// Middleware
app.use(cors());
app.use(express.json());

// Connect to MongoDB
const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/scgrs';
mongoose.connect(mongoUri)
  .then(async () => {
    console.log('MongoDB Connected Successfully to:', mongoUri);
    
    // Seed database demo accounts, grievances, and officers
    const authController = require('./controllers/authController');
    const complaintController = require('./controllers/complaintController');
    const officerController = require('./controllers/officerController');
    
    await authController.seedDemoUsers();
    // await complaintController.seedDemoComplaints(); // Disabled so database remains empty for manual entries
    await officerController.seedDemoOfficers();

    // Run initial SLA & resolution expiry check
    await complaintController.runAutomatedSLAChecks();

    // Schedule background automated SLA monitoring worker every 60 seconds
    setInterval(async () => {
      try {
        await complaintController.runAutomatedSLAChecks();
      } catch (slaErr) {
        console.error('Automated SLA worker error:', slaErr.message);
      }
    }, 60000);
    console.log('⏱️ SLA Escalation & Resolution background worker active (interval: 60s)');
  })
  .catch(err => {
    console.error('Database connection failed:', err.message);
    console.log('Ensure MongoDB is installed and running locally, or supply a MONGO_URI in .env');
  });

// Import Routes
const authRoutes = require('./routes/authRoutes');
const complaintRoutes = require('./routes/complaintRoutes');
const officerRoutes = require('./routes/officerRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const { verifyToken, isAdmin } = require('./middleware/auth');
const complaintController = require('./controllers/complaintController');

// Mount routes
app.use('/api/auth', authRoutes);
app.use('/api/complaints', complaintRoutes);
app.use('/api/officers', officerRoutes);
app.use('/api/notifications', notificationRoutes);

// Explicit routes requested in API list
app.get('/api/admin/statistics', verifyToken, isAdmin, complaintController.getAdminStatistics);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected' });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Internal Server Error', error: err.message });
});

// Start Server
app.listen(PORT, () => {
  console.log(`SCGRS Backend Server running on http://127.0.0.1:${PORT}`);
});
