import React, { useState, useEffect } from 'react';
import api from '../../api/client.js';
import DataTable from '../../components/common/DataTable.jsx';
import Modal from '../../components/common/Modal.jsx';
import { Users, UserPlus, CheckCircle2, AlertCircle, Shield, ShieldOff } from 'lucide-react';

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [batches, setBatches] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    capabilities: ['FACULTY'],
    registrationNo: '',
    batchId: '',
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const fetchUsersAndBatches = async () => {
    try {
      const uRes = await api.get('/admin/users');
      const bRes = await api.get('/admin/batches');
      if (uRes.success) setUsers(uRes.users || []);
      if (bRes.success) setBatches(bRes.batches || []);
    } catch (err) {
      console.warn('Fetch users error:', err.message);
    }
  };

  useEffect(() => {
    fetchUsersAndBatches();
  }, []);

  const handleCreateUser = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.password) return;

    try {
      setLoading(true);
      setError('');
      setMessage('');

      const res = await api.post('/admin/users', formData);
      if (res.success) {
        setMessage(res.message);
        setModalOpen(false);
        setFormData({
          name: '',
          email: '',
          password: '',
          capabilities: ['FACULTY'],
          registrationNo: '',
          batchId: '',
        });
        await fetchUsersAndBatches();
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (userId, currentStatus) => {
    const nextStatus = currentStatus === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      setError('');
      setMessage('');
      const res = await api.put(`/admin/users/${userId}/status`, { accountStatus: nextStatus });
      if (res.success) {
        setMessage(res.message);
        await fetchUsersAndBatches();
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const columns = [
    {
      header: 'Full Name',
      accessor: 'name',
      className: 'font-semibold text-gray-900',
    },
    { header: 'Institutional Email', accessor: 'email', className: 'text-gray-700' },
    {
      header: 'Account Capabilities',
      render: (u) => (
        <div className="flex gap-1 flex-wrap">
          {u.capabilities?.map((c, i) => (
            <span
              key={i}
              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                c === 'ADMIN'
                  ? 'bg-purple-100 text-purple-800'
                  : c === 'FACULTY'
                  ? 'bg-blue-100 text-blue-800'
                  : 'bg-emerald-100 text-emerald-800'
              }`}
            >
              {c}
            </span>
          ))}
        </div>
      ),
    },
    {
      header: 'Portal Password',
      render: (u) => (
        <span
          className="font-mono text-xs font-bold px-2.5 py-0.5 rounded bg-amber-50 text-amber-900 border border-amber-200"
          title="Current Portal Password"
        >
          {u.visiblePassword || '••••••••'}
        </span>
      ),
    },
    {
      header: 'Status',
      render: (u) => (
        <span
          className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
            u.accountStatus === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
          }`}
        >
          {u.accountStatus}
        </span>
      ),
    },
    {
      header: 'Actions',
      render: (u) => (
        <button
          onClick={() => handleToggleStatus(u.id, u.accountStatus)}
          className={`text-xs px-2.5 py-1 rounded font-medium border ${
            u.accountStatus === 'ACTIVE'
              ? 'bg-white border-gray-300 text-rose-700 hover:bg-rose-50'
              : 'bg-white border-gray-300 text-emerald-700 hover:bg-emerald-50'
          }`}
        >
          {u.accountStatus === 'ACTIVE' ? 'Deactivate' : 'Activate'}
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Users className="w-5 h-5 text-purple-700" />
            Institutional User Accounts
          </h2>
          <p className="text-xs text-gray-600 mt-0.5">
            Provision and control faculty, student, and administrator portal credentials.
          </p>
        </div>

        <button
          onClick={() => setModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-purple-700 text-white rounded-lg text-xs font-bold hover:bg-purple-800 transition-colors shadow-2xs"
        >
          <UserPlus className="w-4 h-4" />
          <span>Provision Account</span>
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
        data={users}
        searchKey="email"
        searchPlaceholder="Search users by email or name..."
        emptyMessage="No user accounts registered."
      />

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Provision Academic Portal Account">
        <form onSubmit={handleCreateUser} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700">
              Full Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              placeholder="e.g. Dr. Ayesha Siddiqui"
              className="mt-1 w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500"
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
              placeholder="user@university.edu"
              className="mt-1 w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700">
              Initial Password *
            </label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              required
              placeholder="••••••••"
              className="mt-1 w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700">
              Account Capability *
            </label>
            <select
              value={formData.capabilities[0]}
              onChange={(e) => setFormData({ ...formData, capabilities: [e.target.value] })}
              className="mt-1 w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-purple-500"
            >
              <option value="FACULTY">Faculty Member (Coordinator / Supervisor / Examiner)</option>
              <option value="STUDENT">Student Candidate</option>
              <option value="ADMIN">Super Admin Authority</option>
            </select>
          </div>

          {formData.capabilities.includes('STUDENT') && (
            <div className="grid grid-cols-2 gap-3 p-3 bg-gray-50 border border-gray-200 rounded-lg">
              <div>
                <label className="block text-xs font-bold text-gray-700">Registration No *</label>
                <input
                  type="text"
                  value={formData.registrationNo}
                  onChange={(e) => setFormData({ ...formData, registrationNo: e.target.value })}
                  placeholder="SP23-BCS-050"
                  className="mt-1 w-full px-2.5 py-1.5 bg-white border border-gray-300 rounded text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700">Enrolled Batch *</label>
                <select
                  value={formData.batchId}
                  onChange={(e) => setFormData({ ...formData, batchId: e.target.value })}
                  className="mt-1 w-full px-2.5 py-1.5 bg-white border border-gray-300 rounded text-xs"
                >
                  <option value="">-- Select Batch --</option>
                  {batches.map((b) => (
                    <option key={b._id || b.id} value={b._id || b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

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
              {loading ? 'Creating...' : 'Provision Account'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
