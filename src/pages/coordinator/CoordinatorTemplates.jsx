import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import api from '../../api/client.js';
import Modal from '../../components/common/Modal.jsx';
import {
  FileText,
  Upload,
  CheckCircle2,
  AlertCircle,
  Download,
  Eye,
  Trash2,
  FolderOpen,
} from 'lucide-react';

const PHASE_CATEGORIES = [
  { value: 'PROPOSAL', label: 'Phase 0 — Project Proposal & Initial Synopsis', semester: 7 },
  { value: 'SEMESTER_7', label: 'Semester 7 (Phase 1) — SRS, Design & Defense Slides', semester: 7 },
  { value: 'SEMESTER_8', label: 'Semester 8 (Phase 2) — Final Thesis, Manual & Slides', semester: 8 },
  { value: 'GENERAL', label: 'General FYP Guidelines, Rubrics & Formatting Rules', semester: 7 },
];

export default function CoordinatorTemplates() {
  const { activeAssignment } = useAuth();
  const batchId = activeAssignment?.batchId || 'ALL';

  const [templates, setTemplates] = useState([]);
  const [filterPhase, setFilterPhase] = useState('ALL');
  const [modalOpen, setModalOpen] = useState(false);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [phaseCategory, setPhaseCategory] = useState('PROPOSAL');
  const [fileBase64, setFileBase64] = useState('');
  const [fileName, setFileName] = useState('');
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  const fetchTemplates = async () => {
    try {
      const res = await api.get(`/templates?batchId=${batchId}`);
      if (res.success) {
        setTemplates(res.templates || []);
      }
    } catch (err) {
      console.warn('Fetch templates error:', err.message);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, [batchId]);

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => setFileBase64(reader.result);
    reader.readAsDataURL(file);
  };

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !fileBase64 || !fileName) {
      setError('Template title and document file are required.');
      return;
    }

    try {
      setUploading(true);
      setError('');
      setMessage('');

      const selectedPhaseObj = PHASE_CATEGORIES.find((p) => p.value === phaseCategory);

      const res = await api.post('/templates', {
        batchId,
        title,
        description,
        phaseCategory,
        semesterNumber: selectedPhaseObj?.semester || 7,
        fileBase64,
        fileName,
      });

      if (res.success) {
        setMessage(res.message);
        setModalOpen(false);
        setTitle('');
        setDescription('');
        setFileBase64('');
        setFileName('');
        await fetchTemplates();
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteTemplate = async (templateId) => {
    try {
      setConfirmDeleteId(null);
      setError('');
      setMessage('');
      const res = await api.delete(`/templates/${templateId}`);
      if (res.success) {
        setMessage('Template removed.');
        await fetchTemplates();
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const filteredTemplates =
    filterPhase === 'ALL'
      ? templates
      : templates.filter((t) => t.phaseCategory === filterPhase);

  const getPhaseBadge = (cat) => {
    switch (cat) {
      case 'PROPOSAL':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'SEMESTER_7':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case 'SEMESTER_8':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-300';
    }
  };

  const getPhaseLabel = (cat) => {
    const found = PHASE_CATEGORIES.find((p) => p.value === cat);
    return found ? found.label : cat;
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto py-2">
      {/* Header */}
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-blue-700 bg-blue-50 px-3 py-1 rounded-full border border-blue-200">
            Official Academic Templates
          </span>
          <h2 className="text-xl font-bold text-gray-900 mt-2 flex items-center gap-2">
            <FolderOpen className="w-5 h-5 text-blue-700" />
            Phase Templates & Document Formats
          </h2>
          <p className="text-xs text-gray-600 mt-0.5">
            Upload official Word (.docx), PDF, or presentation templates for Proposal, Semester 7 (Phase 1), and Semester 8 (Phase 2).
          </p>
        </div>

        <button
          onClick={() => setModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-700 text-white rounded-lg text-xs font-bold hover:bg-blue-800 transition-colors shadow-2xs shrink-0"
        >
          <Upload className="w-4 h-4" />
          <span>Upload Phase Template</span>
        </button>
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

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs flex flex-wrap items-center gap-2">
        {[
          { key: 'ALL', label: 'All Phases' },
          { key: 'PROPOSAL', label: 'Proposal Templates' },
          { key: 'SEMESTER_7', label: 'Semester 7 (Phase 1)' },
          { key: 'SEMESTER_8', label: 'Semester 8 (Phase 2)' },
          { key: 'GENERAL', label: 'Guidelines & Rubrics' },
        ].map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setFilterPhase(tab.key)}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              filterPhase === tab.key
                ? 'bg-blue-700 text-white shadow-2xs'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Templates List */}
      {filteredTemplates.length === 0 ? (
        <div className="bg-white p-12 rounded-xl border border-gray-200 text-center text-sm text-gray-500 shadow-xs">
          No templates uploaded for this category yet. Click "Upload Phase Template" above to publish official templates for students.
        </div>
      ) : (
        <div className="space-y-3">
          {filteredTemplates.map((tpl) => {
            const tplId = tpl._id || tpl.id;
            return (
              <div
                key={tplId}
                className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:border-blue-300 transition-all"
              >
                <div className="space-y-1.5 max-w-2xl">
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="text-sm font-bold text-gray-900">{tpl.title}</h4>
                    <span
                      className={`text-[10px] font-bold uppercase px-2.5 py-0.5 rounded border ${getPhaseBadge(
                        tpl.phaseCategory
                      )}`}
                    >
                      {getPhaseLabel(tpl.phaseCategory)}
                    </span>
                  </div>

                  {tpl.description && (
                    <p className="text-xs text-gray-600 leading-relaxed">{tpl.description}</p>
                  )}

                  <div className="text-[11px] text-gray-400 flex flex-wrap items-center gap-3 pt-0.5">
                    <span>File: <strong className="text-gray-600">{tpl.fileName || 'Document'}</strong></span>
                    <span>Uploaded by: {tpl.uploadedByName}</span>
                    <span>Date: {new Date(tpl.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <a
                    href={`/api/documents/${tplId}/view`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-white border border-gray-300 rounded-lg text-blue-700 hover:bg-gray-50 shadow-2xs"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>View Template</span>
                  </a>

                  <a
                    href={`/api/documents/${tplId}/raw?download=1`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-blue-700 text-white rounded-lg hover:bg-blue-800 shadow-2xs"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download</span>
                  </a>

                  {confirmDeleteId === tplId ? (
                    <div className="flex items-center gap-1 bg-rose-50 border border-rose-200 px-2 py-1 rounded-lg">
                      <button
                        type="button"
                        onClick={() => handleDeleteTemplate(tplId)}
                        className="px-2 py-0.5 text-[11px] font-bold bg-rose-600 text-white rounded hover:bg-rose-700"
                      >
                        Confirm
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(null)}
                        className="px-2 py-0.5 text-[11px] text-gray-600 hover:text-gray-900"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteId(tplId)}
                      className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg border border-transparent hover:border-rose-200 transition-colors"
                      title="Delete Template"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Upload Template Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Upload Official FYP Phase Template"
      >
        <form onSubmit={handleUploadSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700">
              Target Phase / Deliverable Category *
            </label>
            <select
              value={phaseCategory}
              onChange={(e) => setPhaseCategory(e.target.value)}
              className="mt-1 w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-xs font-medium text-gray-900 focus:ring-2 focus:ring-blue-500"
            >
              {PHASE_CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700">
              Template Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              placeholder="e.g. Official BSCS FYP Project Proposal Template (Word Format)"
              className="mt-1 w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700">
              Instructions / Formatting Notes (Optional)
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Use this standard departmental format for your Semester 7 proposal submission..."
              className="mt-1 w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700">
              Template File (.docx, .pdf, .pptx, .doc) *
            </label>
            <input
              type="file"
              accept=".pdf,.doc,.docx,.pptx,.xlsx"
              onChange={handleFileUpload}
              required
              className="mt-1 w-full text-xs text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
            {fileName && (
              <span className="text-xs text-blue-600 font-medium block mt-1">
                Selected: {fileName}
              </span>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="px-4 py-2 text-xs font-medium border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={uploading}
              className="px-4 py-2 text-xs font-bold bg-blue-700 text-white rounded-lg hover:bg-blue-800 disabled:opacity-50"
            >
              {uploading ? 'Publishing...' : 'Publish Template'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
