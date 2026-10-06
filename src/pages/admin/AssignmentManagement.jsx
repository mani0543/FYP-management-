import React, { useState, useEffect } from 'react';
import api from '../../api/client.js';
import DataTable from '../../components/common/DataTable.jsx';
import Modal from '../../components/common/Modal.jsx';
import {
  Layers,
  Plus,
  CheckCircle2,
  AlertCircle,
  Trash2,
  ShieldAlert,
  UserCheck,
} from 'lucide-react';

export default function AssignmentManagement() {
  const [assignments, setAssignments] = useState([]);
  const [facultyUsers, setFacultyUsers] = useState([]);
  const [batches, setBatches] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    userId: '',
    batchId: '',
    semesterNumber: 7,
    responsibility: 'COORDINATOR',
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const fetchData = async () => {
    try {
      const aRes = await api.get('/admin/assignments');
      const uRes = await api.get('/admin/users');
      const bRes = await api.get('/admin/batches');

      if (aRes.success) setAssignments(aRes.assignments || []);
      if (uRes.success) {
        setFacultyUsers(uRes.users.filter((u) => u.capabilities?.includes('FACULTY')) || []);
      }
      if (bRes.success) setBatches(bRes.batches || []);
    } catch (err) {
      console.warn('Fetch assignments error:', err.message);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateAssignment = async (e) => {
    e.preventDefault();
    if (!formData.userId || !formData.batchId || !formData.responsibility) return;

    try {
      setLoading(true);
      setError('');
      setMessage('');

      const res = await api.post('/admin/assignments', formData);
      if (res.success) {
        setMessage(res.message);
        setModalOpen(false);
        await fetchData();
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const [confirmRevokeId, setConfirmRevokeId] = useState(null);

  const handleRevoke = async (assignmentId) => {
    try {
      setConfirmRevokeId(null);
      setError('');
      setMessage('');

      const res = await api.delete(`/admin/assignments/${assignmentId}`);
      if (res.success) {
        setMessage(res.message);
        await fetchData();
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const columns = [
    {
      header: 'Faculty Member',
      accessor: 'userName',
      className: 'font-semibold text-gray-900',
    },
    {
      header: 'Assigned Batch',
      accessor: 'batchName',
      className: 'text-gray-700 font-medium',
    },
    {
      header: 'Semester',
      render: (a) => (
        <span className="font-mono text-xs px-2 py-0.5 rounded bg-gray-100 font-bold text-gray-700">
          Sem {a.semesterNumber}
        </span>
      ),
    },
    {
      header: 'Responsibility',
      render: (a) => {
        const color =
          a.responsibility === 'COORDINATOR'
            ? 'bg-blue-50 text-blue-800 border-blue-200'
            : a.responsibility === 'SUPERVISOR'
            ? 'bg-purple-50 text-purple-800 border-purple-200'
            : 'bg-amber-50 text-amber-800 border-amber-200';
        return (
          <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider border ${color}`}>
            {a.responsibility}
          </span>
        );
      },
    },
    {
      header: 'Status',
      render: (a) => (
        <span
          className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
            a.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'
          }`}
        >
          {a.status}
        </span>
      ),
    },
    {
      header: 'Assigned By',
      render: (a) => <span className="text-xs text-gray-500">{a.assignedByName || 'Super Admin'}</span>,
    },
    {
      header: 'Actions',
      render: (a) => {
        const aId = a._id || a.id;
        return a.status === 'ACTIVE' ? (
          confirmRevokeId === aId ? (
            <div className="flex items-center gap-1">
              <button
                onClick={() => handleRevoke(aId)}
                className="px-2 py-0.5 text-[11px] font-bold bg-rose-700 text-white rounded hover:bg-rose-800"
              >
                Revoke
              </button>
              <button
                onClick={() => setConfirmRevokeId(null)}
                className="px-2 py-0.5 text-[11px] font-medium bg-white border border-gray-300 rounded text-gray-700"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmRevokeId(aId)}
              className="p-1 text-gray-400 hover:text-rose-600 rounded transition-colors"
              title="Revoke Assignment"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )
        ) : (
          <span className="text-xs text-gray-400">Archived</span>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Layers className="w-5 h-5 text-purple-700" />
            Dynamic Academic Assignments
          </h2>
          <p className="text-xs text-gray-600 mt-0.5">
            Decouple roles from permanent user accounts. A faculty member can be Coordinator in Batch A Sem 7, Supervisor in Batch A Sem 8, or Coordinator in Batch B.
          </p>
        </div>

        <button
          onClick={() => setModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-purple-700 text-white rounded-lg text-xs font-bold hover:bg-purple-800 transition-colors shadow-2xs"
        >
          <Plus className="w-4 h-4" />
          <span>New Academic Assignment</span>
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

      {/* Historical Rule Banner (Rule #53) */}
      <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 flex items-start gap-3">
        <ShieldAlert className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
        <div>
          <strong>Non-Destructive Historical Preservation:</strong> Modifying or assigning a new Coordinator for a
          subsequent semester (e.g. transitioning Batch 2026 from Dr. Ahmed in Sem 7 to Dr. Bilal in Sem 8) preserves all
          prior approvals, digital signatures, and audit logs permanently attributed to the original signatory.
        </div>
      </div>

      <DataTable
        columns={columns}
        data={assignments}
        searchKey="userName"
        searchPlaceholder="Search assignments by faculty name..."
        emptyMessage="No academic assignments registered."
      />

      {/* Assignment Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Create Dynamic Academic Assignment">
        <form onSubmit={handleCreateAssignment} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700">
              Faculty Member *
            </label>
            <select
              value={formData.userId}
              onChange={(e) => setFormData({ ...formData, userId: e.target.value })}
              required
              className="mt-1 w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-purple-500"
            >
              <option value="">-- Select Faculty --</option>
              {facultyUsers.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name} ({f.email})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700">
              Target Academic Batch *
            </label>
            <select
              value={formData.batchId}
              onChange={(e) => setFormData({ ...formData, batchId: e.target.value })}
              required
              className="mt-1 w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-purple-500"
            >
              <option value="">-- Select Batch --</option>
              {batches.map((b) => (
                <option key={b._id || b.id} value={b._id || b.id}>
                  {b.name} ({b.academicYear})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-700">
                Academic Semester *
              </label>
              <select
                value={formData.semesterNumber}
                onChange={(e) => setFormData({ ...formData, semesterNumber: Number(e.target.value) })}
                className="mt-1 w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-purple-500"
              >
                <option value={7}>Semester 7</option>
                <option value={8}>Semester 8</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-700">
                Responsibility Role *
              </label>
              <select
                value={formData.responsibility}
                onChange={(e) => setFormData({ ...formData, responsibility: e.target.value })}
                className="mt-1 w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-purple-500"
              >
                <option value="COORDINATOR">COORDINATOR</option>
                <option value="SUPERVISOR">SUPERVISOR</option>
                <option value="EXAMINER">EXAMINER</option>
              </select>
            </div>
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
              className="px-4 py-2 text-xs font-bold bg-purple-700 text-white rounded-lg hover:bg-purple-800 disabled:opacity-50"
            >
              {loading ? 'Assigning...' : 'Confirm Assignment'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
