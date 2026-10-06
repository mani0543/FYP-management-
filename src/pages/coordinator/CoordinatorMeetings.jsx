import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import api from '../../api/client.js';
import Modal from '../../components/common/Modal.jsx';
import { Video, Plus, Calendar, Clock, MapPin, Link2, CheckCircle2, AlertCircle } from 'lucide-react';

export default function CoordinatorMeetings() {
  const { activeAssignment } = useAuth();
  const [meetings, setMeetings] = useState([]);
  const [teams, setTeams] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    teamId: '',
    title: '',
    date: '',
    startTime: '10:00',
    endTime: '11:00',
    location: '',
    link: '',
    description: '',
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const batchId = activeAssignment?.batchId;

  const fetchData = async () => {
    try {
      const meetRes = await api.get('/meetings');
      if (meetRes.success) {
        setMeetings(meetRes.meetings || []);
      }
      if (batchId) {
        const teamRes = await api.get(`/coordinator/batch/${batchId}/teams`);
        if (teamRes.success) {
          setTeams(teamRes.teams || []);
        }
      }
    } catch (err) {
      console.warn('Fetch meetings error:', err.message);
    }
  };

  useEffect(() => {
    fetchData();
  }, [batchId]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!formData.teamId || !formData.title || !formData.date) return;

    try {
      setLoading(true);
      setError('');
      setMessage('');

      const res = await api.post('/meetings', formData);
      if (res.success) {
        setMessage(res.message);
        setModalOpen(false);
        setFormData({
          teamId: '',
          title: '',
          date: '',
          startTime: '10:00',
          endTime: '11:00',
          location: '',
          link: '',
          description: '',
        });
        await fetchData();
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
            <Video className="w-5 h-5 text-blue-700" />
            Batch Meetings & Progress Sessions
          </h2>
          <p className="text-xs text-gray-600 mt-0.5">
            Schedule formal progress sessions and review meetings with project teams.
          </p>
        </div>

        <button
          onClick={() => setModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-700 text-white rounded-lg text-xs font-bold hover:bg-blue-800 transition-colors shadow-2xs"
        >
          <Plus className="w-4 h-4" />
          <span>Schedule Meeting</span>
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

      {meetings.length === 0 ? (
        <div className="bg-white p-8 rounded-xl border border-gray-200 text-center text-sm text-gray-500 shadow-xs">
          No meetings scheduled yet.
        </div>
      ) : (
        <div className="space-y-4">
          {meetings.map((m) => (
            <div key={m._id || m.id} className="bg-white p-5 rounded-xl border border-gray-200 shadow-2xs space-y-2">
              <div className="flex justify-between items-start border-b border-gray-100 pb-2">
                <div>
                  <h4 className="text-base font-bold text-gray-900">{m.title}</h4>
                  <span className="font-mono text-xs font-semibold text-blue-700">Team: {m.teamCode}</span>
                </div>
                <span className="text-xs px-2.5 py-0.5 rounded-full font-bold uppercase bg-blue-50 text-blue-700 border border-blue-200">
                  {m.status}
                </span>
              </div>

              {m.description && <p className="text-xs text-gray-700 leading-relaxed">{m.description}</p>}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t border-gray-100 text-xs text-gray-600">
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  <span>Date: {m.date}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-gray-400" />
                  <span>
                    {m.startTime} – {m.endTime}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-gray-400" />
                  <span>{m.location || 'Faculty Room'}</span>
                </div>
              </div>

              {m.link && (
                <div className="pt-1">
                  <a
                    href={m.link}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 hover:text-blue-900 underline"
                  >
                    <Link2 className="w-3.5 h-3.5" />
                    <span>Join Link</span>
                  </a>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Schedule Academic Meeting">
        <form onSubmit={handleCreate} className="space-y-4">
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
              <option value="">-- Select Team --</option>
              {teams.map((t) => (
                <option key={t._id || t.id} value={t._id || t.id}>
                  {t.teamCode} — {t.projectTitle || 'Team'}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700">
              Meeting Title *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
              placeholder="e.g. Bi-Weekly Progress Sync"
              className="mt-1 w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Date *</label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                required
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Start Time</label>
              <input
                type="time"
                value={formData.startTime}
                onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">End Time</label>
              <input
                type="time"
                value={formData.endTime}
                onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Location</label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="Faculty Block B, Room 302"
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Meeting Link (Online)</label>
              <input
                type="url"
                value={formData.link}
                onChange={(e) => setFormData({ ...formData, link: e.target.value })}
                placeholder="https://meet.google.com/..."
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Description</label>
            <textarea
              rows={2}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500"
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
              {loading ? 'Saving...' : 'Schedule Meeting'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
