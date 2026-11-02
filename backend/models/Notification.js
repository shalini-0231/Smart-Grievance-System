const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema({
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  recipientRole: {
    type: String,
    enum: ['student', 'admin', 'officer'],
    default: 'student'
  },
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: [
      'STATUS_CHANGE',
      'OFFICER_ASSIGNED',
      'SLA_BREACH',
      'SLA_WARNING',
      'DUPLICATE_ALERT',
      'DUPLICATE_UPVOTE',
      'FEEDBACK_RECEIVED',
      'REOPENED',
      'SYSTEM'
    ],
    default: 'STATUS_CHANGE'
  },
  complaintId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Complaint',
    default: null
  },
  complaintCode: {
    type: String,
    default: ''
  },
  isRead: {
    type: Boolean,
    default: false
  },
  readAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

NotificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', NotificationSchema);
