import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import api from '../../api/client.js';
import Modal from '../../components/common/Modal.jsx';
import { Bell, Plus, CheckCircle2, AlertCircle, Clock } from 'lucide-react';

export default function CoordinatorAnnouncements() {
  const { activeAssignment, user } = useAuth();
  const [announcements, setAnnouncements] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [formData, setFormData] = useState({ title: '', message: '' });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const batchId = activeAssignment?.batchId;

  const fetchAnnouncements = async () => {
    try {
      const res = await api.get('/announcements', { params: { targetType: 'BATCH', targetId: batchId } });
      if (res.success) {
        setAnnouncements(res.announcements || []);
      }
    } catch (err) {
      console.warn('Fetch announcements error:', err.message);
    }
  };

  useEffect(() => {
    fetchAnnouncements();
  }, [batchId]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!formData.title || !formData.message) return;

    try {
      setLoading(true);
      setError('');
      setMessage('');

      const res = await api.post('/announcements', {
        targetType: 'BATCH',
        targetId: batchId,
        title: formData.title,
        message: formData.message,
      });

      if (res.success) {
        setMessage(res.message);
        setModalOpen(false);
        setFormData({ title: '', message: '' });
        await fetchAnnouncements();
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto py-2">
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Bell className="w-5 h-5 text-blue-700" />
            Batch Announcements & Circulars
          </h2>
          <p className="text-xs text-gray-600 mt-0.5">
            Broadcast official notices and instructions directly to all students enrolled in this batch.
          </p>
        </div>

        <button
          onClick={() => setModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-700 text-white rounded-lg text-xs font-bold hover:bg-blue-800 transition-colors shadow-2xs"
        >
          <Plus className="w-4 h-4" />
          <span>New Batch Circular</span>
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

      {announcements.length === 0 ? (
        <div className="bg-white p-8 rounded-xl border border-gray-200 text-center text-sm text-gray-500 shadow-xs">
          No circulars published for this batch yet.
        </div>
      ) : (
        <div className="space-y-4">
          {announcements.map((a) => (
            <div key={a._id || a.id} className="bg-white p-5 rounded-xl border border-gray-200 shadow-2xs space-y-2">
              <div className="flex justify-between items-start border-b border-gray-100 pb-2">
                <h4 className="text-base font-bold text-gray-900">{a.title}</h4>
                <span className="text-[11px] font-mono text-gray-500 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-gray-400" />
                  {new Date(a.createdAt).toLocaleDateString()}
                </span>
              </div>
              <p className="text-xs text-gray-800 whitespace-pre-line leading-relaxed">{a.message}</p>
              <div className="text-[11px] text-gray-500 pt-1 font-medium">Issued by: {a.senderName}</div>
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Issue Batch Circular Announcement">
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700">
              Announcement Title *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
              placeholder="e.g. Mandatory Defense Document Submission Deadline"
              className="mt-1 w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700">
              Circular Details *
            </label>
            <textarea
              rows={4}
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              required
              placeholder="Detailed guidelines and instructions..."
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
              {loading ? 'Publishing...' : 'Publish Announcement'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
