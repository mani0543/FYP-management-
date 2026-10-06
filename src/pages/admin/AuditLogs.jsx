import React, { useState, useEffect } from 'react';
import api from '../../api/client.js';
import DataTable from '../../components/common/DataTable.jsx';
import { ShieldCheck, History, Clock } from 'lucide-react';

export default function AuditLogs() {
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const res = await api.get('/admin/audit-logs');
        if (res.success) setLogs(res.logs || []);
      } catch (err) {
        console.warn('Fetch audit logs error:', err.message);
      }
    };
    fetchLogs();
  }, []);

  const columns = [
    {
      header: 'Timestamp',
      render: (l) => (
        <span className="font-mono text-xs text-gray-600 flex items-center gap-1.5 whitespace-nowrap">
          <Clock className="w-3.5 h-3.5 text-gray-400" />
          {new Date(l.timestamp).toLocaleString()}
        </span>
      ),
    },
    {
      header: 'Actor',
      render: (l) => (
        <div>
          <div className="font-semibold text-gray-900 text-xs">{l.actorName}</div>
          <span className="text-[10px] font-bold uppercase text-purple-700 bg-purple-50 px-1.5 py-0.2 rounded border border-purple-200">
            {l.actorRole}
          </span>
        </div>
      ),
    },
    {
      header: 'Action Taken',
      accessor: 'action',
      className: 'font-mono text-xs font-bold text-gray-800',
    },
    {
      header: 'Target Entity',
      render: (l) => (
        <span className="font-mono text-xs text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
          {l.entityType}: {l.entityId?.substring(0, 10)}
        </span>
      ),
    },
    {
      header: 'Audit Metadata Details',
      render: (l) => (
        <pre className="text-[11px] font-mono text-gray-600 bg-gray-50 p-1.5 rounded max-w-xs overflow-x-auto">
          {JSON.stringify(l.metadata || {})}
        </pre>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-xs">
        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-purple-700" />
          Cryptographically Tracked Academic Audit Trail
        </h2>
        <p className="text-xs text-gray-600 mt-0.5">
          Immutable historic records. When coordinators or supervisors change across semesters, previous approvals remain attributed permanently to the original signatories.
        </p>
      </div>

      <DataTable
        columns={columns}
        data={logs}
        searchKey="action"
        searchPlaceholder="Search audit events by action..."
        emptyMessage="No audit log events recorded yet."
      />
    </div>
  );
}
