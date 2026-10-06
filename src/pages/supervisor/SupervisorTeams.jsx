import React, { useState, useEffect } from 'react';
import api from '../../api/client.js';
import DataTable from '../../components/common/DataTable.jsx';
import { Users, MessageSquare, Layers } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function SupervisorTeams() {
  const [teams, setTeams] = useState([]);

  useEffect(() => {
    const fetchTeams = async () => {
      try {
        const res = await api.get('/supervisor/teams');
        if (res.success) setTeams(res.teams || []);
      } catch (err) {
        console.warn('Fetch teams error:', err.message);
      }
    };
    fetchTeams();
  }, []);

  const columns = [
    {
      header: 'Team Code',
      accessor: 'teamCode',
      className: 'font-mono font-bold text-gray-900',
    },
    {
      header: 'Project Title',
      accessor: 'projectTitle',
      className: 'font-semibold text-gray-900 max-w-sm truncate',
    },
    {
      header: 'Student Members',
      render: (t) => (
        <div className="text-xs text-gray-700">
          <div>{t.studentNames?.join(', ')}</div>
          <div className="font-mono text-gray-400">{t.studentRegNos?.join(', ')}</div>
        </div>
      ),
    },
    {
      header: 'Semester',
      render: (t) => (
        <span className="font-semibold text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-700">
          Sem {t.semesterNumber}
        </span>
      ),
    },
    {
      header: 'Actions',
      render: (t) => (
        <div className="flex gap-2">
          <Link
            to="/supervisor/chat"
            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-white border border-gray-300 rounded text-blue-700 hover:bg-gray-50 shadow-2xs"
          >
            <MessageSquare className="w-3.5 h-3.5" /> Chat
          </Link>
          <Link
            to="/supervisor/documents"
            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-blue-700 text-white rounded hover:bg-blue-800 shadow-2xs"
          >
            Deliverables
          </Link>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-xs">
        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <Users className="w-5 h-5 text-blue-700" />
          My Supervised FYP Teams
        </h2>
        <p className="text-xs text-gray-600 mt-0.5">
          Comprehensive roster of project groups under your mentorship across active semesters.
        </p>
      </div>

      <DataTable
        columns={columns}
        data={teams}
        searchKey="teamCode"
        searchPlaceholder="Search teams by code or title..."
        emptyMessage="No teams currently allocated under your supervision."
      />
    </div>
  );
}
