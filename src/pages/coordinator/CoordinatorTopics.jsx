import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import api from '../../api/client.js';
import DataTable from '../../components/common/DataTable.jsx';
import Modal from '../../components/common/Modal.jsx';
import { FolderOpen, Plus, CheckCircle2, AlertCircle } from 'lucide-react';

export default function CoordinatorTopics() {
  const { activeAssignment, user } = useAuth();
  const [topics, setTopics] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [formData, setFormData] = useState({ title: '', description: '', technologies: '' });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const batchId = activeAssignment?.batchId;

  const fetchTopics = async () => {
    if (!batchId) return;
    try {
      const res = await api.get(`/coordinator/batch/${batchId}/topics`);
      if (res.success) {
        setTopics(res.topics || []);
      }
    } catch (err) {
      console.warn('Fetch topics error:', err.message);
    }
  };

  useEffect(() => {
    fetchTopics();
  }, [batchId]);

  const handleCreateTopic = async (e) => {
    e.preventDefault();
    if (!formData.title || !formData.description) return;

    try {
      setLoading(true);
      setError('');
      setMessage('');

      const res = await api.post('/supervisor/topics', {
        batchId,
        semesterNumber: activeAssignment?.semesterNumber || 7,
        title: formData.title,
        description: formData.description,
        technologies: formData.technologies ? formData.technologies.split(',').map((s) => s.trim()) : [],
      });

      if (res.success) {
        setMessage(res.message);
        setModalOpen(false);
        setFormData({ title: '', description: '', technologies: '' });
        await fetchTopics();
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    {
      header: 'Topic Title',
      accessor: 'title',
      className: 'font-semibold text-gray-900',
    },
    {
      header: 'Supervisor',
      accessor: 'supervisorName',
      className: 'font-medium text-gray-700',
    },
    {
      header: 'Technologies',
      render: (t) => (
        <span className="text-xs text-gray-600">
          {Array.isArray(t.technologies) ? t.technologies.join(', ') : t.technologies}
        </span>
      ),
    },
    {
      header: 'Status',
      render: (t) => (
        <span
          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
            t.status === 'OCCUPIED'
              ? 'bg-slate-100 text-slate-700 border border-slate-300'
              : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
          }`}
        >
          {t.status}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <FolderOpen className="w-5 h-5 text-blue-700" />
            Published Department FYP Topics
          </h2>
          <p className="text-xs text-gray-600 mt-0.5">
            Research topics offered by faculty supervisors for this batch.
          </p>
        </div>

        <button
          onClick={() => setModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-700 text-white rounded-lg text-xs font-bold hover:bg-blue-800 transition-colors shadow-2xs"
        >
          <Plus className="w-4 h-4" />
          <span>Publish Project Topic</span>
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
        data={topics}
        searchKey="title"
        searchPlaceholder="Search topics by title..."
        emptyMessage="No project topics published for this batch yet."
      />

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Publish Project Research Topic">
        <form onSubmit={handleCreateTopic} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700">
              Topic Title *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
              placeholder="e.g. Distributed Consensus in Edge Compute Clusters"
              className="mt-1 w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700">
              Topic Description & Scope *
            </label>
            <textarea
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              required
              placeholder="Detailed description of technical scope and expected milestones..."
              className="mt-1 w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700">
              Technologies (Comma separated)
            </label>
            <input
              type="text"
              value={formData.technologies}
              onChange={(e) => setFormData({ ...formData, technologies: e.target.value })}
              placeholder="Rust, Docker, Raft Consensus, gRPC"
              className="mt-1 w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
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
              {loading ? 'Publishing...' : 'Publish Topic'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
