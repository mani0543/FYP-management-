import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import {
  GraduationCap,
  LogOut,
  User,
  Shield,
  Layers,
  FileSignature,
  ChevronDown,
  KeyRound,
  Eye,
  EyeOff,
} from 'lucide-react';
import Modal from './Modal.jsx';
import api from '../../api/client.js';

export default function Header() {
  const { user, assignments, activeAssignment, switchAssignment, logout, studentProfile, refreshUser } = useAuth();
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [signatureBase64, setSignatureBase64] = useState('');
  const [stampBase64, setStampBase64] = useState('');
  const [savingCredentials, setSavingCredentials] = useState(false);
  const [credentialMessage, setCredentialMessage] = useState('');

  // Password Change State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const isSuperAdmin = user?.capabilities?.includes('ADMIN');
  const isStudent = user?.capabilities?.includes('STUDENT');
  const isFaculty = user?.capabilities?.includes('FACULTY');

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordMessage('');

    if (!currentPassword || !newPassword) {
      setPasswordError('Please enter your current password and a new password.');
      return;
    }

    if (newPassword.trim().length < 6) {
      setPasswordError('New password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setPasswordError('New password and confirmation do not match.');
      return;
    }

    try {
      setChangingPassword(true);
      const res = await api.post('/auth/change-password', {
        currentPassword,
        newPassword: newPassword.trim(),
      });
      if (res.success) {
        setPasswordMessage(res.message || 'Portal password updated successfully.');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmNewPassword('');
      }
    } catch (err) {
      setPasswordError(err.message || 'Failed to update password.');
    } finally {
      setChangingPassword(false);
    }
  };

  const handleFileUpload = (e, type) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      if (type === 'sig') setSignatureBase64(reader.result);
      if (type === 'stamp') setStampBase64(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleGenerateSignature = () => {
    const nameText = user?.name || 'Faculty Signature';
    const canvas = document.createElement('canvas');
    canvas.width = 360;
    canvas.height = 100;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.font = 'italic bold 28px Georgia, serif';
      ctx.fillStyle = '#1e3a8a';
      ctx.fillText(nameText, 16, 56);
      ctx.beginPath();
      ctx.moveTo(14, 68);
      ctx.lineTo(320, 68);
      ctx.strokeStyle = '#1e3a8a';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.font = '11px sans-serif';
      ctx.fillStyle = '#475569';
      ctx.fillText('Digitally Verified Faculty Signature', 16, 86);
      setSignatureBase64(canvas.toDataURL('image/png'));
    }
  };

  const handleGenerateStamp = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 280;
    canvas.height = 110;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.strokeStyle = '#1d4ed8';
      ctx.lineWidth = 4;
      ctx.strokeRect(8, 8, 264, 94);
      ctx.strokeStyle = '#1d4ed8';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(14, 14, 252, 82);
      ctx.fillStyle = '#1d4ed8';
      ctx.font = 'bold 14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('CS & SE DEPARTMENT', 140, 38);
      ctx.font = 'bold 13px sans-serif';
      ctx.fillText('OFFICIAL FYP SEAL', 140, 60);
      ctx.font = '10px monospace';
      ctx.fillText('APPROVED & VERIFIED', 140, 80);
      setStampBase64(canvas.toDataURL('image/png'));
    }
  };

  const handleSaveCredentials = async () => {
    try {
      setSavingCredentials(true);
      setCredentialMessage('');

      if (signatureBase64) {
        await api.post('/auth/upload-credential', {
          type: 'signature',
          imageBase64: signatureBase64,
          fileName: `signature_${user?.id}.png`,
        });
      }

      if (stampBase64) {
        await api.post('/auth/upload-credential', {
          type: 'stamp',
          imageBase64: stampBase64,
          fileName: `stamp_${user?.id}.png`,
        });
      }

      await refreshUser();
      setCredentialMessage('Credentials updated successfully in Cloudinary storage.');
      setSignatureBase64('');
      setStampBase64('');
      setTimeout(() => setProfileModalOpen(false), 1200);
    } catch (err) {
      setCredentialMessage(err.message);
    } finally {
      setSavingCredentials(false);
    }
  };

  return (
    <>
      <header className="h-16 bg-white border-b border-gray-200 px-6 flex items-center justify-between sticky top-0 z-40 shadow-2xs">
        {/* Left: Branding */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-700 flex items-center justify-center text-white shadow-xs">
            <GraduationCap className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-base font-bold text-gray-900 leading-tight">
              University FYP Management System
            </h1>
            <p className="text-xs text-gray-500">Department of Computer Science & Software Engineering</p>
          </div>
        </div>

        {/* Right: Active Assignment Selector & User Menu */}
        <div className="flex items-center gap-4">
          {/* Dynamic Responsibility Switcher for Faculty with Multiple Assignments */}
          {isFaculty && assignments && assignments.length > 0 && (
            <div className="relative flex items-center bg-blue-50 border border-blue-200 rounded-lg px-3 py-1.5 text-xs text-blue-900">
              <Layers className="w-3.5 h-3.5 text-blue-600 mr-2" />
              <span className="font-semibold text-blue-800 mr-1.5">Active Assignment:</span>
              <select
                value={activeAssignment ? activeAssignment._id || activeAssignment.id : ''}
                onChange={(e) => {
                  const selected = assignments.find((a) => (a._id || a.id) === e.target.value);
                  if (selected) switchAssignment(selected);
                }}
                className="bg-transparent font-medium text-blue-950 focus:outline-none cursor-pointer pr-4"
              >
                {assignments.map((a) => (
                  <option key={a._id || a.id} value={a._id || a.id}>
                    {a.responsibility} — {a.batchName} (Sem {a.semesterNumber})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Super Admin Badge */}
          {isSuperAdmin && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">
              <Shield className="w-3.5 h-3.5" />
              Super Admin Authority
            </span>
          )}

          {/* Student Badge + Quick Change Password Button */}
          {isStudent && studentProfile && (
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                Student ID: {studentProfile.registrationNo}
              </span>
              <button
                type="button"
                onClick={() => setProfileModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 transition-colors"
                title="Change your portal password"
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Change Password</span>
              </button>
            </div>
          )}

          {/* User Details & Profile Trigger */}
          <div className="flex items-center gap-2 border-l border-gray-200 pl-4">
            <button
              onClick={() => setProfileModalOpen(true)}
              className="flex items-center gap-2 text-left hover:bg-gray-50 p-1.5 rounded-lg transition-colors"
              title="Academic profile, password & digital signature"
            >
              <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-xs border border-blue-200">
                {user?.name?.charAt(0) || 'U'}
              </div>
              <div className="hidden md:block">
                <div className="text-xs font-bold text-gray-900">{user?.name}</div>
                <div className="text-[11px] text-gray-500">{user?.email}</div>
              </div>
            </button>

            <button
              onClick={logout}
              className="p-2 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors ml-1"
              title="Logout of Academic Portal"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Profile, Password & Signature Modal */}
      <Modal
        isOpen={profileModalOpen}
        onClose={() => setProfileModalOpen(false)}
        title={isStudent ? 'Student Portal Security & Password Settings' : 'Academic Credentials, Password & Digital Signature'}
      >
        <div className="space-y-5">
          <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div className="text-sm font-semibold text-gray-900">{user?.name}</div>
            <div className="text-xs text-gray-600">{user?.email}</div>
            <div className="text-xs font-mono text-blue-700 mt-1">
              Capabilities: {user?.capabilities?.join(', ')}
            </div>
          </div>

          {/* Portal Password Change Section */}
          <form onSubmit={handleChangePassword} className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-blue-700" />
                Change Portal Password
              </h4>
              <button
                type="button"
                onClick={() => setShowPasswords(!showPasswords)}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-gray-600 hover:text-blue-700"
              >
                {showPasswords ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                <span>{showPasswords ? 'Hide' : 'Show'}</span>
              </button>
            </div>
            <p className="text-xs text-gray-600">
              Update your portal password to keep your team workspace secure so no unauthorized students can access your account.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div>
                <label className="block text-[11px] font-bold text-gray-700 mb-1">Current Password</label>
                <input
                  type={showPasswords ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Current password"
                  className="w-full px-2.5 py-1.5 bg-white border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-gray-700 mb-1">New Password</label>
                <input
                  type={showPasswords ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Min 6 characters"
                  className="w-full px-2.5 py-1.5 bg-white border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-gray-700 mb-1">Confirm New</label>
                <input
                  type={showPasswords ? 'text' : 'password'}
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  className="w-full px-2.5 py-1.5 bg-white border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {passwordError && (
              <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium">
                {passwordError}
              </div>
            )}
            {passwordMessage && (
              <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-medium">
                {passwordMessage}
              </div>
            )}

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={changingPassword}
                className="px-3.5 py-1.5 bg-blue-700 text-white rounded-lg text-xs font-bold hover:bg-blue-800 disabled:opacity-50 shadow-2xs"
              >
                {changingPassword ? 'Updating Password...' : 'Update Portal Password'}
              </button>
            </div>
          </form>

          {/* Signature Management */}
          <div>
            <h4 className="text-sm font-bold text-gray-900 mb-2 flex items-center gap-2">
              <FileSignature className="w-4 h-4 text-blue-600" />
              Digital Signature (Uploaded Once, Reused for Approvals)
            </h4>
            <p className="text-xs text-gray-600 mb-3">
              Upload a transparent PNG signature. Reused automatically when digitally signing proposal and thesis documents.
            </p>

            <div className="flex items-center gap-4">
              {user?.signatureUrl ? (
                <div className="p-2 bg-white border border-gray-300 rounded shadow-2xs">
                  <img src={user.signatureUrl} alt="Signature" className="h-12 max-w-44 object-contain" />
                  <div className="text-[10px] text-emerald-600 text-center font-bold mt-1">Verified on Cloudinary</div>
                </div>
              ) : (
                <div className="h-14 w-44 bg-gray-100 border border-dashed border-gray-300 rounded flex items-center justify-center text-xs text-gray-500">
                  No signature on file
                </div>
              )}

              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <label className="inline-block px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-xs font-medium text-gray-700 hover:bg-gray-50 cursor-pointer shadow-2xs">
                    Upload Image
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileUpload(e, 'sig')}
                      className="hidden"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={handleGenerateSignature}
                    className="px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-lg text-xs font-semibold text-blue-700 hover:bg-blue-100"
                  >
                    Generate Digital Signature
                  </button>
                </div>
                {signatureBase64 && (
                  <div className="flex items-center gap-2">
                    <img src={signatureBase64} alt="Preview" className="h-8 border border-blue-200 rounded bg-white px-1" />
                    <span className="text-[11px] text-blue-600 font-medium">Ready to save</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Departmental Stamp (For Coordinators) */}
          {(isFaculty || isSuperAdmin) && (
            <div className="border-t pt-4 border-gray-200">
              <h4 className="text-sm font-bold text-gray-900 mb-2">
                Official Department Stamp
              </h4>
              <p className="text-xs text-gray-600 mb-3">
                Used by the active Coordinator during official document verification and stamping.
              </p>

              <div className="flex items-center gap-4">
                {user?.stampUrl ? (
                  <div className="p-2 bg-white border border-blue-200 rounded shadow-2xs">
                    <img src={user.stampUrl} alt="Stamp" className="h-12 max-w-28 object-contain" />
                    <div className="text-[10px] text-blue-700 text-center font-bold mt-1">Official Stamp</div>
                  </div>
                ) : (
                  <div className="h-14 w-28 bg-gray-100 border border-dashed border-gray-300 rounded flex items-center justify-center text-xs text-gray-500">
                    No stamp
                  </div>
                )}

                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <label className="inline-block px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-xs font-medium text-gray-700 hover:bg-gray-50 cursor-pointer shadow-2xs">
                      Upload Stamp
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleFileUpload(e, 'stamp')}
                        className="hidden"
                      />
                    </label>
                    <button
                      type="button"
                      onClick={handleGenerateStamp}
                      className="px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-lg text-xs font-semibold text-blue-700 hover:bg-blue-100"
                    >
                      Generate Official Seal
                    </button>
                  </div>
                  {stampBase64 && (
                    <div className="flex items-center gap-2">
                      <img src={stampBase64} alt="Stamp Preview" className="h-8 border border-blue-200 rounded bg-white px-1" />
                      <span className="text-[11px] text-blue-600 font-medium">Ready to save</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {credentialMessage && (
            <div
              className={`p-3 rounded-lg text-xs font-medium ${
                credentialMessage.includes('success')
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'bg-rose-50 text-rose-800 border border-rose-200'
              }`}
            >
              {credentialMessage}
            </div>
          )}

          <div className="flex justify-end gap-2 border-t pt-4 border-gray-200">
            <button
              onClick={() => setProfileModalOpen(false)}
              className="px-4 py-2 text-xs font-medium border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Close
            </button>
            <button
              onClick={handleSaveCredentials}
              disabled={savingCredentials || (!signatureBase64 && !stampBase64)}
              className="px-4 py-2 text-xs font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {savingCredentials ? 'Saving...' : 'Save to Cloud Storage'}
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
