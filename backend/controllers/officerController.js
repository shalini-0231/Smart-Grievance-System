const Officer = require('../models/Officer');
const Complaint = require('../models/Complaint');
const User = require('../models/User');
const bcrypt = require('bcryptjs');

const VALID_DEPARTMENTS = [
  'Academic Department',
  'Hostel Administration',
  'Transport Department',
  'IT Department',
  'Maintenance Department',
  'Student Welfare / Anti-Ragging Committee',
  'Canteen & Hospitality',
  'General Administration'
];

// ── Novelty 2: Officer Performance-Weighted Auto-Assignment ─────────────────
// Algorithm: score = (10 - openTicketCount) + (avgRating × 2)
// Higher score → recommended first.
exports.getRecommendedOfficers = async (req, res) => {
  try {
    const complaint = await Complaint.findById(req.params.complaintId);
    if (!complaint) {
      return res.status(404).json({ message: 'Complaint not found.' });
    }

    // Only active officers for the complaint department
    const officers = await Officer.find({
      department: complaint.department,
      isActive: { $ne: false }
    });

    if (officers.length === 0) {
      return res.status(200).json({
        department: complaint.department,
        officers: [],
        recommended: null,
        message: `No active officers currently found for ${complaint.department}.`
      });
    }

    // Score each officer: score = (10 - openTickets) + (rating × 2)
    const scored = officers.map(o => {
      const openTickets = typeof o.openTicketCount === 'number' ? o.openTicketCount : 0;
      const rating = typeof o.avgRating === 'number' ? o.avgRating : 4.0;
      const score = parseFloat(((10 - openTickets) + (rating * 2)).toFixed(2));

      let recommendationReason = '';
      if (openTickets === 0) {
        recommendationReason = `Zero active workload with an outstanding ${rating}★ student rating.`;
      } else if (openTickets <= 2) {
        recommendationReason = `Optimal low workload (${openTickets} open) & proven ${rating}★ resolution performance.`;
      } else {
        recommendationReason = `Department specialist with ${rating}★ rating and ${o.totalResolved || 0} lifetime resolutions.`;
      }

      return {
        _id: o._id,
        name: o.name,
        department: o.department,
        role: o.role || o.designation || 'Department Officer',
        contact: o.contact || o.phone || '',
        phone: o.phone || o.contact || '',
        email: o.email,
        openTicketCount: openTickets,
        avgRating: rating,
        totalResolved: o.totalResolved || 0,
        score,
        recommendationReason
      };
    });

    // Sort descending by score
    scored.sort((a, b) => b.score - a.score);

    res.status(200).json({
      department: complaint.department,
      officers: scored,
      recommended: scored[0] || null
    });
  } catch (err) {
    res.status(500).json({ message: 'Error fetching recommended officers.', error: err.message });
  }
};

