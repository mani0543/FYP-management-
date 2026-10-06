import React, { useState, useEffect } from 'react';
import api from '../../api/client.js';
import { Settings, Save, CheckCircle2, AlertCircle, ShieldAlert } from 'lucide-react';

export default function AdminSettings() {
  const [settings, setSettings] = useState({
    maxTeamsPerSupervisor: 5,
    teamSize: 2,
    proposalSimilarityThreshold: 60,
    allowOwnTopic: true,
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await api.get('/admin/settings');
        if (res.success && res.settings) {
          setSettings(res.settings);
        }
      } catch (err) {
        console.warn('Fetch settings error:', err.message);
      }
    };
    fetchSettings();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError('');
      setMessage('');

      const res = await api.put('/admin/settings', settings);
      if (res.success) {
        setMessage(res.message);
        setSettings(res.settings);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto py-2 space-y-6">
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-xs">
        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <Settings className="w-5 h-5 text-purple-700" />
          Department FYP Academic Policies & Governance Thresholds
        </h2>
        <p className="text-xs text-gray-600 mt-0.5">
          Configure supervisor capacity limits, group formation rules, and AI originality parameters.
        </p>
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

      <form onSubmit={handleSubmit} className="bg-white p-8 rounded-xl border border-gray-200 shadow-xs space-y-6">
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-gray-700">
            Maximum Teams Per Faculty Supervisor *
          </label>
          <input
            type="number"
            min="1"
            max="15"
            value={settings.maxTeamsPerSupervisor}
            onChange={(e) => setSettings({ ...settings, maxTeamsPerSupervisor: Number(e.target.value) })}
            required
            className="mt-1 w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-lg text-sm text-gray-900 font-mono focus:ring-2 focus:ring-purple-500"
          />
          <span className="text-[11px] text-gray-500 mt-1 block">
            Backend will automatically mark supervisors as FULL and reject additional team allocations once reached.
          </span>
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-gray-700">
            Mandatory Student Team Size *
          </label>
          <input
            type="number"
            min="1"
            max="4"
            value={settings.teamSize}
            onChange={(e) => setSettings({ ...settings, teamSize: Number(e.target.value) })}
            required
            className="mt-1 w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-lg text-sm text-gray-900 font-mono focus:ring-2 focus:ring-purple-500"
          />
          <span className="text-[11px] text-gray-500 mt-1 block">
            Default university group size is 2 students per FYP team.
          </span>
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-gray-700">
            AI Proposal Similarity Flagging Threshold (%) *
          </label>
          <input
            type="number"
            min="10"
            max="95"
            value={settings.proposalSimilarityThreshold}
            onChange={(e) =>
              setSettings({ ...settings, proposalSimilarityThreshold: Number(e.target.value) })
            }
            required
            className="mt-1 w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-lg text-sm text-gray-900 font-mono focus:ring-2 focus:ring-purple-500"
          />
          <span className="text-[11px] text-gray-500 mt-1 block">
            Proposals with Gemini AI novelty overlap exceeding this score trigger a HIGH risk advisory indicator.
          </span>
        </div>

        <div className="pt-2">
          <label className="flex items-center gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.allowOwnTopic}
              onChange={(e) => setSettings({ ...settings, allowOwnTopic: e.target.checked })}
              className="w-4 h-4 text-purple-600 rounded border-gray-300 focus:ring-purple-500"
            />
            <span className="text-sm font-semibold text-gray-800">
              Permit Student Groups to Propose Independent / Custom Topics
            </span>
          </label>
          <span className="text-[11px] text-gray-500 ml-6 block">
            If disabled, students must select exclusively from department published supervisor topics.
          </span>
        </div>

        <div className="flex justify-end pt-4 border-t border-gray-200">
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-purple-700 text-white rounded-lg text-xs font-bold hover:bg-purple-800 disabled:opacity-50 transition-colors shadow-xs"
          >
            <Save className="w-4 h-4" />
            <span>{loading ? 'Saving...' : 'Save Department Policies'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
