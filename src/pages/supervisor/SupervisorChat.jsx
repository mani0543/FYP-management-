import React, { useState, useEffect } from 'react';
import api from '../../api/client.js';
import ChatBox from '../../components/chat/ChatBox.jsx';
import { MessageSquare, Users } from 'lucide-react';

export default function SupervisorChat() {
  const [teams, setTeams] = useState([]);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTeams = async () => {
      try {
        const res = await api.get('/supervisor/teams');
        if (res.success && res.teams.length > 0) {
          setTeams(res.teams);
          setSelectedTeam(res.teams[0]);
        }
      } catch (err) {
        console.warn('Fetch teams for chat error:', err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchTeams();
  }, []);

  return (
    <div className="max-w-5xl mx-auto py-2 space-y-4">
      <div>
        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-blue-700" />
          Direct Team Consultation Channels
        </h2>
        <p className="text-xs text-gray-600 mt-0.5">
          Dedicated academic messaging with your assigned project teams.
        </p>
      </div>

      {teams.length === 0 ? (
        <div className="bg-white p-12 rounded-xl border border-gray-200 text-center text-sm text-gray-500 shadow-xs">
          No active teams currently assigned to you. Once proposals are approved, communication rooms appear here.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* Teams Selector Sidebar */}
          <div className="md:col-span-4 bg-white p-4 rounded-xl border border-gray-200 shadow-xs space-y-2 h-[520px] overflow-y-auto">
            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
              Select Project Team
            </h4>
            {teams.map((t) => {
              const isSelected = (selectedTeam?._id || selectedTeam?.id) === (t._id || t.id);
              return (
                <div
                  key={t._id || t.id}
                  onClick={() => setSelectedTeam(t)}
                  className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-blue-50 border-blue-300 text-blue-950 font-semibold'
                      : 'bg-white border-gray-200 hover:bg-gray-50 text-gray-800'
                  }`}
                >
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-mono font-bold text-blue-800">{t.teamCode}</span>
                    <span className="text-[10px] bg-gray-100 px-1.5 py-0.5 rounded">Sem {t.semesterNumber}</span>
                  </div>
                  <div className="text-xs mt-1 truncate">{t.projectTitle || 'Project Title'}</div>
                  <div className="text-[11px] text-gray-500 mt-0.5">{t.studentNames?.join(', ')}</div>
                </div>
              );
            })}
          </div>

          {/* Active Chat Pane */}
          <div className="md:col-span-8">
            {selectedTeam ? (
              <ChatBox
                teamId={selectedTeam._id || selectedTeam.id}
                teamCode={selectedTeam.teamCode}
              />
            ) : (
              <div className="text-center py-20 bg-white border border-gray-200 rounded-xl text-gray-500 text-sm">
                Select a team from the left to start conversation.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
