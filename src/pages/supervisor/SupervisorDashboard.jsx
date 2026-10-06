import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import api from '../../api/client.js';
import StatusBadge from '../../components/common/StatusBadge.jsx';
import {
  Users,
  FolderOpen,
  FileText,
  MessageSquare,
  ArrowRight,
  CheckCircle2,
  Clock,
  Layers,
} from 'lucide-react';
import { Link } from 'react-router-dom';

export default function SupervisorDashboard() {
  const { user } = useAuth();
  const [teams, setTeams] = useState([]);
  const [proposals, setProposals] = useState([]);
  const [topics, setTopics] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSupervisorData = async () => {
      try {
        const teamRes = await api.get('/supervisor/teams');
        const propRes = await api.get('/supervisor/proposals');
        const topRes = await api.get('/supervisor/topics');

        if (teamRes.success) setTeams(teamRes.teams || []);
        if (propRes.success) setProposals(propRes.proposals || []);
        if (topRes.success) setTopics(topRes.topics || []);
      } catch (err) {
        console.warn('Supervisor dashboard fetch error:', err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchSupervisorData();
  }, []);

  const pendingProposalsCount = proposals.filter((p) => p.status === 'SUBMITTED_TO_SUPERVISOR').length;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-blue-700 bg-blue-50 px-3 py-1 rounded-full border border-blue-200">
            Faculty Supervisor Workspace
          </span>
          <h2 className="text-xl font-bold text-gray-900 mt-2">{user?.name}</h2>
          <p className="text-xs text-gray-600 mt-0.5">
            Oversee project teams, evaluate proposals, sign approved deliverables, and advise students.
          </p>
        </div>

        <div className="flex gap-2">
          <Link
            to="/supervisor/proposals"
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-700 text-white rounded-lg text-xs font-bold hover:bg-blue-800 transition-colors shadow-2xs"
          >
            <FileText className="w-4 h-4" />
            <span>Review Proposals ({pendingProposalsCount})</span>
          </Link>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link
          to="/supervisor/teams"
          className="bg-white p-5 rounded-xl border border-gray-200 shadow-2xs hover:border-blue-300 transition-all space-y-2"
        >
          <div className="flex justify-between items-center text-gray-500 text-xs uppercase font-bold">
            <span>Allocated Teams</span>
            <Users className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-bold text-gray-900">{teams.length}</div>
          <div className="text-[11px] text-blue-700 flex items-center gap-1 font-semibold">
            <span>View Supervised Teams</span> <ArrowRight className="w-3 h-3" />
          </div>
        </Link>

        <Link
          to="/supervisor/proposals"
          className="bg-white p-5 rounded-xl border border-gray-200 shadow-2xs hover:border-blue-300 transition-all space-y-2"
        >
          <div className="flex justify-between items-center text-gray-500 text-xs uppercase font-bold">
            <span>Pending Proposal Reviews</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-bold text-gray-900">{pendingProposalsCount}</div>
          <div className="text-[11px] text-amber-700 flex items-center gap-1 font-semibold">
            <span>Evaluate Submissions</span> <ArrowRight className="w-3 h-3" />
          </div>
        </Link>

        <Link
          to="/supervisor/topics"
          className="bg-white p-5 rounded-xl border border-gray-200 shadow-2xs hover:border-blue-300 transition-all space-y-2"
        >
          <div className="flex justify-between items-center text-gray-500 text-xs uppercase font-bold">
            <span>Published Research Topics</span>
            <FolderOpen className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-bold text-gray-900">{topics.length}</div>
          <div className="text-[11px] text-indigo-700 flex items-center gap-1 font-semibold">
            <span>Manage Topics</span> <ArrowRight className="w-3 h-3" />
          </div>
        </Link>
      </div>

      {/* Assigned Teams Table */}
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-gray-200 pb-3">
          <div>
            <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-700" />
              Assigned Project Teams
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Teams under your direct academic mentorship.
            </p>
          </div>
        </div>

        {teams.length === 0 ? (
          <div className="text-center py-10 text-sm text-gray-500">
            No teams assigned yet. Accepted project proposals will assign teams here automatically.
          </div>
        ) : (
          <div className="space-y-3">
            {teams.map((t) => (
              <div
                key={t._id || t.id}
                className="p-4 rounded-xl border border-gray-200 bg-gray-50/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:bg-gray-50 transition-colors"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-blue-800 bg-blue-100 px-2 py-0.5 rounded">
                      {t.teamCode}
                    </span>
                    <h4 className="text-sm font-bold text-gray-900">{t.projectTitle || 'Project Title'}</h4>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded bg-gray-200 text-gray-700">
                      Semester {t.semesterNumber}
                    </span>
                  </div>
                  <div className="text-xs text-gray-600">
                    <strong>Members:</strong> {t.studentNames?.join(', ')} ({t.studentRegNos?.join(', ')})
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Link
                    to="/supervisor/chat"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 shadow-2xs"
                  >
                    <MessageSquare className="w-3.5 h-3.5 text-blue-600" />
                    <span>Open Chat</span>
                  </Link>

                  <Link
                    to="/supervisor/documents"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-blue-700 text-white rounded-lg hover:bg-blue-800 shadow-2xs"
                  >
                    <span>View Deliverables</span>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
