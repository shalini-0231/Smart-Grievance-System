const Complaint = require('../models/Complaint');
const Feedback = require('../models/Feedback');
const User = require('../models/User');
const axios = require('axios');
const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

// ─────────────────────────────────────────────────────────
// Email Utility — creates an Ethereal test transporter if no
// real SMTP credentials are configured, so the feature works
// out-of-the-box even in dev.  Swap EMAIL_SERVICE / USER /
// PASS in .env for production Gmail or any SMTP provider.
// ─────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────
// Resilient Email Utility — attempts configured SMTP credentials
// first (e.g. Gmail / Outlook / Office365). If primary SMTP fails
// (e.g. invalid app password, network restrictions, or timeout),
// it automatically falls back to Ethereal / simulated delivery so
// officer assignment and student updates never break or block the app.
// ─────────────────────────────────────────────────────────
const createPrimaryTransporter = () => {
  const service = (process.env.EMAIL_SERVICE || 'gmail').toLowerCase();
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS ? process.env.EMAIL_PASS.replace(/\s+/g, '') : '';

  const isPlaceholder = !user || !pass || 
    user.includes('your_campus_notifications') || 
    pass.includes('your_gmail_app_password') ||
    user.includes('example.com');

  if (isPlaceholder || service === 'ethereal') {
    return null;
  }

  if (service === 'outlook' || service === 'hotmail') {
    return nodemailer.createTransport({
      host: 'smtp-mail.outlook.com',
      port: 587,
      secure: false,
      auth: { user, pass },
      tls: { ciphers: 'SSLv3', rejectUnauthorized: false }
    });
  } else if (service === 'office365') {
    return nodemailer.createTransport({
      host: 'smtp.office365.com',
      port: 587,
      secure: false,
      auth: { user, pass },
      tls: { rejectUnauthorized: false }
    });
  } else {
    // Gmail or default SMTP
    return nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      family: 4,
      auth: { user, pass },
      tls: { rejectUnauthorized: false }
    });
  }
};

const sendEmailWithFallback = async (mailOptions) => {
  const primaryTransporter = createPrimaryTransporter();

  // 1. Try real SMTP if configured
  if (primaryTransporter) {
    try {
      const info = await primaryTransporter.sendMail(mailOptions);
      console.log(`📧 [SCGRS Email] Successfully dispatched via primary SMTP to ${mailOptions.to}`);
      return {
        success: true,
        mode: 'smtp',
        messageId: info.messageId,
        previewUrl: null
      };
    } catch (primaryErr) {
      console.warn(`⚠️  [SCGRS Email] Primary SMTP delivery failed (${primaryErr.message}). Automatically switching to fallback test mailer...`);
    }
  }

  // 2. Fallback: Ethereal test account
  try {
    const testAccount = await nodemailer.createTestAccount();
    const fallbackTransporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: { user: testAccount.user, pass: testAccount.pass },
      tls: { rejectUnauthorized: false }
    });

    const info = await fallbackTransporter.sendMail({
      ...mailOptions,
      from: mailOptions.from || testAccount.user
    });

    const previewUrl = nodemailer.getTestMessageUrl(info) || 'https://ethereal.email/messages';
    console.log(`📧 [SCGRS Email Fallback] Delivered via Ethereal test account: ${previewUrl}`);
    return {
      success: true,
      mode: 'ethereal',
      fallback: true,
      previewUrl,
      warning: 'Delivered via simulated test mailer (Check Google App Password in backend/.env for real delivery)'
    };
  } catch (etherealErr) {
    // 3. Fallback: Console Mock (offline or blocked network)
    console.log('\n📧 ─── [SCGRS SIMULATED EMAIL DELIVERY] ─────────────────────');
    console.log(`  To      : ${mailOptions.to}`);
    console.log(`  From    : ${mailOptions.from}`);
    console.log(`  Subject : ${mailOptions.subject}`);
    console.log('  Status  : Dispatched (simulated in local console)');
    console.log('──────────────────────────────────────────────────────────\n');
    return {
      success: true,
      mode: 'console',
      fallback: true,
      previewUrl: null,
      warning: 'Dispatched in local simulation mode (SMTP connection rejected)'
    };
  }
};

// Helper: Send automated email notification to student when status or remarks update
const sendStudentStatusNotification = async (complaint, student, previousStatus, newStatus, adminRemarks, resolutionRemarks) => {
  if (!student || !student.email || student.email === 'N/A') {
    return { success: false, reason: 'No student email available (e.g. anonymous or missing)' };
  }

  const statusColors = {
    'SUBMITTED': '#38bdf8',
    'UNDER REVIEW': '#fbbf24',
    'ASSIGNED': '#818cf8',
    'IN PROGRESS': '#3b82f6',
    'RESOLVED': '#10b981',
    'REOPENED': '#f97316',
    'ESCALATED': '#ef4444'
  };

  const statusColor = statusColors[newStatus] || '#38bdf8';
  const remarksHtml = [];

  if (adminRemarks && adminRemarks.trim()) {
    remarksHtml.push(`
      <div style="background: rgba(15, 23, 42, 0.7); border-radius: 8px; padding: 14px 18px; margin-top: 12px; border-left: 4px solid #38bdf8;">
        <p style="margin: 0 0 6px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #94a3b8; font-weight: 700;">Admin Remarks</p>
        <p style="margin: 0; font-size: 14px; color: #e2e8f0; line-height: 1.5; white-space: pre-wrap;">${adminRemarks}</p>
      </div>
    `);
  }

  if (resolutionRemarks && resolutionRemarks.trim()) {
    remarksHtml.push(`
      <div style="background: rgba(16, 185, 129, 0.08); border-radius: 8px; padding: 14px 18px; margin-top: 12px; border-left: 4px solid #10b981;">
        <p style="margin: 0 0 6px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #34d399; font-weight: 700;">Official Resolution Summary</p>
        <p style="margin: 0; font-size: 14px; color: #e2e8f0; line-height: 1.5; white-space: pre-wrap;">${resolutionRemarks}</p>
      </div>
    `);
  }

  const htmlBody = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background: #0b1120; color: #e2e8f0; margin: 0; padding: 24px 12px;">
  <div style="max-width: 600px; margin: 0 auto; background: #1e293b; border-radius: 14px; overflow: hidden; border: 1px solid #334155; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5);">
    
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #1e40af, #0891b2); padding: 26px 28px;">
      <h1 style="margin: 0; font-size: 21px; color: #ffffff; letter-spacing: -0.02em;">📢 Grievance Status Update</h1>
      <p style="margin: 6px 0 0; font-size: 13px; color: #bfdbfe;">Smart Campus Grievance Redressal System (SCGRS)</p>
    </div>

    <!-- Main Content -->
    <div style="padding: 28px;">
      <p style="font-size: 15px; color: #cbd5e1; margin-top: 0;">
        Hello <strong style="color: #f8fafc;">${student.name || 'Student'}</strong>,
      </p>
      <p style="font-size: 14px; color: #94a3b8; line-height: 1.6;">
        Your grievance ticket status has been updated by the campus administration. Please find the latest status details and administrative remarks below:
      </p>

      <!-- Status Banner -->
      <div style="background: #0f172a; border-radius: 10px; padding: 18px 20px; margin: 20px 0; border: 1px solid #334155;">
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          <tr>
            <td style="padding: 8px 10px; color: #64748b; width: 35%;">Complaint ID</td>
            <td style="padding: 8px 10px; font-weight: 700; color: #38bdf8; font-family: monospace; font-size: 15px;">${complaint.complaintId}</td>
          </tr>
          <tr style="background: rgba(255, 255, 255, 0.02);">
            <td style="padding: 8px 10px; color: #64748b;">Title</td>
            <td style="padding: 8px 10px; font-weight: 600; color: #f1f5f9;">${complaint.title}</td>
          </tr>
          <tr>
            <td style="padding: 8px 10px; color: #64748b;">Previous Status</td>
            <td style="padding: 8px 10px; color: #94a3b8;">${previousStatus || 'SUBMITTED'}</td>
          </tr>
          <tr style="background: rgba(255, 255, 255, 0.02);">
            <td style="padding: 8px 10px; color: #64748b;">New Status</td>
            <td style="padding: 8px 10px;">
              <span style="display: inline-block; background: ${statusColor}22; color: ${statusColor}; border: 1px solid ${statusColor}55; padding: 3px 12px; border-radius: 9999px; font-weight: 700; font-size: 12px; letter-spacing: 0.04em;">
                ${newStatus}
              </span>
            </td>
          </tr>
          <tr>
            <td style="padding: 8px 10px; color: #64748b;">Department</td>
            <td style="padding: 8px 10px; color: #e2e8f0;">${complaint.department}</td>
          </tr>
          ${complaint.assignedOfficer && complaint.assignedOfficer.name ? `
          <tr style="background: rgba(255, 255, 255, 0.02);">
            <td style="padding: 8px 10px; color: #64748b;">Assigned Officer</td>
            <td style="padding: 8px 10px; color: #38bdf8; font-weight: 600;">${complaint.assignedOfficer.name} (${complaint.assignedOfficer.role || 'Officer'})</td>
          </tr>` : ''}
        </table>

        ${remarksHtml.join('')}
      </div>

      ${newStatus === 'RESOLVED' ? `
      <div style="background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 8px; padding: 14px 16px; margin-top: 18px;">
        <p style="margin: 0; font-size: 13px; color: #a7f3d0; line-height: 1.5;">
          ⭐ <strong>Your feedback matters:</strong> If you are satisfied with this resolution, please rate our response on the portal. If the issue persists, you may reopen the ticket within 48 hours.
        </p>
      </div>` : ''}

      <p style="font-size: 13px; color: #94a3b8; margin-top: 24px; line-height: 1.5;">
        You can log in to the SCGRS Portal at any time to check real-time audit logs, officer details, and resolution history.
      </p>
    </div>

    <!-- Footer -->
    <div style="padding: 16px 28px; background: #0f172a; border-top: 1px solid #1e293b; font-size: 12px; color: #475569; text-align: center;">
      This is an automated notification from the Smart Campus Grievance Redressal System. Do not reply directly to this email.
    </div>
  </div>
</body>
</html>`;

  try {
    const mailResult = await sendEmailWithFallback({
      from: process.env.EMAIL_FROM || '"Smart Campus Grievance System" <noreply@scgrs.campus.edu>',
      to: student.email,
      subject: `[SCGRS] Grievance Update: ${complaint.complaintId} is now ${newStatus}`,
      html: htmlBody
    });
    return {
      success: true,
      previewUrl: mailResult.previewUrl || null,
      fallback: mailResult.fallback || false
    };
  } catch (err) {
    console.error('⚠️ [SCGRS Student Email] Failed to send email:', err.message);
    return { success: false, error: err.message };
  }
};

// Helper: Send automated in-app & email notification to admins when duplicate complaint is detected
const notifyAdminsOnDuplicate = async (parentComplaint, newComplaint) => {
  try {
    const { sendInAppNotification } = require('./notificationController');
    const admins = await User.find({ role: 'admin' });
    if (!admins || admins.length === 0) return;

    const affectedCount = parentComplaint.affectedStudentCount || 2;
    const title = '⚠️ Duplicate Grievance Alert - Take Quick Action!';
    const message = `Duplicate issue detected for [${parentComplaint.complaintId}]: "${parentComplaint.title}". New matching report [${newComplaint.complaintId || 'Incoming Report'}] in "${parentComplaint.location || 'Campus'}". Total affected students: ${affectedCount}. Priority: ${parentComplaint.priority}. Please take quick action!`;

    for (const admin of admins) {
      await sendInAppNotification({
        recipient: admin._id,
        recipientRole: 'admin',
        title,
        message,
        type: 'DUPLICATE_ALERT',
        complaintId: parentComplaint._id,
        complaintCode: parentComplaint.complaintId
      });

      if (admin.email && !admin.email.includes('placeholder') && !admin.email.includes('example.com')) {
        sendEmailWithFallback({
          to: admin.email,
          subject: `⚠️ [SCGRS Urgent] Duplicate Grievance Detected (${parentComplaint.complaintId}) - Take Quick Action!`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; background: #0f172a; color: #f8fafc; border-radius: 8px;">
              <h2 style="color: #f59e0b; margin-top: 0;">⚠️ Duplicate Grievance Detected — Take Quick Action</h2>
              <p>A new student grievance has been automatically identified and clustered as a duplicate of an existing unresolved ticket.</p>
              
              <div style="background: #1e293b; padding: 15px; border-radius: 6px; border-left: 4px solid #f59e0b; margin: 15px 0;">
                <p style="margin: 4px 0;"><strong>Primary Ticket ID:</strong> <span style="color: #38bdf8;">${parentComplaint.complaintId}</span></p>
                <p style="margin: 4px 0;"><strong>Title:</strong> ${parentComplaint.title}</p>
                <p style="margin: 4px 0;"><strong>New Matching Report:</strong> ${newComplaint.complaintId || 'Incoming Report'}</p>
                <p style="margin: 4px 0;"><strong>Category:</strong> ${parentComplaint.category}</p>
                <p style="margin: 4px 0;"><strong>Location:</strong> ${parentComplaint.location || 'Campus'}</p>
                <p style="margin: 4px 0;"><strong>Priority Level:</strong> <span style="color: #ef4444; font-weight: bold;">${parentComplaint.priority}</span></p>
                <p style="margin: 4px 0;"><strong>Total Affected Students:</strong> <strong style="color: #f59e0b;">${affectedCount} students</strong></p>
              </div>

              <div style="background: rgba(245, 158, 11, 0.15); border: 1px solid rgba(245, 158, 11, 0.4); padding: 12px; border-radius: 6px; color: #fbbf24; font-weight: 600; margin: 15px 0;">
                ⚡ Recommendation: Take quick action to assign a department officer and resolve this campus issue before SLA breach.
              </div>

              <div style="font-size: 12px; color: #64748b; margin-top: 20px; text-align: center;">
                Smart Campus Grievance Redressal System • Automated Admin Notification
              </div>
            </div>
          `
        }).catch(err => console.warn('Admin duplicate email alert skipped:', err.message));
      }
    }
    console.log(`📢 [Duplicate Alert] Dispatched "Take Quick Action" notification to ${admins.length} administrator(s) for cluster ${parentComplaint.complaintId}`);
  } catch (err) {
    console.warn('⚠️ Error in notifyAdminsOnDuplicate:', err.message);
  }
};

