import React, { useState, useEffect, useRef } from 'react';
import { Send, MessageSquare, AlertCircle } from 'lucide-react';
import api from '../../api/client.js';
import { useAuth } from '../../context/AuthContext.jsx';

export default function ChatBox({ teamId, teamCode }) {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);

  const fetchMessages = async () => {
    try {
      const res = await api.get(`/chat/${teamId}`);
      if (res.success) {
        setMessages(res.messages || []);
        setError('');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!teamId) return;
    fetchMessages();
    const interval = setInterval(fetchMessages, 4000); // Polling chat
    return () => clearInterval(interval);
  }, [teamId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || sending) return;

    try {
      setSending(true);
      const res = await api.post(`/chat/${teamId}`, { message: input.trim() });
      if (res.success) {
        setMessages((prev) => [...prev, res.message]);
        setInput('');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  };

  if (error && error.includes('inactive')) {
    return (
      <div className="p-8 text-center bg-gray-50 border border-gray-200 rounded-xl">
        <MessageSquare className="w-10 h-10 text-gray-400 mx-auto mb-3" />
        <h4 className="text-base font-semibold text-gray-800">Direct Academic Channel Inactive</h4>
        <p className="text-sm text-gray-600 mt-1 max-w-md mx-auto">
          Per departmental policy, private team-supervisor communication channels unlock automatically once the project proposal
          has been officially accepted by the faculty supervisor.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[520px] bg-white border border-gray-200 rounded-xl shadow-xs overflow-hidden">
      {/* Header */}
      <div className="px-5 py-3.5 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
          <div>
            <h4 className="text-sm font-semibold text-gray-900">
              {teamCode || 'Project Team'} ↔ Supervisor Direct Channel
            </h4>
            <span className="text-[11px] text-gray-500">Official Academic Communication</span>
          </div>
        </div>
      </div>

      {/* Messages Scroll */}
      <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-slate-50/50">
        {loading ? (
          <div className="text-center py-10 text-sm text-gray-500">Loading conversation history...</div>
        ) : messages.length === 0 ? (
          <div className="text-center py-12 text-sm text-gray-500">
            No messages yet. Start your academic project discussion below.
          </div>
        ) : (
          messages.map((msg, idx) => {
            const isMe = msg.senderId === (user?._id || user?.id);
            return (
              <div
                key={msg._id || msg.id || idx}
                className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
              >
                <div className="flex items-center gap-1.5 mb-1 px-1 text-[11px] text-gray-500">
                  <span className="font-semibold text-gray-700">{msg.senderName}</span>
                  <span
                    className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                      msg.senderRole === 'SUPERVISOR'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-emerald-100 text-emerald-800'
                    }`}
                  >
                    {msg.senderRole}
                  </span>
                  <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>

                <div
                  className={`max-w-[80%] rounded-xl px-4 py-2.5 text-sm leading-relaxed shadow-2xs ${
                    isMe
                      ? 'bg-blue-600 text-white rounded-br-none'
                      : 'bg-white border border-gray-200 text-gray-900 rounded-bl-none'
                  }`}
                >
                  {msg.message}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSend} className="p-3 bg-white border-t border-gray-200 flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type an academic message to team or supervisor..."
          disabled={sending}
          className="flex-1 px-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          type="submit"
          disabled={sending || !input.trim()}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-2xs"
        >
          <Send className="w-4 h-4" />
          <span>Send</span>
        </button>
      </form>
    </div>
  );
}
