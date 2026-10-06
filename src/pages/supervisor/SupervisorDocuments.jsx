import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import api from '../../api/client.js';
import StatusBadge from '../../components/common/StatusBadge.jsx';
import SignaturePreview from '../../components/common/SignaturePreview.jsx';
import {
  FileText,
  FileSignature,
  CheckCircle2,
  AlertCircle,
  GitBranch,
  Globe,
  Lock,
} from 'lucide-react';

export default function SupervisorDocuments() {
  const { user } = useAuth();
  const [teams, setTeams] = useState([]);
  const [selectedTeamId, setSelectedTeamId] = useState('');
  const [documents, setDocuments] = useState([]);
  const [signingDocId, setSigningDocId] = useState(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const fetchTeams = async () => {
    try {
      const res = await api.get('/supervisor/teams');
      if (res.success && res.teams.length > 0) {
        setTeams(res.teams);
        setSelectedTeamId(res.teams[0]._id || res.teams[0].id);
      }
    } catch (err) {
      console.warn('Fetch teams error:', err.message);
    }
  };

  const fetchDocs = async (tId) => {
    if (!tId) return;
    try {
      const res = await api.get(`/teams/${tId}/documents`);
      if (res.success) {
        setDocuments(res.documents || []);
      }
    } catch (err) {
      console.warn('Fetch docs error:', err.message);
    }
  };

  useEffect(() => {
    fetchTeams();
  }, []);

  useEffect(() => {
    if (selectedTeamId) {
      fetchDocs(selectedTeamId);
    }
  }, [selectedTeamId]);

  const handleSignDocument = async (docId) => {
    if (!user?.signatureUrl) {
      setError('Please upload your digital signature in your profile first before signing documents.');
      return;
    }

    try {
      setSigningDocId(docId);
      setError('');
      setMessage('');

      const res = await api.post(`/supervisor/documents/${docId}/sign`, {
        comments: 'Academically verified and approved by faculty supervisor.',
      });

      if (res.success) {
        setMessage(res.message);
        await fetchDocs(selectedTeamId);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSigningDocId(null);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto py-2">
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <FileSignature className="w-5 h-5 text-blue-700" />
            Deliverables Review & Digital Signature Endorsement
          </h2>
          <p className="text-xs text-gray-600 mt-0.5">
            Review submitted proposal documents, repository code, and final thesis manuscripts.
          </p>
        </div>

        {teams.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-gray-600">Select Team:</span>
            <select
              value={selectedTeamId}
              onChange={(e) => setSelectedTeamId(e.target.value)}
              className="px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-xs font-bold text-gray-900 focus:ring-2 focus:ring-blue-500"
            >
              {teams.map((t) => (
                <option key={t._id || t.id} value={t._id || t.id}>
                  {t.teamCode} — {t.projectTitle || 'Team'}
                </option>
              ))}
            </select>
          </div>
        )}
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

      {documents.length === 0 ? (
        <div className="bg-white p-12 rounded-xl border border-gray-200 text-center text-sm text-gray-500 shadow-xs">
          No deliverables submitted by this team yet.
        </div>
      ) : (
        <div className="space-y-4">
          {documents.map((doc) => {
            const hasSupervisorSig = !!doc.supervisorApproval;
            const hasCoordinatorStamp = !!doc.coordinatorApproval;

            return (
              <div key={doc._id || doc.id} className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-base font-bold text-gray-900">{doc.title}</h4>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                        {doc.type} (Sem {doc.semesterNumber})
                      </span>
                      {doc.isLocked && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase bg-slate-200 text-slate-800 px-2 py-0.5 rounded">
                          <Lock className="w-3 h-3" /> Locked
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      Uploaded by {doc.uploadedByName} on {new Date(doc.createdAt).toLocaleDateString()}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <StatusBadge status={doc.status} />

                    {doc.repoUrl && (
                      <a
                        href={doc.repoUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-1.5 text-xs font-semibold bg-white border border-gray-300 rounded-lg text-blue-700 hover:bg-gray-50 inline-flex items-center gap-1"
                      >
                        <GitBranch className="w-3.5 h-3.5" /> Repository
                      </a>
                    )}

                    {doc.liveUrl && (
                      <a
                        href={doc.liveUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-1.5 text-xs font-semibold bg-white border border-gray-300 rounded-lg text-emerald-700 hover:bg-gray-50 inline-flex items-center gap-1"
                      >
                        <Globe className="w-3.5 h-3.5" /> Live Demo
                      </a>
                    )}

                    {doc.cloudinaryUrl && (
                      <a
                        href={`/api/documents/${doc._id || doc.id}/view`}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-1.5 text-xs font-semibold bg-white border border-gray-300 rounded-lg text-blue-700 hover:bg-gray-50 inline-flex items-center gap-1"
                      >
                        <FileText className="w-3.5 h-3.5" /> View File
                      </a>
                    )}

                    {(hasSupervisorSig || hasCoordinatorStamp) && (
                      <a
                        href={`/api/documents/${doc._id || doc.id}/view?format=certificate`}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-1.5 text-xs font-semibold bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 hover:bg-emerald-100 inline-flex items-center gap-1"
                      >
                        <FileSignature className="w-3.5 h-3.5" /> Signed PDF
                      </a>
                    )}

                    {!hasSupervisorSig && (
                      <button
                        onClick={() => handleSignDocument(doc._id || doc.id)}
                        disabled={signingDocId === (doc._id || doc.id)}
                        className="px-3.5 py-1.5 bg-blue-700 text-white rounded-lg text-xs font-bold hover:bg-blue-800 disabled:opacity-50 inline-flex items-center gap-1.5 shadow-2xs"
                      >
                        <FileSignature className="w-3.5 h-3.5" />
                        <span>{signingDocId === (doc._id || doc.id) ? 'Signing...' : 'Sign Document'}</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Display Existing Signatures */}
                <div className="space-y-3 pt-3 border-t border-gray-100">
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
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
