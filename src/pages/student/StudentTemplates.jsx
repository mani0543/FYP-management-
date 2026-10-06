import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import api from '../../api/client.js';
import {
  FileText,
  Download,
  Eye,
  FolderOpen,
  Layers,
  Sparkles,
  GitBranch,
  BookOpen,
} from 'lucide-react';

const PHASE_SECTIONS = [
  {
    key: 'PROPOSAL',
    title: 'Project Proposal & Initial Synopsis Templates',
    subtitle: 'Standard formats required before supervisor approval and proposal defense.',
    badge: 'bg-blue-50 text-blue-700 border-blue-200',
    icon: Sparkles,
  },
  {
    key: 'SEMESTER_7',
    title: 'Semester 7 (Phase 1) — SRS, Design & Defense Templates',
    subtitle: 'Deliverable templates for Software Requirements Specification (SRS), architecture diagrams, and Phase 1 presentation slides.',
    badge: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    icon: Layers,
  },
  {
    key: 'SEMESTER_8',
    title: 'Semester 8 (Phase 2) — Final Thesis, User Manual & Defense Templates',
    subtitle: 'Official manuscript templates for Final FYP Thesis report, testing documentation, and final degree defense slides.',
    badge: 'bg-purple-50 text-purple-700 border-purple-200',
    icon: GitBranch,
  },
  {
    key: 'GENERAL',
    title: 'General FYP Guidelines, Evaluation Rubrics & Formatting Rules',
    subtitle: 'Departmental policies, citation guidelines, and grading rubrics.',
    badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    icon: BookOpen,
  },
];

export default function StudentTemplates() {
  const { studentData } = useOutletContext();
  const batchId = studentData?.batch?._id || studentData?.batch?.id || '';

  const [templates, setTemplates] = useState([]);
  const [selectedTab, setSelectedTab] = useState('ALL');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        setLoading(true);
        const query = batchId ? `?batchId=${batchId}` : '';
        const res = await api.get(`/templates${query}`);
        if (res.success) {
          setTemplates(res.templates || []);
        }
      } catch (err) {
        console.warn('Fetch student templates error:', err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchTemplates();
  }, [batchId]);

  const visibleSections =
    selectedTab === 'ALL'
      ? PHASE_SECTIONS
      : PHASE_SECTIONS.filter((s) => s.key === selectedTab);

  return (
    <div className="space-y-6 max-w-5xl mx-auto py-2">
      {/* Header Banner */}
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-blue-700 bg-blue-50 px-3 py-1 rounded-full border border-blue-200">
            Departmental Resource Center
          </span>
          <h2 className="text-xl font-bold text-gray-900 mt-2 flex items-center gap-2">
            <FolderOpen className="w-5 h-5 text-blue-700" />
            Official FYP Document & Proposal Templates
          </h2>
          <p className="text-xs text-gray-600 mt-0.5">
            Download or preview official templates uploaded by your Batch Coordinator for Proposal, Semester 7 (Phase 1), and Semester 8 (Phase 2).
          </p>
        </div>
      </div>

      {/* Phase Filter Tabs */}
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
            onClick={() => setSelectedTab(tab.key)}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              selectedTab === tab.key
                ? 'bg-blue-700 text-white shadow-2xs'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="bg-white p-12 rounded-xl border border-gray-200 text-center text-sm text-gray-500 shadow-xs">
          Loading official FYP templates...
        </div>
      ) : templates.length === 0 ? (
        <div className="bg-white p-12 rounded-xl border border-gray-200 text-center text-sm text-gray-500 shadow-xs">
          No document templates have been uploaded by the Batch Coordinator yet.
        </div>
      ) : (
        <div className="space-y-6">
          {visibleSections.map((section) => {
            const sectionTemplates = templates.filter((t) => t.phaseCategory === section.key);
            if (selectedTab === 'ALL' && sectionTemplates.length === 0) return null;

            const IconComponent = section.icon;

            return (
              <div
                key={section.key}
                className="bg-white p-6 rounded-xl border border-gray-200 shadow-xs space-y-4"
              >
                <div className="border-b border-gray-200 pb-3 flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                      <IconComponent className="w-5 h-5 text-blue-700" />
                      <span>{section.title}</span>
                    </h3>
                    <p className="text-xs text-gray-500 mt-0.5">{section.subtitle}</p>
                  </div>
                  <span className={`text-xs font-bold px-2.5 py-0.5 rounded border ${section.badge}`}>
                    {sectionTemplates.length} {sectionTemplates.length === 1 ? 'Template' : 'Templates'}
                  </span>
                </div>

                {sectionTemplates.length === 0 ? (
                  <div className="text-center py-6 text-xs text-gray-500 italic">
                    No templates published under this phase yet.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {sectionTemplates.map((tpl) => {
                      const tplId = tpl._id || tpl.id;
                      return (
                        <div
                          key={tplId}
                          className="p-4 rounded-xl border border-gray-200 bg-gray-50/50 hover:bg-white hover:border-blue-300 transition-all flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
                        >
                          <div className="space-y-1 max-w-2xl">
                            <div className="flex items-center gap-2">
                              <FileText className="w-4 h-4 text-blue-700 shrink-0" />
                              <h4 className="text-sm font-bold text-gray-900">{tpl.title}</h4>
                            </div>

                            {tpl.description && (
                              <p className="text-xs text-gray-600 pl-6">{tpl.description}</p>
                            )}

                            <div className="text-[11px] text-gray-400 pl-6 flex flex-wrap items-center gap-3">
                              <span>
                                Format: <strong className="text-gray-600">{tpl.fileName || 'Document'}</strong>
                              </span>
                              <span>Uploaded by: {tpl.uploadedByName}</span>
                              <span>Published: {new Date(tpl.createdAt).toLocaleDateString()}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0 pl-6 sm:pl-0">
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
                              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold bg-blue-700 text-white rounded-lg hover:bg-blue-800 shadow-2xs"
                            >
                              <Download className="w-3.5 h-3.5" />
                              <span>Download Template</span>
                            </a>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
