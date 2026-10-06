import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import api from '../../api/client.js';
import { Bell, Clock, User } from 'lucide-react';

export default function StudentAnnouncements() {
  const { studentData } = useOutletContext();
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnnouncements = async () => {
      try {
        const res = await api.get('/announcements');
        if (res.success) {
          setAnnouncements(res.announcements || []);
        }
      } catch (err) {
        console.warn('Announcements fetch error:', err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchAnnouncements();
  }, []);

  return (
    <div className="max-w-4xl mx-auto py-2 space-y-6">
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-xs">
        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <Bell className="w-5 h-5 text-blue-700" />
          Departmental & Coordinator Announcements
        </h2>
        <p className="text-xs text-gray-600 mt-0.5">
          Official academic directives, deadline notifications, and guidelines.
        </p>
      </div>

      {loading ? (
        <div className="text-center py-10 text-sm text-gray-500">Loading notices...</div>
      ) : announcements.length === 0 ? (
        <div className="bg-white p-8 rounded-xl border border-gray-200 text-center text-sm text-gray-500 shadow-xs">
          No formal circulars or announcements issued currently.
        </div>
      ) : (
        <div className="space-y-4">
          {announcements.map((a) => (
            <div key={a._id || a.id} className="bg-white p-6 rounded-xl border border-gray-200 shadow-2xs space-y-2">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-gray-100 pb-2">
                <h4 className="text-base font-bold text-gray-900">{a.title}</h4>
                <div className="flex items-center gap-2 text-[11px] text-gray-500 font-mono">
                  <Clock className="w-3.5 h-3.5 text-gray-400" />
                  <span>{new Date(a.createdAt).toLocaleDateString()}</span>
                </div>
              </div>

              <p className="text-xs text-gray-800 leading-relaxed pt-1 whitespace-pre-line">{a.message}</p>

              <div className="pt-2 text-[11px] text-gray-500 flex items-center gap-1.5 font-medium">
                <User className="w-3.5 h-3.5 text-gray-400" />
                <span>
                  Issued by <strong>{a.senderName}</strong> ({a.senderRole})
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
