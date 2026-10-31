import re

def query_campus_ai(message, role='student', user_context=None):
    if not message:
        return {
            "answer": "Hello! I am your site-wide AI Campus Copilot. How can I assist you today?",
            "action": "NONE",
            "quickReplies": ["How to get OD approval?", "Canteen food safety rules", "Check complaint SLA", "File a new complaint"]
        }

    clean = message.lower().strip()

    # 1. Anti-Ragging & Harassment Helpline intent
    if any(k in clean for k in ['ragging', 'harass', 'helpline', 'bully', 'safety', 'abuse', 'anti-ragging']):
        return {
            "answer": "🛡️ **Anti-Ragging & Harassment Cell**: \n\n- 📞 **National Anti-Ragging Helpline**: 1800-180-5522 (Toll Free)\n- 📱 **Campus Security Desk**: Ext 108 / +91-9876543210\n- 🔒 **Zero Tolerance Policy**: All ragging or harassment complaints can be submitted 100% anonymously. Identity protection is guaranteed under institution policy.",
            "action": "NAVIGATE_SUBMIT",
            "quickReplies": ["File Anonymous Complaint", "Check SLA Rules"]
        }

    # 2. SLA Escalation Timeframes & Rules
    elif any(k in clean for k in ['sla', 'escalat', 'deadline', 'timeframe', 'timer', 'overdue']):
        return {
            "answer": "⚡ **Automatic SLA & Escalation Timeframes**: \n\n• 🚨 **CRITICAL Priority**: 4 Hours SLA (Escalates directly to Director / Senior Authority)\n• 🔴 **HIGH Priority**: 24 Hours SLA (Escalates to Head of Department)\n• 🟡 **MEDIUM Priority**: 48 Hours SLA (Escalates to Committee Lead)\n• 🟢 **LOW Priority**: 72 Hours SLA\n\n⏰ *If unresolved within the SLA timer, complaints are automatically escalated to higher management.*",
            "action": "OPEN_TRACKER",
            "quickReplies": ["Track active complaints", "File a Complaint"]
        }

    # 3. Filing / Submitting a complaint intent
    elif any(k in clean for k in ['submit', 'file', 'register', 'create', 'new complaint', 'new grievance', 'report']):
        return {
            "answer": "You can file a campus grievance anytime using either our 📝 Quick Form or 💬 Guided Chatbot. Click below to start filing right away!",
            "action": "NAVIGATE_SUBMIT",
            "quickReplies": ["File Canteen Complaint", "File OD Form Issue", "File Wi-Fi Issue"]
        }

    # 4. Tracking SLA or Complaint status intent
    elif any(k in clean for k in ['status', 'track', 'cmp-', 'resolution']):
        return {
            "answer": "You can track your active grievances and real-time SLA timers under the 'Track Status' tab, or enter any Complaint ID (e.g., CMP-1002).",
            "action": "OPEN_TRACKER",
            "quickReplies": ["Track active complaints", "How does escalation work?"]
        }

    # 5. OD Form Workflow & Signature Rules
    elif any(k in clean for k in ['od', 'on duty', 'mentor', 'counsellor', 'hod', 'signature', 'event return', 'fake od', 'attendance']):
        return {
            "answer": "📌 **OD (On-Duty) Approval Procedure**: \n\n1️⃣ **Mentor Sign**: Verification of event eligibility\n2️⃣ **Class Counsellor Sign**: Academic schedule review\n3️⃣ **HOD Sign-off**: Final department approval\n4️⃣ **Academic Cell**: Attendance update\n\n⚠️ **Important**: Fake OD submissions will be rejected. Genuine event registration proof is mandatory. Upon returning, students must present event outcome to the class.",
            "action": "NAVIGATE_SUBMIT",
            "quickReplies": ["File OD Form Issue", "Where is my OD stuck?"]
        }

    # 6. Canteen & Food Safety Policies
    elif any(k in clean for k in ['canteen', 'food', 'mess', 'hygiene', 'cockroach', 'foreign object', 'biryani', 'taste', 'quality', 'overprice']):
        return {
            "answer": "🍲 **Canteen Dish & Food Safety Standards**: \n\n- 🛡️ **Safety Override**: Foreign objects or hygiene issues trigger an **AUTOMATIC AI Priority Override** to HIGH or CRITICAL.\n- 🏢 **Direct Routing**: Automatically routed to the Canteen & Hospitality Inspection Committee.\n- 📊 **Dish Tracking**: Admins track problem dishes to hold caterers accountable.",
            "action": "NAVIGATE_SUBMIT",
            "quickReplies": ["Report Food Hygiene Concern", "Report Foreign Object in Food"]
        }

    # 7. Wi-Fi, Hostel & Infrastructure Issues
    elif any(k in clean for k in ['wifi', 'internet', 'hostel', 'water', 'fan', 'light', 'clean', 'room', 'bus', 'transport']):
        return {
            "answer": "📶 **IT & Infrastructure Support**: Wi-Fi outages, hostel maintenance, and campus transport grievances are automatically routed to the IT Department or Hostel Administration with automated SLA timers.",
            "action": "NONE",
            "quickReplies": ["Report Wi-Fi Down", "Report Hostel Maintenance"]
        }

    # 8. Admin Specific Analytics Intent
    elif role == 'admin' and any(k in clean for k in ['workload', 'analytic', 'dept', 'statistic', 'overview', 'summary']):
        return {
            "answer": "📊 **Admin Executive Insights**: You can view real-time department workload distribution and recurring problem dishes on the Admin Dashboard or Analytics panel.",
            "action": "NAVIGATE_ADMIN_ANALYTICS",
            "quickReplies": ["View Department Workload", "View Problem Dishes"]
        }

    # 9. General Fallback Response
    else:
        return {
            "answer": f"I analyzed your query regarding '{message}'. You can use SCGRS to file grievances, check real-time AI priority scoring, track SLA deadlines, or view department routing.",
            "action": "NONE",
            "quickReplies": ["File a Complaint", "Check SLA Deadlines", "Canteen Rules", "OD Approval Rules"]
        }