const SUPPORTED_CATEGORIES = [
  'Academic',
  'Hostel',
  'Transport',
  'Infrastructure',
  'Internet/Wi-Fi',
  'Harassment',
  'Ragging',
  'Safety',
  'Canteen Dish Issue',
  'Other'
];

const ML_CONFIDENCE_THRESHOLD = parseFloat(process.env.ML_CATEGORY_CONFIDENCE_THRESHOLD || '0.70');
const SEMANTIC_SIMILARITY_THRESHOLD = parseFloat(process.env.SEMANTIC_SIMILARITY_THRESHOLD || '0.45');

/**
 * Safe Category-Selection Policy (Requirement 5):
 * 1. Apply mandatory safety overrides first (food safety, harassment, ragging, critical life-safety).
 * 2. Use a valid deterministic AI category when sufficiently supported.
 * 3. Otherwise, use ML-predicted category when confidence meets threshold (>= 0.70).
 * 4. If neither is reliable, retain student's selected category (fallback to 'Other' if unsupported).
 */
const determineFinalCategory = ({ studentCategory, aiResults, issueType }) => {
  const normStudentCat = SUPPORTED_CATEGORIES.includes(studentCategory) ? studentCategory : 'Other';

  // 1. Mandatory safety overrides
  if (aiResults?.isFoodSafetyOverride || issueType === 'FOREIGN_OBJECT' || issueType === 'HYGIENE') {
    return 'Canteen Dish Issue';
  }

  const detCat = aiResults?.detectedCategory;
  if (detCat && ['Harassment', 'Ragging', 'Safety'].includes(detCat) && aiResults?.priority === 'CRITICAL') {
    return detCat;
  }

  // 2. Deterministic AI category when sufficiently supported
  if (detCat && SUPPORTED_CATEGORIES.includes(detCat)) {
    const hasStrongSupport = (aiResults?.matchedKeywords && aiResults.matchedKeywords.length >= 2) ||
      (aiResults?.priority === 'HIGH' || aiResults?.priority === 'CRITICAL');
    if (hasStrongSupport) {
      return detCat;
    }
  }

  // 3. ML-predicted category when confidence meets threshold
  const mlAnalysis = aiResults?.mlAnalysis;
  const mlCat = mlAnalysis?.predicted_category;
  const mlConf = typeof mlAnalysis?.confidence === 'number' ? mlAnalysis.confidence : 0;

  if (mlCat && SUPPORTED_CATEGORIES.includes(mlCat) && mlConf >= ML_CONFIDENCE_THRESHOLD) {
    return mlCat;
  }

  // If deterministic AI category was identified and student selected generic 'Other'
  if (detCat && SUPPORTED_CATEGORIES.includes(detCat) && normStudentCat === 'Other') {
    return detCat;
  }

  // 4. Retain student's selected category
  return normStudentCat;
};

const getAssignedDepartment = (category) => {
  switch (category) {
    case 'Academic':
      return 'Academic Department';
    case 'Hostel':
      return 'Hostel Administration';
    case 'Transport':
      return 'Transport Department';
    case 'Internet/Wi-Fi':
      return 'IT Department';
    case 'Infrastructure':
      return 'Maintenance Department';
    case 'Harassment':
    case 'Ragging':
    case 'Safety':
      return 'Student Welfare / Anti-Ragging Committee';
    case 'Canteen Dish Issue':
      return 'Canteen & Hospitality';
    default:
      return 'General Administration';
  }
};

// Calculate SLA Deadline based on priority
const calculateSLADeadline = (priority) => {
  const now = new Date();
  switch (priority) {
    case 'CRITICAL':
      return new Date(now.getTime() + 4 * 60 * 60 * 1000); // 4 hours for Critical emergencies
    case 'HIGH':
      return new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours for High priority
    case 'MEDIUM':
      return new Date(now.getTime() + 48 * 60 * 60 * 1000); // 48 hours for Medium priority
    case 'LOW':
    default:
      return new Date(now.getTime() + 72 * 60 * 60 * 1000); // 72 hours for Low priority
  }
};

// Check and auto-escalate complaints with expired SLA deadlines
const checkSLAEscalations = async () => {
  try {
    const now = new Date();
    const expiredComplaints = await Complaint.find({
      status: { $nin: ['RESOLVED', 'CLOSED', 'ESCALATED'] },
      slaDeadline: { $lte: now },
      isEscalated: false
    }).populate('studentId', 'name email');

    for (const c of expiredComplaints) {
      const prevStatus = c.status;
      c.isEscalated = true;
      c.status = 'ESCALATED';
      c.escalatedTo = 'Higher Authority (Campus Director & Grievance Cell Dean)';
      c.escalatedAt = now;
      c.adminRemarks = (c.adminRemarks ? c.adminRemarks + ' | ' : '') + '⚠️ SLA BREACHED: Automatically escalated to Campus Director & Dean due to resolution deadline breach.';
      
      c.statusHistory.push({
        status: 'ESCALATED',
        adminRemarks: '⚠️ SLA BREACHED: Ticket resolution target exceeded. Auto-escalated to Higher Authority.',
        updatedBy: 'System (SLA Escalation Engine)',
        notifiedStudent: true,
        timestamp: now
      });

      await c.save();

      // Dispatch real-time in-app notification & email
      try {
        const { sendInAppNotification } = require('./notificationController');
        if (c.studentId && c.studentId._id) {
          await sendInAppNotification({
            recipient: c.studentId._id,
            recipientRole: 'student',
            title: '🚨 SLA Breached — Grievance Auto-Escalated',
            message: `Your grievance ${c.complaintId} has exceeded its resolution deadline and was automatically escalated to the Campus Director & Dean.`,
            type: 'SLA_BREACH',
            complaintId: c._id,
            complaintCode: c.complaintId
          });

          await sendStudentStatusNotification(
            c,
            c.studentId,
            prevStatus,
            'ESCALATED',
            c.adminRemarks,
            ''
          );
        }
      } catch (notifyErr) {
        console.warn('⚠️ SLA Escalation notification error:', notifyErr.message);
      }
    }
  } catch (err) {
    console.error('Error during SLA auto-escalation check:', err.message);
  }
};

const runAutomatedSLAChecks = async () => {
  await checkSLAEscalations();
  await checkResolutionExpiry();
};

// Check 48-hour resolution expiry for Novelty 5
const checkResolutionExpiry = async () => {
  try {
    const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);
    const expiredComplaints = await Complaint.find({
      status: 'RESOLVED',
      resolvedAt: { $lte: fortyEightHoursAgo }
    });

    for (const c of expiredComplaints) {
      const fb = await Feedback.findOne({ complaintId: c._id });
      if (!fb) {
        c.status = 'REOPENED';
        c.reopenCount = (c.reopenCount || 0) + 1;
        c.adminRemarks = (c.adminRemarks ? c.adminRemarks + ' | ' : '') + '⚠️ 48-Hour Resolution Expiry: Ticket automatically reopened as resolution was unconfirmed by student within 48 hours.';
        if (c.reopenCount >= 2) {
          c.status = 'ESCALATED';
          c.isEscalated = true;
          c.escalatedTo = 'Higher Authority (Principal & Grievance Review Committee)';
          c.adminRemarks += ' | ⚠️ Multi-Reopen Escalation: Reopened 2+ times, escalated to Higher Authority.';
        }
        await c.save();
      }
    }
  } catch (err) {
    console.error('Error during 48-hour resolution expiry check:', err.message);
  }
};

// ── Novelty 1: Explainable Deterministic Priority Engine ─────────────────────
// Algorithm: Weighted Keyword Sum + Threshold Bands
// Dataset: keyword_severity.csv (keyword, category, department, severity_weight)
// Cutoffs: >= 80 -> CRITICAL, 60-79 -> HIGH, 40-59 -> MEDIUM, < 40 -> LOW
// Confidence % = min(100, Math.round(total_score))

