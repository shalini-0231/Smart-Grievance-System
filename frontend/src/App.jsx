import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { LanguageProvider } from './context/LanguageContext';
import Navbar from './components/Navbar';
import GlobalFloatingChatbot from './components/GlobalFloatingChatbot';
import LandingPage from './pages/LandingPage';
import Login from './pages/Login';
import Register from './pages/Register';
import StudentDashboard from './pages/StudentDashboard';
import SubmitComplaint from './pages/SubmitComplaint';
import MyComplaints from './pages/MyComplaints';
import AdminDashboard from './pages/AdminDashboard';
import AdminAnalytics from './pages/AdminAnalytics';
import AdminReports from './pages/AdminReports';
import AdminOfficers from './pages/AdminOfficers';
import AdminUsers from './pages/AdminUsers';
import ComplaintDetails from './pages/ComplaintDetails';

// Protected Route Wrapper Component
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: 'var(--bg-primary)' }}>
        <h3 style={{ color: 'var(--text-secondary)' }}>Loading Session...</h3>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Redirect to home if user doesn't have the required role
    return <Navigate to="/" replace />;
  }

  return children;
};

function App() {
  return (
    <LanguageProvider>
    <AuthProvider>
      <ToastProvider>
        <Router>
        <div className="app-container">
          <div className="bg-glow"></div>
          <Navbar />
          <main className="main-content">
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />

              {/* Student Routes */}
              <Route 
                path="/student/dashboard" 
                element={
                  <ProtectedRoute allowedRoles={['student']}>
                    <StudentDashboard />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/student/submit" 
                element={
                  <ProtectedRoute allowedRoles={['student']}>
                    <SubmitComplaint />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/student/complaints" 
                element={
                  <ProtectedRoute allowedRoles={['student']}>
                    <MyComplaints />
                  </ProtectedRoute>
                } 
              />

              {/* Admin Routes */}
              <Route 
                path="/admin/dashboard" 
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <AdminDashboard defaultTab="overview" />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/admin/complaints" 
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <AdminDashboard defaultTab="grievances" />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/admin/officers" 
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <AdminOfficers />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/admin/sla" 
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <AdminDashboard defaultTab="sla" />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/admin/analytics" 
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <AdminAnalytics />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/admin/users" 
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <AdminUsers />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/admin/reports" 
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <AdminReports />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/admin/alerts" 
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <AdminDashboard defaultTab="notifications" />
                  </ProtectedRoute>
                } 
              />

              {/* Unified Complaint Details */}
              <Route 
                path="/complaints/:id" 
                element={
                  <ProtectedRoute>
                    <ComplaintDetails />
                  </ProtectedRoute>
                } 
              />

              {/* Redirect any fallback paths */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
          <GlobalFloatingChatbot />
        </div>
      </Router>
    </ToastProvider>
    </AuthProvider>
    </LanguageProvider>
  );
}

export default App;
