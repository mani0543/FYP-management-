import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import api from '../../api/client.js';
import DataTable from '../../components/common/DataTable.jsx';
import StatusBadge from '../../components/common/StatusBadge.jsx';
import Modal from '../../components/common/Modal.jsx';
import { Award, Plus, CheckCircle2, AlertCircle, Calendar } from 'lucide-react';

export default function CoordinatorPresentations() {
  const { activeAssignment } = useAuth();
  const [presentations, setPresentations] = useState([]);
  const [teams, setTeams] = useState([]);
  const [facultyUsers, setFacultyUsers] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    teamId: '',
    semesterNumber: 7,
    title: '',
    examinerId: '',
    scheduledDate: '',
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const batchId = activeAssignment?.batchId;

  const fetchData = async () => {
    if (!batchId) return;
    try {
      const presRes = await api.get(`/coordinator/batch/${batchId}/presentations`);
      if (presRes.success) {
        setPresentations(presRes.presentations || []);
      }

      const teamRes = await api.get(`/coordinator/batch/${batchId}/teams`);
      if (teamRes.success) {
        setTeams(teamRes.teams || []);
      }

      const userRes = await api.get('/coordinator/faculty');
      if (userRes.success) {
        setFacultyUsers(userRes.faculty || []);
      }
    } catch (err) {
      console.warn('Presentations fetch error:', err.message);
    }
  };

  useEffect(() => {
    fetchData();
  }, [batchId]);

  const handleSchedule = async (e) => {
    e.preventDefault();
    if (!formData.teamId || !formData.scheduledDate) return;

    try {
      setLoading(true);
      setError('');
      setMessage('');

      const res = await api.post(`/coordinator/batch/${batchId}/presentations`, formData);
      if (res.success) {
        setMessage(res.message);
        setModalOpen(false);
        setFormData({ teamId: '', semesterNumber: 7, title: '', examinerId: '', scheduledDate: '' });
        await fetchData();
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    {
      header: 'Team Code',
      accessor: 'teamCode',
      className: 'font-mono font-bold text-gray-900',
    },
    { header: 'Session Title', accessor: 'title', className: 'font-semibold text-gray-900' },
    {
      header: 'Semester',
      render: (p) => (
        <span className="font-semibold text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-700">
          Sem {p.semesterNumber}
        </span>
      ),
    },
    {
      header: 'Assigned Examiner',
      accessor: 'examinerName',
      className: 'text-gray-700 font-medium',
    },
    {
      header: 'Scheduled Date',
      render: (p) => (
        <span className="font-mono text-xs text-gray-600">
          {p.scheduledDate ? new Date(p.scheduledDate).toLocaleDateString() : 'TBD'}
        </span>
      ),
    },
    {
      header: 'Defense Result',
      render: (p) => <StatusBadge status={p.result} />,
    },
    {
      header: 'Marks',
      render: (p) => (
        <span className="font-mono text-xs font-bold text-gray-800">
          {p.marks !== undefined ? `${p.marks} / 100` : '-'}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Award className="w-5 h-5 text-blue-700" />
            Defense Sessions & Examiner Assignments
          </h2>
          <p className="text-xs text-gray-600 mt-0.5">
            Organize formal proposal and thesis presentation sessions and designate evaluation examiners.
          </p>
        </div>

        <button
          onClick={() => setModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-700 text-white rounded-lg text-xs font-bold hover:bg-blue-800 transition-colors shadow-2xs"
        >
          <Plus className="w-4 h-4" />
          <span>Schedule Defense Session</span>
        </button>
      </div>

      {message && (
        <div className="p-3.5 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-start gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          <span>{message}</span>
        </div>
      )}

      {error && (
        <div className="p-3.5 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <DataTable
        columns={columns}
        data={presentations}
        searchKey="teamCode"
        searchPlaceholder="Search sessions by Team Code..."
        emptyMessage="No defense presentation sessions scheduled for this batch yet."
      />

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Schedule Academic Defense Presentation">
        <form onSubmit={handleSchedule} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700">
              Project Team *
            </label>
            <select
              value={formData.teamId}
              onChange={(e) => setFormData({ ...formData, teamId: e.target.value })}
              required
              className="mt-1 w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500"
            >
              <option value="">-- Choose Team --</option>
              {teams.map((t) => (
                <option key={t._id || t.id} value={t._id || t.id}>
                  {t.teamCode} — {t.projectTitle || 'Project Team'}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700">
              Semester Defense Phase *
            </label>
            <select
              value={formData.semesterNumber}
              onChange={(e) => setFormData({ ...formData, semesterNumber: Number(e.target.value) })}
              className="mt-1 w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500"
            >
              <option value={7}>Semester 7 — Proposal Defense</option>
              <option value={8}>Semester 8 — Final FYP Thesis Defense</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700">
              Session Title
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g. Semester 7 FYP Proposal Defense & Feasibility Evaluation"
              className="mt-1 w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700">
              Designated Examiner Faculty *
            </label>
            <select
              value={formData.examinerId}
              onChange={(e) => setFormData({ ...formData, examinerId: e.target.value })}
              required
              className="mt-1 w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500"
            >
              <option value="">-- Select Faculty Examiner --</option>
              {facultyUsers.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name} ({f.email})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700">
              Defense Date *
            </label>
            <input
              type="date"
              value={formData.scheduledDate}
              onChange={(e) => setFormData({ ...formData, scheduledDate: e.target.value })}
              required
              className="mt-1 w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="px-4 py-2 text-xs font-medium border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-xs font-bold bg-blue-700 text-white rounded-lg hover:bg-blue-800 disabled:opacity-50"
            >
              {loading ? 'Scheduling...' : 'Schedule Defense'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