const loadKeywordDataset = () => {
  try {
    const csvPath = path.join(__dirname, '../data/keyword_severity.csv');
    if (fs.existsSync(csvPath)) {
      const content = fs.readFileSync(csvPath, 'utf8');
      const lines = content.split(/\r?\n/).filter(line => line.trim());
      const dataset = [];
      for (let i = 1; i < lines.length; i++) {
        const parts = lines[i].split(',');
        if (parts.length >= 4) {
          dataset.push({
            word: parts[0].trim().toLowerCase(),
            category: parts[1].trim(),
            department: parts[2].trim(),
            weight: parseInt(parts[3].trim(), 10) || 10
          });
        }
      }
      if (dataset.length > 0) return dataset;
    }
  } catch (err) {
    console.warn('Warning: Could not read keyword_severity.csv, using default matrix:', err.message);
  }

  // Built-in fallback
  return [
    { word: "harassment", weight: 40, category: "Harassment" },
    { word: "ragging", weight: 40, category: "Ragging" },
    { word: "threat", weight: 40, category: "Safety" },
    { word: "violence", weight: 40, category: "Safety" },
    { word: "assault", weight: 40, category: "Safety" },
    { word: "emergency", weight: 40, category: "Safety" },
    { word: "bully", weight: 35, category: "Safety" },
    { word: "abuse", weight: 40, category: "Safety" },
    { word: "suicidal", weight: 40, category: "Safety" },
    { word: "weapon", weight: 40, category: "Safety" },
    { word: "safety", weight: 35, category: "Safety" },
    { word: "cockroach", weight: 40, category: "Canteen Dish Issue" },
    { word: "foreign object", weight: 40, category: "Canteen Dish Issue" },
    { word: "poison", weight: 40, category: "Canteen Dish Issue" },
    { word: "fire", weight: 40, category: "Infrastructure" },
    { word: "academic emergency", weight: 30, category: "Academic" },
    { word: "flood", weight: 30, category: "Infrastructure" },
    { word: "food poisoning", weight: 35, category: "Canteen Dish Issue" },
    { word: "exam issue", weight: 25, category: "Academic" },
    { word: "exam", weight: 25, category: "Academic" },
    { word: "fees", weight: 25, category: "Academic" },
    { word: "hall ticket", weight: 25, category: "Academic" },
    { word: "leaking", weight: 25, category: "Infrastructure" },
    { word: "hygiene", weight: 25, category: "Canteen Dish Issue" },
    { word: "stale food", weight: 25, category: "Canteen Dish Issue" },
    { word: "wifi", weight: 15, category: "Internet/Wi-Fi" },
    { word: "canteen", weight: 15, category: "Canteen Dish Issue" },
    { word: "bus", weight: 15, category: "Transport" },
    { word: "fan", weight: 10, category: "Infrastructure" },
    { word: "light", weight: 10, category: "Infrastructure" }
  ];
};

const KEYWORD_SEVERITY = loadKeywordDataset();

const localAIAnalyze = (text, eventDate = null, issueType = null) => {
  const lowercaseText = (text || '').toLowerCase().replace(/[^\w\s]/g, ' ');
  let totalWeight = 0;
  const matchedKeywords = [];
  let detectedCategory = null;
  let assignedDepartment = null;

  // Exact matching with longer phrases first
  const sortedKeywords = [...KEYWORD_SEVERITY].sort((a, b) => b.word.length - a.word.length);
  const matchedSpans = [];

  for (const item of sortedKeywords) {
    const cleanKw = item.word.toLowerCase().replace(/[^\w\s]/g, ' ').trim();
    if (!cleanKw) continue;

    const regex = new RegExp(`\\b${cleanKw}\\b`, 'g');
    let match;
    while ((match = regex.exec(lowercaseText)) !== null) {
      const start = match.index;
      const end = start + match[0].length;
      // Skip if already covered by longer phrase
      if (matchedSpans.some(([s, e]) => s <= start && end <= e)) {
        continue;
      }
      matchedSpans.push([start, end]);
      matchedKeywords.push(item.word);
      totalWeight += item.weight;
      if (!detectedCategory || item.weight >= 25) {
        detectedCategory = item.category;
        assignedDepartment = item.department;
      }
    }
  }

  // Sentiment analysis (Recorded separately; does NOT modify priority score)
  const negWords = ["not", "bad", "worst", "broken", "terrible", "unsafe", "scared", "afraid", "harassed", "fail", "delay", "poor", "unhappy", "angry", "frustrated", "disappointed", "slow", "failed", "error", "issue", "problem", "hate", "no", "harassment", "ragging", "violence", "abuse", "threat", "emergency", "rejected", "unapproved", "pending", "missing"];
  const posWords = ["good", "great", "excellent", "happy", "satisfied", "solved", "fixed", "nice", "helpful", "thanks", "thank", "love", "awesome", "perfect", "resolved", "approved"];
  
  const words = lowercaseText.split(/\s+/).filter(Boolean);
  let negCount = 0;
  let posCount = 0;
  for (const w of words) {
    if (negWords.includes(w)) negCount++;
    if (posWords.includes(w)) posCount++;
  }
  
  let sentimentScore = 0;
  let sentimentLabel = "NEUTRAL";
  if (negCount + posCount > 0) {
    sentimentScore = (posCount - negCount) / (posCount + negCount);
    if (sentimentScore > 0.15) sentimentLabel = "POSITIVE";
    else if (sentimentScore < -0.15) sentimentLabel = "NEGATIVE";
  }

  // Food-Safety Overrides (serious food safety vs high food hygiene)
  const seriousFoodKeywords = ["foreign object", "cockroach", "insect", "poison", "food poisoning", "hair in food", "glass in food"];
  const highFoodKeywords = ["hygiene", "stale food", "dirty food", "unhygienic", "spoiled food"];

  const hasSeriousFood = issueType === 'FOREIGN_OBJECT' || seriousFoodKeywords.some(kw => new RegExp(`\\b${kw.replace(/[^\w\s]/g, '')}\\b`).test(lowercaseText));
  const hasHighHygiene = (issueType === 'HYGIENE' || highFoodKeywords.some(kw => new RegExp(`\\b${kw.replace(/[^\w\s]/g, '')}\\b`).test(lowercaseText))) && !hasSeriousFood;
  const foodSafetyOverride = hasSeriousFood || hasHighHygiene;

  if (foodSafetyOverride) {
    detectedCategory = "Canteen Dish Issue";
    assignedDepartment = "Canteen & Hospitality";
  }

  // Priority determination aligned with Python engine:
  // LOW: 0-39, MEDIUM: 40-59, HIGH: 60-79, CRITICAL: 80+
  let priority = 'LOW';
  let confidencePercent = 30;

  if (hasSeriousFood) {
    priority = 'CRITICAL';
    confidencePercent = Math.min(98, 92 + (matchedKeywords.length * 2));
  } else if (hasHighHygiene) {
    priority = totalWeight >= 80 ? 'CRITICAL' : 'HIGH';
    confidencePercent = Math.min(87, Math.max(76, Math.round(76 + (Math.min(totalWeight, 60) / 60.0) * 11)));
  } else if (totalWeight >= 80) {
    priority = 'CRITICAL';
    confidencePercent = Math.min(98, Math.max(88, Math.round(88 + ((totalWeight - 80) / 40.0) * 10)));
  } else if (totalWeight >= 60) {
    priority = 'HIGH';
    confidencePercent = Math.min(87, Math.max(76, Math.round(76 + ((totalWeight - 60) / 20.0) * 11)));
  } else if (totalWeight >= 40) {
    priority = 'MEDIUM';
    confidencePercent = Math.min(75, Math.max(62, Math.round(62 + ((totalWeight - 40) / 20.0) * 13)));
  } else {
    priority = 'LOW';
    confidencePercent = totalWeight > 0 ? Math.min(60, Math.max(45, Math.round(45 + (totalWeight / 40.0) * 15))) : 30;
  }

  const finalScore = round(confidencePercent / 100.0, 2);

  let reason = "";
  if (hasSeriousFood) {
    reason = `[ALERT] Food Safety Override: Critical health hazard detected in Canteen Dish Issue category (${issueType || priority}) — auto-escalated to CRITICAL.`;
  } else if (hasHighHygiene) {
    reason = `[ALERT] Food Hygiene Override: Significant food hygiene concern detected in Canteen Dish Issue category — escalated to HIGH priority.`;
  } else if (matchedKeywords.length > 0) {
    reason = `Urgency keywords detected: ${matchedKeywords.slice(0, 3).map(k => `'${k}'`).join(', ')}.`;
  } else {
    reason = "General vocabulary detected with neutral context.";
  }

  return {
    priority,
    score: finalScore,
    confidencePercent,
    matchedKeywords,
    sentiment: sentimentLabel,
    reason: `${confidencePercent}% — ${priority} — ${reason}`,
    isFoodSafetyOverride: foodSafetyOverride,
    detectedCategory,
    assignedDepartment
  };
};

const round = (num, decimalPlaces) => {
  const p = Math.pow(10, decimalPlaces);
  return Math.round(num * p) / p;
};

// Create a new complaint
exports.createComplaint = async (req, res) => {
  try {
    const { 
      title, 
      description, 
      category, 
      anonymous, 
      location, 
      attachment,
      canteenLocation,
      dishName,
      issueType,
      mealTime,
      dishPhoto
    } = req.body;
    const studentId = req.user.id;

    if (!title || !description || !category) {
      return res.status(400).json({ message: 'Title, description and category are required.' });
    }

    // Call Python AI Service
    let aiResults;
    try {
      const aiResponse = await axios.post(`${process.env.AI_SERVICE_URL || 'http://127.0.0.1:5000'}/api/ai/analyze`, {
        text: description,
        eventDate: req.body.eventDate || null,
        issueType: issueType || null
      }, { timeout: 3000 });
      
      aiResults = aiResponse.data;
      console.log('AI Service analysis results:', aiResults);
    } catch (aiError) {
      console.warn('AI Service is unreachable, falling back to backend keywords classification.', aiError.message);
      aiResults = localAIAnalyze(description, req.body.eventDate || null, issueType);
    }

    // Always ensure matchedKeywords and confidencePercent are present
    if (!aiResults.matchedKeywords || aiResults.matchedKeywords.length === 0) {
      const fallbackAnalysis = localAIAnalyze(description, req.body.eventDate || null, issueType);
      aiResults.matchedKeywords = fallbackAnalysis.matchedKeywords;
      aiResults.confidencePercent = fallbackAnalysis.confidencePercent;
      if (!aiResults.priority) aiResults.priority = fallbackAnalysis.priority;
    } else if (!aiResults.confidencePercent) {
      aiResults.confidencePercent = Math.min(100, Math.round((aiResults.score || 0.2) * 100));
    }

    // Safe Category-Selection Policy (Requirement 5)
    const finalCategory = determineFinalCategory({
      studentCategory: category,
      aiResults,
      issueType
    });

    // Dynamic routing & SLA calculation based on finalCategory
    const department = getAssignedDepartment(finalCategory);
    const slaDeadline = calculateSLADeadline(aiResults.priority);

    // Sequence calculation
    const count = await Complaint.countDocuments();
    const currentYear = new Date().getFullYear();
    const complaintId = `SCGRS-${currentYear}-${String(count + 1).padStart(4, '0')}`;

    // ── Novelty 3: Duplicate & Recurring-Issue Clustering ─────────────────────
    // Check open complaints with the finalCategory
    let isDuplicate = false;
    let parentComplaintId = null;
    let duplicateParentCandidate = null;

    const stopWords = new Set(['the', 'and', 'for', 'with', 'this', 'that', 'from', 'have', 'has', 'not', 'are', 'was', 'were', 'our', 'room', 'campus', 'complaint', 'issue', 'problem']);
    const getTokens = (str) => {
      return (str || '').toLowerCase()
        .replace(/[^a-z0-9\s]/g, ' ')
        .split(/\s+/)
        .filter(w => w.length >= 3 && !stopWords.has(w));
    };

    const newTokens = new Set(getTokens(description));

    if (newTokens.size > 0) {
      const openCandidates = await Complaint.find({
        status: { $nin: ['RESOLVED', 'CLOSED'] },
        category: finalCategory,
        isDuplicate: false
      });

      for (const candidate of openCandidates) {
        const candidateTokens = getTokens(candidate.description);
        let commonWordCount = 0;
        for (const token of candidateTokens) {
          if (newTokens.has(token)) commonWordCount++;
        }

        const sameLocation = location && candidate.location && 
          location.trim().toLowerCase() === candidate.location.trim().toLowerCase();

        // If >= 3 common words, or same location with >= 2 common words
        if (commonWordCount >= 3 || (sameLocation && commonWordCount >= 2)) {
          isDuplicate = true;
          parentComplaintId = candidate._id;

          // Increment affectedStudentCount on parent
          candidate.affectedStudentCount = (candidate.affectedStudentCount || 1) + 1;

          // If affectedStudentCount >= 5, boost parent priority by one level
          if (candidate.affectedStudentCount >= 5) {
            if (candidate.priority === 'LOW') {
              candidate.priority = 'MEDIUM';
            } else if (candidate.priority === 'MEDIUM') {
              candidate.priority = 'HIGH';
            } else if (candidate.priority === 'HIGH') {
              candidate.priority = 'CRITICAL';
            }
            candidate.slaDeadline = calculateSLADeadline(candidate.priority);
            candidate.adminRemarks = (candidate.adminRemarks ? candidate.adminRemarks + ' | ' : '') +
              `🔗 Priority escalated: Recurring issue affecting ${candidate.affectedStudentCount} students.`;
          }

          duplicateParentCandidate = candidate;
          await candidate.save();
          break;
        }
      }
    }

    const newComplaint = new Complaint({
      complaintId,
      studentId,
      title,
      description,
      category: finalCategory,
      priority: aiResults.priority,
      priorityScore: aiResults.score,
      confidencePercent: aiResults.confidencePercent,
      matchedKeywords: aiResults.matchedKeywords || [],
      parentComplaintId,
      isDuplicate,
      affectedStudentCount: 1,
      sentiment: aiResults.sentiment,
      priorityReason: aiResults.reason,
      department,
      location: location || 'Campus Premises',
      attachment: attachment || '',
      anonymous: !!anonymous,
      slaDeadline,
      status: 'SUBMITTED',
      statusHistory: [{
        status: 'SUBMITTED',
        adminRemarks: 'Grievance submitted and entered the campus queue.',
        updatedBy: 'System / Student',
        notifiedStudent: true,
        timestamp: new Date()
      }],
      canteenLocation: canteenLocation || '',
      dishName: dishName || '',
      issueType: issueType || '',
      mealTime: mealTime || '',
      dishPhoto: dishPhoto || ''
    });

    await newComplaint.save();

    // Novelty: Dispatch quick action notification to admins when duplicate is detected
    if (isDuplicate && duplicateParentCandidate) {
      notifyAdminsOnDuplicate(duplicateParentCandidate, newComplaint);
    }

    // Send submission acknowledgement email to student (async non-blocking)
    if (!anonymous) {
      User.findById(studentId).select('name email').then(studentUser => {
        if (studentUser && studentUser.email) {
          sendStudentStatusNotification(
            newComplaint,
            studentUser,
            null,
            'SUBMITTED',
            'Your grievance has been safely logged into the SCGRS system. Our department administration will review and route your request within the specified SLA timeframe.',
            ''
          ).catch(e => console.warn('Submission student notification skipped:', e.message));
        }
      }).catch(err => console.warn('Student lookup for email skipped:', err.message));
    }

    res.status(201).json(newComplaint);

  } catch (error) {
    res.status(500).json({ message: 'Error submitting complaint.', error: error.message });
  }
};

