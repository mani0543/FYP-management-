import React, { useState, useEffect } from 'react';
import api from '../../api/client.js';
import {
  Users,
  GraduationCap,
  Layers,
  FileText,
  ShieldCheck,
  Settings,
  ArrowRight,
  RotateCcw,
  CheckCircle2,
} from 'lucide-react';
import { Link } from 'react-router-dom';

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [message, setMessage] = useState('');

  const fetchStats = async () => {
    try {
      const res = await api.get('/admin/stats');
      if (res.success) {
        setStats(res.stats);
      }
    } catch (err) {
      console.warn('Admin stats fetch error:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const [confirmMode, setConfirmMode] = useState(null); // 'seed' | 'purge' | null

  const handleDataAction = async (mode) => {
    try {
      setSeeding(true);
      setConfirmMode(null);
      setMessage('');
      const res = await api.post('/admin/seed-demo', { mode });
      setMessage(res.message || 'Database updated.');
      await fetchStats();
    } catch (err) {
      setMessage(err.message);
    } finally {
      setSeeding(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-purple-700 bg-purple-50 px-3 py-1 rounded-full border border-purple-200">
            System Administration
          </span>
          <h2 className="text-xl font-bold text-gray-900 mt-2">
            Institutional FYP Governance Console
          </h2>
          <p className="text-xs text-gray-600 mt-0.5">
            Manage batches, configure dynamic coordinator and supervisor responsibilities, enforce quotas, and review audit logs.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {confirmMode === 'purge' ? (
            <div className="flex items-center gap-1.5 bg-rose-50 border border-rose-200 px-3 py-1.5 rounded-lg">
              <span className="text-xs font-bold text-rose-800">Confirm Purge?</span>
              <button
                onClick={() => handleDataAction('purge')}
                disabled={seeding}
                className="px-2.5 py-1 bg-rose-700 text-white rounded text-xs font-bold hover:bg-rose-800"
              >
                Yes, Purge
              </button>
              <button
                onClick={() => setConfirmMode(null)}
                className="px-2 py-1 bg-white text-gray-700 border border-gray-300 rounded text-xs font-semibold"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmMode('purge')}
              disabled={seeding}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-rose-300 text-rose-700 rounded-lg text-xs font-bold hover:bg-rose-50 transition-colors shadow-2xs"
            >
              <RotateCcw className="w-4 h-4" />
              <span>{seeding ? 'Purging records...' : 'Purge All Records (Clean Slate)'}</span>
            </button>
          )}
        </div>
      </div>

      {message && (
        <div className="p-3.5 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-start gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          <span>{message}</span>
        </div>
      )}

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Link
          to="/admin/batches"
          className="bg-white p-5 rounded-xl border border-gray-200 shadow-2xs hover:border-purple-300 transition-all space-y-2"
        >
          <div className="flex justify-between items-center text-gray-500 text-xs uppercase font-bold">
            <span>Academic Batches</span>
            <GraduationCap className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-2xl font-bold text-gray-900">{stats?.totalBatches || 0}</div>
          <div className="text-[11px] text-purple-700 flex items-center gap-1 font-semibold">
            <span>Manage Batches & Semesters</span> <ArrowRight className="w-3 h-3" />
          </div>
        </Link>

        <Link
          to="/admin/assignments"
          className="bg-white p-5 rounded-xl border border-gray-200 shadow-2xs hover:border-purple-300 transition-all space-y-2"
        >
          <div className="flex justify-between items-center text-gray-500 text-xs uppercase font-bold">
            <span>Active Academic Assignments</span>
            <Layers className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-bold text-gray-900">{stats?.activeAssignmentsCount || 0}</div>
          <div className="text-[11px] text-blue-700 flex items-center gap-1 font-semibold">
            <span>Dynamic Staff Assignments</span> <ArrowRight className="w-3 h-3" />
          </div>
        </Link>

        <Link
          to="/admin/users"
          className="bg-white p-5 rounded-xl border border-gray-200 shadow-2xs hover:border-purple-300 transition-all space-y-2"
        >
          <div className="flex justify-between items-center text-gray-500 text-xs uppercase font-bold">
            <span>Institutional Accounts</span>
            <Users className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-gray-900">{stats?.totalUsers || 0}</div>
          <div className="text-[11px] text-emerald-700 flex items-center gap-1 font-semibold">
            <span>User Accounts</span> <ArrowRight className="w-3 h-3" />
          </div>
        </Link>

        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-2xs space-y-2">
          <div className="flex justify-between items-center text-gray-500 text-xs uppercase font-bold">
            <span>Registered FYP Teams</span>
            <Users className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-bold text-gray-900">{stats?.totalTeams || 0}</div>
          <div className="text-[11px] text-gray-500">Across Senior and Junior batches</div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-2xs space-y-2">
          <div className="flex justify-between items-center text-gray-500 text-xs uppercase font-bold">
            <span>Project Proposals</span>
            <FileText className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-bold text-gray-900">{stats?.totalProposals || 0}</div>
          <div className="text-[11px] text-gray-500">Evaluated with Gemini AI</div>
        </div>

        <Link
          to="/admin/audit-logs"
          className="bg-white p-5 rounded-xl border border-gray-200 shadow-2xs hover:border-purple-300 transition-all space-y-2"
        >
          <div className="flex justify-between items-center text-gray-500 text-xs uppercase font-bold">
            <span>Immutable Audit Logs</span>
            <ShieldCheck className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-2xl font-bold text-gray-900">{stats?.auditCount || 0}</div>
          <div className="text-[11px] text-rose-700 flex items-center gap-1 font-semibold">
            <span>Review Activity History</span> <ArrowRight className="w-3 h-3" />
          </div>
        </Link>
      </div>
    </div>
  );
}
