import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { useToast } from '../context/ToastContext';
import {
  FileText, Download, Printer, Calendar, TrendingUp, CheckCircle2,
  Clock, AlertTriangle, ShieldAlert, Star, MessageSquare, Building2,
  Users, Search, Filter, ArrowUpRight, Layers, Eye, X, RefreshCw, Award
} from 'lucide-react';

const AdminReports = () => {
  const navigate = useNavigate();
  const { addToast } = useToast();

  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1); // 1-12
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
  const [activeTab, setActiveTab] = useState('reports'); // 'reports' | 'feedback'

  // Data states
  const [reportData, setReportData] = useState(null);
  const [feedbackData, setFeedbackData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  // Department comparison sort state
  const [deptSortField, setDeptSortField] = useState('totalAssigned');
  const [deptSortAsc, setDeptSortAsc] = useState(false);

  // Feedback tab filter states
  const [feedbackSearch, setFeedbackSearch] = useState('');
  const [feedbackDeptFilter, setFeedbackDeptFilter] = useState('');
  const [feedbackRatingFilter, setFeedbackRatingFilter] = useState('');
  const [selectedFeedbackModal, setSelectedFeedbackModal] = useState(null);

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const departmentsList = [
    'Academic Department',
    'Hostel Administration',
    'Transport Department',
    'IT Department',
    'Maintenance Department',
    'Student Welfare / Anti-Ragging Committee',
    'Canteen & Hospitality',
    'General Administration'
  ];

  const loadAllData = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError('');

    try {
      const [reportsRes, feedbackRes] = await Promise.all([
        api.getExecutiveReports(selectedMonth, selectedYear),
        api.getAllFeedback()
      ]);
      setReportData(reportsRes);
      setFeedbackData(feedbackRes);
      if (isRefresh) addToast('Reports and feedback data refreshed successfully', 'success');
    } catch (err) {
      console.error('Failed to load reports/feedback:', err);
      setError('Failed to load reports. Please verify network connectivity.');
      addToast('Error loading reports data', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, [selectedMonth, selectedYear]);

  // Sorted department performance
  const sortedDepartments = useMemo(() => {
    if (!reportData?.departmentPerformance) return [];
    return [...reportData.departmentPerformance].sort((a, b) => {
      let valA = a[deptSortField];
      let valB = b[deptSortField];
      if (typeof valA === 'string') {
        return deptSortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      valA = valA || 0;
      valB = valB || 0;
      return deptSortAsc ? valA - valB : valB - valA;
    });
  }, [reportData?.departmentPerformance, deptSortField, deptSortAsc]);

  // Filtered student feedback
  const filteredFeedbacks = useMemo(() => {
    if (!feedbackData?.feedbacks) return [];
    return feedbackData.feedbacks.filter(f => {
      // Rating filter
      if (feedbackRatingFilter) {
        if (feedbackRatingFilter === 'positive' && (f.rating < 4)) return false;
        if (feedbackRatingFilter === 'neutral' && (f.rating !== 3)) return false;
        if (feedbackRatingFilter === 'negative' && (f.rating > 2)) return false;
        if (['1', '2', '3', '4', '5'].includes(feedbackRatingFilter) && f.rating !== parseInt(feedbackRatingFilter)) return false;
      }
      // Department filter
      if (feedbackDeptFilter && f.complaintId?.department !== feedbackDeptFilter) {
        return false;
      }
      // Search
      if (feedbackSearch.trim()) {
        const q = feedbackSearch.toLowerCase();
        const studentName = (f.complaintId?.studentId?.name || (f.complaintId?.anonymous ? 'Anonymous' : '')).toLowerCase();
        const complaintId = (f.complaintId?.complaintId || '').toLowerCase();
        const dept = (f.complaintId?.department || '').toLowerCase();
        const comment = (f.comment || '').toLowerCase();
        if (!studentName.includes(q) && !complaintId.includes(q) && !dept.includes(q) && !comment.includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [feedbackData?.feedbacks, feedbackRatingFilter, feedbackDeptFilter, feedbackSearch]);

  // ─── Export Handlers ────────────────────────────────────────────────────────

  // 1. Export Excel (HTML format recognized natively by Microsoft Excel)
  const handleExportExcel = () => {
    if (!reportData) return addToast('No report data available to export', 'warning');

    const mName = reportData.reportingPeriod?.monthName || monthNames[selectedMonth - 1];
    const yr = reportData.reportingPeriod?.year || selectedYear;
    const summary = reportData.monthlySummary || {};
    const depts = sortedDepartments;
    const complaints = reportData.monthlyComplaints || [];

    let html = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>SCGRS Report</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]-->
        <meta http-equiv="content-type" content="text/plain; charset=UTF-8"/>
        <style>
          th { background-color: #0f172a; color: #ffffff; font-weight: bold; border: 1px solid #334155; padding: 6px; }
          td { border: 1px solid #cbd5e1; padding: 6px; }
          .header { font-size: 16pt; font-weight: bold; color: #1e3a8a; }
          .section { font-size: 12pt; font-weight: bold; background-color: #f1f5f9; }
        </style>
      </head>
      <body>
        <table>
          <tr><td colspan="7" class="header">Smart Campus Grievance Redressal System (SCGRS)</td></tr>
          <tr><td colspan="7">Executive Monthly Report: ${mName} ${yr}</td></tr>
          <tr><td colspan="7">Generated on: ${new Date().toLocaleString()}</td></tr>
          <tr><td colspan="7"></td></tr>

          <!-- Summary Metrics -->
          <tr><td colspan="7" class="section">1. MONTHLY EXECUTIVE SUMMARY</td></tr>
          <tr>
            <th>Total Complaints</th>
            <th>Pending</th>
            <th>In Progress</th>
            <th>Resolved</th>
            <th>Overdue / Breached</th>
            <th>Resolution Rate</th>
            <th>SLA Compliance</th>
          </tr>
          <tr>
            <td>${summary.total || 0}</td>
            <td>${summary.pending || 0}</td>
            <td>${summary.inProgress || 0}</td>
            <td>${summary.resolved || 0}</td>
            <td>${summary.overdue || 0}</td>
            <td>${summary.resolutionRate || 0}%</td>
            <td>${summary.onTimeRate || 0}%</td>
          </tr>
          <tr><td colspan="7"></td></tr>

          <!-- Department Performance -->
          <tr><td colspan="7" class="section">2. DEPARTMENT PERFORMANCE AUDIT</td></tr>
          <tr>
            <th>Department</th>
            <th>Total Complaints</th>
            <th>Pending</th>
            <th>In Progress</th>
            <th>Resolved</th>
            <th>Resolution Rate</th>
            <th>SLA Compliance</th>
            <th>Avg Resolution Time (hrs)</th>
            <th>Satisfaction Rating</th>
            <th>Status Grade</th>
          </tr>
          ${depts.map(d => `
            <tr>
              <td>${d.department}</td>
              <td>${d.totalAssigned}</td>
              <td>${d.pending}</td>
              <td>${d.inProgress}</td>
              <td>${d.resolved}</td>
              <td>${d.resolutionRate}%</td>
              <td>${d.onTimeRate}%</td>
              <td>${d.avgResolutionHours}</td>
              <td>${d.avgRating > 0 ? d.avgRating : 'N/A'}</td>
              <td>${d.statusGrade}</td>
            </tr>
          `).join('')}
          <tr><td colspan="7"></td></tr>

          <!-- Detailed Monthly Complaints -->
          <tr><td colspan="7" class="section">3. MONTHLY GRIEVANCE LOG RECORDS</td></tr>
          <tr>
            <th>Token ID</th>
            <th>Title</th>
            <th>Student</th>
            <th>Department</th>
            <th>Category</th>
            <th>Priority</th>
            <th>Status</th>
            <th>Submitted Date</th>
            <th>Responsible Officer</th>
          </tr>
          ${complaints.map(c => `
            <tr>
              <td>${c.complaintId}</td>
              <td>${c.title}</td>
              <td>${c.studentName}</td>
              <td>${c.department}</td>
              <td>${c.category}</td>
              <td>${c.priority}</td>
              <td>${c.status}</td>
              <td>${new Date(c.createdAt).toLocaleDateString()}</td>
              <td>${c.assignedOfficer}</td>
            </tr>
          `).join('')}
        </table>
      </body>
      </html>
    `;

    const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `SCGRS_Executive_Report_${mName}_${yr}.xls`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    addToast(`Excel report downloaded for ${mName} ${yr}`, 'success');
  };

  // 2. Download Monthly Report (CSV)
  const handleDownloadMonthlyCSV = () => {
    if (!reportData?.monthlyComplaints || reportData.monthlyComplaints.length === 0) {
      return addToast('No grievance records found for this period to export', 'warning');
    }

    const mName = reportData.reportingPeriod?.monthName || monthNames[selectedMonth - 1];
    const yr = reportData.reportingPeriod?.year || selectedYear;

    const headers = ['Token ID', 'Title', 'Student', 'Roll/Email', 'Department', 'Category', 'Priority', 'Status', 'Submitted Date', 'SLA Deadline', 'Resolved Date', 'Responsible Officer'];
    const rows = reportData.monthlyComplaints.map(c => [
      `"${c.complaintId || ''}"`,
      `"${(c.title || '').replace(/"/g, '""')}"`,
      `"${c.studentName || ''}"`,
      `"${c.studentRoll || ''}"`,
      `"${c.department || ''}"`,
      `"${c.category || ''}"`,
      `"${c.priority || ''}"`,
      `"${c.status || ''}"`,
      `"${c.createdAt ? new Date(c.createdAt).toLocaleDateString() : ''}"`,
      `"${c.slaDeadline ? new Date(c.slaDeadline).toLocaleDateString() : 'N/A'}"`,
      `"${c.resolvedAt ? new Date(c.resolvedAt).toLocaleDateString() : 'N/A'}"`,
      `"${c.assignedOfficer || 'Unassigned'}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.href = encodedUri;
    link.download = `SCGRS_Grievances_${mName}_${yr}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    addToast('Monthly CSV grievance log downloaded successfully', 'success');
  };

  // 3. Print / PDF Export
  const handlePrintPDF = () => {
    window.print();
  };

  const summary = reportData?.monthlySummary || {};
  const feedbackSummary = feedbackData?.summary || {};

  return (
    <div className="admin-portal-wrapper" style={{ paddingBottom: '3.5rem' }}>
      {/* ── Page Header matching SCGRS Style ── */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: '1.25rem',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '0.35rem' }}>
            <span style={{
              background: '#0284c7',
              color: '#ffffff',
              fontSize: '0.68rem',
              fontWeight: 800,
              padding: '2px 8px',
              borderRadius: '4px',
              letterSpacing: '0.5px'
            }}>
              EXECUTIVE AUDIT
            </span>
            <span style={{ color: '#64748b', fontSize: '0.75rem', fontWeight: 500 }}>
              • SCGRS 2.0 Compliance Engine
            </span>
          </div>
          <h1 style={{
            fontSize: '1.65rem',
            fontWeight: 800,
            color: '#ffffff',
            margin: '0 0 0.25rem 0',
            letterSpacing: '-0.02em'
          }}>
            Campus Grievance Reports & Feedback
          </h1>
          <p style={{
            color: '#94a3b8',
            fontSize: '0.84rem',
            margin: 0
          }}>
            Unified monthly audit dashboard, department SLA benchmarks, resolution velocity, and verified student feedback.
          </p>
        </div>

        {/* Global Export & Action Buttons */}
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <button
            onClick={handleExportExcel}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
              background: 'transparent',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              color: '#cbd5e1',
              padding: '0.45rem 0.9rem',
              borderRadius: '6px',
              fontSize: '0.82rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
            title="Download formatted Excel workbook"
          >
            <Download size={14} color="#10b981" /> Export Excel
          </button>

          <button
            onClick={handleDownloadMonthlyCSV}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
              background: 'transparent',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              color: '#cbd5e1',
              padding: '0.45rem 0.9rem',
              borderRadius: '6px',
              fontSize: '0.82rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
            title="Download raw complaint logs for this month"
          >
            <FileText size={14} color="#38bdf8" /> Monthly CSV
          </button>

          <button
            onClick={handlePrintPDF}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
              background: 'transparent',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              color: '#cbd5e1',
              padding: '0.45rem 0.9rem',
              borderRadius: '6px',
              fontSize: '0.82rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
            title="Print or Save as PDF"
          >
            <Printer size={14} /> Print / PDF
          </button>

          <button
            onClick={() => loadAllData(true)}
            disabled={refreshing}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
              background: 'transparent',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              color: '#cbd5e1',
              padding: '0.45rem 0.9rem',
              borderRadius: '6px',
              fontSize: '0.82rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>
      </div>

      {/* Global Error Banner if any */}
      {error && (
        <div className="alert-box alert-error" style={{ marginBottom: '1.25rem' }}>
          <AlertTriangle size={18} /><span>{error}</span>
        </div>
      )}

      {/* ── Two Primary Tabs: 1. Reports & Analytics | 2. Student Feedback ── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        marginBottom: '1.5rem',
        flexWrap: 'wrap',
        gap: '0.75rem'
      }}>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            onClick={() => setActiveTab('reports')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.65rem 1.25rem',
              fontSize: '0.88rem',
              fontWeight: activeTab === 'reports' ? 700 : 500,
              color: activeTab === 'reports' ? '#38bdf8' : '#94a3b8',
              borderBottom: activeTab === 'reports' ? '2.5px solid #38bdf8' : '2.5px solid transparent',
              background: activeTab === 'reports' ? 'rgba(56, 189, 248, 0.08)' : 'transparent',
              borderRadius: '6px 6px 0 0',
              cursor: 'pointer',
              borderTop: 'none',
              borderLeft: 'none',
              borderRight: 'none'
            }}
          >
            <TrendingUp size={16} /> 1. Reports & Analytics
          </button>

          <button
            onClick={() => setActiveTab('feedback')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.65rem 1.25rem',
              fontSize: '0.88rem',
              fontWeight: activeTab === 'feedback' ? 700 : 500,
              color: activeTab === 'feedback' ? '#38bdf8' : '#94a3b8',
              borderBottom: activeTab === 'feedback' ? '2.5px solid #38bdf8' : '2.5px solid transparent',
              background: activeTab === 'feedback' ? 'rgba(56, 189, 248, 0.08)' : 'transparent',
              borderRadius: '6px 6px 0 0',
              cursor: 'pointer',
              borderTop: 'none',
              borderLeft: 'none',
              borderRight: 'none'
            }}
          >
            <MessageSquare size={16} /> 2. Student Feedback
            {feedbackData?.summary?.totalFeedback > 0 && (
              <span style={{
                fontSize: '0.7rem',
                background: '#0284c7',
                color: '#fff',
                padding: '1px 6px',
                borderRadius: '10px'
              }}>
                {feedbackData.summary.totalFeedback}
              </span>
            )}
          </button>
        </div>

        {/* Month & Year Filter Widget */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          background: '#0d1527',
          padding: '0.35rem 0.75rem',
          borderRadius: '8px',
          border: '1px solid rgba(255, 255, 255, 0.08)'
        }}>
          <Calendar size={14} color="#38bdf8" />
          <span style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: 600 }}>Period:</span>

          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
            style={{
              background: '#080d1a',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '6px',
              padding: '0.3rem 0.5rem',
              fontSize: '0.78rem',
              color: '#f8fafc',
              cursor: 'pointer',
              outline: 'none'
            }}
          >
            {monthNames.map((m, idx) => (
              <option key={m} value={idx + 1}>{m}</option>
            ))}
          </select>

          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
            style={{
              background: '#080d1a',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '6px',
              padding: '0.3rem 0.5rem',
              fontSize: '0.78rem',
              color: '#f8fafc',
              cursor: 'pointer',
              outline: 'none'
            }}
          >
            {[2024, 2025, 2026, 2027].map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem 1rem' }}>
          <div style={{
            display: 'inline-block',
            width: '38px',
            height: '38px',
            border: '3px solid rgba(56, 189, 248, 0.3)',
            borderTopColor: '#38bdf8',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }}></div>
          <div style={{ marginTop: '1rem', color: '#94a3b8', fontSize: '0.85rem' }}>
            Compiling campus grievance audit and feedback records...
          </div>
        </div>
      ) : activeTab === 'reports' ? (
        /* ═══════════════════════════════════════════════════════════════════════
           TAB 1: REPORTS & ANALYTICS
           ═══════════════════════════════════════════════════════════════════════ */
        <div>
          {/* Section A: Monthly Grievance Reports KPI Cards */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
            gap: '1rem',
            marginBottom: '1.25rem'
          }}>
            {/* Total Received in Month */}
            <div style={{
              background: '#0d1527',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderLeft: '3.5px solid #2563eb',
              borderRadius: '10px',
              padding: '1rem 1.25rem'
            }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#94a3b8', letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: '0.2rem' }}>
                TOTAL RECEIVED ({monthNames[selectedMonth - 1].slice(0, 3)} {selectedYear})
              </div>
              <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#f8fafc', lineHeight: 1 }}>
                {summary.total || 0}
              </div>
              <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '0.4rem' }}>
                All logged cases in selected month
              </div>
            </div>

            {/* Pending Complaints */}
            <div style={{
              background: '#0d1527',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderLeft: '3.5px solid #f59e0b',
              borderRadius: '10px',
              padding: '1rem 1.25rem'
            }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#94a3b8', letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: '0.2rem' }}>
                PENDING / REVIEW
              </div>
              <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#f8fafc', lineHeight: 1 }}>
                {summary.pending || 0}
              </div>
              <div style={{ fontSize: '0.72rem', color: '#f59e0b', marginTop: '0.4rem' }}>
                Awaiting officer review & dispatch
              </div>
            </div>

            {/* In Progress Complaints */}
            <div style={{
              background: '#0d1527',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderLeft: '3.5px solid #38bdf8',
              borderRadius: '10px',
              padding: '1rem 1.25rem'
            }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#94a3b8', letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: '0.2rem' }}>
                IN-PROGRESS ACTIONS
              </div>
              <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#f8fafc', lineHeight: 1 }}>
                {summary.inProgress || 0}
              </div>
              <div style={{ fontSize: '0.72rem', color: '#38bdf8', marginTop: '0.4rem' }}>
                Actively handled by department
              </div>
            </div>

            {/* Resolved Complaints */}
            <div style={{
              background: '#0d1527',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderLeft: '3.5px solid #10b981',
              borderRadius: '10px',
              padding: '1rem 1.25rem'
            }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#94a3b8', letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: '0.2rem' }}>
                RESOLVED CASES
              </div>
              <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#10b981', lineHeight: 1 }}>
                {summary.resolved || 0}
              </div>
              <div style={{ fontSize: '0.72rem', color: '#10b981', marginTop: '0.4rem' }}>
                Resolution Rate: <strong>{summary.resolutionRate || 0}%</strong>
              </div>
            </div>

            {/* Overdue / SLA Breached */}
            <div style={{
              background: '#0d1527',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderLeft: '3.5px solid #ef4444',
              borderRadius: '10px',
              padding: '1rem 1.25rem'
            }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#94a3b8', letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: '0.2rem' }}>
                OVERDUE / BREACHED
              </div>
              <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#ef4444', lineHeight: 1 }}>
                {summary.overdue || 0}
              </div>
              <div style={{ fontSize: '0.72rem', color: '#ef4444', marginTop: '0.4rem' }}>
                SLA Compliance: <strong>{summary.onTimeRate || 0}%</strong>
              </div>
            </div>
          </div>

          {/* Section B: Resolution Analysis & Priority Distribution */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '1rem',
            marginBottom: '1.25rem'
          }}>
            {/* Resolution Velocity & SLA Analysis */}
            <div style={{
              background: '#0d1527',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '10px',
              padding: '1.25rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', color: '#f8fafc', fontWeight: 700, fontSize: '0.95rem' }}>
                <Clock size={16} color="#38bdf8" />
                <span>Complaint Resolution Analysis</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Complaint Resolution Percentage:</span>
                  <span style={{ fontSize: '0.9rem', fontWeight: 700, color: summary.resolutionRate >= 70 ? '#10b981' : '#f59e0b' }}>
                    {summary.resolutionRate || 0}%
                  </span>
                </div>
                <div style={{ height: '4px', background: 'rgba(255,255,255,0.08)', borderRadius: '2px', overflow: 'hidden' }}>
                  <div style={{ width: `${summary.resolutionRate || 0}%`, height: '100%', background: '#10b981' }}></div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.4rem' }}>
                  <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>SLA Compliance Percentage:</span>
                  <span style={{ fontSize: '0.9rem', fontWeight: 700, color: summary.onTimeRate >= 80 ? '#10b981' : '#ef4444' }}>
                    {summary.onTimeRate || 0}%
                  </span>
                </div>
                <div style={{ height: '4px', background: 'rgba(255,255,255,0.08)', borderRadius: '2px', overflow: 'hidden' }}>
                  <div style={{ width: `${summary.onTimeRate || 0}%`, height: '100%', background: '#38bdf8' }}></div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.4rem' }}>
                  <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Average Resolution Time:</span>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#f8fafc' }}>
                    {summary.avgResolutionHours ? `${summary.avgResolutionHours} hours` : 'Within SLA Standard'}
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>SLA Breached Cases:</span>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: summary.slaBreachedCount > 0 ? '#ef4444' : '#10b981' }}>
                    {summary.slaBreachedCount || 0} cases
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Best-Performing Department:</span>
                  <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#38bdf8' }}>
                    {reportData?.bestPerformingDepartment || 'Academic Department'}
                  </span>
                </div>
              </div>
            </div>

            {/* Priority Distribution */}
            <div style={{
              background: '#0d1527',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '10px',
              padding: '1.25rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', color: '#f8fafc', fontWeight: 700, fontSize: '0.95rem' }}>
                <ShieldAlert size={16} color="#ef4444" />
                <span>Priority Classification Distribution</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem' }}>
                <div style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.25)', borderRadius: '8px', padding: '0.75rem' }}>
                  <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#ef4444', textTransform: 'uppercase' }}>CRITICAL</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#ef4444' }}>
                    {summary.priorityCounts?.critical || 0}
                  </div>
                  <div style={{ fontSize: '0.65rem', color: '#94a3b8' }}>Requires immediate redressal</div>
                </div>

                <div style={{ background: 'rgba(249, 115, 22, 0.08)', border: '1px solid rgba(249, 115, 22, 0.25)', borderRadius: '8px', padding: '0.75rem' }}>
                  <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#f97316', textTransform: 'uppercase' }}>HIGH</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#f97316' }}>
                    {summary.priorityCounts?.high || 0}
                  </div>
                  <div style={{ fontSize: '0.65rem', color: '#94a3b8' }}>High priority escalation</div>
                </div>

                <div style={{ background: 'rgba(234, 179, 8, 0.08)', border: '1px solid rgba(234, 179, 8, 0.25)', borderRadius: '8px', padding: '0.75rem' }}>
                  <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#eab308', textTransform: 'uppercase' }}>MEDIUM</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#eab308' }}>
                    {summary.priorityCounts?.medium || 0}
                  </div>
                  <div style={{ fontSize: '0.65rem', color: '#94a3b8' }}>Standard SLA response</div>
                </div>

                <div style={{ background: 'rgba(34, 197, 94, 0.08)', border: '1px solid rgba(34, 197, 94, 0.25)', borderRadius: '8px', padding: '0.75rem' }}>
                  <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#22c55e', textTransform: 'uppercase' }}>LOW</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#22c55e' }}>
                    {summary.priorityCounts?.low || 0}
                  </div>
                  <div style={{ fontSize: '0.65rem', color: '#94a3b8' }}>Routine maintenance</div>
                </div>
              </div>
            </div>

            {/* Monthly Trend (Past 6 Months) */}
            <div style={{
              background: '#0d1527',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '10px',
              padding: '1.25rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', color: '#f8fafc', fontWeight: 700, fontSize: '0.95rem' }}>
                <TrendingUp size={16} color="#10b981" />
                <span>6-Month Resolution Trend</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                {(reportData?.monthlyTrends || []).map(t => (
                  <div key={t.label}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.74rem', marginBottom: '2px' }}>
                      <span style={{ color: '#cbd5e1', fontWeight: 600 }}>{t.label}</span>
                      <span style={{ color: '#94a3b8' }}>
                        {t.resolved} / {t.total} ({t.resolutionRate}%)
                      </span>
                    </div>
                    <div style={{ height: '4px', background: 'rgba(255,255,255,0.08)', borderRadius: '2px', overflow: 'hidden' }}>
                      <div style={{
                        width: `${t.resolutionRate}%`,
                        height: '100%',
                        background: t.resolutionRate >= 70 ? '#10b981' : t.resolutionRate > 0 ? '#38bdf8' : 'transparent'
                      }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Section C: Department Performance Table & Comparison */}
          <div style={{
            background: '#0d1527',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '10px',
            padding: '1.25rem',
            marginBottom: '1.5rem',
            overflow: 'hidden'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '1rem',
              flexWrap: 'wrap',
              gap: '0.75rem'
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#f8fafc', fontWeight: 700, fontSize: '1rem' }}>
                  <Building2 size={18} color="#38bdf8" />
                  <span>Department Performance Audit & Comparison</span>
                </div>
                <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '2px' }}>
                  Real-time SLA compliance, resolution percentages, and student satisfaction grades. Click any header to sort.
                </div>
              </div>

              {/* Sorting shortcuts */}
              <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                {[
                  { label: 'Sort by Total', field: 'totalAssigned' },
                  { label: 'Sort by Resolution %', field: 'resolutionRate' },
                  { label: 'Sort by SLA Compliance', field: 'onTimeRate' },
                  { label: 'Sort by Rating', field: 'avgRating' }
                ].map(s => (
                  <button
                    key={s.field}
                    onClick={() => {
                      if (deptSortField === s.field) setDeptSortAsc(!deptSortAsc);
                      else { setDeptSortField(s.field); setDeptSortAsc(false); }
                    }}
                    style={{
                      background: deptSortField === s.field ? 'rgba(56, 189, 248, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                      border: `1px solid ${deptSortField === s.field ? '#38bdf8' : 'rgba(255, 255, 255, 0.1)'}`,
                      color: deptSortField === s.field ? '#38bdf8' : '#94a3b8',
                      fontSize: '0.72rem',
                      fontWeight: 600,
                      padding: '3px 8px',
                      borderRadius: '4px',
                      cursor: 'pointer'
                    }}
                  >
                    {s.label} {deptSortField === s.field ? (deptSortAsc ? '↑' : '↓') : ''}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
                    <th style={{ padding: '0.65rem 0.6rem', color: '#94a3b8', fontWeight: 600, textAlign: 'left', textTransform: 'uppercase', fontSize: '0.72rem' }}>Department</th>
                    <th style={{ padding: '0.65rem 0.6rem', color: '#94a3b8', fontWeight: 600, textAlign: 'center', textTransform: 'uppercase', fontSize: '0.72rem' }}>Total Received</th>
                    <th style={{ padding: '0.65rem 0.6rem', color: '#94a3b8', fontWeight: 600, textAlign: 'center', textTransform: 'uppercase', fontSize: '0.72rem' }}>Pending</th>
                    <th style={{ padding: '0.65rem 0.6rem', color: '#94a3b8', fontWeight: 600, textAlign: 'center', textTransform: 'uppercase', fontSize: '0.72rem' }}>In-Progress</th>
                    <th style={{ padding: '0.65rem 0.6rem', color: '#94a3b8', fontWeight: 600, textAlign: 'center', textTransform: 'uppercase', fontSize: '0.72rem' }}>Resolved</th>
                    <th style={{ padding: '0.65rem 0.6rem', color: '#94a3b8', fontWeight: 600, textAlign: 'center', textTransform: 'uppercase', fontSize: '0.72rem' }}>Resolution Rate</th>
                    <th style={{ padding: '0.65rem 0.6rem', color: '#94a3b8', fontWeight: 600, textAlign: 'center', textTransform: 'uppercase', fontSize: '0.72rem' }}>SLA Compliance</th>
                    <th style={{ padding: '0.65rem 0.6rem', color: '#94a3b8', fontWeight: 600, textAlign: 'center', textTransform: 'uppercase', fontSize: '0.72rem' }}>Avg Time</th>
                    <th style={{ padding: '0.65rem 0.6rem', color: '#94a3b8', fontWeight: 600, textAlign: 'center', textTransform: 'uppercase', fontSize: '0.72rem' }}>Student Rating</th>
                    <th style={{ padding: '0.65rem 0.6rem', color: '#94a3b8', fontWeight: 600, textAlign: 'center', textTransform: 'uppercase', fontSize: '0.72rem' }}>Status Grade</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedDepartments.map(d => (
                    <tr
                      key={d.department}
                      style={{
                        borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                        transition: 'background 0.15s ease'
                      }}
                    >
                      <td style={{ padding: '0.8rem 0.6rem', color: '#f8fafc', fontWeight: 600 }}>
                        {d.department}
                      </td>
                      <td style={{ padding: '0.8rem 0.6rem', textAlign: 'center', color: '#cbd5e1', fontWeight: 700 }}>
                        {d.totalAssigned}
                      </td>
                      <td style={{ padding: '0.8rem 0.6rem', textAlign: 'center', color: d.pending > 0 ? '#f59e0b' : '#64748b' }}>
                        {d.pending}
                      </td>
                      <td style={{ padding: '0.8rem 0.6rem', textAlign: 'center', color: d.inProgress > 0 ? '#38bdf8' : '#64748b' }}>
                        {d.inProgress}
                      </td>
                      <td style={{ padding: '0.8rem 0.6rem', textAlign: 'center', color: '#10b981', fontWeight: 700 }}>
                        {d.resolved}
                      </td>
                      <td style={{ padding: '0.8rem 0.6rem', textAlign: 'center' }}>
                        <span style={{
                          fontWeight: 700,
                          color: d.resolutionRate >= 70 ? '#10b981' : d.resolutionRate >= 40 ? '#f59e0b' : '#ef4444'
                        }}>
                          {d.resolutionRate}%
                        </span>
                      </td>
                      <td style={{ padding: '0.8rem 0.6rem', textAlign: 'center' }}>
                        <span style={{
                          fontWeight: 700,
                          color: d.onTimeRate >= 80 ? '#10b981' : d.onTimeRate >= 50 ? '#f59e0b' : '#ef4444'
                        }}>
                          {d.onTimeRate}%
                        </span>
                      </td>
                      <td style={{ padding: '0.8rem 0.6rem', textAlign: 'center', color: '#94a3b8' }}>
                        {d.avgResolutionHours ? `${d.avgResolutionHours}h` : 'N/A'}
                      </td>
                      <td style={{ padding: '0.8rem 0.6rem', textAlign: 'center' }}>
                        {d.avgRating > 0 ? (
                          <span style={{ color: '#fbbf24', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
                            ★ {d.avgRating} <span style={{ color: '#64748b', fontSize: '0.68rem' }}>({d.feedbackCount})</span>
                          </span>
                        ) : (
                          <span style={{ color: '#64748b', fontSize: '0.72rem' }}>No reviews</span>
                        )}
                      </td>
                      <td style={{ padding: '0.8rem 0.6rem', textAlign: 'center' }}>
                        <span style={{
                          display: 'inline-block',
                          padding: '2px 8px',
                          borderRadius: '12px',
                          fontSize: '0.68rem',
                          fontWeight: 700,
                          background: d.statusGrade === 'Exemplary' ? 'rgba(16, 185, 129, 0.15)' :
                                      d.statusGrade === 'Moderate' ? 'rgba(245, 158, 11, 0.15)' :
                                      d.statusGrade === 'Action Required' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                          color: d.statusGrade === 'Exemplary' ? '#34d399' :
                                 d.statusGrade === 'Moderate' ? '#fbbf24' :
                                 d.statusGrade === 'Action Required' ? '#f87171' : '#94a3b8',
                          border: `1px solid ${
                            d.statusGrade === 'Exemplary' ? 'rgba(16, 185, 129, 0.3)' :
                            d.statusGrade === 'Moderate' ? 'rgba(245, 158, 11, 0.3)' :
                            d.statusGrade === 'Action Required' ? 'rgba(239, 68, 68, 0.3)' : 'rgba(255, 255, 255, 0.1)'
                          }`
                        }}>
                          {d.statusGrade}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section D: Detailed Monthly Grievance Records Table */}
          <div style={{
            background: '#0d1527',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '10px',
            padding: '1.25rem',
            overflow: 'hidden'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '1rem',
              flexWrap: 'wrap',
              gap: '0.5rem'
            }}>
              <div>
                <div style={{ color: '#f8fafc', fontWeight: 700, fontSize: '1rem' }}>
                  Monthly Grievance Audit Log ({reportData?.monthlyComplaints?.length || 0})
                </div>
                <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                  Showing all grievance filings recorded during {monthNames[selectedMonth - 1]} {selectedYear}.
                </div>
              </div>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
                    <th style={{ padding: '0.65rem 0.6rem', color: '#94a3b8', fontWeight: 600, textAlign: 'left', textTransform: 'uppercase', fontSize: '0.72rem' }}>Token</th>
                    <th style={{ padding: '0.65rem 0.6rem', color: '#94a3b8', fontWeight: 600, textAlign: 'left', textTransform: 'uppercase', fontSize: '0.72rem' }}>Title</th>
                    <th style={{ padding: '0.65rem 0.6rem', color: '#94a3b8', fontWeight: 600, textAlign: 'left', textTransform: 'uppercase', fontSize: '0.72rem' }}>Student</th>
                    <th style={{ padding: '0.65rem 0.6rem', color: '#94a3b8', fontWeight: 600, textAlign: 'left', textTransform: 'uppercase', fontSize: '0.72rem' }}>Department</th>
                    <th style={{ padding: '0.65rem 0.6rem', color: '#94a3b8', fontWeight: 600, textAlign: 'center', textTransform: 'uppercase', fontSize: '0.72rem' }}>Priority</th>
                    <th style={{ padding: '0.65rem 0.6rem', color: '#94a3b8', fontWeight: 600, textAlign: 'center', textTransform: 'uppercase', fontSize: '0.72rem' }}>Status</th>
                    <th style={{ padding: '0.65rem 0.6rem', color: '#94a3b8', fontWeight: 600, textAlign: 'left', textTransform: 'uppercase', fontSize: '0.72rem' }}>Filing Date</th>
                    <th style={{ padding: '0.65rem 0.6rem', color: '#94a3b8', fontWeight: 600, textAlign: 'center', textTransform: 'uppercase', fontSize: '0.72rem' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {!reportData?.monthlyComplaints || reportData.monthlyComplaints.length === 0 ? (
                    <tr>
                      <td colSpan="8" style={{ textAlign: 'center', padding: '2.5rem 1rem', color: '#64748b' }}>
                        No grievances recorded during {monthNames[selectedMonth - 1]} {selectedYear}.
                      </td>
                    </tr>
                  ) : (
                    reportData.monthlyComplaints.map(c => (
                      <tr key={c._id || c.complaintId} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                        <td style={{ padding: '0.8rem 0.6rem', fontFamily: 'monospace', fontWeight: 700, color: '#38bdf8' }}>
                          {c.complaintId}
                        </td>
                        <td style={{ padding: '0.8rem 0.6rem', color: '#f8fafc', fontWeight: 500, maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {c.title}
                        </td>
                        <td style={{ padding: '0.8rem 0.6rem', color: '#cbd5e1' }}>
                          {c.studentName}
                        </td>
                        <td style={{ padding: '0.8rem 0.6rem', color: '#cbd5e1' }}>
                          {c.department}
                        </td>
                        <td style={{ padding: '0.8rem 0.6rem', textAlign: 'center' }}>
                          <span style={{
                            padding: '2px 8px',
                            borderRadius: '10px',
                            fontSize: '0.68rem',
                            fontWeight: 700,
                            background: c.priority === 'CRITICAL' ? 'rgba(239,68,68,0.15)' :
                                        c.priority === 'HIGH' ? 'rgba(249,115,22,0.15)' :
                                        c.priority === 'MEDIUM' ? 'rgba(234,179,8,0.15)' : 'rgba(34,197,94,0.15)',
                            color: c.priority === 'CRITICAL' ? '#ef4444' :
                                   c.priority === 'HIGH' ? '#f97316' :
                                   c.priority === 'MEDIUM' ? '#eab308' : '#22c55e'
                          }}>
                            {c.priority}
                          </span>
                        </td>
                        <td style={{ padding: '0.8rem 0.6rem', textAlign: 'center' }}>
                          <span style={{
                            padding: '2px 8px',
                            borderRadius: '10px',
                            fontSize: '0.68rem',
                            fontWeight: 700,
                            background: c.status === 'RESOLVED' ? 'rgba(16,185,129,0.15)' : 'rgba(59,130,246,0.15)',
                            color: c.status === 'RESOLVED' ? '#34d399' : '#60a5fa'
                          }}>
                            {c.status}
                          </span>
                        </td>
                        <td style={{ padding: '0.8rem 0.6rem', color: '#94a3b8', fontSize: '0.75rem' }}>
                          {new Date(c.createdAt).toLocaleDateString()}
                        </td>
                        <td style={{ padding: '0.8rem 0.6rem', textAlign: 'center' }}>
                          <button
                            onClick={() => navigate(`/student/complaints?id=${c._id || c.complaintId}`)}
                            style={{
                              background: '#2563eb',
                              color: '#fff',
                              border: 'none',
                              borderRadius: '4px',
                              padding: '3px 8px',
                              fontSize: '0.72rem',
                              fontWeight: 600,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '3px'
                            }}
                          >
                            <Eye size={11} /> View
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        /* ═══════════════════════════════════════════════════════════════════════
           TAB 2: STUDENT FEEDBACK MODULE
           ═══════════════════════════════════════════════════════════════════════ */
        <div>
          {/* Feedback High-Level Summary KPI Cards */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
            gap: '1rem',
            marginBottom: '1.25rem'
          }}>
            {/* Average Rating */}
            <div style={{
              background: '#0d1527',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderLeft: '3.5px solid #fbbf24',
              borderRadius: '10px',
              padding: '1rem 1.25rem'
            }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#94a3b8', letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: '0.2rem' }}>
                AVERAGE SATISFACTION
              </div>
              <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#fbbf24', lineHeight: 1, display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                ★ {feedbackSummary.avgRating > 0 ? feedbackSummary.avgRating : '0.0'}
                <span style={{ fontSize: '0.9rem', color: '#94a3b8', fontWeight: 500 }}>/ 5.0</span>
              </div>
              <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '0.4rem' }}>
                Based on verified resolved grievances
              </div>
            </div>

            {/* Total Reviews */}
            <div style={{
              background: '#0d1527',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderLeft: '3.5px solid #38bdf8',
              borderRadius: '10px',
              padding: '1rem 1.25rem'
            }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#94a3b8', letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: '0.2rem' }}>
                TOTAL REVIEWS RECEIVED
              </div>
              <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#f8fafc', lineHeight: 1 }}>
                {feedbackSummary.totalFeedback || 0}
              </div>
              <div style={{ fontSize: '0.72rem', color: '#38bdf8', marginTop: '0.4rem' }}>
                Student verified responses
              </div>
            </div>

            {/* Positive Reviews */}
            <div style={{
              background: '#0d1527',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderLeft: '3.5px solid #10b981',
              borderRadius: '10px',
              padding: '1rem 1.25rem'
            }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#94a3b8', letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: '0.2rem' }}>
                POSITIVE REVIEWS (4-5★)
              </div>
              <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#10b981', lineHeight: 1 }}>
                {feedbackSummary.positiveCount || 0}
              </div>
              <div style={{ fontSize: '0.72rem', color: '#10b981', marginTop: '0.4rem' }}>
                Satisfaction Rate: <strong>{feedbackSummary.satisfactionPercent || 0}%</strong>
              </div>
            </div>

            {/* Neutral Reviews */}
            <div style={{
              background: '#0d1527',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderLeft: '3.5px solid #eab308',
              borderRadius: '10px',
              padding: '1rem 1.25rem'
            }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#94a3b8', letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: '0.2rem' }}>
                NEUTRAL REVIEWS (3★)
              </div>
              <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#eab308', lineHeight: 1 }}>
                {feedbackSummary.neutralCount || 0}
              </div>
              <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '0.4rem' }}>
                Acceptable redressal
              </div>
            </div>

            {/* Negative Reviews */}
            <div style={{
              background: '#0d1527',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderLeft: '3.5px solid #ef4444',
              borderRadius: '10px',
              padding: '1rem 1.25rem'
            }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#94a3b8', letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: '0.2rem' }}>
                NEGATIVE REVIEWS (1-2★)
              </div>
              <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#ef4444', lineHeight: 1 }}>
                {feedbackSummary.negativeCount || 0}
              </div>
              <div style={{ fontSize: '0.72rem', color: '#ef4444', marginTop: '0.4rem' }}>
                Requires process intervention
              </div>
            </div>
          </div>

          {/* Department-wise Satisfaction Breakdown */}
          {feedbackSummary.departmentSatisfaction && feedbackSummary.departmentSatisfaction.length > 0 && (
            <div style={{
              background: '#0d1527',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '10px',
              padding: '1.1rem 1.25rem',
              marginBottom: '1.25rem'
            }}>
              <div style={{ fontSize: '0.92rem', fontWeight: 700, color: '#f8fafc', marginBottom: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Award size={16} color="#fbbf24" />
                <span>Department Satisfaction Ratings</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.75rem' }}>
                {feedbackSummary.departmentSatisfaction.map(ds => (
                  <div key={ds.department} style={{ background: '#080d1a', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '8px', padding: '0.75rem' }}>
                    <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '0.25rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {ds.department}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: '#fbbf24', fontWeight: 700, fontSize: '0.95rem' }}>
                        ★ {ds.avgRating}
                      </span>
                      <span style={{ fontSize: '0.7rem', color: '#94a3b8', background: 'rgba(255,255,255,0.06)', padding: '2px 6px', borderRadius: '4px' }}>
                        {ds.count} {ds.count === 1 ? 'review' : 'reviews'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Feedback Filter Bar */}
          <div style={{
            background: '#0d1527',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '8px',
            padding: '0.55rem 0.9rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            marginBottom: '1rem',
            flexWrap: 'wrap'
          }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#94a3b8' }}>
              Filters:
            </span>

            <div style={{ flex: '1 1 200px', position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Search size={14} style={{ position: 'absolute', left: '10px', color: '#64748b' }} />
              <input
                type="text"
                placeholder="Search feedback by student, ID, department, or comment..."
                value={feedbackSearch}
                onChange={(e) => setFeedbackSearch(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.4rem 0.65rem 0.4rem 2rem',
                  background: '#080d1a',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '6px',
                  fontSize: '0.8rem',
                  color: '#f8fafc',
                  outline: 'none'
                }}
              />
            </div>

            <select
              value={feedbackRatingFilter}
              onChange={(e) => setFeedbackRatingFilter(e.target.value)}
              style={{
                background: '#080d1a',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '6px',
                padding: '0.4rem 0.65rem',
                fontSize: '0.8rem',
                color: '#cbd5e1',
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              <option value="">All Ratings</option>
              <option value="5">★★★★★ 5 Stars Only</option>
              <option value="4">★★★★ 4 Stars Only</option>
              <option value="3">★★★ 3 Stars (Neutral)</option>
              <option value="2">★★ 2 Stars</option>
              <option value="1">★ 1 Star</option>
              <option value="positive">Positive Reviews (4-5★)</option>
              <option value="negative">Negative Reviews (1-2★)</option>
            </select>

            <select
              value={feedbackDeptFilter}
              onChange={(e) => setFeedbackDeptFilter(e.target.value)}
              style={{
                background: '#080d1a',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '6px',
                padding: '0.4rem 0.65rem',
                fontSize: '0.8rem',
                color: '#cbd5e1',
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              <option value="">All Departments</option>
              {departmentsList.map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          {/* Feedback Records Table */}
          <div style={{
            background: '#0d1527',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '10px',
            padding: '1.25rem',
            overflow: 'hidden'
          }}>
            <div style={{ fontSize: '1rem', fontWeight: 700, color: '#f8fafc', marginBottom: '1rem' }}>
              Verified Student Feedback Records ({filteredFeedbacks.length})
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
                    <th style={{ padding: '0.65rem 0.6rem', color: '#94a3b8', fontWeight: 600, textAlign: 'left', textTransform: 'uppercase', fontSize: '0.72rem' }}>Student</th>
                    <th style={{ padding: '0.65rem 0.6rem', color: '#94a3b8', fontWeight: 600, textAlign: 'left', textTransform: 'uppercase', fontSize: '0.72rem' }}>Complaint Token</th>
                    <th style={{ padding: '0.65rem 0.6rem', color: '#94a3b8', fontWeight: 600, textAlign: 'left', textTransform: 'uppercase', fontSize: '0.72rem' }}>Department</th>
                    <th style={{ padding: '0.65rem 0.6rem', color: '#94a3b8', fontWeight: 600, textAlign: 'left', textTransform: 'uppercase', fontSize: '0.72rem' }}>Officer</th>
                    <th style={{ padding: '0.65rem 0.6rem', color: '#94a3b8', fontWeight: 600, textAlign: 'center', textTransform: 'uppercase', fontSize: '0.72rem' }}>Rating</th>
                    <th style={{ padding: '0.65rem 0.6rem', color: '#94a3b8', fontWeight: 600, textAlign: 'left', textTransform: 'uppercase', fontSize: '0.72rem' }}>Comments</th>
                    <th style={{ padding: '0.65rem 0.6rem', color: '#94a3b8', fontWeight: 600, textAlign: 'left', textTransform: 'uppercase', fontSize: '0.72rem' }}>Submitted Date</th>
                    <th style={{ padding: '0.65rem 0.6rem', color: '#94a3b8', fontWeight: 600, textAlign: 'center', textTransform: 'uppercase', fontSize: '0.72rem' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredFeedbacks.length === 0 ? (
                    <tr>
                      <td colSpan="8" style={{ textAlign: 'center', padding: '2.5rem 1rem', color: '#64748b' }}>
                        No student feedback records found matching the active criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredFeedbacks.map(f => {
                      const studentName = f.complaintId?.anonymous
                        ? 'Anonymous Student'
                        : (f.complaintId?.studentId?.name || 'Student');
                      const complaintCode = f.complaintId?.complaintId || 'SCGRS-TICKET';
                      const officerName = f.complaintId?.assignedOfficer?.name || 'Unassigned';

                      return (
                        <tr key={f._id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                          <td style={{ padding: '0.8rem 0.6rem' }}>
                            <div style={{ color: '#f8fafc', fontWeight: 600 }}>{studentName}</div>
                            {f.complaintId?.anonymous ? (
                              <div style={{ color: '#f59e0b', fontSize: '0.68rem' }}>🔒 Anonymous</div>
                            ) : (
                              <div style={{ color: '#64748b', fontSize: '0.68rem' }}>
                                {f.complaintId?.studentId?.rollNumber || f.complaintId?.studentId?.email || ''}
                              </div>
                            )}
                          </td>
                          <td style={{ padding: '0.8rem 0.6rem', fontFamily: 'monospace', fontWeight: 700, color: '#38bdf8' }}>
                            {complaintCode}
                          </td>
                          <td style={{ padding: '0.8rem 0.6rem', color: '#cbd5e1' }}>
                            {f.complaintId?.department || 'General Administration'}
                          </td>
                          <td style={{ padding: '0.8rem 0.6rem', color: '#cbd5e1' }}>
                            {officerName}
                          </td>
                          <td style={{ padding: '0.8rem 0.6rem', textAlign: 'center' }}>
                            <span style={{
                              color: f.rating >= 4 ? '#fbbf24' : f.rating === 3 ? '#eab308' : '#ef4444',
                              fontWeight: 700,
                              fontSize: '0.9rem'
                            }}>
                              {'★'.repeat(f.rating || 0)}{'☆'.repeat(Math.max(0, 5 - (f.rating || 0)))}
                            </span>
                          </td>
                          <td style={{ padding: '0.8rem 0.6rem', maxWidth: '240px' }}>
                            <div style={{
                              color: '#e2e8f0',
                              fontSize: '0.78rem',
                              fontStyle: 'italic',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap'
                            }} title={f.comment}>
                              "{f.comment || 'No written comment provided.'}"
                            </div>
                          </td>
                          <td style={{ padding: '0.8rem 0.6rem', color: '#94a3b8', fontSize: '0.75rem', whiteSpace: 'nowrap' }}>
                            {new Date(f.createdAt).toLocaleDateString()}
                          </td>
                          <td style={{ padding: '0.8rem 0.6rem', textAlign: 'center' }}>
                            <button
                              onClick={() => setSelectedFeedbackModal(f)}
                              style={{
                                background: '#2563eb',
                                color: '#fff',
                                border: 'none',
                                borderRadius: '4px',
                                padding: '3px 8px',
                                fontSize: '0.72rem',
                                fontWeight: 600,
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px'
                              }}
                            >
                              <Eye size={11} /> Details
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── Feedback Details Modal ── */}
      {selectedFeedbackModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(5px)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem'
        }}>
          <div style={{
            background: '#0d1527',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            borderRadius: '12px',
            maxWidth: '520px',
            width: '100%',
            padding: '1.5rem',
            color: '#f8fafc',
            boxShadow: '0 20px 40px rgba(0,0,0,0.6)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                <Star size={18} color="#fbbf24" fill="#fbbf24" />
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>
                  Student Feedback Details
                </h3>
              </div>
              <button
                onClick={() => setSelectedFeedbackModal(null)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', fontSize: '0.85rem' }}>
              <div style={{ background: '#080d1a', padding: '0.75rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '3px' }}>Complaint Token & Title</div>
                <div style={{ fontWeight: 700, color: '#38bdf8' }}>
                  {selectedFeedbackModal.complaintId?.complaintId || 'N/A'}
                </div>
                <div style={{ color: '#e2e8f0', marginTop: '2px' }}>
                  {selectedFeedbackModal.complaintId?.title || 'Complaint record'}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div style={{ background: '#080d1a', padding: '0.75rem', borderRadius: '8px' }}>
                  <div style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase' }}>Department</div>
                  <div style={{ fontWeight: 600, color: '#f8fafc', marginTop: '2px' }}>
                    {selectedFeedbackModal.complaintId?.department || 'General Administration'}
                  </div>
                </div>
                <div style={{ background: '#080d1a', padding: '0.75rem', borderRadius: '8px' }}>
                  <div style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase' }}>Responsible Officer</div>
                  <div style={{ fontWeight: 600, color: '#f8fafc', marginTop: '2px' }}>
                    {selectedFeedbackModal.complaintId?.assignedOfficer?.name || 'Unassigned'}
                  </div>
                </div>
              </div>

              <div style={{ background: '#080d1a', padding: '0.75rem', borderRadius: '8px' }}>
                <div style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '4px' }}>Satisfaction Rating</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontSize: '1.25rem', color: '#fbbf24', fontWeight: 800 }}>
                    {'★'.repeat(selectedFeedbackModal.rating || 0)}{'☆'.repeat(Math.max(0, 5 - (selectedFeedbackModal.rating || 0)))}
                  </span>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#f8fafc' }}>
                    ({selectedFeedbackModal.rating} out of 5)
                  </span>
                </div>
              </div>

              <div style={{ background: '#080d1a', padding: '0.75rem', borderRadius: '8px' }}>
                <div style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '4px' }}>Student Remarks</div>
                <div style={{ color: '#f1f5f9', fontStyle: 'italic', lineHeight: 1.4 }}>
                  "{selectedFeedbackModal.comment || 'No written comments submitted.'}"
                </div>
              </div>

              <div style={{ fontSize: '0.72rem', color: '#64748b', textAlign: 'right' }}>
                Submitted on: {new Date(selectedFeedbackModal.createdAt).toLocaleString()}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.25rem', gap: '0.5rem' }}>
              {selectedFeedbackModal.complaintId?._id && (
                <button
                  onClick={() => navigate(`/student/complaints?id=${selectedFeedbackModal.complaintId._id}`)}
                  style={{
                    background: 'transparent',
                    border: '1px solid #38bdf8',
                    color: '#38bdf8',
                    padding: '0.4rem 0.8rem',
                    borderRadius: '6px',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  View Full Complaint
                </button>
              )}
              <button
                onClick={() => setSelectedFeedbackModal(null)}
                style={{
                  background: '#2563eb',
                  border: 'none',
                  color: '#fff',
                  padding: '0.4rem 0.8rem',
                  borderRadius: '6px',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminReports;

