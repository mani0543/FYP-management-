import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import DashboardLayout from './layouts/DashboardLayout.jsx';
import ProtectedRoute from './components/guards/ProtectedRoute.jsx';

// Auth Pages
import Login from './pages/auth/Login.jsx';

// Admin Pages
import AdminDashboard from './pages/admin/AdminDashboard.jsx';
import BatchManagement from './pages/admin/BatchManagement.jsx';
import AssignmentManagement from './pages/admin/AssignmentManagement.jsx';
import UserManagement from './pages/admin/UserManagement.jsx';
import AdminSettings from './pages/admin/AdminSettings.jsx';
import AuditLogs from './pages/admin/AuditLogs.jsx';

// Coordinator Pages
import CoordinatorDashboard from './pages/coordinator/CoordinatorDashboard.jsx';
import CoordinatorStudents from './pages/coordinator/CoordinatorStudents.jsx';
import CoordinatorTeamRequests from './pages/coordinator/CoordinatorTeamRequests.jsx';
import CoordinatorTopics from './pages/coordinator/CoordinatorTopics.jsx';
import CoordinatorProposals from './pages/coordinator/CoordinatorProposals.jsx';
import CoordinatorTemplates from './pages/coordinator/CoordinatorTemplates.jsx';
import CoordinatorPresentations from './pages/coordinator/CoordinatorPresentations.jsx';
import CoordinatorAnnouncements from './pages/coordinator/CoordinatorAnnouncements.jsx';
import CoordinatorMeetings from './pages/coordinator/CoordinatorMeetings.jsx';

// Supervisor Pages
import SupervisorDashboard from './pages/supervisor/SupervisorDashboard.jsx';
import SupervisorTeams from './pages/supervisor/SupervisorTeams.jsx';
import SupervisorTopics from './pages/coordinator/CoordinatorTopics.jsx'; // Reused clean topics component
import SupervisorProposals from './pages/supervisor/SupervisorProposals.jsx';
import SupervisorDocuments from './pages/supervisor/SupervisorDocuments.jsx';
import SupervisorChat from './pages/supervisor/SupervisorChat.jsx';
import SupervisorMeetings from './pages/coordinator/CoordinatorMeetings.jsx';
import SupervisorAnnouncements from './pages/coordinator/CoordinatorAnnouncements.jsx';

// Student Pages
import StudentTeamRegistration from './pages/student/StudentTeamRegistration.jsx';
import StudentDashboard from './pages/student/StudentDashboard.jsx';
import StudentProposal from './pages/student/StudentProposal.jsx';
import StudentTemplates from './pages/student/StudentTemplates.jsx';
import StudentSemester7 from './pages/student/StudentSemester7.jsx';
import StudentSemester8 from './pages/student/StudentSemester8.jsx';
import StudentChatPage from './pages/student/StudentChatPage.jsx';
import StudentMeetings from './pages/student/StudentMeetings.jsx';
import StudentAnnouncements from './pages/student/StudentAnnouncements.jsx';

// Examiner Pages
import ExaminerDashboard from './pages/examiner/ExaminerDashboard.jsx';
import DocumentViewerPage from './pages/common/DocumentViewerPage.jsx';

function RootRedirect() {
  const { user, activeAssignment, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-gray-500 text-sm">
        Loading university portal...
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  if (user.capabilities?.includes('ADMIN')) return <Navigate to="/admin/dashboard" replace />;
  if (user.capabilities?.includes('STUDENT')) return <Navigate to="/student/dashboard" replace />;

  if (activeAssignment) {
    if (activeAssignment.responsibility === 'COORDINATOR') return <Navigate to="/coordinator/dashboard" replace />;
    if (activeAssignment.responsibility === 'SUPERVISOR') return <Navigate to="/supervisor/dashboard" replace />;
    if (activeAssignment.responsibility === 'EXAMINER') return <Navigate to="/examiner/dashboard" replace />;
  }

  return <Navigate to="/coordinator/dashboard" replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/document-viewer/:docId" element={<DocumentViewerPage />} />
          <Route path="/" element={<RootRedirect />} />

          <Route
            element={
              <ProtectedRoute>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            {/* Super Admin Routes */}
            <Route path="/admin/dashboard" element={<AdminDashboard />} />
            <Route path="/admin/batches" element={<BatchManagement />} />
            <Route path="/admin/assignments" element={<AssignmentManagement />} />
            <Route path="/admin/users" element={<UserManagement />} />
            <Route path="/admin/settings" element={<AdminSettings />} />
            <Route path="/admin/audit-logs" element={<AuditLogs />} />

            {/* Coordinator Routes */}
            <Route path="/coordinator/dashboard" element={<CoordinatorDashboard />} />
            <Route path="/coordinator/students" element={<CoordinatorStudents />} />
            <Route path="/coordinator/team-requests" element={<CoordinatorTeamRequests />} />
            <Route path="/coordinator/topics" element={<CoordinatorTopics />} />
            <Route path="/coordinator/proposals" element={<CoordinatorProposals />} />
            <Route path="/coordinator/templates" element={<CoordinatorTemplates />} />
            <Route path="/coordinator/presentations" element={<CoordinatorPresentations />} />
            <Route path="/coordinator/announcements" element={<CoordinatorAnnouncements />} />
            <Route path="/coordinator/meetings" element={<CoordinatorMeetings />} />

            {/* Supervisor Routes */}
            <Route path="/supervisor/dashboard" element={<SupervisorDashboard />} />
            <Route path="/supervisor/teams" element={<SupervisorTeams />} />
            <Route path="/supervisor/topics" element={<SupervisorTopics />} />
            <Route path="/supervisor/proposals" element={<SupervisorProposals />} />
            <Route path="/supervisor/documents" element={<SupervisorDocuments />} />
            <Route path="/supervisor/chat" element={<SupervisorChat />} />
            <Route path="/supervisor/meetings" element={<SupervisorMeetings />} />
            <Route path="/supervisor/announcements" element={<SupervisorAnnouncements />} />

            {/* Student Routes */}
            <Route path="/student/team-registration" element={<StudentTeamRegistration />} />
            <Route path="/student/dashboard" element={<StudentDashboard />} />
            <Route path="/student/proposal" element={<StudentProposal />} />
            <Route path="/student/templates" element={<StudentTemplates />} />
            <Route path="/student/chat" element={<StudentChatPage />} />
            <Route path="/student/semester-7" element={<StudentSemester7 />} />
            <Route path="/student/semester-8" element={<StudentSemester8 />} />
            <Route path="/student/meetings" element={<StudentMeetings />} />
            <Route path="/student/announcements" element={<StudentAnnouncements />} />

            {/* Examiner Routes */}
            <Route path="/examiner/dashboard" element={<ExaminerDashboard />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
