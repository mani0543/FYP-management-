import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import api from '../../api/client.js';
import DataTable from '../../components/common/DataTable.jsx';
import StatusBadge from '../../components/common/StatusBadge.jsx';
import Modal from '../../components/common/Modal.jsx';
import SignaturePreview from '../../components/common/SignaturePreview.jsx';
import {
  FileText,
  CheckCircle2,
  AlertCircle,
  FileSignature,
  Stamp,
  Clock,
  Eye,
  ShieldCheck,
} from 'lucide-react';

export default function CoordinatorProposals() {
  const { activeAssignment, user } = useAuth();
  const [proposals, setProposals] = useState([]);
  const [selectedProposal, setSelectedProposal] = useState(null);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [decision, setDecision] = useState('APPROVE');
  const [feedback, setFeedback] = useState('');
  const [teamDocuments, setTeamDocuments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [signingDocId, setSigningDocId] = useState(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const batchId = activeAssignment?.batchId;

  const fetchProposals = async () => {
    if (!batchId) return;
    try {
      const res = await api.get(`/coordinator/batch/${batchId}/proposals`);
      if (res.success) {
        setProposals(res.proposals || []);
      }
    } catch (err) {
      console.warn('Fetch proposals error:', err.message);
    }
  };

  useEffect(() => {
    fetchProposals();
  }, [batchId]);

  const handleOpenReview = async (prop) => {
    setSelectedProposal(prop);
    setDecision('APPROVE');
    setFeedback(prop.coordinatorFeedback || '');
    setReviewModalOpen(true);

    try {
      const docsRes = await api.get(`/teams/${prop.teamId}/documents`);
      if (docsRes.success) {
        setTeamDocuments(docsRes.documents || []);
      }
    } catch {}
  };

  const handleProposalDecision = async (e) => {
    e.preventDefault();
    if (!selectedProposal) return;

    try {
      setLoading(true);
      setError('');
      setMessage('');

      const propId = selectedProposal._id || selectedProposal.id;
      const res = await api.post(`/coordinator/proposals/${propId}/review`, {
        decision,
        feedback,
      });

      if (res.success) {
        setMessage(res.message);
        setReviewModalOpen(false);
        await fetchProposals();
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSignAndStampDocument = async (docId) => {
    if (!user?.signatureUrl || !user?.stampUrl) {
      setError('Please upload both your digital signature and departmental stamp in your profile before signing.');
      return;
    }

    try {
      setSigningDocId(docId);
      setError('');
      setMessage('');

      const res = await api.post(`/coordinator/documents/${docId}/sign`, {
        comments: 'Officially verified and stamped by Batch Coordinator.',
      });

      if (res.success) {
        setMessage(res.message);
        // Refresh team documents
        const docsRes = await api.get(`/teams/${selectedProposal.teamId}/documents`);
        if (docsRes.success) {
          setTeamDocuments(docsRes.documents || []);
        }
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSigningDocId(null);
    }
  };

  const columns = [
    {
      header: 'Project Title',
      accessor: 'title',
      className: 'font-semibold text-gray-900 max-w-xs truncate',
    },
    {
      header: 'AI Similarity',
      render: (p) => (
        <span
          className={`font-mono text-xs font-bold px-2 py-0.5 rounded ${
            p.similarityScore >= 60 ? 'bg-rose-100 text-rose-800' : 'bg-blue-100 text-blue-800'
          }`}
        >
          {p.similarityScore || 0}%
        </span>
      ),
    },
    {
      header: 'Status',
      render: (p) => <StatusBadge status={p.status} />,
    },
    {
      header: 'Actions',
      render: (p) => (
        <button
          onClick={() => handleOpenReview(p)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 shadow-2xs"
        >
          <Eye className="w-3.5 h-3.5 text-blue-600" />
          <span>Review & Endorse</span>
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
            Batch FYP Proposals & Official Document Verification
          </h2>
          <p className="text-xs text-gray-600 mt-0.5">
            Evaluate student proposals, examine AI novelty reports, and digitally apply coordinator signature and official seal.
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
        emptyMessage="No project proposals submitted in this batch yet."
      />

      {/* Review Modal */}
      <Modal
        isOpen={reviewModalOpen}
        onClose={() => setReviewModalOpen(false)}
        title={`Coordinator Review — ${selectedProposal?.title || 'Proposal'}`}
        maxWidth="max-w-3xl"
      >
        {selectedProposal && (
          <div className="space-y-6">
            {/* Proposal Details */}
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 text-xs space-y-2">
              <div>
                <strong>Description:</strong> <span className="text-gray-700">{selectedProposal.description}</span>
              </div>
              <div>
                <strong>Problem Statement:</strong>{' '}
                <span className="text-gray-700">{selectedProposal.problemStatement}</span>
              </div>
              <div>
                <strong>Methodology:</strong> <span className="text-gray-700">{selectedProposal.methodology}</span>
              </div>
              <div>
                <strong>Technologies:</strong>{' '}
                <span className="text-gray-700 font-mono">{selectedProposal.technologies}</span>
              </div>
            </div>

            {/* AI Analysis Summary */}
            {selectedProposal.aiAnalysis && (
              <div className="p-4 bg-blue-50/50 border border-blue-200 rounded-lg text-xs space-y-1.5">
                <div className="font-bold text-blue-950 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-blue-600" />
                  Gemini AI Originality Audit Result
                </div>
                <div>
                  Calculated Similarity: <strong>{selectedProposal.aiAnalysis.similarityScore}%</strong> | Risk:{' '}
                  <strong className="uppercase">{selectedProposal.aiAnalysis.riskLevel}</strong>
                </div>
                <div className="text-gray-700">{selectedProposal.aiAnalysis.reasoning}</div>
              </div>
            )}

            {/* Submitted Documents & Signatures */}
            <div className="border-t pt-4 border-gray-200 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-700">
                Official Submitted Deliverables ({teamDocuments.length})
              </h4>

              {teamDocuments.length === 0 ? (
                <div className="text-xs text-gray-500 italic">No formal documents submitted by this team yet.</div>
              ) : (
                teamDocuments.map((doc) => {
                  const isApprovedAndLocked = doc.isLocked && doc.status === 'APPROVED';
                  const hasSupervisorSig = !!doc.supervisorApproval;
                  const hasCoordinatorStamp = !!doc.coordinatorApproval;

                  return (
                    <div key={doc._id || doc.id} className="p-4 bg-white border border-gray-200 rounded-lg space-y-3">
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                        <div>
                          <div className="text-xs font-bold text-gray-900">{doc.title}</div>
                          <div className="text-[11px] text-gray-500">Category: {doc.type} (v{doc.version})</div>
                        </div>

                        <div className="flex items-center gap-2">
                          <StatusBadge status={doc.status} />
                          {doc.cloudinaryUrl && (
                            <a
                              href={`/api/documents/${doc._id || doc.id}/view`}
                              target="_blank"
                              rel="noreferrer"
                              className="px-2.5 py-1 text-xs border border-gray-300 rounded bg-gray-50 hover:bg-gray-100 text-blue-700 font-semibold"
                            >
                              View / Download
                            </a>
                          )}
                          {(hasSupervisorSig || hasCoordinatorStamp) && (
                            <a
                              href={`/api/documents/${doc._id || doc.id}/view?format=certificate`}
                              target="_blank"
                              rel="noreferrer"
                              className="px-2.5 py-1 text-xs border border-emerald-200 rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-semibold"
                            >
                              Signed PDF
                            </a>
                          )}
                        </div>
                      </div>

                      {/* Display Signatures */}
                      {hasSupervisorSig && (
                        <SignaturePreview
                          signatureUrl={doc.supervisorApproval.signatureUrl}
                          signedBy={doc.supervisorApproval.approvedByName}
                          signedAt={doc.supervisorApproval.approvedAt}
                          roleTitle="Faculty Supervisor Digital Endorsement"
                        />
                      )}

                      {hasCoordinatorStamp && (
                        <SignaturePreview
                          signatureUrl={doc.coordinatorApproval.signatureUrl}
                          stampUrl={doc.coordinatorApproval.stampUrl}
                          signedBy={doc.coordinatorApproval.approvedByName}
                          signedAt={doc.coordinatorApproval.approvedAt}
                          roleTitle="Batch Coordinator Official Departmental Seal"
                        />
                      )}

                      {/* Apply Coordinator Signature + Stamp Button */}
                      {!hasCoordinatorStamp && (
                        <div className="pt-2 flex justify-end">
                          <button
                            type="button"
                            onClick={() => handleSignAndStampDocument(doc._id || doc.id)}
                            disabled={signingDocId === (doc._id || doc.id)}
                            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-700 text-white rounded-lg text-xs font-bold hover:bg-blue-800 disabled:opacity-50 shadow-2xs"
                          >
                            <Stamp className="w-3.5 h-3.5" />
                            <span>
                              {signingDocId === (doc._id || doc.id)
                                ? 'Applying Signature & Seal...'
                                : 'Sign & Apply Department Stamp'}
                            </span>
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Coordinator Academic Decision Form */}
            <form onSubmit={handleProposalDecision} className="border-t pt-4 border-gray-200 space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-700">
                Coordinator Academic Endorsement
              </h4>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Decision</label>
                <select
                  value={decision}
                  onChange={(e) => setDecision(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500"
                >
                  <option value="APPROVE">Officially Approve Proposal</option>
                  <option value="REQUEST_CHANGES">Request Technical Modifications</option>
                  <option value="REJECT">Reject Proposal</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Coordinator Directives / Feedback
                </label>
                <textarea
                  rows={2}
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="Enter academic review notes..."
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setReviewModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 text-xs font-bold bg-blue-700 text-white rounded-lg hover:bg-blue-800 disabled:opacity-50"
                >
                  {loading ? 'Submitting...' : 'Save Coordinator Decision'}
                </button>
              </div>
            </form>
          </div>
        )}
      </Modal>
    </div>
  );
}
