import React, { useState, useEffect } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import api from '../../api/client.js';
import StatusBadge from '../../components/common/StatusBadge.jsx';
import SignaturePreview from '../../components/common/SignaturePreview.jsx';
import Modal from '../../components/common/Modal.jsx';
import {
  FileText,
  Upload,
  CheckCircle2,
  Clock,
  Award,
  AlertCircle,
  FileCheck,
  Lock,
} from 'lucide-react';

export default function StudentSemester7() {
  const { studentData, refreshStudentStatus } = useOutletContext();
  const navigate = useNavigate();
  const [documents, setDocuments] = useState([]);
  const [presentations, setPresentations] = useState([]);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [fileBase64, setFileBase64] = useState('');
  const [fileName, setFileName] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

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

  const fetchDocsAndPresentations = async () => {
    if (!teamId || !hasSupervisor) return;
    try {
      const docRes = await api.get(`/teams/${teamId}/documents`);
      if (docRes.success) {
        setDocuments(docRes.documents.filter((d) => d.semesterNumber === 7) || []);
      }
      const presRes = await api.get(`/teams/${teamId}/presentations`);
      if (presRes.success) {
        setPresentations(presRes.presentations.filter((p) => p.semesterNumber === 7) || []);
      }
    } catch (err) {
      console.warn('Semester 7 fetch error:', err.message);
    }
  };

  useEffect(() => {
    fetchDocsAndPresentations();
  }, [teamId, hasSupervisor]);

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => setFileBase64(reader.result);
    reader.readAsDataURL(file);
  };

  const [replaceConfirmOpen, setReplaceConfirmOpen] = useState(false);

  const executeUpload = async (confirmReplace = false) => {
    try {
      setUploading(true);
      setError('');
      setSuccess('');

      const res = await api.post('/student/documents/upload', {
        type: 'PROPOSAL',
        title,
        semesterNumber: 7,
        fileBase64,
        fileName,
        confirmReplace,
      });

      if (res.success) {
        setSuccess(res.message);
        setUploadModalOpen(false);
        setReplaceConfirmOpen(false);
        setTitle('');
        setFileBase64('');
        setFileName('');
        await fetchDocsAndPresentations();
        await refreshStudentStatus();
      }
    } catch (err) {
      setError(err.message);
      setReplaceConfirmOpen(false);
    } finally {
      setUploading(false);
    }
  };

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!title || !fileBase64) {
      setError('Document title and file are required.');
      return;
    }

    const existingLocked = documents.find((d) => d.type === 'PROPOSAL' && d.isLocked);
    if (existingLocked) {
      setReplaceConfirmOpen(true);
      return;
    }

    await executeUpload(false);
  };

  const isSemesterLocked =
    studentData?.phases?.semester7?.status === 'LOCKED' || studentData?.team?.semesterNumber === 8;

  return (
    <div className="space-y-6 max-w-5xl mx-auto py-2">
      {/* Header */}
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-700 bg-blue-50 px-3 py-1 rounded-full border border-blue-200">
              Semester 7 — Phase 1
            </span>
            {isSemesterLocked && (
              <span className="inline-flex items-center gap-1 text-xs font-bold bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded border border-slate-300">
                <Lock className="w-3.5 h-3.5" /> LOCKED & PASSED
              </span>
            )}
          </div>
          <h2 className="text-xl font-bold text-gray-900 mt-2">
            Proposal Document & Defense Presentation Session
          </h2>
          <p className="text-xs text-gray-600 mt-0.5">
            Submit formal proposal document for digital signature by Supervisor and official departmental stamping by Coordinator.
          </p>
        </div>

        {!isSemesterLocked && (
          <button
            onClick={() => setUploadModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-700 text-white rounded-lg text-xs font-bold hover:bg-blue-800 transition-colors shadow-2xs"
          >
            <Upload className="w-4 h-4" />
            <span>Upload Proposal Document</span>
          </button>
        )}
      </div>

      {success && (
        <div className="p-3.5 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-start gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          <span>{success}</span>
        </div>
      )}

      {/* Official Approved Documents Section (Rule #33, #34, #36) */}
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-xs space-y-4">
        <div className="border-b border-gray-200 pb-3">
          <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
            <FileCheck className="w-5 h-5 text-blue-700" />
            Official Semester 7 Documents & Digital Signatures
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Official evidence documents are locked after supervisor signature and coordinator stamping.
          </p>
        </div>

        {documents.length === 0 ? (
          <div className="text-center py-10 text-sm text-gray-500">
            No proposal documents uploaded yet for Semester 7. Click "Upload Proposal Document" above.
          </div>
        ) : (
          <div className="space-y-4">
            {documents.map((doc) => {
              const hasSupervisorSig = !!doc.supervisorApproval;
              const hasCoordinatorStamp = !!doc.coordinatorApproval;

              return (
                <div key={doc._id || doc.id} className="p-5 rounded-xl border border-gray-200 bg-gray-50/50 space-y-4">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-gray-900">{doc.title}</h4>
                        <span className="text-xs font-mono text-gray-500">v{doc.version}</span>
                        {doc.isLocked && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase bg-slate-200 text-slate-800 px-2 py-0.5 rounded">
                            <Lock className="w-3 h-3" /> Locked Evidence
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        Uploaded by {doc.uploadedByName} on {new Date(doc.createdAt).toLocaleDateString()}
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <StatusBadge status={doc.status} />
                      {doc.cloudinaryUrl && (
                        <a
                          href={`/api/documents/${doc._id || doc.id}/view`}
                          target="_blank"
                          rel="noreferrer"
                          className="px-3 py-1.5 text-xs font-semibold bg-white border border-gray-300 rounded-lg text-blue-700 hover:bg-gray-50"
                        >
                          View / Download Document
                        </a>
                      )}
                      {(hasSupervisorSig || hasCoordinatorStamp) && (
                        <a
                          href={`/api/documents/${doc._id || doc.id}/view?format=certificate`}
                          target="_blank"
                          rel="noreferrer"
                          className="px-3 py-1.5 text-xs font-semibold bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 hover:bg-emerald-100"
                        >
                          View Signed & Stamped PDF
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Signatures & Stamps Container */}
                  <div className="space-y-3 pt-3 border-t border-gray-200">
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
                        roleTitle="Batch Coordinator Official Departmental Verification & Seal"
                      />
                    )}

                    {!hasSupervisorSig && (
                      <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 flex items-center gap-2">
                        <Clock className="w-4 h-4 text-amber-600" />
                        <span>Awaiting digital signature review from assigned faculty Supervisor.</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Defense Presentation & Examiner Evaluation (Rule #37, #38) */}
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-xs space-y-4">
        <div className="border-b border-gray-200 pb-3">
          <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
            <Award className="w-5 h-5 text-blue-700" />
            Semester 7 Defense Defense & Examiner Grading
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Evaluated by departmental Examiner committee. PASS result advances the team to Semester 8.
          </p>
        </div>

        {presentations.length === 0 ? (
          <div className="text-center py-8 text-sm text-gray-500">
            Defense presentation session has not been scheduled yet by Coordinator.
          </div>
        ) : (
          <div className="space-y-3">
            {presentations.map((p) => (
              <div key={p._id || p.id} className="p-4 rounded-xl border border-gray-200 bg-white space-y-2">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                  <div>
                    <h4 className="text-sm font-bold text-gray-900">{p.title}</h4>
                    <div className="text-xs text-gray-600 mt-0.5">
                      Examiner: <strong>{p.examinerName || 'Departmental Examiner'}</strong>
                      {p.scheduledDate && ` | Date: ${new Date(p.scheduledDate).toLocaleDateString()}`}
                    </div>
                  </div>

                  <StatusBadge status={p.result} />
                </div>

                {p.result !== 'PENDING' && (
                  <div className="p-3 bg-gray-50 rounded-lg text-xs space-y-1 border border-gray-200 mt-2">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Marks Awarded:</span>
                      <span className="font-bold text-gray-900">{p.marks} / 100</span>
                    </div>
                    {p.comments && (
                      <div className="pt-1 border-t border-gray-200">
                        <span className="text-gray-500">Examiner Comments:</span>
                        <p className="text-gray-800 mt-0.5 font-medium">{p.comments}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Upload Document Modal */}
      <Modal isOpen={uploadModalOpen} onClose={() => setUploadModalOpen(false)} title="Upload Semester 7 Proposal Document">
        <form onSubmit={handleUploadSubmit} className="space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700">
              Document Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              placeholder="e.g. Formal FYP Semester 7 Project Proposal Document"
              className="mt-1 w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700">
              Proposal Document File (PDF / DOCX) *
            </label>
            <input
              type="file"
              accept=".pdf,.doc,.docx"
              onChange={handleFileUpload}
              required
              className="mt-1 w-full text-xs text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
            {fileName && <span className="text-xs text-blue-600 font-medium block mt-1">Selected: {fileName}</span>}
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={() => setUploadModalOpen(false)}
              className="px-4 py-2 text-xs font-medium border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={uploading}
              className="px-4 py-2 text-xs font-bold bg-blue-700 text-white rounded-lg hover:bg-blue-800 disabled:opacity-50"
            >
              {uploading ? 'Uploading to Cloudinary...' : 'Upload Document'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Locked Document Replacement Confirmation Modal (Rule #36) */}
      <Modal
        isOpen={replaceConfirmOpen}
        onClose={() => setReplaceConfirmOpen(false)}
        title="Confirm Locked Document Replacement"
      >
        <div className="space-y-4">
          <div className="p-3.5 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900">
            <strong>Warning:</strong> Your current Semester 7 Proposal document is officially approved and locked with faculty digital signatures and coordinator stamps. Replacing it will reset approval status and require fresh verification.
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-gray-200">
            <button
              type="button"
              onClick={() => setReplaceConfirmOpen(false)}
              className="px-4 py-2 text-xs font-medium border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={uploading}
              onClick={() => executeUpload(true)}
              className="px-4 py-2 text-xs font-bold bg-rose-700 text-white rounded-lg hover:bg-rose-800 disabled:opacity-50"
            >
              {uploading ? 'Replacing...' : 'Confirm & Replace Locked Document'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