// GET /api/officers — list all officers with dynamically calculated workload and performance metrics
exports.getAllOfficers = async (req, res) => {
  try {
    const officers = await Officer.find().sort({ department: 1, avgRating: -1 });

    const now = new Date().getTime();

    // Dynamically calculate metrics from the Complaint collection for each officer
    const enrichedOfficers = await Promise.all(
      officers.map(async (officer) => {
        const offObj = officer.toObject();
        const officerQueries = [
          { 'assignedOfficer.email': officer.email },
          { 'assignedOfficer.name': officer.name }
        ];

        const assignedComplaints = await Complaint.find({ $or: officerQueries });

        const totalAssigned = assignedComplaints.length;
        const pending = assignedComplaints.filter(c => ['SUBMITTED', 'UNDER REVIEW', 'ASSIGNED'].includes(c.status)).length;
        const inProgress = assignedComplaints.filter(c => c.status === 'IN PROGRESS').length;
        const resolved = assignedComplaints.filter(c => ['RESOLVED', 'CLOSED'].includes(c.status)).length;
        
        // Overdue complaints
        const overdue = assignedComplaints.filter(c => {
          if (['RESOLVED', 'CLOSED', 'REJECTED'].includes(c.status)) return false;
          return c.slaDeadline && new Date(c.slaDeadline).getTime() < now;
        }).length;

        // SLA compliance rate
        const resolvedWithSLA = assignedComplaints.filter(c => ['RESOLVED', 'CLOSED'].includes(c.status) && c.slaDeadline);
        let compliantCount = 0;
        let totalResolutionHours = 0;

        resolvedWithSLA.forEach(c => {
          const resolvedTime = new Date(c.updatedAt).getTime();
          const deadlineTime = new Date(c.slaDeadline).getTime();
          const createdTime = new Date(c.createdAt).getTime();

          if (resolvedTime <= deadlineTime) compliantCount++;
          if (resolvedTime > createdTime) {
            totalResolutionHours += (resolvedTime - createdTime) / (1000 * 60 * 60);
          }
        });

        const slaComplianceRate = resolvedWithSLA.length > 0
          ? Math.round((compliantCount / resolvedWithSLA.length) * 100)
          : (totalAssigned > 0 ? 100 : 96);

        const avgResolutionHours = resolvedWithSLA.length > 0
          ? Math.round(totalResolutionHours / resolvedWithSLA.length)
          : 24;

        const resolutionRate = totalAssigned > 0
          ? Math.round((resolved / totalAssigned) * 100)
          : (officer.totalResolved > 0 ? 100 : 0);

        const currentWorkload = pending + inProgress;

        return {
          ...offObj,
          isActive: officer.isActive !== false,
          totalAssigned,
          pending,
          inProgress,
          resolved,
          overdue,
          currentWorkload,
          openTicketCount: currentWorkload > 0 ? currentWorkload : officer.openTicketCount,
          resolutionRate,
          slaComplianceRate,
          avgResolutionHours,
          feedbackRating: officer.avgRating || 4.5
        };
      })
    );

    // Compute overall KPI Summary
    const totalOfficers = enrichedOfficers.length;
    const activeOfficers = enrichedOfficers.filter(o => o.isActive).length;
    const inactiveOfficers = totalOfficers - activeOfficers;
    const totalAssignedComplaints = enrichedOfficers.reduce((acc, o) => acc + o.totalAssigned, 0);
    const pendingComplaints = enrichedOfficers.reduce((acc, o) => acc + o.pending, 0);
    const avgResolutionRate = totalOfficers > 0
      ? Math.round(enrichedOfficers.reduce((acc, o) => acc + o.resolutionRate, 0) / totalOfficers)
      : 0;

    const kpis = {
      totalOfficers,
      activeOfficers,
      inactiveOfficers,
      totalAssignedComplaints,
      pendingComplaints,
      avgResolutionRate
    };

    // Return enriched officers along with kpi meta
    res.status(200).json({
      officers: enrichedOfficers,
      kpis
    });
  } catch (err) {
    res.status(500).json({ message: 'Error fetching officers.', error: err.message });
  }
};

// POST /api/officers — create new officer (admin)
exports.createOfficer = async (req, res) => {
  try {
    const { name, department, role, designation, contact, phone, email, password } = req.body;
    
    if (!name || !department || !email) {
      return res.status(400).json({ message: 'Name, department, and email address are required.' });
    }

    if (!VALID_DEPARTMENTS.includes(department)) {
      return res.status(400).json({
        message: `Invalid department. Must be one of: ${VALID_DEPARTMENTS.join(', ')}`
      });
    }

    // Check duplicate email in Officer collection
    const existing = await Officer.findOne({ email: email.toLowerCase().trim() });
    if (existing) {
      return res.status(400).json({ message: `An officer with email ${email} already exists.` });
    }

    const officer = new Officer({
      name: name.trim(),
      department,
      role: role || designation || 'Department Officer',
      designation: designation || role || 'Department Officer',
      contact: contact || phone || '',
      phone: phone || contact || '',
      email: email.toLowerCase().trim(),
      isActive: true,
      openTicketCount: 0,
      avgRating: 4.5,
      totalResolved: 0
    });
    await officer.save();

    // Also create login account in User collection if password provided or requested
    if (password) {
      const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
      if (!existingUser) {
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        const user = new User({
          name: name.trim(),
          email: email.toLowerCase().trim(),
          password: hashedPassword,
          role: 'officer',
          department,
          phone: phone || contact || '',
          isActive: true
        });
        await user.save();
      }
    }

    res.status(201).json(officer);
  } catch (err) {
    res.status(500).json({ message: 'Error creating officer.', error: err.message });
  }
};

