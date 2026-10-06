import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import api from '../../api/client.js';
import StatusBadge from '../../components/common/StatusBadge.jsx';
import CountdownTimer from '../../components/common/CountdownTimer.jsx';
import Modal from '../../components/common/Modal.jsx';
import {
  Users,
  GraduationCap,
  Calendar,
  Layers,
  FileCheck,
  CheckCircle2,
  Clock,
  ArrowRight,
  Sparkles,
  Award,
  AlertCircle,
} from 'lucide-react';
import { Link } from 'react-router-dom';

export default function CoordinatorDashboard() {
  const { activeAssignment, user } = useAuth();
  const [batch, setBatch] = useState(null);
  const [stats, setStats] = useState({
    studentsCount: 0,
    requestsCount: 0,
    teamsCount: 0,
    proposalsCount: 0,
  });
  const [deadlineModalOpen, setDeadlineModalOpen] = useState(false);
  const [newDeadline, setNewDeadline] = useState('');
  const [updatingDeadline, setUpdatingDeadline] = useState(false);
  const [activatingPortals, setActivatingPortals] = useState(false);
  const [actionMessage, setActionMessage] = useState('');
  const [actionError, setActionError] = useState('');

  const batchId = activeAssignment?.batchId;

  const fetchBatchDetails = async () => {
    if (!batchId) return;
    try {
      const bRes = await api.get('/coordinator/batches');
      if (bRes.success) {
        const current = bRes.batches.find((b) => (b._id || b.id) === batchId);
        if (current) {
          setBatch(current);
          if (current.registrationDeadline) {
            setNewDeadline(current.registrationDeadline.substring(0, 16));
          }
        }
      }

      const studRes = await api.get(`/coordinator/batch/${batchId}/students`);
      const reqRes = await api.get(`/coordinator/batch/${batchId}/team-requests`);
      const teamRes = await api.get(`/coordinator/batch/${batchId}/teams`);
      const propRes = await api.get(`/coordinator/batch/${batchId}/proposals`);

      setStats({
        studentsCount: studRes.students?.length || 0,
        requestsCount: reqRes.requests?.filter((r) => r.status === 'PENDING').length || 0,
        teamsCount: teamRes.teams?.length || 0,
        proposalsCount: propRes.proposals?.length || 0,
      });
    } catch (err) {
      console.warn('Batch workspace load error:', err.message);
    }
  };

  useEffect(() => {
    fetchBatchDetails();
  }, [batchId]);

  const handleUpdateDeadline = async (e) => {
    e.preventDefault();
    if (!newDeadline) return;

    try {
      setUpdatingDeadline(true);
      setActionMessage('');
      setActionError('');

      const res = await api.post(`/coordinator/batch/${batchId}/deadline`, {
        registrationDeadline: new Date(newDeadline).toISOString(),
        registrationOpen: true,
      });

      if (res.success) {
        setActionMessage('Team registration deadline updated.');
        setDeadlineModalOpen(false);
        await fetchBatchDetails();
      }
    } catch (err) {
      setActionError(err.message);
    } finally {
      setUpdatingDeadline(false);
    }
  };

  const handleCreatePortals = async () => {
    try {
      setActivatingPortals(true);
      setActionMessage('');
      setActionError('');

      const res = await api.post(`/coordinator/batch/${batchId}/create-portals`);
      if (res.success) {
        setActionMessage(res.message);
        await fetchBatchDetails();
      }
    } catch (err) {
      setActionError(err.message);
    } finally {
      setActivatingPortals(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-700 bg-blue-50 px-3 py-1 rounded-full border border-blue-200">
              Coordinator Workspace
            </span>
            <span className="text-xs font-semibold bg-gray-100 text-gray-700 px-2 py-0.5 rounded">
              Semester {activeAssignment?.semesterNumber || 7}
            </span>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mt-2">
            {batch?.name || activeAssignment?.batchName || 'Academic Batch'}
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Presiding Coordinator: <strong>{user?.name}</strong> | Academic Year {batch?.academicYear || '2025-2026'}
          </p>
        </div>

        {/* CREATE PORTALS BUTTON (Requirement #22) */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => setDeadlineModalOpen(true)}
            className="px-3.5 py-2 text-xs font-semibold bg-white border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700 shadow-2xs"
          >
            Configure Deadline
          </button>

          {!batch?.portalsCreated ? (
            <button
              onClick={handleCreatePortals}
              disabled={activatingPortals || stats.requestsCount === 0}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-700 text-white rounded-lg text-xs font-bold hover:bg-blue-800 disabled:opacity-50 transition-colors shadow-xs"
            >
              <FileCheck className="w-4 h-4" />
              <span>{activatingPortals ? 'Activating...' : 'CREATE PORTALS'}</span>
            </button>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-semibold">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              Portals Active
            </span>
          )}
        </div>
      </div>

      {actionMessage && (
        <div className="p-3.5 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-start gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          <span>{actionMessage}</span>
        </div>
      )}

      {actionError && (
        <div className="p-3.5 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
          <span>{actionError}</span>
        </div>
      )}

      {/* Team Registration Deadline Countdown & Portal Activation Card */}
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
            <Clock className="w-4 h-4 text-blue-700" />
            Team Registration Deadline & Portal Activation Status
          </h3>
          <p className="text-xs text-gray-600 mt-0.5">
            {batch?.portalsCreated
              ? 'Student portals have been unlocked. Registered groups can now formulate proposals.'
              : 'Students see ONLY the team registration screen until registration closes and portals are activated.'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <CountdownTimer targetDate={batch?.registrationDeadline} />
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link
          to="/coordinator/students"
          className="bg-white p-5 rounded-xl border border-gray-200 shadow-2xs hover:border-blue-300 transition-all space-y-2"
        >
          <div className="flex justify-between items-center text-gray-500 text-xs uppercase font-bold">
            <span>Enrolled Students</span>
            <Users className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-bold text-gray-900">{stats.studentsCount}</div>
          <div className="text-[11px] text-blue-700 flex items-center gap-1 font-semibold">
            <span>Manage Student Roster</span> <ArrowRight className="w-3 h-3" />
          </div>
        </Link>

        <Link
          to="/coordinator/team-requests"
          className="bg-white p-5 rounded-xl border border-gray-200 shadow-2xs hover:border-blue-300 transition-all space-y-2"
        >
          <div className="flex justify-between items-center text-gray-500 text-xs uppercase font-bold">
            <span>Pending Team Requests</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-bold text-gray-900">{stats.requestsCount}</div>
          <div className="text-[11px] text-amber-700 flex items-center gap-1 font-semibold">
            <span>Review & Create Portals</span> <ArrowRight className="w-3 h-3" />
          </div>
        </Link>

        <Link
          to="/coordinator/proposals"
          className="bg-white p-5 rounded-xl border border-gray-200 shadow-2xs hover:border-blue-300 transition-all space-y-2"
        >
          <div className="flex justify-between items-center text-gray-500 text-xs uppercase font-bold">
            <span>Active Project Teams</span>
            <Layers className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-bold text-gray-900">{stats.teamsCount}</div>
          <div className="text-[11px] text-indigo-700 flex items-center gap-1 font-semibold">
            <span>View Teams & Proposals</span> <ArrowRight className="w-3 h-3" />
          </div>
        </Link>

        <Link
          to="/coordinator/presentations"
          className="bg-white p-5 rounded-xl border border-gray-200 shadow-2xs hover:border-blue-300 transition-all space-y-2"
        >
          <div className="flex justify-between items-center text-gray-500 text-xs uppercase font-bold">
            <span>Proposals Submitted</span>
            <Sparkles className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-gray-900">{stats.proposalsCount}</div>
          <div className="text-[11px] text-emerald-700 flex items-center gap-1 font-semibold">
            <span>Schedule Defense Sessions</span> <ArrowRight className="w-3 h-3" />
          </div>
        </Link>
      </div>

      {/* Deadline Modal */}
      <Modal isOpen={deadlineModalOpen} onClose={() => setDeadlineModalOpen(false)} title="Configure Team Registration Deadline">
        <form onSubmit={handleUpdateDeadline} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700">
              Registration Closing Timestamp *
            </label>
            <input
              type="datetime-local"
              value={newDeadline}
              onChange={(e) => setNewDeadline(e.target.value)}
              required
              className="mt-1 w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-blue-500"
            />
            <span className="text-[11px] text-gray-500 mt-1 block">
              The live student countdown and server-side acceptance will strictly enforce this date.
            </span>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={() => setDeadlineModalOpen(false)}
              className="px-4 py-2 text-xs font-medium border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={updatingDeadline}
              className="px-4 py-2 text-xs font-bold bg-blue-700 text-white rounded-lg hover:bg-blue-800 disabled:opacity-50"
            >
              {updatingDeadline ? 'Updating...' : 'Save Deadline'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
