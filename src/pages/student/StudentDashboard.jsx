import React, { useState, useEffect } from 'react';
import { Link, useOutletContext, useNavigate } from 'react-router-dom';
import api from '../../api/client.js';
import StatusBadge from '../../components/common/StatusBadge.jsx';
import {
  Users,
  FolderOpen,
  Sparkles,
  Layers,
  ArrowRight,
  CheckCircle,
  Clock,
  AlertCircle,
  FileText,
} from 'lucide-react';

export default function StudentDashboard() {
  const { studentData } = useOutletContext();
  const navigate = useNavigate();

  const [supervisors, setSupervisors] = useState([]);
  const [topics, setTopics] = useState([]);
  const [loading, setLoading] = useState(true);

  // If portals not active yet, redirect to team registration screen.
  // Once supervisor is chosen & approved, hide Project Dashboard and redirect to active Phase.
  useEffect(() => {
    if (!studentData) return;
    if (!studentData.batch?.portalsCreated || studentData.team?.status !== 'PORTAL_ACTIVE') {
      navigate('/student/team-registration', { replace: true });
      return;
    }

    const hasSupervisor =
      Boolean(studentData?.team?.supervisorId) ||
      (studentData?.proposal &&
        ['SUPERVISOR_APPROVED', 'COORDINATOR_REVIEW', 'APPROVED'].includes(studentData.proposal.status));

    if (hasSupervisor) {
      const semester7Passed =
        studentData?.phases?.semester7?.status === 'LOCKED' || studentData?.team?.semesterNumber === 8;
      navigate(semester7Passed ? '/student/semester-8' : '/student/semester-7', { replace: true });
    }
  }, [studentData, navigate]);

  useEffect(() => {
    const fetchSupervisorsAndTopics = async () => {
      try {
        const res = await api.get('/student/supervisors-and-topics');
        if (res.success) {
          setSupervisors(res.supervisors || []);
          setTopics(res.topics || []);
        }
      } catch (err) {
        console.warn('Supervisors fetch error:', err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchSupervisorsAndTopics();
  }, []);

  const team = studentData?.team;
  const proposal = studentData?.proposal;

  return (
    <div className="space-y-6">
      {/* Team & Project Status Hero Banner */}
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold bg-blue-100 text-blue-800 px-2.5 py-0.5 rounded">
              {team?.teamCode || 'TEAM'}
            </span>
            <span className="text-xs text-gray-500 font-semibold">{studentData?.batch?.name}</span>
            <span className="text-xs font-semibold bg-gray-100 text-gray-700 px-2 py-0.5 rounded">
              Semester {team?.semesterNumber || 7}
            </span>
          </div>

          <h2 className="text-xl font-bold text-gray-900 mt-2">
            {proposal?.title || team?.projectTitle || 'Topic Submission Pending'}
          </h2>

          <div className="flex flex-wrap items-center gap-4 mt-2 text-xs text-gray-600">
            <div>
              <strong>Members:</strong> {team?.studentNames?.join(', ')}
            </div>
            {team?.supervisorName && (
              <div>
                <strong>Supervisor:</strong> {team.supervisorName}
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="text-right">
            <div className="text-[11px] text-gray-500 font-medium uppercase tracking-wider mb-1">
              Proposal Status
            </div>
            <StatusBadge status={proposal?.status || 'DRAFT'} />
          </div>

          <Link
            to="/student/proposal"
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-700 text-white rounded-lg text-xs font-semibold hover:bg-blue-800 transition-colors shadow-2xs"
          >
            <span>{proposal ? 'View / Edit Proposal' : 'Submit Proposal'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* Available Supervisors Section (Rule #23, #24) */}
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-xs">
        <div className="flex items-center justify-between border-b border-gray-200 pb-3 mb-4">
          <div>
            <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-700" />
              Department Faculty Supervisors & Capacities
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Supervisors are allocated on capacity. Maximum quota is strictly enforced by department policy.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-8 text-sm text-gray-500">Loading academic supervisors...</div>
        ) : supervisors.length === 0 ? (
          <div className="text-center py-8 text-sm text-gray-500">
            No supervisors actively assigned to this batch yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {supervisors.map((s) => (
              <div
                key={s.id}
                className={`p-4 rounded-xl border ${
                  s.isFull ? 'bg-gray-50/70 border-gray-200 opacity-80' : 'bg-white border-blue-100 hover:border-blue-300'
                } shadow-2xs space-y-2 transition-all`}
              >
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-gray-900 truncate">{s.name}</h4>
                  {s.isFull ? (
                    <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded bg-rose-100 text-rose-800 border border-rose-200">
                      FULL
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded bg-emerald-100 text-emerald-800 border border-emerald-200">
                      AVAILABLE ({s.availableCapacity} slots)
                    </span>
                  )}
                </div>

                <div className="text-xs text-gray-500">{s.email}</div>

                <div className="pt-2 border-t border-gray-100 flex justify-between text-xs text-gray-600">
                  <span>Current Team Count:</span>
                  <span className="font-bold text-gray-800">
                    {s.currentTeamCount} / {s.maxCapacity} Teams
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Supervisor Project Topics Section (Rule #23) */}
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-xs">
        <div className="flex items-center justify-between border-b border-gray-200 pb-3 mb-4">
          <div>
            <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <FolderOpen className="w-5 h-5 text-blue-700" />
              Published Supervisor Research Topics
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              You can select a published supervisor topic or propose your own innovative topic in the proposal form.
            </p>
          </div>
        </div>

        {topics.length === 0 ? (
          <div className="text-center py-8 text-sm text-gray-500">
            No research topics published yet. You may propose your own custom topic!
          </div>
        ) : (
          <div className="space-y-3">
            {topics.map((t) => {
              const isOccupied = t.status === 'OCCUPIED';
              return (
                <div
                  key={t._id || t.id}
                  className={`p-4 rounded-xl border ${
                    isOccupied ? 'bg-gray-50/60 border-gray-200 opacity-75' : 'bg-white border-gray-200 hover:border-blue-300'
                  } transition-all flex flex-col md:flex-row justify-between items-start md:items-center gap-4`}
                >
                  <div className="space-y-1 max-w-3xl">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-gray-900">{t.title}</h4>
                      {isOccupied ? (
                        <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded bg-slate-200 text-slate-800">
                          OCCUPIED
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded bg-emerald-100 text-emerald-800">
                          AVAILABLE
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-gray-600 line-clamp-2">{t.description}</p>

                    <div className="flex flex-wrap items-center gap-3 text-[11px] text-gray-500 pt-1">
                      <span>
                        Supervisor: <strong>{t.supervisorName}</strong>
                      </span>
                      {t.technologies && t.technologies.length > 0 && (
                        <span>Tech: {t.technologies.join(', ')}</span>
                      )}
                    </div>
                  </div>

                  {!isOccupied && !proposal && (
                    <Link
                      to={`/student/proposal?topicId=${t._id || t.id}&supervisorId=${t.supervisorId}`}
                      className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 transition-colors"
                    >
                      Select Topic
                    </Link>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