// PUT /api/officers/:id — update officer details
exports.updateOfficer = async (req, res) => {
  try {
    const { name, department, role, designation, contact, phone, email, isActive } = req.body;
    
    if (department && !VALID_DEPARTMENTS.includes(department)) {
      return res.status(400).json({
        message: `Invalid department. Must be one of: ${VALID_DEPARTMENTS.join(', ')}`
      });
    }

    const officer = await Officer.findById(req.params.id);
    if (!officer) return res.status(404).json({ message: 'Officer not found.' });

    // If email is changing, verify uniqueness
    if (email && email.toLowerCase().trim() !== officer.email) {
      const duplicate = await Officer.findOne({ email: email.toLowerCase().trim(), _id: { $ne: officer._id } });
      if (duplicate) {
        return res.status(400).json({ message: `Email ${email} is already taken by another officer.` });
      }
      officer.email = email.toLowerCase().trim();
    }

    if (name) officer.name = name.trim();
    if (department) officer.department = department;
    if (role) officer.role = role;
    if (designation) officer.designation = designation;
    if (contact !== undefined) officer.contact = contact;
    if (phone !== undefined) officer.phone = phone;
    if (isActive !== undefined) officer.isActive = isActive;

    await officer.save();

    // Sync department/name with User account if exists
    await User.updateOne(
      { email: officer.email },
      { $set: { name: officer.name, department: officer.department, isActive: officer.isActive } }
    );

    res.status(200).json(officer);
  } catch (err) {
    res.status(500).json({ message: 'Error updating officer', error: err.message });
  }
};

// PUT /api/officers/:id/status — toggle active / inactive status
exports.toggleOfficerStatus = async (req, res) => {
  try {
    const officer = await Officer.findById(req.params.id);
    if (!officer) return res.status(404).json({ message: 'Officer not found.' });

    officer.isActive = officer.isActive === false ? true : false;
    await officer.save();

    // Also sync User account status if exists
    await User.updateOne({ email: officer.email }, { $set: { isActive: officer.isActive } });

    res.status(200).json({
      message: `Officer ${officer.name} is now ${officer.isActive ? 'Active' : 'Deactivated'}.`,
      officer
    });
  } catch (err) {
    res.status(500).json({ message: 'Error updating officer status', error: err.message });
  }
};

// DELETE /api/officers/:id — safe deletion with complaint history protection
exports.deleteOfficer = async (req, res) => {
  try {
    const officer = await Officer.findById(req.params.id);
    if (!officer) return res.status(404).json({ message: 'Officer not found' });

    // Safe Deletion: Check if officer has any complaint assignment or resolution history
    const historyCount = await Complaint.countDocuments({
      $or: [
        { 'assignedOfficer.email': officer.email },
        { 'assignedOfficer.name': officer.name }
      ]
    });

    if (historyCount > 0 || (officer.totalResolved && officer.totalResolved > 0)) {
      return res.status(400).json({
        message: `Cannot permanently delete officer "${officer.name}". This officer has a record of ${historyCount || officer.totalResolved} assigned/resolved complaints. To maintain institutional audit trails and SLA compliance history, please DEACTIVATE the officer instead.`
      });
    }

    await Officer.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: `Officer ${officer.name} removed successfully.` });
  } catch (err) {
    res.status(500).json({ message: 'Error removing officer', error: err.message });
  }
};

// PUT /api/officers/:id/increment-ticket
exports.incrementTicket = async (req, res) => {
  try {
    const officer = await Officer.findById(req.params.id);
    if (!officer) return res.status(404).json({ message: 'Officer not found.' });
    officer.openTicketCount = Math.max(0, officer.openTicketCount + 1);
    await officer.save();
    res.status(200).json(officer);
  } catch (err) {
    res.status(500).json({ message: 'Error updating officer ticket count.', error: err.message });
  }
};

// PUT /api/officers/:id/resolve
exports.resolveTicket = async (req, res) => {
  try {
    const { rating } = req.body;
    const officer = await Officer.findById(req.params.id);
    if (!officer) return res.status(404).json({ message: 'Officer not found.' });

    officer.openTicketCount = Math.max(0, officer.openTicketCount - 1);
    officer.totalResolved += 1;

    if (rating && rating >= 1 && rating <= 5) {
      officer.totalRatingSum += rating;
      officer.avgRating = parseFloat((officer.totalRatingSum / officer.totalResolved).toFixed(1));
    }

    await officer.save();
    res.status(200).json(officer);
  } catch (err) {
    res.status(500).json({ message: 'Error updating officer resolution.', error: err.message });
  }
};

