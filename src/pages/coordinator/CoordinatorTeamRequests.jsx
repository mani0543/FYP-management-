import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import api from '../../api/client.js';
import DataTable from '../../components/common/DataTable.jsx';
import StatusBadge from '../../components/common/StatusBadge.jsx';
import { UserCheck, FileCheck, CheckCircle2, AlertCircle } from 'lucide-react';

export default function CoordinatorTeamRequests() {
  const { activeAssignment } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activating, setActivating] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const batchId = activeAssignment?.batchId;

  const fetchRequests = async () => {
    if (!batchId) return;
    try {
      const res = await api.get(`/coordinator/batch/${batchId}/team-requests`);
      if (res.success) {
        setRequests(res.requests || []);
      }
    } catch (err) {
      console.warn('Fetch requests error:', err.message);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [batchId]);

  const handleCreatePortals = async () => {
    try {
      setActivating(true);
      setMessage('');
      setError('');

      const res = await api.post(`/coordinator/batch/${batchId}/create-portals`);
      if (res.success) {
        setMessage(res.message);
        await fetchRequests();
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setActivating(false);
    }
  };

  const pendingCount = requests.filter((r) => r.status === 'PENDING').length;

  const columns = [
    {
      header: 'Team Code',
      accessor: 'teamCode',
      className: 'font-mono font-bold text-gray-900',
    },
    {
      header: 'Student 1',
      render: (r) => (
        <div>
          <div className="font-semibold text-gray-900">{r.student1Name}</div>
          <div className="font-mono text-xs text-gray-500">{r.student1RegNo}</div>
        </div>
      ),
    },
    {
      header: 'Student 2',
      render: (r) => (
        <div>
          <div className="font-semibold text-gray-900">{r.student2Name}</div>
          <div className="font-mono text-xs text-gray-500">{r.student2RegNo}</div>
        </div>
      ),
    },
    {
      header: 'Submitted At',
      render: (r) => (
        <span className="font-mono text-xs text-gray-600">
          {new Date(r.submittedAt).toLocaleString()}
        </span>
      ),
    },
    {
      header: 'Portal Status',
      render: (r) => <StatusBadge status={r.status} />,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-blue-700" />
            Team Formation Requests & Portal Activation
          </h2>
          <p className="text-xs text-gray-600 mt-0.5">
            Review student pairings submitted prior to deadline. Click <strong>"CREATE PORTALS"</strong> to grant students project dashboard access.
          </p>
        </div>

        <button
          onClick={handleCreatePortals}
          disabled={activating || pendingCount === 0}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-700 text-white rounded-lg text-xs font-bold hover:bg-blue-800 disabled:opacity-50 transition-colors shadow-xs"
        >
          <FileCheck className="w-4 h-4" />
          <span>{activating ? 'Activating Portals...' : `CREATE PORTALS (${pendingCount} Pending)`}</span>
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
        data={requests}
        searchKey="teamCode"
        searchPlaceholder="Search by Team Code or Student Name..."
        emptyMessage="No team formation requests submitted yet for this batch."
      />
    </div>
  );
}
