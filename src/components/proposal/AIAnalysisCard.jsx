import React from 'react';
import { Sparkles, AlertTriangle, CheckCircle, Info, RefreshCw } from 'lucide-react';

export default function AIAnalysisCard({ analysis, loading, onRecheck }) {
  if (loading) {
    return (
      <div className="p-6 bg-blue-50/50 border border-blue-200 rounded-xl text-center">
        <Sparkles className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-3" />
        <h4 className="text-base font-semibold text-blue-900">
          Running Gemini Academic Novelty & Originality Analysis...
        </h4>
        <p className="text-sm text-blue-700 mt-1 max-w-md mx-auto">
          Comparing problem formulation, methodology, and feature vectors against archived university FYP projects.
        </p>
      </div>
    );
  }

  if (!analysis) return null;

  const {
    similarityScore = 0,
    riskLevel = 'LOW',
    similarProjects = [],
    matchingAreas = [],
    reasoning = '',
    improvementSuggestions = [],
  } = analysis;

  const isHighRisk = riskLevel === 'HIGH' || similarityScore >= 70;
  const isMedRisk = riskLevel === 'MEDIUM' || (similarityScore >= 40 && similarityScore < 70);

  return (
    <div
      className={`p-6 rounded-xl border ${
        isHighRisk
          ? 'bg-rose-50/60 border-rose-200'
          : isMedRisk
          ? 'bg-amber-50/60 border-amber-200'
          : 'bg-emerald-50/60 border-emerald-200'
      } shadow-xs space-y-4`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4 border-gray-200/60">
        <div className="flex items-center gap-3">
          <div
            className={`p-2 rounded-lg ${
              isHighRisk ? 'bg-rose-100 text-rose-700' : isMedRisk ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
            }`}
          >
            {isHighRisk ? (
              <AlertTriangle className="w-6 h-6" />
            ) : isMedRisk ? (
              <Info className="w-6 h-6" />
            ) : (
              <CheckCircle className="w-6 h-6" />
            )}
          </div>
          <div>
            <h4 className="text-base font-bold text-gray-900 flex items-center gap-2">
              Gemini AI Proposal Originality Analysis
              <span className="text-xs font-normal px-2 py-0.5 rounded bg-white/80 border border-gray-300 font-mono">
                {similarityScore}% Similarity
              </span>
            </h4>
            <p className="text-xs text-gray-600">
              Risk Level: <strong className="uppercase">{riskLevel}</strong> | Compared against departmental FYP archives
            </p>
          </div>
        </div>

        {onRecheck && (
          <button
            type="button"
            onClick={onRecheck}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 shadow-2xs"
          >
            <RefreshCw className="w-3.5 h-3.5 text-gray-500" />
            Re-evaluate Draft
          </button>
        )}
      </div>

      {/* AI is not final authority banner */}
      <div className="text-xs text-gray-600 bg-white/80 p-3 rounded-lg border border-gray-200 flex items-start gap-2">
        <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
        <div>
          <strong>Department Academic Policy:</strong> AI originality scores provide advisory novelty guidance.
          The assigned faculty Supervisor and batch Coordinator retain final academic approval authority.
        </div>
      </div>

      {/* High similarity warning */}
      {isHighRisk && (
        <div className="p-3 bg-rose-100 border border-rose-300 rounded-lg text-sm text-rose-900 font-medium">
          This proposal exhibits significant overlap with a previously completed FYP. Please review the suggested
          differentiations below to avoid rejection by the department committee.
        </div>
      )}

      {/* Academic Reasoning */}
      {reasoning && (
        <div className="bg-white p-4 rounded-lg border border-gray-200 text-sm">
          <div className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">Evaluation Rationale</div>
          <p className="text-gray-800 leading-relaxed">{reasoning}</p>
        </div>
      )}

      {/* Similar Archive Projects & Overlap Areas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {similarProjects.length > 0 && (
          <div className="bg-white p-3.5 rounded-lg border border-gray-200 text-xs">
            <div className="font-bold text-gray-700 mb-1.5">Matching Archived FYPs:</div>
            <ul className="list-disc pl-4 space-y-1 text-gray-800">
              {similarProjects.map((title, idx) => (
                <li key={idx} className="font-medium text-slate-800">
                  {title}
                </li>
              ))}
            </ul>
          </div>
        )}

        {matchingAreas.length > 0 && (
          <div className="bg-white p-3.5 rounded-lg border border-gray-200 text-xs">
            <div className="font-bold text-gray-700 mb-1.5">Identified Overlap Areas:</div>
            <ul className="list-disc pl-4 space-y-1 text-gray-800">
              {matchingAreas.map((area, idx) => (
                <li key={idx}>{area}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Actionable Improvement Suggestions */}
      {improvementSuggestions.length > 0 && (
        <div className="bg-white p-4 rounded-lg border border-gray-200 text-sm">
          <div className="text-xs font-bold uppercase tracking-wider text-blue-700 mb-2 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" />
            Recommended Novelty Enhancements & Differentiators
          </div>
          <ul className="space-y-1.5 text-xs text-gray-800">
            {improvementSuggestions.map((sug, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="font-bold text-blue-600 shrink-0">{idx + 1}.</span>
                <span>{sug}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
