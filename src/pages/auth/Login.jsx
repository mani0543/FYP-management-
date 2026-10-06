import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { GraduationCap, Shield, LogIn, CheckCircle2, AlertCircle, KeyRound, Sparkles } from 'lucide-react';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) return;

    try {
      setLoading(true);
      setError('');
      const res = await login(email, password);

      // Route based on role
      if (res.user.capabilities.includes('ADMIN')) {
        navigate('/admin/dashboard');
      } else if (res.user.capabilities.includes('STUDENT')) {
        navigate('/student/dashboard');
      } else if (res.assignments?.[0]?.responsibility === 'COORDINATOR') {
        navigate('/coordinator/dashboard');
      } else if (res.assignments?.[0]?.responsibility === 'SUPERVISOR') {
        navigate('/supervisor/dashboard');
      } else if (res.assignments?.[0]?.responsibility === 'EXAMINER') {
        navigate('/examiner/dashboard');
      } else {
        navigate('/coordinator/dashboard');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFillCredentials = (targetEmail, targetPassword) => {
    setEmail(targetEmail);
    setPassword(targetPassword);
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      {/* Top Banner */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="w-14 h-14 bg-blue-700 text-white rounded-xl mx-auto flex items-center justify-center shadow-md">
          <GraduationCap className="w-8 h-8" />
        </div>
        <h2 className="mt-4 text-2xl font-extrabold text-gray-900 tracking-tight">
          University FYP Management System
        </h2>
        <p className="mt-1 text-xs text-gray-600">
          Faculty of Information Technology & Computer Science Academic Portal
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-4xl px-4">
        <div className="bg-white py-8 px-6 shadow-sm rounded-xl border border-gray-200 sm:px-10 grid grid-cols-1 md:grid-cols-12 gap-8">
          {/* Left Column: Login Form */}
          <div className="md:col-span-6 flex flex-col justify-between">
            <div>
              <div className="border-b border-gray-200 pb-3 mb-5">
                <h3 className="text-base font-bold text-gray-900">Academic Sign In</h3>
                <p className="text-xs text-gray-500">Enter university credentials to access authorized FYP services.</p>
              </div>

              {error && (
                <div className="mb-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Institutional Email Address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="admin@university.edu"
                    className="mt-1 block w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-2xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Portal Password
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="••••••••"
                    className="mt-1 block w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-2xs"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 border border-transparent rounded-lg shadow-xs text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors disabled:opacity-50"
                >
                  <LogIn className="w-4 h-4" />
                  <span>{loading ? 'Authenticating...' : 'Sign In to Portal'}</span>
                </button>
              </form>
            </div>

            <div className="mt-6 pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={() => handleFillCredentials('admin@university.edu', 'Admin@123')}
                className="w-full text-xs text-blue-700 hover:text-blue-800 font-semibold flex items-center justify-center gap-1.5 py-2 rounded-lg border border-blue-200 bg-blue-50/70 hover:bg-blue-100 transition-colors"
              >
                <KeyRound className="w-3.5 h-3.5 text-blue-600" />
                <span>Fill Super Admin (admin@university.edu)</span>
              </button>
            </div>
          </div>

          {/* Right Column: Institutional Workflow & Governance Overview */}
          <div className="md:col-span-6 bg-slate-50 p-5 rounded-xl border border-gray-200 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-gray-200 pb-2.5">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-blue-700" />
                  <span className="text-xs font-bold uppercase tracking-wider text-gray-800">
                    End-to-End Academic FYP Workflow
                  </span>
                </div>
                <span className="text-[11px] font-medium text-emerald-700">Live Database</span>
              </div>

              <div className="space-y-2.5 text-xs text-gray-700">
                <div className="p-3 rounded-lg bg-white border border-gray-200 space-y-1">
                  <div className="font-bold text-gray-900">1. Super Admin Governance</div>
                  <div className="text-[11px] text-gray-500">
                    Initialize academic batches, provision faculty accounts, and assign dynamic responsibilities (Coordinator, Supervisor, Examiner) per batch & semester.
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-white border border-gray-200 space-y-1">
                  <div className="font-bold text-gray-900">2. Coordinator Roster & Portal Creation</div>
                  <div className="text-[11px] text-gray-500">
                    Enroll students by Registration Number, set the Team Registration Deadline countdown, review 2-member team pairings, and click <strong>Create Portals</strong>.
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-white border border-gray-200 space-y-1">
                  <div className="font-bold text-gray-900">3. Proposal, AI Check & Supervisor Chat</div>
                  <div className="text-[11px] text-gray-500">
                    Students run Gemini AI similarity checks and submit proposals. Supervisor acceptance unlocks private Team-Supervisor Chat.
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-white border border-gray-200 space-y-1">
                  <div className="font-bold text-gray-900">4. Signatures, Defense & Semester 8</div>
                  <div className="text-[11px] text-gray-500">
                    Supervisor digital signatures, Coordinator official stamp + document lock, and Examiner grading (PASS locks Sem 7 & activates Sem 8).
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-3 pt-2.5 border-t border-gray-200 text-[11px] text-gray-500 text-center">
              Protected university portal. All actions are securely logged in the audit ledger.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

