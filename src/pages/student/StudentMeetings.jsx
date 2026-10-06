import React, { useState, useEffect } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import api from '../../api/client.js';
import { Video, Calendar, Clock, MapPin, Link2 } from 'lucide-react';

export default function StudentMeetings() {
  const { studentData } = useOutletContext();
  const navigate = useNavigate();
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);

  const teamId = studentData?.team?._id || studentData?.team?.id;
  const hasSupervisor =
    Boolean(studentData?.team?.supervisorId) ||
    (studentData?.proposal &&
      ['SUPERVISOR_APPROVED', 'COORDINATOR_REVIEW', 'APPROVED'].includes(studentData.proposal.status));

  useEffect(() => {
    if (studentData && !hasSupervisor) {
      navigate('/student/proposal');
    }
  }, [studentData, hasSupervisor, navigate]);

  useEffect(() => {
    if (!hasSupervisor) return;
    const fetchMeetings = async () => {
      try {
        const res = await api.get('/meetings', { params: { teamId } });
        if (res.success) {
          setMeetings(res.meetings || []);
        }
      } catch (err) {
        console.warn('Meetings fetch error:', err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchMeetings();
  }, [teamId, hasSupervisor]);

  return (
    <div className="max-w-4xl mx-auto py-2 space-y-6">
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-xs">
        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <Video className="w-5 h-5 text-blue-700" />
          Academic Supervision & Progress Meetings
        </h2>
        <p className="text-xs text-gray-600 mt-0.5">
          Scheduled consultations with faculty supervisor and department committees.
        </p>
      </div>

      {loading ? (
        <div className="text-center py-10 text-sm text-gray-500">Loading meeting schedule...</div>
      ) : meetings.length === 0 ? (
        <div className="bg-white p-8 rounded-xl border border-gray-200 text-center text-sm text-gray-500 shadow-xs">
          No scheduled meetings currently on file for your project team.
        </div>
      ) : (
        <div className="space-y-4">
          {meetings.map((m) => (
            <div key={m._id || m.id} className="bg-white p-5 rounded-xl border border-gray-200 shadow-2xs space-y-3">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                <h4 className="text-base font-bold text-gray-900">{m.title}</h4>
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
                  <span>{m.location}</span>
                </div>
              </div>

              {m.link && (
                <div className="pt-2">
                  <a
                    href={m.link}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700 hover:text-blue-900 underline"
                  >
                    <Link2 className="w-3.5 h-3.5" />
                    <span>Join Online Meeting Room</span>
                  </a>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
