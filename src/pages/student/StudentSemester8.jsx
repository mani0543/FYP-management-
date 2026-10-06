import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import api from '../../api/client.js';
import StatusBadge from '../../components/common/StatusBadge.jsx';
import SignaturePreview from '../../components/common/SignaturePreview.jsx';
import Modal from '../../components/common/Modal.jsx';
import {
  GitBranch,
  Upload,
  CheckCircle2,
  Lock,
  Globe,
  FileCheck,
  FileText,
  Clock,
  Layers,
} from 'lucide-react';

export default function StudentSemester8() {
  const { studentData, refreshStudentStatus } = useOutletContext();
  const [documents, setDocuments] = useState([]);
  const [presentations, setPresentations] = useState([]);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [replaceConfirmOpen, setReplaceConfirmOpen] = useState(false);
  const [type, setType] = useState('CODE_REPO'); // 'CODE_REPO' | 'THESIS' | 'PRESENTATION_S8'
  const [title, setTitle] = useState('');
  const [repoUrl, setRepoUrl] = useState('');
  const [liveUrl, setLiveUrl] = useState('');
  const [fileBase64, setFileBase64] = useState('');
  const [fileName, setFileName] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const teamId = studentData?.team?._id || studentData?.team?.id;

  const fetchDocs = async () => {
    if (!teamId) return;
    try {
      const docRes = await api.get(`/teams/${teamId}/documents`);
      if (docRes.success) {
        setDocuments(docRes.documents.filter((d) => d.semesterNumber === 8) || []);
      }
      const presRes = await api.get(`/teams/${teamId}/presentations`);
      if (presRes.success) {
        setPresentations(presRes.presentations.filter((p) => p.semesterNumber === 8) || []);
      }
    } catch (err) {
      console.warn('Semester 8 fetch error:', err.message);
    }
  };

  useEffect(() => {
    fetchDocs();
  }, [teamId]);

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => setFileBase64(reader.result);
    reader.readAsDataURL(file);
  };

  const executeUpload = async (confirmReplace = false) => {
    try {
      setUploading(true);
      setError('');
      setSuccess('');

      const res = await api.post('/student/documents/upload', {
        type,
        title,
        semesterNumber: 8,
        repoUrl,
        liveUrl,
        fileBase64,
        fileName,
        confirmReplace,
      });

      if (res.success) {
        setSuccess(res.message);
        setUploadModalOpen(false);
        setReplaceConfirmOpen(false);
        setTitle('');
        setRepoUrl('');
        setLiveUrl('');
        setFileBase64('');
        setFileName('');
        await fetchDocs();
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
    if (!title) {
      setError('Document / Repository title is required.');
      return;
    }

    const existingLocked = documents.find((d) => d.type === type && d.isLocked);
    if (existingLocked) {
      setReplaceConfirmOpen(true);
      return;
    }

    await executeUpload(false);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto py-2">
      {/* Header */}
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-200">
            Semester 8 — Final Implementation & Thesis
          </span>
          <h2 className="text-xl font-bold text-gray-900 mt-2">
            Code Repository, Thesis & Final Defense
          </h2>
          <p className="text-xs text-gray-600 mt-0.5">
            Submit your complete source code repository, deployment endpoints, and final thesis document for degree completion.
          </p>
        </div>

        <button
          onClick={() => setUploadModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-700 text-white rounded-lg text-xs font-bold hover:bg-blue-800 transition-colors shadow-2xs"
        >
          <Upload className="w-4 h-4" />
          <span>Submit Code / Thesis Artifact</span>
        </button>
      </div>

      {success && (
        <div className="p-3.5 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-start gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          <span>{success}</span>
        </div>
      )}

      {/* Submitted Semester 8 Documents */}
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-xs space-y-4">
        <div className="border-b border-gray-200 pb-3">
          <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
            <FileCheck className="w-5 h-5 text-blue-700" />
            Submitted Deliverables & Verification
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Artifacts reviewed by the active Semester 8 Supervisor and Coordinator.
          </p>
        </div>

        {documents.length === 0 ? (
          <div className="text-center py-10 text-sm text-gray-500">
            No Semester 8 deliverables submitted yet. Use the submit button above to register your GitHub repository or upload thesis.
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
                        <span className="text-xs font-semibold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                          {doc.type}
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

                    <div className="flex items-center gap-3">
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
                          <FileText className="w-3.5 h-3.5" /> View Document
                        </a>
                      )}
                      {(hasSupervisorSig || hasCoordinatorStamp) && (
                        <a
                          href={`/api/documents/${doc._id || doc.id}/view?format=certificate`}
                          target="_blank"
                          rel="noreferrer"
                          className="px-3 py-1.5 text-xs font-semibold bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 hover:bg-emerald-100 inline-flex items-center gap-1"
                        >
                          <FileCheck className="w-3.5 h-3.5" /> Signed PDF
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Signatures & Stamps */}
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
                        roleTitle="Semester 8 Coordinator Official Institutional Seal"
                      />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Upload Deliverable Modal */}
      <Modal isOpen={uploadModalOpen} onClose={() => setUploadModalOpen(false)} title="Submit Semester 8 Deliverable">
        <form onSubmit={handleUploadSubmit} className="space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700">
              Deliverable Category *
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="mt-1 w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500"
            >
              <option value="CODE_REPO">Source Code Repository (GitHub / GitLab)</option>
              <option value="THESIS">Complete Final Thesis Document (PDF)</option>
              <option value="PRESENTATION_S8">Final Defense Presentation Slides (PDF / PPTX)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700">
              Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              placeholder="e.g. Production Codebase v1.0 or Final FYP Thesis Document"
              className="mt-1 w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {type === 'CODE_REPO' ? (
            <>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700">
                  Git Repository URL *
                </label>
                <input
                  type="url"
                  value={repoUrl}
                  onChange={(e) => setRepoUrl(e.target.value)}
                  required
                  placeholder="https://github.com/organization/fyp-project"
                  className="mt-1 w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700">
                  Live Deployment / Prototype URL (Optional)
                </label>
                <input
                  type="url"
                  value={liveUrl}
                  onChange={(e) => setLiveUrl(e.target.value)}
                  placeholder="https://my-fyp-app.cloudrun.app"
                  className="mt-1 w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </>
          ) : (
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-700">
                Document File (PDF) *
              </label>
              <input
                type="file"
                accept=".pdf,.doc,.docx,.pptx"
                onChange={handleFileUpload}
                required
                className="mt-1 w-full text-xs text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
              {fileName && <span className="text-xs text-blue-600 font-medium block mt-1">Selected: {fileName}</span>}
            </div>
          )}

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
              {uploading ? 'Submitting...' : 'Submit Deliverable'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Semester 8 Final Defense Presentations */}
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-xs space-y-4">
        <div className="border-b border-gray-200 pb-3">
          <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
            <Layers className="w-5 h-5 text-indigo-700" />
            Semester 8 Final Defense & Evaluation
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Final degree defense evaluation by the departmental Examiner panel.
          </p>
        </div>

        {presentations.length === 0 ? (
          <div className="text-center py-8 text-sm text-gray-500">
            Final Semester 8 defense session has not been scheduled yet by the Semester 8 Coordinator.
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

      {/* Locked Deliverable Replacement Confirmation Modal */}
      <Modal
        isOpen={replaceConfirmOpen}
        onClose={() => setReplaceConfirmOpen(false)}
        title="Confirm Locked Deliverable Replacement"
      >
        <div className="space-y-4">
          <div className="p-3.5 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900">
            <strong>Warning:</strong> Your current deliverable is officially approved and locked with supervisor digital signature and coordinator stamp. Replacing it will reset approval status and require re-verification.
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
              {uploading ? 'Replacing...' : 'Confirm & Replace Deliverable'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
