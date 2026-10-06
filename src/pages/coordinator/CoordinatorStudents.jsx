import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import api from '../../api/client.js';
import DataTable from '../../components/common/DataTable.jsx';
import Modal from '../../components/common/Modal.jsx';
import { Users, UserPlus, CheckCircle2, AlertCircle, KeyRound } from 'lucide-react';

export default function CoordinatorStudents() {
  const { activeAssignment } = useAuth();
  const [students, setStudents] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [formData, setFormData] = useState({ registrationNo: '', name: '', email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const batchId = activeAssignment?.batchId;

  const fetchStudents = async () => {
    if (!batchId) return;
    try {
      const res = await api.get(`/coordinator/batch/${batchId}/students`);
      if (res.success) {
        setStudents(res.students || []);
      }
    } catch (err) {
      console.warn('Fetch students error:', err.message);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, [batchId]);

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!formData.registrationNo || !formData.name || !formData.email) return;

    try {
      setLoading(true);
      setError('');
      setSuccess('');

      const res = await api.post(`/coordinator/batch/${batchId}/students`, formData);
      if (res.success) {
        setSuccess(res.message);
        setModalOpen(false);
        setFormData({ registrationNo: '', name: '', email: '', password: '' });
        await fetchStudents();
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    {
      header: 'Registration No',
      accessor: 'registrationNo',
      className: 'font-mono font-bold text-gray-900',
    },
    { header: 'Student Name', accessor: 'name', className: 'font-semibold text-gray-900' },
    { header: 'Institutional Email', accessor: 'email', className: 'text-gray-600' },
    {
      header: 'Portal Password',
      render: (s) => (
        <span
          className="inline-flex items-center gap-1.5 font-mono text-xs font-bold px-2.5 py-1 rounded bg-amber-50 text-amber-900 border border-amber-200"
          title="Visible to Student Account Creator / Coordinator"
        >
          <KeyRound className="w-3 h-3 text-amber-700" />
          {s.portalPassword || 'Student@123'}
        </span>
      ),
    },
    {
      header: 'Team Assigned',
      render: (s) =>
        s.teamId ? (
          <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-blue-100 text-blue-800">
            Assigned
          </span>
        ) : (
          <span className="text-xs text-gray-400 italic">Unassigned</span>
        ),
    },
    {
      header: 'Status',
      render: (s) => (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
          {s.status}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-700" />
            Batch Student Roster & Portal Credentials
          </h2>
          <p className="text-xs text-gray-600 mt-0.5">
            Only officially enrolled students in this batch may participate in team registration and FYP submissions. As the student account creator, you can view live student portal passwords here even after students change them.
          </p>
        </div>

        <button
          onClick={() => setModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-700 text-white rounded-lg text-xs font-bold hover:bg-blue-800 transition-colors shadow-2xs"
        >
          <UserPlus className="w-4 h-4" />
          <span>Register New Student</span>
        </button>
      </div>

      {success && (
        <div className="p-3.5 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-start gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          <span>{success}</span>
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
        data={students}
        searchKey="registrationNo"
        searchPlaceholder="Search by Registration No or Name..."
        emptyMessage="No students registered in this batch yet."
      />

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Register Student to Current Batch">
        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700">
              Registration Number *
            </label>
            <input
              type="text"
              value={formData.registrationNo}
              onChange={(e) => setFormData({ ...formData, registrationNo: e.target.value })}
              required
              placeholder="e.g. SP22-BCS-099"
              className="mt-1 w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700">
              Full Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              placeholder="e.g. Daniyal Aslam"
              className="mt-1 w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700">
              Institutional Email *
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
              placeholder="e.g. sp22-bcs-099@university.edu"
              className="mt-1 w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700">
              Initial Portal Password (Optional)
            </label>
            <input
              type="text"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              placeholder="Defaults to Student@123 if left blank"
              className="mt-1 w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-blue-500"
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
              {loading ? 'Enrolling...' : 'Register Student'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