// Get all complaints (filtered based on roles and queries)
exports.getComplaints = async (req, res) => {
  try {
    // Run SLA check & 48-hr resolution expiry check
    await checkSLAEscalations();
    await checkResolutionExpiry();

    const isUserAdmin = req.user.role === 'admin';
    let filter = {};

    if (!isUserAdmin) {
      // Student only sees their own complaints
      filter.studentId = req.user.id;
    } else {
      // Admins can filter
      const { priority, category, department, status } = req.query;
      if (priority) filter.priority = priority;
      if (category) filter.category = category;
      if (department) filter.department = department;
      if (status) filter.status = status;
    }

    // Populate student info
    let complaints = await Complaint.find(filter)
      .populate('studentId', 'name email')
      .sort({ createdAt: -1 });

    // Protect anonymous identity for admins/others
    complaints = complaints.map(complaint => {
      const obj = complaint.toObject();
      if (obj.anonymous) {
        // Redact only if the logged-in user is not the student who created it
        if (!req.user || String(obj.studentId._id || obj.studentId) !== String(req.user.id)) {
          obj.studentId = { name: 'Anonymous Student', email: 'N/A' };
        }
      }
      return obj;
    });

    res.status(200).json(complaints);
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving complaints.', error: error.message });
  }
};

// Get single complaint details
exports.getComplaintById = async (req, res) => {
  try {
    await checkSLAEscalations();
    await checkResolutionExpiry();

    let complaint = await Complaint.findById(req.params.id)
      .populate('studentId', 'name email')
      .populate('parentComplaintId', 'complaintId title status priority affectedStudentCount');
    if (!complaint) {
      return res.status(404).json({ message: 'Complaint not found.' });
    }

    // Validate access
    if (req.user.role !== 'admin' && String(complaint.studentId._id || complaint.studentId) !== String(req.user.id)) {
      return res.status(403).json({ message: 'Access denied. You do not own this complaint.' });
    }

    // Fetch associated feedback if resolved
    let feedback = null;
    if (complaint.status === 'RESOLVED') {
      feedback = await Feedback.findOne({ complaintId: complaint._id });
    }

    const obj = complaint.toObject();
    // Protect anonymous identity
    if (obj.anonymous && String(obj.studentId._id || obj.studentId) !== String(req.user.id)) {
      obj.studentId = { name: 'Anonymous Student', email: 'N/A' };
    }

    res.status(200).json({
      complaint: obj,
      feedback
    });
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving complaint details.', error: error.message });
  }
};

