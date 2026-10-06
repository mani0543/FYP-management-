import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import api from '../../api/client.js';
import DataTable from '../../components/common/DataTable.jsx';
import StatusBadge from '../../components/common/StatusBadge.jsx';
import Modal from '../../components/common/Modal.jsx';
import { Award, CheckCircle2, AlertCircle, Eye, Lock, FileText, Sparkles } from 'lucide-react';

export default function ExaminerDashboard() {
  const { user } = useAuth();
  const [presentations, setPresentations] = useState([]);
  const [selectedPres, setSelectedPres] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [marks, setMarks] = useState(85);
  const [result, setResult] = useState('PASS');
  const [comments, setComments] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const fetchPresentations = async () => {
    try {
      const res = await api.get('/examiner/presentations');
      if (res.success) {
        setPresentations(res.presentations || []);
      }
    } catch (err) {
      console.warn('Fetch examiner presentations error:', err.message);
    }
  };

  useEffect(() => {
    fetchPresentations();
  }, []);

  const handleOpenGrading = (p) => {
    setSelectedPres(p);
    setMarks(p.marks !== undefined ? p.marks : 85);
    setResult(p.result === 'PENDING' ? 'PASS' : p.result);
    setComments(p.comments || '');
    setModalOpen(true);
  };

  const handleGradeSubmit = async (e) => {
    e.preventDefault();
    if (!selectedPres) return;

    try {
      setLoading(true);
      setError('');
      setMessage('');

      const presId = selectedPres._id || selectedPres.id;
      const res = await api.post(`/examiner/presentations/${presId}/grade`, {
        marks: Number(marks),
        result,
        comments,
      });

      if (res.success) {
        setMessage(res.message);
        setModalOpen(false);
        await fetchPresentations();
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    {
      header: 'Team Code',
      accessor: 'teamCode',
      className: 'font-mono font-bold text-gray-900',
    },
    {
      header: 'Defense Session Title',
      accessor: 'title',
      className: 'font-semibold text-gray-900',
    },
    {
      header: 'Phase',
      render: (p) => (
        <span className="font-semibold text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-700">
          Semester {p.semesterNumber} Defense
        </span>
      ),
    },
    {
      header: 'Defense Result',
      render: (p) => <StatusBadge status={p.result} />,
    },
    {
      header: 'Score',
      render: (p) => (
        <span className="font-mono text-xs font-bold text-gray-900">
          {p.marks !== undefined ? `${p.marks} / 100` : 'Ungraded'}
        </span>
      ),
    },
    {
      header: 'Grading Action',
      render: (p) => (
        <button
          onClick={() => handleOpenGrading(p)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-blue-700 text-white rounded-lg hover:bg-blue-800 transition-colors shadow-2xs"
        >
          <Award className="w-3.5 h-3.5" />
          <span>{p.result === 'PENDING' ? 'Grade Defense' : 'Update Evaluation'}</span>
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6 max-w-5xl mx-auto py-2">
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-amber-700 bg-amber-50 px-3 py-1 rounded-full border border-amber-200">
            Examiner Evaluation Committee
          </span>
          <h2 className="text-xl font-bold text-gray-900 mt-2">
            Defense Presentation Grading & Assessment
          </h2>
          <p className="text-xs text-gray-600 mt-0.5">
            Evaluate student technical defenses. Awarding a PASS on Semester 7 locks Phase 1 and activates Semester 8.
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
        data={presentations}
        searchKey="teamCode"
        searchPlaceholder="Search presentations by Team Code..."
        emptyMessage="No presentations currently assigned to your examination schedule."
      />

      {/* Grading Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={`Evaluation — ${selectedPres?.teamCode || 'Team Defense'}`}
        maxWidth="max-w-2xl"
      >
        {selectedPres && (
          <form onSubmit={handleGradeSubmit} className="space-y-4">
            {/* Team & Proposal Context */}
            <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg text-xs space-y-2">
              <div>
                <strong>Project Title:</strong>{' '}
                <span className="font-semibold text-gray-900">{selectedPres.team?.projectTitle || selectedPres.title}</span>
              </div>
              <div>
                <strong>Student Members:</strong>{' '}
                <span className="text-gray-700">
                  {selectedPres.team?.studentNames?.join(', ')} ({selectedPres.team?.studentRegNos?.join(', ')})
                </span>
              </div>
              <div>
                <strong>Supervisor:</strong>{' '}
                <span className="text-gray-700">{selectedPres.team?.supervisorName || 'Department Faculty'}</span>
              </div>
            </div>

            {/* Documents Submitted */}
            {selectedPres.documents && selectedPres.documents.length > 0 && (
              <div className="p-3 bg-blue-50/50 border border-blue-200 rounded-lg text-xs space-y-1.5">
                <div className="font-bold text-blue-950 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-blue-700" />
                  Submitted Deliverables for this Phase:
                </div>
                <div className="space-y-1">
                  {selectedPres.documents.map((d) => (
                    <div key={d._id || d.id} className="flex justify-between items-center bg-white p-1.5 rounded border border-blue-100">
                      <span className="font-medium text-gray-800">{d.title}</span>
                      {d.cloudinaryUrl && (
                        <a
                          href={`/api/documents/${d._id || d.id}/view`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-blue-700 hover:underline font-semibold"
                        >
                          Review File
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
                Evaluation Result *
              </label>
              <select
                value={result}
                onChange={(e) => setResult(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm font-semibold focus:ring-2 focus:ring-blue-500"
              >
                <option value="PASS">PASS — Satisfactory Defense (Locks Phase, Unlocks Next Semester)</option>
                <option value="FAIL_IDEA">FAIL IDEA — Proposal Rejected / Inadequate Technical Feasibility</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
                Marks Awarded (Out of 100) *
              </label>
              <input
                type="number"
                min="0"
                max="100"
                value={marks}
                onChange={(e) => setMarks(e.target.value)}
                required
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
                Examiner Academic Assessment Remarks
              </label>
              <textarea
                rows={3}
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                placeholder="Technical depth, defense clarity, Q&A responses, recommended refinements..."
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
                {loading ? 'Submitting Evaluation...' : 'Submit Official Grade'}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