// Seed demo officers
exports.seedDemoOfficers = async () => {
  try {
    const count = await Officer.countDocuments();
    if (count > 0) return;

    const demoOfficers = [
      { name: 'Mr. Rajesh Kumar', department: 'IT Department', role: 'Network Administrator', contact: '+91 98765 43210', phone: '+91 98765 43210', email: 'it.admin@scgrs.edu', openTicketCount: 2, avgRating: 4.5, totalResolved: 20, totalRatingSum: 90, isActive: true },
      { name: 'Ms. Priya Suresh', department: 'IT Department', role: 'Systems Engineer', contact: '+91 97654 32109', phone: '+91 97654 32109', email: 'it.engineer@scgrs.edu', openTicketCount: 5, avgRating: 3.8, totalResolved: 15, totalRatingSum: 57, isActive: true },
      { name: 'Mr. Suresh Sharma', department: 'Hostel Administration', role: 'Hostel Caretaker', contact: '+91 98123 45678', phone: '+91 98123 45678', email: 'hostel.admin@scgrs.edu', openTicketCount: 3, avgRating: 4.2, totalResolved: 30, totalRatingSum: 126, isActive: true },
      { name: 'Ms. Kavitha Rajan', department: 'Hostel Administration', role: 'Hostel Warden', contact: '+91 99887 65432', phone: '+91 99887 65432', email: 'hostel.warden@scgrs.edu', openTicketCount: 1, avgRating: 4.8, totalResolved: 25, totalRatingSum: 120, isActive: true },
      { name: 'Mr. Ramesh Verma', department: 'Maintenance Department', role: 'Maintenance Supervisor', contact: '+91 97654 32109', phone: '+91 97654 32109', email: 'maintenance@scgrs.edu', openTicketCount: 4, avgRating: 3.9, totalResolved: 40, totalRatingSum: 156, isActive: true },
      { name: 'Mr. Arun Babu', department: 'Maintenance Department', role: 'Electrical Technician', contact: '+91 96543 21098', phone: '+91 96543 21098', email: 'electrical@scgrs.edu', openTicketCount: 2, avgRating: 4.3, totalResolved: 18, totalRatingSum: 77, isActive: true },
      { name: 'Dr. Ananya Sen', department: 'Student Welfare / Anti-Ragging Committee', role: 'Student Welfare Officer', contact: '+91 94321 87654', phone: '+91 94321 87654', email: 'welfare@scgrs.edu', openTicketCount: 1, avgRating: 4.9, totalResolved: 12, totalRatingSum: 59, isActive: true },
      { name: 'Prof. V. K. Malhotra', department: 'Student Welfare / Anti-Ragging Committee', role: 'Principal & Anti-Ragging Chair', contact: '+91 91111 22222', phone: '+91 91111 22222', email: 'principal@scgrs.edu', openTicketCount: 0, avgRating: 5.0, totalResolved: 8, totalRatingSum: 40, isActive: true },
      { name: 'Dr. S. Ramachandran', department: 'Academic Department', role: 'Head of Academic Affairs', contact: '+91 98431 11111', phone: '+91 98431 11111', email: 'academic.head@scgrs.edu', openTicketCount: 2, avgRating: 4.4, totalResolved: 22, totalRatingSum: 97, isActive: true },
      { name: 'Mr. Dinesh Pillai', department: 'Transport Department', role: 'Transport Coordinator', contact: '+91 95432 10987', phone: '+91 95432 10987', email: 'transport@scgrs.edu', openTicketCount: 3, avgRating: 3.7, totalResolved: 14, totalRatingSum: 52, isActive: true },
      { name: 'Mr. Anand Subramaniam', department: 'Canteen & Hospitality', role: 'Canteen Inspector', contact: '+91 94421 88765', phone: '+91 94421 88765', email: 'canteen@scgrs.edu', openTicketCount: 2, avgRating: 4.1, totalResolved: 19, totalRatingSum: 78, isActive: true },
      { name: 'Ms. Deepa Krishnan', department: 'General Administration', role: 'Administrative Officer', contact: '+91 98431 56789', phone: '+91 98431 56789', email: 'admin@scgrs.edu', openTicketCount: 1, avgRating: 4.6, totalResolved: 35, totalRatingSum: 161, isActive: true },
    ];

    await Officer.insertMany(demoOfficers);
    console.log(`${demoOfficers.length} demo officers seeded successfully.`);
  } catch (err) {
    console.error('Error seeding demo officers:', err.message);
  }
};
