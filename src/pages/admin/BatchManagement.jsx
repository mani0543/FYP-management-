import React, { useState, useEffect } from 'react';
import api from '../../api/client.js';
import DataTable from '../../components/common/DataTable.jsx';
import Modal from '../../components/common/Modal.jsx';
import {
  GraduationCap,
  Plus,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Lock,
} from 'lucide-react';

export default function BatchManagement() {
  const [batches, setBatches] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    program: 'BS Computer Science',
    academicYear: '2026-2027',
    currentSemester: 7,
  });
  const [advancingBatchId, setAdvancingBatchId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const fetchBatches = async () => {
    try {
      const res = await api.get('/admin/batches');
      if (res.success) setBatches(res.batches || []);
    } catch (err) {
      console.warn('Fetch batches error:', err.message);
    }
  };

  useEffect(() => {
    fetchBatches();
  }, []);

  const handleCreateBatch = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.program || !formData.academicYear) return;

    try {
      setLoading(true);
      setError('');
      setMessage('');

      const res = await api.post('/admin/batches', formData);
      if (res.success) {
        setMessage(res.message);
        setModalOpen(false);
        setFormData({ name: '', program: 'BS Computer Science', academicYear: '2026-2027', currentSemester: 7 });
        await fetchBatches();
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const [confirmBatchId, setConfirmBatchId] = useState(null);

  const handleAdvanceSemester = async (batchId, currentSem) => {
    const nextSem = currentSem === 7 ? 8 : 7;

    try {
      setAdvancingBatchId(batchId);
      setConfirmBatchId(null);
      setError('');
      setMessage('');

      const res = await api.post(`/admin/batches/${batchId}/advance-semester`, { targetSemester: nextSem });
      if (res.success) {
        setMessage(res.message);
        await fetchBatches();
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setAdvancingBatchId(null);
    }
  };

  const columns = [
    {
      header: 'Batch Title',
      accessor: 'name',
      className: 'font-semibold text-gray-900',
    },
    { header: 'Academic Program', accessor: 'program', className: 'text-gray-700' },
    { header: 'Academic Year', accessor: 'academicYear', className: 'font-mono text-xs text-gray-600' },
    {
      header: 'Active Semester',
      render: (b) => (
        <span className="font-semibold text-xs px-2.5 py-0.5 rounded bg-blue-100 text-blue-800">
          Semester {b.currentSemester}
        </span>
      ),
    },
    {
      header: 'Portal State',
      render: (b) => (
        <span
          className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${
            b.portalsCreated
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-amber-50 text-amber-800 border-amber-200'
          }`}
        >
          {b.portalsCreated ? 'Portals Created' : 'Pre-Portal / Registration'}
        </span>
      ),
    },
    {
      header: 'Actions',
      render: (b) => {
        const bId = b._id || b.id;
        return (
          <div className="flex items-center gap-2">
            {b.currentSemester === 7 ? (
              confirmBatchId === bId ? (
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleAdvanceSemester(bId, 7)}
                    disabled={advancingBatchId === bId}
                    className="px-2.5 py-1 text-xs font-bold bg-indigo-700 text-white rounded hover:bg-indigo-800"
                  >
                    Confirm Sem 8
                  </button>
                  <button
                    onClick={() => setConfirmBatchId(null)}
                    className="px-2 py-1 text-xs font-medium bg-white border border-gray-300 rounded text-gray-700"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmBatchId(bId)}
                  disabled={advancingBatchId === bId}
                  className="inline-flex items-center gap-1 px-3 py-1 text-xs font-bold bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100 rounded-lg shadow-2xs"
                >
                  <span>Advance to Sem 8</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              )
            ) : (
              <span className="text-xs text-slate-500 font-medium flex items-center gap-1">
                <Lock className="w-3 h-3" /> Semester 8 Active
              </span>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-purple-700" />
            Batch & Semester Management
          </h2>
          <p className="text-xs text-gray-600 mt-0.5">
            Support multiple concurrent batches simultaneously with strict data isolation.
          </p>
        </div>

        <button
          onClick={() => setModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-purple-700 text-white rounded-lg text-xs font-bold hover:bg-purple-800 transition-colors shadow-2xs"
        >
          <Plus className="w-4 h-4" />
          <span>Initialize New Batch</span>
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
        data={batches}
        searchKey="name"
        searchPlaceholder="Search batches by name..."
        emptyMessage="No batches found."
      />

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Initialize New Academic Batch">
        <form onSubmit={handleCreateBatch} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700">
              Batch Title *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              placeholder="e.g. BSCS Class of 2028"
              className="mt-1 w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700">
              Degree Program *
            </label>
            <input
              type="text"
              value={formData.program}
              onChange={(e) => setFormData({ ...formData, program: e.target.value })}
              required
              className="mt-1 w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-700">
                Academic Year *
              </label>
              <input
                type="text"
                value={formData.academicYear}
                onChange={(e) => setFormData({ ...formData, academicYear: e.target.value })}
                required
                placeholder="2027-2028"
                className="mt-1 w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-700">
                Starting Semester *
              </label>
              <select
                value={formData.currentSemester}
                onChange={(e) => setFormData({ ...formData, currentSemester: Number(e.target.value) })}
                className="mt-1 w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500"
              >
                <option value={7}>Semester 7</option>
                <option value={8}>Semester 8</option>
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
              {loading ? 'Initializing...' : 'Create Batch'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