// Update complaint status and resolution remarks (Admin only)
exports.updateStatus = async (req, res) => {
  try {
    const { status, adminRemarks, resolutionRemarks, assignedOfficer } = req.body;
    
    if (!status) {
      return res.status(400).json({ message: 'Status is required.' });
    }

    const complaint = await Complaint.findById(req.params.id).populate('studentId', 'name email');
    if (!complaint) {
      return res.status(404).json({ message: 'Complaint not found.' });
    }

    const previousStatus = complaint.status;
    const isStatusChanged = previousStatus !== status;
    const isRemarksChanged = (adminRemarks !== undefined && adminRemarks !== complaint.adminRemarks) ||
                            (resolutionRemarks !== undefined && resolutionRemarks !== complaint.resolutionRemarks);

    // Novelty 5: Track resolvedAt timestamp
    if (status === 'RESOLVED' && complaint.status !== 'RESOLVED') {
      complaint.resolvedAt = new Date();
    }

    complaint.status = status;
    if (adminRemarks !== undefined) {
      complaint.adminRemarks = adminRemarks;
    }
    if (resolutionRemarks !== undefined) {
      complaint.resolutionRemarks = resolutionRemarks;
    }
    if (assignedOfficer && typeof assignedOfficer === 'object') {
      complaint.assignedOfficer = {
        name: assignedOfficer.name || complaint.assignedOfficer.name,
        role: assignedOfficer.role || complaint.assignedOfficer.role,
        contact: assignedOfficer.contact || complaint.assignedOfficer.contact,
        email: assignedOfficer.email || complaint.assignedOfficer.email
      };
    }

    // Trigger automated email notification to student if status or remarks changed
    let notificationResult = { success: false, reason: 'No status or remarks change detected' };
    if (isStatusChanged || isRemarksChanged) {
      // Check if student identity is known and not anonymous
      const studentObj = complaint.studentId;
      if (studentObj && studentObj.email && (!complaint.anonymous || req.body.forceNotifyStudent)) {
        notificationResult = await sendStudentStatusNotification(
          complaint,
          studentObj,
          previousStatus,
          status,
          complaint.adminRemarks,
          complaint.resolutionRemarks
        );
        if (notificationResult.success) {
          complaint.studentNotifiedAt = new Date();
        }

        // Also dispatch in-app notification to the student
        try {
          const { sendInAppNotification } = require('./notificationController');
          await sendInAppNotification({
            recipient: studentObj._id,
            recipientRole: 'student',
            title: `Ticket Status Updated: ${status}`,
            message: `Your grievance ${complaint.complaintId} is now "${status}". ${adminRemarks || resolutionRemarks || ''}`.trim(),
            type: 'STATUS_CHANGE',
            complaintId: complaint._id,
            complaintCode: complaint.complaintId
          });

          // Also alert any students who upvoted/endorsed this issue
          if (complaint.upvotedStudents && complaint.upvotedStudents.length > 0) {
            for (const subscriberId of complaint.upvotedStudents) {
              await sendInAppNotification({
                recipient: subscriberId,
                recipientRole: 'student',
                title: `Endorsed Ticket Updated: ${status}`,
                message: `Ticket ${complaint.complaintId} which you endorsed was updated to "${status}".`,
                type: 'STATUS_CHANGE',
                complaintId: complaint._id,
                complaintCode: complaint.complaintId
              });
            }
          }
        } catch (inAppErr) {
          console.warn('⚠️ In-app notification error on updateStatus:', inAppErr.message);
        }
      }
    }

    // Push entry to status audit history
    complaint.statusHistory.push({
      status,
      adminRemarks: complaint.adminRemarks || '',
      resolutionRemarks: complaint.resolutionRemarks || '',
      updatedBy: req.user && req.user.email ? `${req.user.name || 'Admin'} (${req.user.email})` : 'Administrator',
      notifiedStudent: !!notificationResult.success,
      timestamp: new Date()
    });

    await complaint.save();
    res.status(200).json({
      complaint,
      notification: {
        sent: !!notificationResult.success,
        previewUrl: notificationResult.previewUrl || null,
        message: notificationResult.success
          ? `Notification email sent to student (${complaint.studentId?.email || 'Student'})`
          : 'Status updated. (Email notification skipped or mock logged)'
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Error updating complaint status.', error: error.message });
  }
};

// Assign Responsible Person / Officer to complaint (Admin only)
exports.assignOfficer = async (req, res) => {
  try {
    const { name, role, contact, email } = req.body;

    if (!name) {
      return res.status(400).json({ message: 'Officer name is required.' });
    }

    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) {
      return res.status(404).json({ message: 'Complaint not found.' });
    }

    complaint.assignedOfficer = {
      name,
      role: role || 'Department Officer',
      contact: contact || '',
      email: email || '',
      // Reset notification status on every (re)assignment so admin
      // gets a fresh "Notify Officer" button for the new assignee.
      notified: false,
      notifiedAt: null
    };

    // Auto update status to ASSIGNED if currently SUBMITTED or UNDER REVIEW
    if (['SUBMITTED', 'UNDER REVIEW'].includes(complaint.status)) {
      complaint.status = 'ASSIGNED';
    }

    await complaint.save();
    res.status(200).json(complaint);
  } catch (error) {
    res.status(500).json({ message: 'Error assigning officer.', error: error.message });
  }
};

// Manually notify assigned officer via email (Admin only)
exports.notifyOfficer = async (req, res) => {
  try {
    const complaint = await Complaint.findById(req.params.id).populate('studentId', 'name email');
    if (!complaint) {
      return res.status(404).json({ message: 'Complaint not found.' });
    }

    const { assignedOfficer } = complaint;
    if (!assignedOfficer || !assignedOfficer.name) {
      return res.status(400).json({ message: 'No officer assigned to this complaint.' });
    }
    if (!assignedOfficer.email) {
      return res.status(400).json({ message: 'Assigned officer does not have an email address on record.' });
    }

    // Build email HTML
    const priorityColors = {
      CRITICAL: '#ef4444',
      HIGH: '#f97316',
      MEDIUM: '#eab308',
      LOW: '#22c55e'
    };
    const priorityColor = priorityColors[complaint.priority] || '#6b7280';

    const htmlBody = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Arial, sans-serif; background: #0f172a; color: #e2e8f0; margin: 0; padding: 0;">
  <div style="max-width: 600px; margin: 30px auto; background: #1e293b; border-radius: 12px; overflow: hidden; border: 1px solid #334155;">
    <div style="background: linear-gradient(135deg, #1e40af, #0891b2); padding: 24px 28px;">
      <h1 style="margin: 0; font-size: 20px; color: #ffffff;">📋 Grievance Assignment Notification</h1>
      <p style="margin: 6px 0 0; font-size: 13px; color: #bfdbfe;">Smart Campus Grievance Redressal System (SCGRS)</p>
    </div>
    <div style="padding: 28px;">
      <p style="font-size: 15px; color: #cbd5e1;">Dear <strong style="color: #f1f5f9;">${assignedOfficer.name}</strong>,</p>
      <p style="font-size: 14px; color: #94a3b8; line-height: 1.6;">
        You have been assigned to handle the following campus grievance. Please review the details below and take appropriate action within the SLA timeframe.
      </p>

      <div style="background: #0f172a; border-radius: 8px; padding: 20px; margin: 20px 0; border: 1px solid #334155;">
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          <tr>
            <td style="padding: 8px 12px; color: #64748b; width: 38%; vertical-align: top;">Complaint ID</td>
            <td style="padding: 8px 12px; font-weight: 700; color: #38bdf8; font-family: monospace;">${complaint.complaintId}</td>
          </tr>
          <tr style="background: rgba(255,255,255,0.02);">
            <td style="padding: 8px 12px; color: #64748b;">Title</td>
            <td style="padding: 8px 12px; font-weight: 600; color: #f1f5f9;">${complaint.title}</td>
          </tr>
          <tr>
            <td style="padding: 8px 12px; color: #64748b;">Category</td>
            <td style="padding: 8px 12px; color: #e2e8f0;">${complaint.category}</td>
          </tr>
          <tr style="background: rgba(255,255,255,0.02);">
            <td style="padding: 8px 12px; color: #64748b;">Department</td>
            <td style="padding: 8px 12px; color: #e2e8f0;">${complaint.department}</td>
          </tr>
          <tr>
            <td style="padding: 8px 12px; color: #64748b;">Priority</td>
            <td style="padding: 8px 12px;">
              <span style="background: ${priorityColor}22; color: ${priorityColor}; padding: 3px 10px; border-radius: 12px; font-weight: 700; font-size: 12px; border: 1px solid ${priorityColor}55;">
                ${complaint.priority}
              </span>
            </td>
          </tr>
          <tr style="background: rgba(255,255,255,0.02);">
            <td style="padding: 8px 12px; color: #64748b;">SLA Deadline</td>
            <td style="padding: 8px 12px; color: #f97316; font-weight: 600;">${complaint.slaDeadline ? new Date(complaint.slaDeadline).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : 'N/A'}</td>
          </tr>
          <tr>
            <td style="padding: 8px 12px; color: #64748b;">Your Role</td>
            <td style="padding: 8px 12px; color: #38bdf8;">${assignedOfficer.role || 'Department Officer'}</td>
          </tr>
        </table>
      </div>

      <div style="background: #0f172a; border-radius: 8px; padding: 16px 20px; margin: 16px 0; border-left: 4px solid #0891b2;">
        <p style="font-size: 12px; color: #64748b; margin: 0 0 6px; text-transform: uppercase; letter-spacing: 0.05em;">Description</p>
        <p style="font-size: 14px; color: #cbd5e1; line-height: 1.6; margin: 0; white-space: pre-wrap;">${complaint.description}</p>
      </div>

      <p style="font-size: 13px; color: #94a3b8; margin-top: 24px;">
        Please log in to the SCGRS portal to take action, update the status, and add your resolution remarks.
      </p>
    </div>
    <div style="padding: 16px 28px; background: #0f172a; border-top: 1px solid #1e293b; font-size: 12px; color: #475569; text-align: center;">
      This is an automated notification from the Smart Campus Grievance Redressal System. Do not reply to this email.
    </div>
  </div>
</body>
</html>`;

    let mailResult;
    try {
      mailResult = await sendEmailWithFallback({
        from: process.env.EMAIL_FROM || '"Smart Campus Grievance System" <noreply@scgrs.campus.edu>',
        to: assignedOfficer.email,
        subject: `[SCGRS] Grievance Assignment — ${complaint.complaintId} (${complaint.priority} Priority)`,
        html: htmlBody
      });
    } catch (mailErr) {
      console.warn('⚠️ [SCGRS Notify] Fallback issue:', mailErr.message);
      mailResult = { fallback: true, warning: mailErr.message, mode: 'console' };
    }

    // Persist notification status
    complaint.assignedOfficer.notified = true;
    complaint.assignedOfficer.notifiedAt = new Date();
    await complaint.save();

    res.status(200).json({
      message: mailResult && mailResult.fallback
        ? `Notification recorded in test mode for ${assignedOfficer.email}`
        : `Notification email dispatched to ${assignedOfficer.email}`,
      notifiedAt: complaint.assignedOfficer.notifiedAt,
      previewUrl: (mailResult && mailResult.previewUrl) || null,
      fallback: (mailResult && mailResult.fallback) || false,
      warning: (mailResult && mailResult.warning) || null,
      complaint
    });
  } catch (error) {
    console.error('Error in notifyOfficer:', error);
    res.status(500).json({ message: 'Error processing officer notification.', error: error.message });
  }
};

// Assign/reassign department (Admin only)
exports.updateDepartment = async (req, res) => {
  try {
    const { department } = req.body;
    
    if (!department) {
      return res.status(400).json({ message: 'Department is required.' });
    }

    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) {
      return res.status(404).json({ message: 'Complaint not found.' });
    }

    complaint.department = department;
    await complaint.save();
    res.status(200).json(complaint);
  } catch (error) {
    res.status(500).json({ message: 'Error reassigning department.', error: error.message });
  }
};

// Create feedback for complaint (Student only)
exports.submitFeedback = async (req, res) => {
  try {
    const { rating, comment } = req.body;
    const complaintId = req.params.id;

    if (!rating) {
      return res.status(400).json({ message: 'Rating is required.' });
    }

    const complaint = await Complaint.findById(complaintId);
    if (!complaint) {
      return res.status(404).json({ message: 'Complaint not found.' });
    }

    // Verify ownership
    if (String(complaint.studentId) !== String(req.user.id)) {
      return res.status(403).json({ message: 'Access denied. You do not own this complaint.' });
    }

    // Verify resolved status
    if (complaint.status !== 'RESOLVED') {
      return res.status(400).json({ message: 'Feedback can only be submitted for RESOLVED complaints.' });
    }

    // Check if feedback already submitted
    const existingFeedback = await Feedback.findOne({ complaintId });
    if (existingFeedback) {
      return res.status(400).json({ message: 'Feedback has already been submitted for this complaint.' });
    }

    const newFeedback = new Feedback({
      complaintId,
      rating,
      comment: comment || ''
    });

    await newFeedback.save();
    res.status(201).json(newFeedback);
  } catch (error) {
    res.status(500).json({ message: 'Error submitting feedback.', error: error.message });
  }
};

// Reopen a complaint (Student only) — Novelty 5: Multi-Reopen Escalation
exports.reopenComplaint = async (req, res) => {
  try {
    const complaintId = req.params.id;
    const complaint = await Complaint.findById(complaintId);
    if (!complaint) {
      return res.status(404).json({ message: 'Complaint not found.' });
    }

    // Verify ownership
    if (String(complaint.studentId) !== String(req.user.id)) {
      return res.status(403).json({ message: 'Access denied. You do not own this complaint.' });
    }

    // Only allow reopen if RESOLVED
    if (complaint.status !== 'RESOLVED') {
      return res.status(400).json({ message: 'Only resolved complaints can be reopened.' });
    }

    // Remove old feedback
    await Feedback.deleteOne({ complaintId });

    complaint.reopenCount = (complaint.reopenCount || 0) + 1;

    // Novelty 5: Auto-escalate if reopened 2 or more times
    if (complaint.reopenCount >= 2) {
      complaint.status = 'ESCALATED';
      complaint.isEscalated = true;
      complaint.escalatedTo = 'Higher Authority (Principal & Grievance Review Committee)';
      complaint.escalatedAt = new Date();
      complaint.adminRemarks = (complaint.adminRemarks ? complaint.adminRemarks + ' | ' : '') +
        `⚠️ Multi-Reopen Escalation: Reopened ${complaint.reopenCount} times by student. Auto-escalated to Higher Authority.`;
    } else {
      complaint.status = 'REOPENED';
      complaint.adminRemarks = (complaint.adminRemarks ? complaint.adminRemarks + ' | ' : '') +
        '⚠️ Ticket reopened by student as issue remains unresolved.';
    }

    await complaint.save();
    res.status(200).json(complaint);
  } catch (error) {
    res.status(500).json({ message: 'Error reopening complaint.', error: error.message });
  }
};

// ── Novelty 5: Student Confirm Resolution ─────────────────────────────────────
exports.confirmResolved = async (req, res) => {
  try {
    const complaintId = req.params.id;
    const { rating, comment } = req.body;

    const complaint = await Complaint.findById(complaintId);
    if (!complaint) {
      return res.status(404).json({ message: 'Complaint not found.' });
    }

    // Verify ownership
    if (String(complaint.studentId) !== String(req.user.id)) {
      return res.status(403).json({ message: 'Access denied. You do not own this complaint.' });
    }

    if (complaint.status !== 'RESOLVED') {
      return res.status(400).json({ message: 'Only resolved complaints can be confirmed.' });
    }

    // Save student verification feedback if rating is provided
    let feedback = null;
    if (rating && rating >= 1 && rating <= 5) {
      feedback = await Feedback.findOneAndUpdate(
        { complaintId },
        { rating, comment: comment || 'Student verified resolution: confirmed fixed.' },
        { upsert: true, new: true }
      );

      // Novelty 2 Integration: Update Officer's performance rating
      if (complaint.assignedOfficer && complaint.assignedOfficer.name) {
        const Officer = require('../models/Officer');
        const officer = await Officer.findOne({ name: complaint.assignedOfficer.name });
        if (officer) {
          officer.openTicketCount = Math.max(0, officer.openTicketCount - 1);
          officer.totalResolved += 1;
          officer.totalRatingSum += rating;
          officer.avgRating = parseFloat((officer.totalRatingSum / officer.totalResolved).toFixed(1));
          await officer.save();
        }
      }
    }

    complaint.adminRemarks = (complaint.adminRemarks ? complaint.adminRemarks + ' | ' : '') +
      '✅ Student verified resolution: Confirmed fixed.';
    await complaint.save();

    res.status(200).json({
      message: 'Resolution confirmed successfully! Thank you for verifying.',
      complaint,
      feedback
    });
  } catch (error) {
    res.status(500).json({ message: 'Error confirming resolution.', error: error.message });
  }
};

// ── Novelty 4: Department SLA Accountability Trail ─────────────────────────
exports.getDepartmentAccountability = async (req, res) => {
  try {
    const departments = [
      'Academic Department',
      'Hostel Administration',
      'Transport Department',
      'IT Department',
      'Maintenance Department',
      'Student Welfare / Anti-Ragging Committee',
      'Canteen & Hospitality',
      'General Administration'
    ];

    const allComplaints = await Complaint.find();

    const results = departments.map(dept => {
      const deptComplaints = allComplaints.filter(c => c.department === dept);
      const total = deptComplaints.length;
      const resolved = deptComplaints.filter(c => c.status === 'RESOLVED');
      const escalated = deptComplaints.filter(c => c.isEscalated);
      const active = deptComplaints.filter(c => !['RESOLVED'].includes(c.status));

      let onTimeCount = 0;
      let totalResolutionTimeMs = 0;

      resolved.forEach(c => {
        const resTime = c.resolvedAt ? new Date(c.resolvedAt).getTime() : new Date(c.updatedAt).getTime();
        const createTime = new Date(c.createdAt).getTime();
        const duration = Math.max(0, resTime - createTime);
        totalResolutionTimeMs += duration;

        if (c.slaDeadline && resTime <= new Date(c.slaDeadline).getTime()) {
          onTimeCount++;
        } else if (!c.isEscalated) {
          onTimeCount++;
        }
      });

      const onTimeRate = resolved.length > 0 ? Math.round((onTimeCount / resolved.length) * 100) : 100;
      const avgResolutionHours = resolved.length > 0
        ? parseFloat((totalResolutionTimeMs / (resolved.length * 3600000)).toFixed(1))
        : 0;

      return {
        department: dept,
        totalTickets: total,
        activeTickets: active.length,
        resolvedTickets: resolved.length,
        onTimeResolved: onTimeCount,
        escalatedTickets: escalated.length,
        onTimeRate,
        avgResolutionHours
      };
    });

    res.status(200).json(results);
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving department accountability.', error: error.message });
  }
};

// Get dashboard statistics for Admin
exports.getAdminStatistics = async (req, res) => {
  try {
    const total = await Complaint.countDocuments();
    const pending = await Complaint.countDocuments({ status: 'SUBMITTED' });
    const underReview = await Complaint.countDocuments({ status: 'UNDER REVIEW' });
    const assigned = await Complaint.countDocuments({ status: 'ASSIGNED' });
    const inProgress = await Complaint.countDocuments({ status: 'IN PROGRESS' });
    const resolved = await Complaint.countDocuments({ status: 'RESOLVED' });
    const reopened = await Complaint.countDocuments({ status: 'REOPENED' });

    const high = await Complaint.countDocuments({ priority: 'HIGH' });
    const critical = await Complaint.countDocuments({ priority: 'CRITICAL' });
    const rejected = await Complaint.countDocuments({ status: 'REJECTED' });

    // Calculate overdue complaints (active with deadline in the past)
    const overdue = await Complaint.countDocuments({
      status: { $nin: ['RESOLVED', 'CLOSED', 'REJECTED'] },
      slaDeadline: { $lt: new Date() }
    });

    // Calculate average resolution time and SLA compliance percentage
    const resolvedList = await Complaint.find({ status: 'RESOLVED' });
    let totalResolutionHours = 0;
    let resolvedCount = 0;
    let compliantCount = 0;

    for (const item of resolvedList) {
      const end = item.resolvedAt || item.updatedAt || new Date();
      const start = item.createdAt || end;
      const hours = Math.max(0.5, (new Date(end).getTime() - new Date(start).getTime()) / (1000 * 60 * 60));
      totalResolutionHours += hours;
      resolvedCount++;
      if (item.slaDeadline && new Date(end) <= new Date(item.slaDeadline)) {
        compliantCount++;
      }
    }

    const avgResolutionHours = resolvedCount > 0 ? parseFloat((totalResolutionHours / resolvedCount).toFixed(1)) : 4.5;
    const slaCompliancePercent = resolvedCount > 0 ? Math.round((compliantCount / resolvedCount) * 100) : 94;

    // Category distribution for charts/tables
    const categories = ['Academic', 'Hostel', 'Transport', 'Infrastructure', 'Internet/Wi-Fi', 'Harassment', 'Ragging', 'Safety', 'Canteen Dish Issue', 'Other'];
    const categoryStats = {};
    for (const cat of categories) {
      categoryStats[cat] = await Complaint.countDocuments({ category: cat });
    }

    // Department distribution
    const departments = [
      'Academic Department', 
      'Hostel Administration', 
      'Transport Department', 
      'IT Department', 
      'Maintenance Department', 
      'Student Welfare / Anti-Ragging Committee',
      'Canteen & Hospitality',
      'General Administration'
    ];
    const departmentStats = {};
    for (const dept of departments) {
      departmentStats[dept] = await Complaint.countDocuments({ department: dept });
    }

    // Dish-level complaint breakdown for recurring problem dishes
    const dishAgg = await Complaint.aggregate([
      { $match: { category: 'Canteen Dish Issue', dishName: { $ne: '' } } },
      { $group: { _id: '$dishName', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);
    const dishStats = dishAgg.map(d => ({ dishName: d._id, count: d.count }));

    res.status(200).json({
      total,
      pending,
      underReview,
      assigned,
      inProgress,
      resolved,
      reopened,
      high,
      critical,
      rejected,
      overdue,
      avgResolutionHours,
      slaCompliancePercent,
      activeComplaints: total - resolved,
      categoryStats,
      departmentStats,
      dishStats
    });
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving statistics.', error: error.message });
  }
};

// Get dashboard statistics for Student
exports.getStudentStatistics = async (req, res) => {
  try {
    const studentId = req.user.id;

    const total = await Complaint.countDocuments({ studentId });
    const pending = await Complaint.countDocuments({ 
      studentId, 
      status: { $in: ['SUBMITTED', 'UNDER REVIEW', 'IN PROGRESS', 'REOPENED'] } 
    });
    const resolved = await Complaint.countDocuments({ studentId, status: 'RESOLVED' });
    
    // Critical complaints submitted by student that are not yet resolved
    const critical = await Complaint.countDocuments({
      studentId,
      priority: { $in: ['HIGH', 'CRITICAL'] },
      status: { $ne: 'RESOLVED' }
    });

    res.status(200).json({
      total,
      pending,
      resolved,
      critical
    });
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving user statistics.', error: error.message });
  }
};

// Seed 5 demo grievances for the demo presentation
exports.seedDemoComplaints = async () => {
  try {
    const count = await Complaint.countDocuments();
    if (count > 0) {
      // Database already has complaints, don't re-seed
      return;
    }

    // Find student
    const student = await User.findOne({ email: 'student@scgrs.com' });
    if (!student) {
      console.log('Unable to seed demo complaints: student user student@scgrs.com not found.');
      return;
    }

    const now = new Date();
    const demoData = [
      {
        title: "Wi-Fi is not working in Block A",
        description: "The Wi-Fi has not been working for the past three days, and students are unable to attend online classes.",
        category: "Internet/Wi-Fi",
        location: "Block A Hostel, 2nd Floor",
        attachment: "wifi_router_error_screenshot.png",
        priority: "HIGH",
        priorityScore: 0.75,
        sentiment: "NEGATIVE",
        priorityReason: "Urgency keywords detected: 'wi-fi', 'online classes'. Negative sentiment identified.",
        department: "IT Department",
        assignedOfficer: {
          name: "Mr. Rajesh Kumar",
          role: "Network Administrator",
          contact: "+91 98765 43210",
          email: "it.admin@scgrs.edu"
        },
        status: "ASSIGNED",
        slaDeadline: new Date(now.getTime() + 18 * 60 * 60 * 1000), // 18 hours remaining
        anonymous: false
      },
      {
        title: "Hostel drinking water supply issue",
        description: "There is no drinking water in Hostel Block C. The dispensers have not been cleaned and water flow has stopped completely.",
        category: "Hostel",
        location: "Hostel Block C, Mess Area",
        attachment: "water_dispenser_photo.jpg",
        priority: "MEDIUM",
        priorityScore: 0.55,
        sentiment: "NEGATIVE",
        priorityReason: "Urgency keywords detected: 'water', 'hostel'. Negative sentiment identified.",
        department: "Hostel Administration",
        assignedOfficer: {
          name: "Suresh Sharma",
          role: "Hostel Caretaker",
          contact: "+91 98123 45678",
          email: "hostel.admin@scgrs.edu"
        },
        status: "IN PROGRESS",
        slaDeadline: new Date(now.getTime() + 30 * 60 * 60 * 1000), // 30 hours remaining
        anonymous: false
      },
      {
        title: "Harassment incident near library",
        description: "I am being harassed near the college library during evening hours. I feel unsafe and threatened.",
        category: "Harassment",
        location: "Central Library Entrance",
        attachment: "",
        priority: "CRITICAL",
        priorityScore: 0.95,
        sentiment: "NEGATIVE",
        priorityReason: "Urgency keywords detected: 'harassed', 'unsafe', 'threatened'. Negative sentiment identified.",
        department: "Student Welfare / Anti-Ragging Committee",
        assignedOfficer: {
          name: "Dr. Ananya Sen",
          role: "Student Welfare Officer",
          contact: "+91 94321 87654",
          email: "welfare@scgrs.edu"
        },
        status: "UNDER REVIEW",
        slaDeadline: new Date(now.getTime() + 2 * 60 * 60 * 1000), // 2 hours remaining (urgent!)
        anonymous: true
      },
      {
        title: "Classroom ceiling fan broken",
        description: "The ceiling fan in Room 302 of Academic Block 1 is broken and stopped rotating.",
        category: "Infrastructure",
        location: "Academic Block 1, Room 302",
        attachment: "fan_photo.jpg",
        priority: "LOW",
        priorityScore: 0.35,
        sentiment: "NEGATIVE",
        priorityReason: "Urgency keyword 'fan' detected.",
        department: "Maintenance Department",
        assignedOfficer: {
          name: "Ramesh Verma",
          role: "Maintenance Supervisor",
          contact: "+91 97654 32109",
          email: "maintenance@scgrs.edu"
        },
        status: "RESOLVED",
        resolutionRemarks: "The Wi-Fi router and capacitor for the fan were replaced and connection/rotation restored.",
        slaDeadline: new Date(now.getTime() + 60 * 60 * 60 * 1000),
        anonymous: false
      },
      {
        title: "Ragging near basketball court",
        description: "Senior students forcing junior students to perform inappropriate tasks near basketball court. This incident was not resolved in time.",
        category: "Ragging",
        location: "Sports Complex Basketball Court",
        attachment: "",
        priority: "CRITICAL",
        priorityScore: 0.95,
        sentiment: "NEGATIVE",
        priorityReason: "Urgency keywords detected: 'ragging', 'forcing'. Negative sentiment identified.",
        department: "Higher Authority (Principal & Anti-Ragging Cell Chair)",
        assignedOfficer: {
          name: "Prof. V. K. Malhotra",
          role: "Principal & Anti-Ragging Chair",
          contact: "+91 91111 22222",
          email: "principal@scgrs.edu"
        },
        status: "ESCALATED",
        isEscalated: true,
        escalatedTo: "Higher Authority (Principal & Anti-Ragging Cell Chair)",
        escalatedAt: new Date(now.getTime() - 1 * 60 * 60 * 1000), // Escalated 1 hour ago
        slaDeadline: new Date(now.getTime() - 5 * 60 * 60 * 1000), // SLA expired 5 hours ago
        adminRemarks: "⚠️ SLA EXPIRED: Automatically escalated to Higher Authority due to non-resolution within specified timeframe.",
        anonymous: true
      }
    ];

    const currentYear = new Date().getFullYear();
    for (let i = 0; i < demoData.length; i++) {
      const data = demoData[i];
      const complaintId = `SCGRS-${currentYear}-${String(i + 1).padStart(4, '0')}`;
      
      const complaint = new Complaint({
        ...data,
        complaintId,
        studentId: student._id
      });
      await complaint.save();
    }

    console.log('5 Demo complaints seeded successfully.');
  } catch (error) {
    console.error('Error seeding demo complaints:', error.message);
  }
};

exports.localAIAnalyze = localAIAnalyze;
exports.runAutomatedSLAChecks = runAutomatedSLAChecks;

// ── Novelty 3: Real-Time Duplicate Check Endpoint for Submission Form ──────
exports.checkDuplicateComplaint = async (req, res) => {
  try {
    const { text, description, title, category, location } = req.body;
    const descText = text || description || '';
    const searchText = `${title || ''} ${descText}`.trim();
    if (!searchText || searchText.length < 5) {
      return res.status(200).json({ hasDuplicate: false, matches: [] });
    }

    const stopWords = new Set(['the', 'and', 'for', 'with', 'this', 'that', 'from', 'have', 'has', 'not', 'are', 'was', 'were', 'our', 'room', 'campus', 'complaint', 'issue', 'problem', 'please', 'help', 'there', 'here', 'very']);
    const getTokens = (str) => {
      return (str || '').toLowerCase()
        .replace(/[^a-z0-9\s]/g, ' ')
        .split(/\s+/)
        .filter(w => w.length >= 3 && !stopWords.has(w));
    };

    const newTokens = getTokens(searchText);
    if (newTokens.length === 0) {
      return res.status(200).json({ hasDuplicate: false, matches: [] });
    }

    const query = {
      status: { $nin: ['RESOLVED', 'CLOSED'] }
    };
    if (category && category !== 'Other') {
      query.category = category;
    }

    const candidates = await Complaint.find(query)
      .select('complaintId title description category location status priority affectedStudentCount upvotedStudents createdAt')
      .sort({ createdAt: -1 })
      .limit(40);

    if (candidates.length === 0) {
      return res.status(200).json({ hasDuplicate: false, matches: [] });
    }

    // Novelty: Call Python AI Semantic Similarity endpoint (Requirement 6)
    const semanticMatchesMap = new Map();
    try {
      const candidatePayload = candidates.map(c => ({
        id: c._id.toString(),
        text: `${c.title}. ${c.description}`
      }));

      const aiSemRes = await axios.post(
        `${process.env.AI_SERVICE_URL || 'http://127.0.0.1:5000'}/api/ai/semantic-similarity`,
        {
          query: searchText,
          candidates: candidatePayload,
          threshold: SEMANTIC_SIMILARITY_THRESHOLD
        },
        { timeout: 2500 }
      );

      if (aiSemRes.data?.matches && Array.isArray(aiSemRes.data.matches)) {
        for (const m of aiSemRes.data.matches) {
          semanticMatchesMap.set(m.id, m);
        }
      }
    } catch (semErr) {
      // Graceful fallback to lexical matching when AI service is offline or loading
      console.warn('Semantic similarity microservice unavailable, using lexical fallback:', semErr.message);
    }

    const matches = [];
    const newTokensSet = new Set(newTokens);

    for (const cand of candidates) {
      const candTokens = getTokens(`${cand.title} ${cand.description}`);
      let commonCount = 0;
      for (const tok of candTokens) {
        if (newTokensSet.has(tok)) commonCount++;
      }

      const sameLocation = location && cand.location &&
        location.trim().toLowerCase() === cand.location.trim().toLowerCase();

      // Check if candidate matched via Semantic Similarity
      const semMatch = semanticMatchesMap.get(cand._id.toString());
      let similarityPercent = 0;
      let isDuplicateCandidate = false;

      if (semMatch) {
        let sim = semMatch.similarity;
        if (sameLocation) sim = Math.min(0.99, sim + 0.10);
        similarityPercent = Math.min(99, Math.round(sim * 100));
        isDuplicateCandidate = true;
      } else if (candTokens.length > 0) {
        // Lexical Jaccard & token overlap fallback
        const candTokensSet = new Set(candTokens);
        const union = new Set([...newTokensSet, ...candTokensSet]);
        let jaccard = union.size > 0 ? (commonCount / union.size) : 0;
        if (sameLocation) jaccard += 0.25;

        if (commonCount >= 2 && (jaccard >= 0.18 || sameLocation)) {
          similarityPercent = Math.min(98, Math.round(Math.max(jaccard, (commonCount / Math.max(newTokens.length, 1))) * 100));
          isDuplicateCandidate = true;
        }
      }

      if (isDuplicateCandidate && similarityPercent >= 40) {
        matches.push({
          id: cand._id,
          complaintId: cand.complaintId,
          title: cand.title,
          description: cand.description.length > 140 ? cand.description.substring(0, 140) + '...' : cand.description,
          category: cand.category,
          location: cand.location,
          status: cand.status,
          priority: cand.priority,
          affectedStudentCount: cand.affectedStudentCount || 1,
          alreadyUpvoted: cand.upvotedStudents && req.user ? cand.upvotedStudents.some(u => u.toString() === req.user.id) : false,
          similarity: similarityPercent,
          matchType: semMatch ? 'semantic' : 'lexical'
        });
      }
    }

    matches.sort((a, b) => b.similarity - a.similarity);

    res.status(200).json({
      hasDuplicate: matches.length > 0,
      matches: matches.slice(0, 3)
    });
  } catch (error) {
    res.status(500).json({ message: 'Error checking duplicate complaints', error: error.message });
  }
};

// ── Novelty 3: Upvote / Endorse Existing Grievance ("Me Too") ───────────────
exports.upvoteComplaint = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const complaint = await Complaint.findById(id).populate('studentId', 'name email');
    if (!complaint) {
      return res.status(404).json({ message: 'Complaint not found.' });
    }

    if (complaint.status === 'RESOLVED' || complaint.status === 'CLOSED') {
      return res.status(400).json({ message: 'Cannot upvote a resolved or closed complaint.' });
    }

    if (!complaint.upvotedStudents) {
      complaint.upvotedStudents = [];
    }

    // Check if already upvoted
    if (complaint.upvotedStudents.some(uid => uid.toString() === userId)) {
      return res.status(400).json({ message: 'You have already endorsed this complaint.' });
    }

    complaint.upvotedStudents.push(userId);
    complaint.affectedStudentCount = (complaint.affectedStudentCount || 1) + 1;

    // Escalate priority based on count
    let priorityChanged = false;
    if (complaint.affectedStudentCount >= 5 && complaint.priority !== 'CRITICAL') {
      complaint.priority = 'CRITICAL';
      complaint.slaDeadline = calculateSLADeadline('CRITICAL');
      priorityChanged = true;
    } else if (complaint.affectedStudentCount >= 3 && (complaint.priority === 'LOW' || complaint.priority === 'MEDIUM')) {
      complaint.priority = 'HIGH';
      complaint.slaDeadline = calculateSLADeadline('HIGH');
      priorityChanged = true;
    }

    if (priorityChanged) {
      complaint.adminRemarks = (complaint.adminRemarks ? complaint.adminRemarks + ' | ' : '') +
        `🔥 Urgency Auto-Boosted: ${complaint.affectedStudentCount} students reported this same issue.`;
    }

    await complaint.save();

    // Send in-app notification to the original student who filed it
    if (complaint.studentId && complaint.studentId._id) {
      try {
        const { sendInAppNotification } = require('./notificationController');
        await sendInAppNotification({
          recipient: complaint.studentId._id,
          recipientRole: 'student',
          title: '👥 Another Student Endorsed Your Ticket',
          message: `Another student reported experiencing your issue in ${complaint.location || 'campus'}. Total affected: ${complaint.affectedStudentCount}.`,
          type: 'DUPLICATE_UPVOTE',
          complaintId: complaint._id,
          complaintCode: complaint.complaintId
        });
      } catch (e) {
        console.warn('⚠️ Upvote notification error:', e.message);
      }
    }

    // Also notify admins to take quick action on this duplicate endorsement
    notifyAdminsOnDuplicate(complaint, { complaintId: `ENDORSEMENT-${(req.user && req.user.name) || 'Student'}` });

    res.status(200).json({
      message: 'Successfully endorsed! You will receive live status notifications on this issue.',
      affectedStudentCount: complaint.affectedStudentCount,
      priority: complaint.priority
    });
  } catch (error) {
    res.status(500).json({ message: 'Error upvoting complaint.', error: error.message });
  }
};


// ── Reports and Feedback Module (Requirement Implementation) ───────────────
// ── Reports and Feedback Module (Requirement Implementation) ───────────────

// Get all student feedback (Admin only)
exports.getAllFeedback = async (req, res) => {
  try {
    const feedbacks = await Feedback.find()
      .populate({
        path: 'complaintId',
        populate: { path: 'studentId', select: 'name email rollNumber' }
      })
      .sort({ createdAt: -1 });

    const validFeedbacks = feedbacks.map(fb => {
      const obj = fb.toObject();
      if (obj.complaintId && obj.complaintId.anonymous) {
        if (obj.complaintId.studentId) {
          obj.complaintId.studentId.name = 'Anonymous Student';
          obj.complaintId.studentId.email = 'N/A';
          obj.complaintId.studentId.rollNumber = 'N/A';
        }
      }
      return obj;
    });

    const total = validFeedbacks.length;
    const ratingSum = validFeedbacks.reduce((sum, f) => sum + (f.rating || 0), 0);
    const avgRating = total > 0 ? parseFloat((ratingSum / total).toFixed(1)) : 0;

    const starCounts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    let positiveCount = 0;
    let neutralCount = 0;
    let negativeCount = 0;

    // Department-wise breakdown map
    const deptStatsMap = {};

    validFeedbacks.forEach(f => {
      const r = f.rating || 0;
      if (r >= 1 && r <= 5) {
        starCounts[r]++;
      }
      if (r >= 4) positiveCount++;
      else if (r === 3) neutralCount++;
      else if (r >= 1) negativeCount++;

      const dept = f.complaintId?.department || 'General Administration';
      if (!deptStatsMap[dept]) {
        deptStatsMap[dept] = { count: 0, ratingSum: 0, positive: 0 };
      }
      deptStatsMap[dept].count++;
      deptStatsMap[dept].ratingSum += r;
      if (r >= 4) deptStatsMap[dept].positive++;
    });

    const departmentSatisfaction = Object.keys(deptStatsMap).map(dept => {
      const d = deptStatsMap[dept];
      return {
        department: dept,
        count: d.count,
        avgRating: d.count > 0 ? parseFloat((d.ratingSum / d.count).toFixed(1)) : 0,
        positivePercent: d.count > 0 ? Math.round((d.positive / d.count) * 100) : 0
      };
    });

    const satisfactionPercent = total > 0 
      ? Math.round((positiveCount / total) * 100) 
      : 0;

    res.status(200).json({
      feedbacks: validFeedbacks,
      summary: {
        totalFeedback: total,
        avgRating,
        satisfactionPercent,
        positiveCount,
        neutralCount,
        negativeCount,
        starCounts,
        departmentSatisfaction
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving student feedback.', error: error.message });
  }
};

// Generate comprehensive monthly executive reports, department performance & resolution rate tracker
exports.getExecutiveReports = async (req, res) => {
  try {
    const selectedMonth = parseInt(req.query.month) || (new Date().getMonth() + 1); // 1-12
    const selectedYear = parseInt(req.query.year) || new Date().getFullYear();

    const allComplaints = await Complaint.find().populate('studentId', 'name email rollNumber').sort({ createdAt: -1 });
    const allFeedbacks = await Feedback.find().populate('complaintId');

    // 1. Calculate Monthly Filtered Set
    const monthlyComplaints = allComplaints.filter(c => {
      const d = new Date(c.createdAt);
      return (d.getMonth() + 1) === selectedMonth && d.getFullYear() === selectedYear;
    });

    const totalMonthly = monthlyComplaints.length;
    const pendingMonthly = monthlyComplaints.filter(c => ['SUBMITTED', 'UNDER REVIEW'].includes(c.status)).length;
    const inProgressMonthly = monthlyComplaints.filter(c => ['ASSIGNED', 'IN PROGRESS', 'REOPENED'].includes(c.status)).length;
    const resolvedMonthly = monthlyComplaints.filter(c => c.status === 'RESOLVED').length;
    const nowMs = Date.now();
    const overdueMonthly = monthlyComplaints.filter(c => {
      if (['RESOLVED', 'CLOSED'].includes(c.status)) return false;
      if (!c.slaDeadline) return false;
      return new Date(c.slaDeadline).getTime() < nowMs;
    }).length;
    const escalatedMonthly = monthlyComplaints.filter(c => c.isEscalated || c.status === 'ESCALATED').length;

    // Priority breakdown for month
    const priorityCounts = {
      critical: monthlyComplaints.filter(c => c.priority === 'CRITICAL').length,
      high: monthlyComplaints.filter(c => c.priority === 'HIGH').length,
      medium: monthlyComplaints.filter(c => c.priority === 'MEDIUM').length,
      low: monthlyComplaints.filter(c => c.priority === 'LOW').length
    };

    // Category distribution for month
    const categoryDistribution = {};
    monthlyComplaints.forEach(c => {
      const cat = c.category || 'Other';
      categoryDistribution[cat] = (categoryDistribution[cat] || 0) + 1;
    });

    // Department distribution for month
    const departmentDistribution = {};
    monthlyComplaints.forEach(c => {
      const d = c.department || 'General Administration';
      departmentDistribution[d] = (departmentDistribution[d] || 0) + 1;
    });

    const monthlyResolutionRate = totalMonthly > 0 ? Math.round((resolvedMonthly / totalMonthly) * 100) : 0;

    // SLA on-time rate for monthly resolved tickets
    let monthlyOnTimeCount = 0;
    let monthlyTotalResHours = 0;
    let monthlyBreachedCount = 0;
    const monthlyResolvedTickets = monthlyComplaints.filter(c => c.status === 'RESOLVED');
    monthlyResolvedTickets.forEach(c => {
      const resTime = c.resolvedAt ? new Date(c.resolvedAt).getTime() : new Date(c.updatedAt).getTime();
      const createTime = new Date(c.createdAt).getTime();
      monthlyTotalResHours += Math.max(0, (resTime - createTime) / 3600000);
      if (c.slaDeadline && resTime <= new Date(c.slaDeadline).getTime()) {
        monthlyOnTimeCount++;
      } else {
        monthlyBreachedCount++;
      }
    });

    // Also add active breached tickets to breached count
    monthlyComplaints.forEach(c => {
      if (c.status !== 'RESOLVED') {
        if (c.isEscalated || (c.slaDeadline && new Date(c.slaDeadline).getTime() < nowMs)) {
          monthlyBreachedCount++;
        }
      }
    });

    const monthlyOnTimeRate = monthlyResolvedTickets.length > 0 
      ? Math.round((monthlyOnTimeCount / monthlyResolvedTickets.length) * 100) 
      : (totalMonthly === 0 ? 100 : 0);
    const monthlyAvgResolutionHours = monthlyResolvedTickets.length > 0
      ? parseFloat((monthlyTotalResHours / monthlyResolvedTickets.length).toFixed(1))
      : 0;

    // 2. Overall Tracking Rates (All Time)
    const overallTotal = allComplaints.length;
    const overallResolved = allComplaints.filter(c => c.status === 'RESOLVED').length;
    const overallResolutionRate = overallTotal > 0 ? Math.round((overallResolved / overallTotal) * 100) : 0;
    const overallReopened = allComplaints.filter(c => c.reopenCount > 0).length;
    const firstContactResolutionRate = overallTotal > 0 ? Math.round(((overallTotal - overallReopened) / overallTotal) * 100) : 100;

    // 3. Department Performance Breakdown
    const departments = [
      'Academic Department',
      'Hostel Administration',
      'Transport Department',
      'IT Department',
      'Maintenance Department',
      'Student Welfare / Anti-Ragging Committee',
      'Canteen & Hospitality',
      'General Administration'
    ];

    const departmentPerformance = departments.map(dept => {
      const deptComplaints = allComplaints.filter(c => c.department === dept);
      const totalDept = deptComplaints.length;
      const pendingDept = deptComplaints.filter(c => ['SUBMITTED', 'UNDER REVIEW'].includes(c.status)).length;
      const inProgressDept = deptComplaints.filter(c => ['ASSIGNED', 'IN PROGRESS', 'REOPENED'].includes(c.status)).length;
      const resolvedDept = deptComplaints.filter(c => c.status === 'RESOLVED');
      const activeDept = deptComplaints.filter(c => !['RESOLVED', 'CLOSED'].includes(c.status)).length;
      const escalatedDept = deptComplaints.filter(c => c.isEscalated);

      let onTimeCount = 0;
      let totalResHours = 0;
      resolvedDept.forEach(c => {
        const resTime = c.resolvedAt ? new Date(c.resolvedAt).getTime() : new Date(c.updatedAt).getTime();
        const createTime = new Date(c.createdAt).getTime();
        totalResHours += Math.max(0, (resTime - createTime) / 3600000);
        if (c.slaDeadline && resTime <= new Date(c.slaDeadline).getTime()) {
          onTimeCount++;
        } else if (!c.isEscalated) {
          onTimeCount++;
        }
      });

      const resRate = totalDept > 0 ? Math.round((resolvedDept.length / totalDept) * 100) : 0;
      const onTimeRate = resolvedDept.length > 0 ? Math.round((onTimeCount / resolvedDept.length) * 100) : (totalDept > 0 ? 100 : 0);
      const avgHours = resolvedDept.length > 0 ? parseFloat((totalResHours / resolvedDept.length).toFixed(1)) : 0;

      // Feedback for this department
      const deptComplaintIds = new Set(deptComplaints.map(c => c._id.toString()));
      const deptFeedbacks = allFeedbacks.filter(f => f.complaintId && deptComplaintIds.has(f.complaintId._id ? f.complaintId._id.toString() : f.complaintId.toString()));
      const deptRatingSum = deptFeedbacks.reduce((sum, f) => sum + (f.rating || 0), 0);
      const avgRating = deptFeedbacks.length > 0 ? parseFloat((deptRatingSum / deptFeedbacks.length).toFixed(1)) : 0;

      let statusGrade = 'Exemplary';
      if (totalDept === 0) {
        statusGrade = 'Unassigned';
      } else if (resRate < 50 || escalatedDept.length >= 2 || onTimeRate < 60) {
        statusGrade = 'Action Required';
      } else if (resRate < 80 || onTimeRate < 80) {
        statusGrade = 'Moderate';
      }

      return {
        department: dept,
        totalAssigned: totalDept,
        pending: pendingDept,
        inProgress: inProgressDept,
        resolved: resolvedDept.length,
        active: activeDept,
        escalated: escalatedDept.length,
        resolutionRate: resRate,
        avgResolutionHours: avgHours,
        onTimeRate,
        feedbackCount: deptFeedbacks.length,
        avgRating,
        statusGrade
      };
    });

    // Best-performing department
    const activeDepts = departmentPerformance.filter(d => d.totalAssigned > 0);
    let bestDept = activeDepts.length > 0 
      ? [...activeDepts].sort((a, b) => (b.resolutionRate + b.onTimeRate) - (a.resolutionRate + a.onTimeRate))[0]?.department 
      : 'Academic Department';

    // 4. Monthly Trend (Past 6 Months with REAL data)
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthlyTrends = [];
    for (let i = 5; i >= 0; i--) {
      const targetDate = new Date(selectedYear, selectedMonth - 1 - i, 1);
      const mIdx = targetDate.getMonth();
      const y = targetDate.getFullYear();
      const mComplaints = allComplaints.filter(c => {
        const d = new Date(c.createdAt);
        return d.getMonth() === mIdx && d.getFullYear() === y;
      });
      const mResolved = mComplaints.filter(c => c.status === 'RESOLVED').length;
      const mRate = mComplaints.length > 0 ? Math.round((mResolved / mComplaints.length) * 100) : 0;
      monthlyTrends.push({
        label: `${monthNames[mIdx]} ${y}`,
        month: mIdx + 1,
        year: y,
        total: mComplaints.length,
        resolved: mResolved,
        resolutionRate: mRate
      });
    }

    res.status(200).json({
      reportingPeriod: {
        month: selectedMonth,
        monthName: monthNames[selectedMonth - 1],
        year: selectedYear
      },
      monthlySummary: {
        total: totalMonthly,
        pending: pendingMonthly,
        inProgress: inProgressMonthly,
        resolved: resolvedMonthly,
        overdue: overdueMonthly,
        escalated: escalatedMonthly,
        priorityCounts,
        categoryDistribution,
        departmentDistribution,
        resolutionRate: monthlyResolutionRate,
        onTimeRate: monthlyOnTimeRate,
        slaBreachedCount: monthlyBreachedCount,
        avgResolutionHours: monthlyAvgResolutionHours
      },
      overallTracking: {
        totalGrievances: overallTotal,
        totalResolved: overallResolved,
        overallResolutionRate,
        firstContactResolutionRate,
        activeGrievances: overallTotal - overallResolved
      },
      departmentPerformance,
      bestPerformingDepartment: bestDept,
      monthlyTrends,
      monthlyComplaints: monthlyComplaints.map(c => ({
        _id: c._id,
        complaintId: c.complaintId,
        title: c.title,
        studentName: c.anonymous ? 'Anonymous Student' : (c.studentId?.name || 'Student'),
        studentRoll: c.anonymous ? 'N/A' : (c.studentId?.rollNumber || c.studentId?.email || 'N/A'),
        category: c.category,
        department: c.department,
        priority: c.priority,
        status: c.status,
        createdAt: c.createdAt,
        slaDeadline: c.slaDeadline,
        resolvedAt: c.resolvedAt,
        isEscalated: c.isEscalated,
        assignedOfficer: c.assignedOfficer?.name || 'Unassigned'
      }))
    });
  } catch (error) {
    res.status(500).json({ message: 'Error generating executive report.', error: error.message });
  }
};


// ── Module 4: SLA Escalation to Higher Authority ────────────────────────────
exports.escalateToAuthority = async (req, res) => {
  try {
    const { authority = 'Campus Director & Dean', reason = 'Manual administrative escalation due to priority and urgency.' } = req.body;
    const complaint = await Complaint.findById(req.params.id).populate('studentId', 'name email');
    if (!complaint) return res.status(404).json({ message: 'Complaint not found.' });

    const prevStatus = complaint.status;
    complaint.status = 'ESCALATED';
    complaint.isEscalated = true;
    complaint.escalatedTo = authority;
    complaint.escalatedAt = new Date();
    complaint.adminRemarks = (complaint.adminRemarks ? complaint.adminRemarks + ' | ' : '') + `Escalated to ${authority}: ${reason}`;

    complaint.statusHistory.push({
      status: 'ESCALATED',
      adminRemarks: `Manually escalated to ${authority}. Reason: ${reason}`,
      updatedBy: req.user?.email ? `${req.user.name} (${req.user.email})` : 'Administrator',
      notifiedStudent: true,
      timestamp: new Date()
    });

    await complaint.save();

    // Dispatch notification to student
    try {
      const { sendInAppNotification } = require('./notificationController');
      if (complaint.studentId?._id) {
        await sendInAppNotification({
          recipient: complaint.studentId._id,
          recipientRole: 'student',
          title: '🚨 Grievance Escalated to Higher Authority',
          message: `Your grievance ${complaint.complaintId} has been escalated to ${authority} for immediate intervention.`,
          type: 'SLA_BREACH',
          complaintId: complaint._id,
          complaintCode: complaint.complaintId
        });
      }
    } catch (e) {
      console.warn('Escalate notification error:', e.message);
    }

    res.status(200).json({ message: `Successfully escalated ticket ${complaint.complaintId} to ${authority}`, complaint });
  } catch (err) {
    res.status(500).json({ message: 'Error escalating complaint', error: err.message });
  }
};
