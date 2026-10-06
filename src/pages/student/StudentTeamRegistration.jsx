import React, { useState, useEffect } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import api from '../../api/client.js';
import CountdownTimer from '../../components/common/CountdownTimer.jsx';
import { Users, AlertCircle, CheckCircle2, Clock, ShieldCheck } from 'lucide-react';

export default function StudentTeamRegistration() {
  const { studentProfile } = useAuth();
  const { studentData, refreshStudentStatus } = useOutletContext();
  const navigate = useNavigate();

  const [ownRegNo, setOwnRegNo] = useState(studentProfile?.registrationNo || '');
  const [teammateRegNo, setTeammateRegNo] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // If portals are already created for this batch, forward to dashboard
  useEffect(() => {
    if (studentData?.batch?.portalsCreated && studentData?.team?.status === 'PORTAL_ACTIVE') {
      navigate('/student/dashboard');
    }
  }, [studentData, navigate]);

  useEffect(() => {
    if (studentProfile?.registrationNo) {
      setOwnRegNo(studentProfile.registrationNo);
    }
  }, [studentProfile]);

  const handleRegisterTeam = async (e) => {
    e.preventDefault();
    if (!ownRegNo.trim() || !teammateRegNo.trim()) {
      setError('Please provide both student registration numbers.');
      return;
    }

    try {
      setLoading(true);
      setError('');
      setSuccess('');

      const res = await api.post('/student/register-team', {
        ownRegNo: ownRegNo.trim(),
        teammateRegNo: teammateRegNo.trim(),
      });

      if (res.success) {
        setSuccess(res.message);
        await refreshStudentStatus();
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const pendingRequest = studentData?.registrationRequest;

  return (
    <div className="max-w-2xl mx-auto py-6">
      {/* Batch Header & Live Countdown */}
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-xs mb-6 text-center space-y-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-blue-700 bg-blue-50 px-3 py-1 rounded-full border border-blue-200">
            {studentData?.batch?.name || 'Class FYP Registration'}
          </span>
          <h2 className="text-xl font-bold text-gray-900 mt-2">Team Formation & Registration</h2>
          <p className="text-xs text-gray-600 max-w-md mx-auto mt-1">
            Form your 2-member FYP project group before the official departmental deadline closes.
          </p>
        </div>

        {/* Live Countdown Timer */}
        <div className="flex justify-center">
          <CountdownTimer targetDate={studentData?.batch?.registrationDeadline} />
        </div>
      </div>

      {/* If team request is already pending review */}
      {pendingRequest ? (
        <div className="bg-white p-8 rounded-xl border border-gray-200 shadow-xs text-center space-y-4">
          <div className="w-12 h-12 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center mx-auto">
            <Clock className="w-6 h-6 animate-pulse" />
          </div>

          <div>
            <h3 className="text-lg font-bold text-gray-900">
              Team Registration Submitted ({pendingRequest.teamCode})
            </h3>
            <p className="text-sm text-gray-600 max-w-md mx-auto mt-1">
              Your group registration is currently pending. Once the batch Coordinator clicks{' '}
              <strong className="text-blue-700">"Create Portals"</strong>, your project workspace will unlock.
            </p>
          </div>

          <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg text-xs text-left max-w-md mx-auto space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-500">Student 1:</span>
              <span className="font-semibold text-gray-800">
                {pendingRequest.student1Name} ({pendingRequest.student1RegNo})
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Student 2:</span>
              <span className="font-semibold text-gray-800">
                {pendingRequest.student2Name} ({pendingRequest.student2RegNo})
              </span>
            </div>
            <div className="flex justify-between border-t pt-2">
              <span className="text-gray-500">Submission Timestamp:</span>
              <span className="font-mono text-gray-700">{new Date(pendingRequest.submittedAt).toLocaleString()}</span>
            </div>
          </div>
        </div>
      ) : (
        /* Team Registration Form (Rule #20: Student sees ONLY this screen before portal activation) */
        <div className="bg-white p-8 rounded-xl border border-gray-200 shadow-xs">
          <div className="border-b border-gray-200 pb-4 mb-6">
            <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-700" />
              Register Team
            </h3>
            <p className="text-xs text-gray-500 mt-1">
              Enter your own registration number and your teammate's registration number.
            </p>
          </div>

          {error && (
            <div className="mb-5 p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="mb-5 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>{success}</span>
            </div>
          )}

          <form onSubmit={handleRegisterTeam} className="space-y-5">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-700">
                Your Registration Number
              </label>
              <input
                type="text"
                value={ownRegNo}
                onChange={(e) => setOwnRegNo(e.target.value)}
                required
                placeholder="e.g. SP23-BCS-010"
                className="mt-1 block w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-lg text-sm text-gray-900 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-[11px] text-gray-500">Must match your authenticated university profile.</span>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-700">
                Teammate Registration Number
              </label>
              <input
                type="text"
                value={teammateRegNo}
                onChange={(e) => setTeammateRegNo(e.target.value)}
                required
                placeholder="e.g. SP23-BCS-011"
                className="mt-1 block w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-lg text-sm text-gray-900 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs"
              />
              <span className="text-[11px] text-gray-500">
                Must be an active student registered in this exact batch.
              </span>
            </div>

            {/* Academic Validation Notice */}
            <div className="p-3.5 bg-slate-50 border border-gray-200 rounded-lg text-xs text-slate-600 flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <strong>Server Enforced Validations:</strong> System verifies active batch enrollment, duplicate team prevention,
                and deadline timestamp validity before registration.
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-lg text-sm font-bold text-white bg-blue-700 hover:bg-blue-800 disabled:opacity-50 transition-colors shadow-xs"
            >
              <Users className="w-4 h-4" />
              <span>{loading ? 'Submitting Registration...' : 'REGISTER TEAM'}</span>
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
