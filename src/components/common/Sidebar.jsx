import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  Calendar,
  Layers,
  FileText,
  UserCheck,
  FolderOpen,
  MessageSquare,
  Video,
  Bell,
  Settings,
  ShieldCheck,
  Award,
  Clock,
  Sparkles,
  GitBranch,
} from 'lucide-react';

export default function Sidebar({ studentData }) {
  const { user, activeAssignment } = useAuth();

  const isSuperAdmin = user?.capabilities?.includes('ADMIN');
  const isStudent = user?.capabilities?.includes('STUDENT');
  const isFaculty = user?.capabilities?.includes('FACULTY');

  // Determine active faculty responsibility
  const responsibility = activeAssignment?.responsibility || (isSuperAdmin ? 'ADMIN' : isStudent ? 'STUDENT' : 'COORDINATOR');

  const navClass = ({ isActive }) =>
    `flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-semibold transition-colors ${
      isActive
        ? 'bg-blue-700 text-white shadow-2xs'
        : 'text-slate-600 hover:text-blue-900 hover:bg-blue-50/70'
    }`;

  // 1. STUDENT SIDEBAR (Strict phase visibility per Rules #3, #20, #30, #38)
  if (isStudent) {
    const portalActive = studentData?.batch?.portalsCreated && studentData?.team?.status === 'PORTAL_ACTIVE';
    const hasSupervisor =
      Boolean(studentData?.team?.supervisorId) ||
      (studentData?.proposal &&
        ['SUPERVISOR_APPROVED', 'COORDINATOR_REVIEW', 'APPROVED'].includes(studentData.proposal.status));
    const semester7Passed = studentData?.phases?.semester7?.status === 'LOCKED' || studentData?.team?.semesterNumber === 8;

    return (
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col shrink-0 min-h-[calc(100vh-4rem)]">
        <div className="p-4 border-b border-gray-200 bg-gray-50/75">
          <div className="text-[11px] uppercase tracking-wider font-bold text-gray-500">Student Navigation</div>
          <div className="text-xs font-semibold text-gray-800 mt-0.5 truncate">
            {studentData?.batch?.name || 'Class FYP Portal'}
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {/* Rule #20: Before portal creation, student sees ONLY Team Registration! */}
          {!portalActive ? (
            <NavLink to="/student/team-registration" className={navClass}>
              <UserCheck className="w-4 h-4" />
              <span>Register Team</span>
            </NavLink>
          ) : (
            <>
              {/* Once supervisor is approved & chosen, Project Dashboard is hidden */}
              {!hasSupervisor && (
                <NavLink to="/student/dashboard" className={navClass}>
                  <LayoutDashboard className="w-4 h-4" />
                  <span>Project Dashboard</span>
                </NavLink>
              )}

              <NavLink to="/student/proposal" className={navClass}>
                <Sparkles className="w-4 h-4" />
                <span>Proposal & AI Analysis</span>
              </NavLink>

              <NavLink to="/student/templates" className={navClass}>
                <FolderOpen className="w-4 h-4" />
                <span>Document Templates</span>
              </NavLink>

              {/* Phase 1 (Semester 7), Chat & Academic Meetings only show after Supervisor is finalized */}
              {hasSupervisor && (
                <>
                  <NavLink to="/student/chat" className={navClass}>
                    <MessageSquare className="w-4 h-4" />
                    <span>Team-Supervisor Chat</span>
                  </NavLink>

                  <NavLink to="/student/semester-7" className={navClass}>
                    <Layers className="w-4 h-4" />
                    <span>Semester 7 (Phase 1)</span>
                  </NavLink>

                  {/* Rule #38: Semester 8 becomes active ONLY after Semester 7 PASS */}
                  {semester7Passed && (
                    <NavLink to="/student/semester-8" className={navClass}>
                      <GitBranch className="w-4 h-4" />
                      <span>Semester 8 (Phase 2)</span>
                    </NavLink>
                  )}

                  <NavLink to="/student/meetings" className={navClass}>
                    <Video className="w-4 h-4" />
                    <span>Academic Meetings</span>
                  </NavLink>
                </>
              )}

              <NavLink to="/student/announcements" className={navClass}>
                <Bell className="w-4 h-4" />
                <span>Announcements</span>
              </NavLink>
            </>
          )}
        </nav>
      </aside>
    );
  }

  // 2. SUPER ADMIN SIDEBAR
  if (isSuperAdmin) {
    return (
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col shrink-0 min-h-[calc(100vh-4rem)]">
        <div className="p-4 border-b border-gray-200 bg-gray-50/75">
          <div className="text-[11px] uppercase tracking-wider font-bold text-gray-500">System Governance</div>
          <div className="text-xs font-semibold text-purple-900 mt-0.5">Super Admin Console</div>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          <NavLink to="/admin/dashboard" className={navClass}>
            <LayoutDashboard className="w-4 h-4" />
            <span>Overview & Analytics</span>
          </NavLink>
          <NavLink to="/admin/batches" className={navClass}>
            <GraduationCap className="w-4 h-4" />
            <span>Batches & Semesters</span>
          </NavLink>
          <NavLink to="/admin/assignments" className={navClass}>
            <Layers className="w-4 h-4" />
            <span>Academic Assignments</span>
          </NavLink>
          <NavLink to="/admin/users" className={navClass}>
            <Users className="w-4 h-4" />
            <span>User Accounts</span>
          </NavLink>
          <NavLink to="/admin/settings" className={navClass}>
            <Settings className="w-4 h-4" />
            <span>System Policies</span>
          </NavLink>
          <NavLink to="/admin/audit-logs" className={navClass}>
            <ShieldCheck className="w-4 h-4" />
            <span>Audit Trail Logs</span>
          </NavLink>
        </nav>
      </aside>
    );
  }

  // 3. FACULTY SIDEBAR (Dynamically adapts to currently active assignment: COORDINATOR, SUPERVISOR, EXAMINER)
  return (
    <aside className="w-64 bg-white border-r border-gray-200 flex flex-col shrink-0 min-h-[calc(100vh-4rem)]">
      <div className="p-4 border-b border-gray-200 bg-blue-50/50">
        <div className="text-[10px] uppercase tracking-wider font-bold text-blue-800">
          Faculty Active Lens
        </div>
        <div className="text-xs font-bold text-gray-900 mt-0.5">
          {responsibility}
        </div>
        {activeAssignment && (
          <div className="text-[11px] text-gray-600 truncate mt-0.5">
            {activeAssignment.batchName} (Sem {activeAssignment.semesterNumber})
          </div>
        )}
      </div>

      <nav className="flex-1 p-3 space-y-1">
        {responsibility === 'COORDINATOR' && (
          <>
            <div className="px-3.5 py-1 text-[10px] font-bold uppercase tracking-wider text-gray-400">
              Batch Coordination
            </div>
            <NavLink to="/coordinator/dashboard" className={navClass}>
              <LayoutDashboard className="w-4 h-4" />
              <span>Batch Workspace</span>
            </NavLink>
            <NavLink to="/coordinator/students" className={navClass}>
              <Users className="w-4 h-4" />
              <span>Student Roster</span>
            </NavLink>
            <NavLink to="/coordinator/team-requests" className={navClass}>
              <UserCheck className="w-4 h-4" />
              <span>Team Requests & Portals</span>
            </NavLink>
            <NavLink to="/coordinator/topics" className={navClass}>
              <FolderOpen className="w-4 h-4" />
              <span>Project Topics</span>
            </NavLink>
            <NavLink to="/coordinator/proposals" className={navClass}>
              <FileText className="w-4 h-4" />
              <span>All Batch Proposals</span>
            </NavLink>
            <NavLink to="/coordinator/templates" className={navClass}>
              <FolderOpen className="w-4 h-4" />
              <span>Phase Templates</span>
            </NavLink>
            <NavLink to="/coordinator/presentations" className={navClass}>
              <Award className="w-4 h-4" />
              <span>Defense Sessions</span>
            </NavLink>
            <NavLink to="/coordinator/announcements" className={navClass}>
              <Bell className="w-4 h-4" />
              <span>Announcements</span>
            </NavLink>
            <NavLink to="/coordinator/meetings" className={navClass}>
              <Video className="w-4 h-4" />
              <span>Meetings</span>
            </NavLink>

            <div className="pt-3 pb-1 px-3.5 text-[10px] font-bold uppercase tracking-wider text-blue-700 border-t border-gray-100 mt-2">
              My Supervision & Teams
            </div>
            <NavLink to="/supervisor/teams" className={navClass}>
              <Users className="w-4 h-4" />
              <span>My Supervised Teams</span>
            </NavLink>
            <NavLink to="/supervisor/proposals" className={navClass}>
              <Sparkles className="w-4 h-4" />
              <span>Supervisor Proposal Reviews</span>
            </NavLink>
            <NavLink to="/supervisor/documents" className={navClass}>
              <Layers className="w-4 h-4" />
              <span>Documents & Signatures</span>
            </NavLink>
            <NavLink to="/supervisor/chat" className={navClass}>
              <MessageSquare className="w-4 h-4" />
              <span>Team-Supervisor Chat</span>
            </NavLink>
          </>
        )}

        {responsibility === 'SUPERVISOR' && (
          <>
            <NavLink to="/supervisor/dashboard" className={navClass}>
              <LayoutDashboard className="w-4 h-4" />
              <span>Supervisor Dashboard</span>
            </NavLink>
            <NavLink to="/supervisor/teams" className={navClass}>
              <Users className="w-4 h-4" />
              <span>My Assigned Teams</span>
            </NavLink>
            <NavLink to="/supervisor/topics" className={navClass}>
              <FolderOpen className="w-4 h-4" />
              <span>My Project Topics</span>
            </NavLink>
            <NavLink to="/supervisor/proposals" className={navClass}>
              <FileText className="w-4 h-4" />
              <span>Proposal Reviews</span>
            </NavLink>
            <NavLink to="/supervisor/documents" className={navClass}>
              <Layers className="w-4 h-4" />
              <span>Documents & Signatures</span>
            </NavLink>
            <NavLink to="/supervisor/chat" className={navClass}>
              <MessageSquare className="w-4 h-4" />
              <span>Student Chat</span>
            </NavLink>
            <NavLink to="/supervisor/meetings" className={navClass}>
              <Video className="w-4 h-4" />
              <span>Meetings</span>
            </NavLink>
            <NavLink to="/supervisor/announcements" className={navClass}>
              <Bell className="w-4 h-4" />
              <span>Announcements</span>
            </NavLink>
          </>
        )}

        {responsibility === 'EXAMINER' && (
          <>
            <NavLink to="/examiner/dashboard" className={navClass}>
              <Award className="w-4 h-4" />
              <span>Defense Grading</span>
            </NavLink>
          </>
        )}
      </nav>
    </aside>
  );
}
