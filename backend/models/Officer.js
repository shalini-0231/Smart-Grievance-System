const mongoose = require('mongoose');

// ── Novelty 2: Officer Performance-Weighted Auto-Assignment ─────────────────
// Each officer belongs to a department. The auto-assignment algorithm uses:
//   score = (10 - openTicketCount) + (avgRating × 2)
// to recommend the best available officer per complaint department.
const OfficerSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  department: {
    type: String,
    required: true
  },
  role: {
    type: String,
    default: 'Department Officer'
  },
  designation: {
    type: String,
    default: 'Department Officer'
  },
  contact: {
    type: String,
    default: ''
  },
  phone: {
    type: String,
    default: ''
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  openTicketCount: {
    type: Number,
    default: 0
  },
  avgRating: {
    type: Number,
    default: 4.0
  },
  totalResolved: {
    type: Number,
    default: 0
  },
  totalRatingSum: {
    type: Number,
    default: 0
  }
}, { timestamps: true });

module.exports = mongoose.model('Officer', OfficerSchema);
