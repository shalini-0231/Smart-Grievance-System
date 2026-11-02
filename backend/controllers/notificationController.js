const User = require('../models/User');
const Notification = require('../models/Notification');

// Get all notifications for current user
exports.getUserNotifications = async (req, res) => {
  try {
    const userId = req.user.id;
    const notifications = await Notification.find({ recipient: userId })
      .sort({ createdAt: -1 })
      .limit(30);

    const unreadCount = await Notification.countDocuments({
      recipient: userId,
      isRead: false
    });

    res.status(200).json({
      notifications,
      unreadCount
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching notifications', error: error.message });
  }
};

// Mark single notification as read
exports.markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const notification = await Notification.findOneAndUpdate(
      { _id: id, recipient: req.user.id },
      { isRead: true, readAt: new Date() },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    res.status(200).json({ message: 'Marked as read', notification });
  } catch (error) {
    res.status(500).json({ message: 'Error updating notification', error: error.message });
  }
};

// Mark all user notifications as read
exports.markAllAsRead = async (req, res) => {
  try {
    await Notification.updateMany(
      { recipient: req.user.id, isRead: false },
      { isRead: true, readAt: new Date() }
    );
    res.status(200).json({ message: 'All notifications marked as read' });
  } catch (error) {
    res.status(500).json({ message: 'Error marking all as read', error: error.message });
  }
};

// Helper function to create notification programmatically
exports.sendInAppNotification = async ({ recipient, recipientRole = 'student', title, message, type = 'STATUS_CHANGE', complaintId = null, complaintCode = '' }) => {
  try {
    if (!recipient) return null;
    const notif = new Notification({
      recipient,
      recipientRole,
      title,
      message,
      type,
      complaintId,
      complaintCode
    });
    return await notif.save();
  } catch (err) {
    console.warn('⚠️ [Notification Helper] Failed to save notification:', err.message);
    return null;
  }
};

// ── Module 8: Notification Management ───────────────────────────────────────
// Get all system notifications for Admin monitoring
exports.getAllNotificationsAdmin = async (req, res) => {
  try {
    const { type, isRead } = req.query;
    let filter = {};
    if (type) filter.type = type;
    if (isRead !== undefined) filter.isRead = isRead === 'true';

    const notifications = await Notification.find(filter)
      .populate('recipient', 'name email role')
      .populate('complaintId', 'complaintId title status priority department location')
      .sort({ createdAt: -1 })
      .limit(100);

    const counts = {
      total: await Notification.countDocuments(),
      duplicateAlerts: await Notification.countDocuments({ type: 'DUPLICATE_ALERT' }),
      slaBreaches: await Notification.countDocuments({ type: { $in: ['SLA_BREACH', 'SLA_WARNING'] } }),
      systemBroadcasts: await Notification.countDocuments({ type: 'SYSTEM' }),
      statusUpdates: await Notification.countDocuments({ type: 'STATUS_CHANGE' })
    };

    res.status(200).json({ notifications, counts });
  } catch (err) {
    res.status(500).json({ message: 'Error retrieving system notifications', error: err.message });
  }
};

// Send campus-wide broadcast announcement
exports.broadcastAnnouncement = async (req, res) => {
  try {
    const { title, message, targetRole = 'all' } = req.body;
    if (!title || !message) {
      return res.status(400).json({ message: 'Title and message are required.' });
    }

    let filter = {};
    if (targetRole && targetRole !== 'all') {
      filter.role = targetRole;
    }

    const recipients = await User.find(filter);
    if (!recipients || recipients.length === 0) {
      return res.status(404).json({ message: 'No recipients found for this target role.' });
    }

    const notifDocs = recipients.map(u => ({
      recipient: u._id,
      recipientRole: u.role,
      title: `📢 ${title}`,
      message,
      type: 'SYSTEM',
      isRead: false
    }));

    await Notification.insertMany(notifDocs);

    res.status(201).json({
      message: `Announcement broadcast successfully to ${recipients.length} user(s).`,
      count: recipients.length
    });
  } catch (err) {
    res.status(500).json({ message: 'Error broadcasting announcement', error: err.message });
  }
};
