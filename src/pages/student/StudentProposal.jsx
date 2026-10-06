import React, { useState, useEffect } from 'react';
import { useSearchParams, useOutletContext } from 'react-router-dom';
import api from '../../api/client.js';
import StatusBadge from '../../components/common/StatusBadge.jsx';
import AIAnalysisCard from '../../components/proposal/AIAnalysisCard.jsx';
import {
  Sparkles,
  Send,
  Save,
  CheckCircle2,
  AlertCircle,
  FolderOpen,
  Info,
} from 'lucide-react';

export default function StudentProposal() {
  const { studentData, refreshStudentStatus } = useOutletContext();
  const [searchParams] = useSearchParams();

  const [supervisors, setSupervisors] = useState([]);
  const [topics, setTopics] = useState([]);
  const [topicSelectionMode, setTopicSelectionMode] = useState('CUSTOM'); // 'TOPIC' | 'CUSTOM'

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    problemStatement: '',
    objectives: '',
    methodology: '',
    technologies: '',
    expectedOutcome: '',
    supervisorId: '',
    selectedTopicId: '',
  });

  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [analyzingAI, setAnalyzingAI] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const currentProposal = studentData?.proposal;

  useEffect(() => {
    const fetchSupervisorsAndTopics = async () => {
      try {
        const res = await api.get('/student/supervisors-and-topics');
        if (res.success) {
          setSupervisors(res.supervisors || []);
          setTopics(res.topics || []);

          // Pre-fill query params if arrived via topic link
          const topicParam = searchParams.get('topicId');
          const supervisorParam = searchParams.get('supervisorId');
          if (topicParam) {
            const matchedTopic = res.topics.find((t) => (t._id || t.id) === topicParam);
            if (matchedTopic) {
              setTopicSelectionMode('TOPIC');
              setFormData((prev) => ({
                ...prev,
                title: matchedTopic.title,
                description: matchedTopic.description,
                technologies: matchedTopic.technologies?.join(', ') || '',
                supervisorId: supervisorParam || matchedTopic.supervisorId,
                selectedTopicId: topicParam,
              }));
            }
          }
        }
      } catch (err) {
        console.warn('Supervisors fetch error:', err.message);
      }
    };

    fetchSupervisorsAndTopics();
  }, [searchParams]);

  useEffect(() => {
    if (currentProposal) {
      setFormData({
        title: currentProposal.title || '',
        description: currentProposal.description || '',
        problemStatement: currentProposal.problemStatement || '',
        objectives: currentProposal.objectives || '',
        methodology: currentProposal.methodology || '',
        technologies: currentProposal.technologies || '',
        expectedOutcome: currentProposal.expectedOutcome || '',
        supervisorId: currentProposal.supervisorId || '',
        selectedTopicId: currentProposal.selectedTopicId || '',
      });
      if (currentProposal.isCustomTopic) {
        setTopicSelectionMode('CUSTOM');
      } else if (currentProposal.selectedTopicId) {
        setTopicSelectionMode('TOPIC');
      }
      if (currentProposal.aiAnalysis) {
        setAiAnalysis(currentProposal.aiAnalysis);
      }
    }
  }, [currentProposal]);

  const handleTopicChange = (topicId) => {
    const matched = topics.find((t) => (t._id || t.id) === topicId);
    if (matched) {
      setFormData((prev) => ({
        ...prev,
        selectedTopicId: topicId,
        title: matched.title,
        description: matched.description,
        supervisorId: matched.supervisorId,
        technologies: matched.technologies?.join(', ') || '',
      }));
    }
  };

  const handleRunAIAnalysis = async () => {
    if (!formData.title.trim() || !formData.description.trim() || !formData.problemStatement.trim()) {
      setError('Please provide at minimum the Project Title, Description, and Problem Statement for AI analysis.');
      return;
    }

    try {
      setAnalyzingAI(true);
      setError('');
      setSuccess('');

      const res = await api.post('/student/proposal/ai-check', {
        title: formData.title,
        description: formData.description,
        problemStatement: formData.problemStatement,
        objectives: formData.objectives,
        methodology: formData.methodology,
        technologies: formData.technologies,
      });

      if (res.success) {
        setAiAnalysis(res.analysis);
        setSuccess('Gemini AI originality check complete. Review similarity score and feedback below.');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setAnalyzingAI(false);
    }
  };

  const handleSubmitProposal = async (e) => {
    e.preventDefault();
    if (!formData.title || !formData.description || !formData.problemStatement || !formData.supervisorId) {
      setError('Please complete all mandatory proposal fields and select a designated supervisor.');
      return;
    }

    try {
      setSubmitting(true);
      setAnalyzingAI(true);
      setError('');
      setSuccess('');

      const res = await api.post('/student/proposal/submit', {
        ...formData,
        isCustomTopic: topicSelectionMode === 'CUSTOM',
      });

      if (res.success) {
        if (res.analysis || res.proposal?.aiAnalysis) {
          setAiAnalysis(res.analysis || res.proposal.aiAnalysis);
        }
        setSuccess(res.message);
        await refreshStudentStatus();
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
      setAnalyzingAI(false);
    }
  };

  const isLocked =
    currentProposal &&
    ['SUPERVISOR_APPROVED', 'COORDINATOR_REVIEW', 'APPROVED'].includes(currentProposal.status);

  return (
    <div className="max-w-4xl mx-auto space-y-6 py-2">
      {/* Header & Status Card */}
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-blue-700 bg-blue-50 px-3 py-1 rounded-full border border-blue-200">
            Phase 1 — Project Formulation
          </span>
          <h2 className="text-xl font-bold text-gray-900 mt-2">FYP Project Proposal</h2>
          <p className="text-xs text-gray-600 mt-0.5">
            Formulate your problem and methodology. Gemini AI originality analysis runs automatically upon submission.
          </p>
        </div>

        <div className="text-right">
          <div className="text-[11px] text-gray-500 font-semibold uppercase tracking-wider mb-1">
            Proposal Status
          </div>
          <StatusBadge status={currentProposal?.status || 'DRAFT'} />
        </div>
      </div>

      {error && (
        <div className="p-3.5 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="p-3.5 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-start gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          <span>{success}</span>
        </div>
      )}

      {/* Proposal Form */}
      <form onSubmit={handleSubmitProposal} className="bg-white p-8 rounded-xl border border-gray-200 shadow-xs space-y-6">
        {/* Topic Type Selector */}
        {!isLocked && (
          <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg space-y-3">
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700">
              Topic Selection Method
            </label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-xs font-medium text-gray-800 cursor-pointer">
                <input
                  type="radio"
                  name="topicMode"
                  checked={topicSelectionMode === 'TOPIC'}
                  onChange={() => setTopicSelectionMode('TOPIC')}
                  className="text-blue-600 focus:ring-blue-500"
                />
                <span>Select from Department Supervisor Topics</span>
              </label>
              <label className="flex items-center gap-2 text-xs font-medium text-gray-800 cursor-pointer">
                <input
                  type="radio"
                  name="topicMode"
                  checked={topicSelectionMode === 'CUSTOM'}
                  onChange={() => {
                    setTopicSelectionMode('CUSTOM');
                    setFormData((prev) => ({ ...prev, selectedTopicId: '' }));
                  }}
                  className="text-blue-600 focus:ring-blue-500"
                />
                <span>Propose Independent / Custom Topic</span>
              </label>
            </div>

            {topicSelectionMode === 'TOPIC' && (
              <div className="pt-2">
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  Available Supervisor Topics:
                </label>
                <select
                  value={formData.selectedTopicId}
                  onChange={(e) => handleTopicChange(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- Choose a published topic --</option>
                  {topics
                    .filter((t) => t.status === 'AVAILABLE' || t._id === formData.selectedTopicId)
                    .map((t) => (
                      <option key={t._id || t.id} value={t._id || t.id}>
                        {t.title} ({t.supervisorName})
                      </option>
                    ))}
                </select>
              </div>
            )}
          </div>
        )}

        {/* Supervisor Selection */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-gray-700">
            Designated Faculty Supervisor *
          </label>
          <select
            value={formData.supervisorId}
            disabled={isLocked || (topicSelectionMode === 'TOPIC' && !!formData.selectedTopicId)}
            onChange={(e) => setFormData({ ...formData, supervisorId: e.target.value })}
            required
            className="mt-1 w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
          >
            <option value="">-- Select Faculty Supervisor --</option>
            {supervisors.map((s) => (
              <option key={s.id} value={s.id} disabled={s.isFull}>
                {s.name} ({s.currentTeamCount}/{s.maxCapacity} Teams{s.isFull ? ' - FULL' : ''})
              </option>
            ))}
          </select>
        </div>

        {/* Project Title */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-gray-700">
            Project Title *
          </label>
          <input
            type="text"
            value={formData.title}
            disabled={isLocked}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            required
            placeholder="e.g. Real-Time Autonomous Agricultural Crop Diagnostic Framework"
            className="mt-1 w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
          />
        </div>

        {/* Project Description */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-gray-700">
            Executive Description *
          </label>
          <textarea
            rows={3}
            value={formData.description}
            disabled={isLocked}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            required
            placeholder="High-level summary of the proposed project..."
            className="mt-1 w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
          />
        </div>

        {/* Problem Statement */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-gray-700">
            Problem Statement *
          </label>
          <textarea
            rows={3}
            value={formData.problemStatement}
            disabled={isLocked}
            onChange={(e) => setFormData({ ...formData, problemStatement: e.target.value })}
            required
            placeholder="Specific technical problem, latency bottleneck, or clinical challenge addressed..."
            className="mt-1 w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
          />
        </div>

        {/* Objectives */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-gray-700">
            Measurable Academic Objectives
          </label>
          <textarea
            rows={3}
            value={formData.objectives}
            disabled={isLocked}
            onChange={(e) => setFormData({ ...formData, objectives: e.target.value })}
            placeholder="1. Benchmark inference latency on edge nodes&#10;2. Achieve >90% precision under packet loss..."
            className="mt-1 w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
          />
        </div>

        {/* Methodology & Technologies */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700">
              Methodology & Architecture
            </label>
            <textarea
              rows={3}
              value={formData.methodology}
              disabled={isLocked}
              onChange={(e) => setFormData({ ...formData, methodology: e.target.value })}
              placeholder="Model architectures, protocols, experimental pipeline..."
              className="mt-1 w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700">
              Technology Stack
            </label>
            <textarea
              rows={3}
              value={formData.technologies}
              disabled={isLocked}
              onChange={(e) => setFormData({ ...formData, technologies: e.target.value })}
              placeholder="Python, PyTorch, Docker, React, ROS2..."
              className="mt-1 w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
            />
          </div>
        </div>

        {/* AI Originality Analysis Result (Automatically triggered on Submit) */}
        {(aiAnalysis || analyzingAI) && (
          <div className="pt-4 border-t border-gray-200 space-y-4">
            <AIAnalysisCard
              analysis={aiAnalysis}
              loading={analyzingAI}
              onRecheck={null}
            />
          </div>
        )}

        {/* Supervisor Feedback if changes were requested */}
        {currentProposal?.supervisorFeedback && (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <h4 className="text-xs font-bold uppercase tracking-wider text-amber-800 mb-1">
              Supervisor Evaluation Remarks
            </h4>
            <p className="text-sm text-amber-950">{currentProposal.supervisorFeedback}</p>
          </div>
        )}

        {/* Submit Actions */}
        {!isLocked && (
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold text-white bg-blue-700 hover:bg-blue-800 disabled:opacity-50 transition-colors shadow-xs"
            >
              <Send className="w-4 h-4" />
              <span>{submitting ? 'Analyzing Originality & Submitting...' : 'Submit Proposal to Supervisor'}</span>
            </button>
          </div>
        )}
      </form>
    </div>
  );
}
