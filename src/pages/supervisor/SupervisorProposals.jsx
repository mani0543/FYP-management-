import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import api from '../../api/client.js';
import DataTable from '../../components/common/DataTable.jsx';
import StatusBadge from '../../components/common/StatusBadge.jsx';
import Modal from '../../components/common/Modal.jsx';
import {
  FileText,
  CheckCircle2,
  AlertCircle,
  Eye,
  ShieldCheck,
  MessageSquare,
} from 'lucide-react';

export default function SupervisorProposals() {
  const { user } = useAuth();
  const [proposals, setProposals] = useState([]);
  const [selectedProposal, setSelectedProposal] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [decision, setDecision] = useState('ACCEPT');
  const [feedback, setFeedback] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const fetchProposals = async () => {
    try {
      const res = await api.get('/supervisor/proposals');
      if (res.success) {
        setProposals(res.proposals || []);
      }
    } catch (err) {
      console.warn('Fetch supervisor proposals error:', err.message);
    }
  };

  useEffect(() => {
    fetchProposals();
  }, []);

  const handleOpenReview = (p) => {
    setSelectedProposal(p);
    setDecision('ACCEPT');
    setFeedback(p.supervisorFeedback || '');
    setModalOpen(true);
  };

  const handleEvaluate = async (e) => {
    e.preventDefault();
    if (!selectedProposal) return;

    try {
      setLoading(true);
      setError('');
      setMessage('');

      const propId = selectedProposal._id || selectedProposal.id;
      const res = await api.post(`/supervisor/proposals/${propId}/review`, {
        decision,
        feedback,
      });

      if (res.success) {
        setMessage(res.message);
        setModalOpen(false);
        await fetchProposals();
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    {
      header: 'Project Title',
      accessor: 'title',
      className: 'font-semibold text-gray-900 max-w-sm truncate',
    },
    {
      header: 'AI Novelty Score',
      render: (p) => (
        <span
          className={`font-mono text-xs font-bold px-2 py-0.5 rounded ${
            p.similarityScore >= 60 ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'
          }`}
        >
          {p.similarityScore || 0}% Sim
        </span>
      ),
    },
    {
      header: 'Status',
      render: (p) => <StatusBadge status={p.status} />,
    },
    {
      header: 'Action',
      render: (p) => (
        <button
          onClick={() => handleOpenReview(p)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 shadow-2xs"
        >
          <Eye className="w-3.5 h-3.5 text-blue-600" />
          <span>Evaluate Proposal</span>
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-700" />
            Proposal Review & Technical Feasibility Evaluation
          </h2>
          <p className="text-xs text-gray-600 mt-0.5">
            Accepting a proposal confirms faculty supervision and activates the direct project communication channel.
          </p>
        </div>
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
        data={proposals}
        searchKey="title"
        searchPlaceholder="Search proposals by title..."
        emptyMessage="No proposals submitted for your review currently."
      />

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={`Supervisor Evaluation — ${selectedProposal?.title || 'Proposal'}`}
        maxWidth="max-w-2xl"
      >
        {selectedProposal && (
          <form onSubmit={handleEvaluate} className="space-y-4">
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 text-xs space-y-2">
              <div>
                <strong>Description:</strong> <p className="text-gray-700 mt-0.5">{selectedProposal.description}</p>
              </div>
              <div>
                <strong>Problem Statement:</strong>{' '}
                <p className="text-gray-700 mt-0.5">{selectedProposal.problemStatement}</p>
              </div>
              <div>
                <strong>Methodology:</strong> <p className="text-gray-700 mt-0.5">{selectedProposal.methodology}</p>
              </div>
              <div>
                <strong>Technologies:</strong>{' '}
                <span className="text-gray-700 font-mono">{selectedProposal.technologies}</span>
              </div>
            </div>

            {selectedProposal.aiAnalysis && (
              <div className="p-3.5 bg-blue-50/60 border border-blue-200 rounded-lg text-xs space-y-1">
                <div className="font-bold text-blue-950 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-blue-600" />
                  Gemini AI Novelty Check: {selectedProposal.aiAnalysis.similarityScore}% Similarity (
                  <span className="uppercase">{selectedProposal.aiAnalysis.riskLevel}</span>)
                </div>
                <div className="text-gray-700">{selectedProposal.aiAnalysis.reasoning}</div>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
                Academic Supervision Decision *
              </label>
              <select
                value={decision}
                onChange={(e) => setDecision(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500"
              >
                <option value="ACCEPT">Accept Proposal & Supervise Team (Unlocks Chat)</option>
                <option value="REQUEST_CHANGES">Request Modifications / Scope Revision</option>
                <option value="REJECT">Reject Proposal</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
                Faculty Remarks & Guidance
              </label>
              <textarea
                rows={3}
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="Guidance on architectural scope, datasets, or requirements..."
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-gray-200">
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
                className="px-4 py-2 text-xs font-bold bg-blue-700 text-white rounded-lg hover:bg-blue-800 disabled:opacity-50"
              >
                {loading ? 'Submitting...' : 'Save Academic Evaluation'}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
