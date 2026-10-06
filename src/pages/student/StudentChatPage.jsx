import React from 'react';
import { useOutletContext } from 'react-router-dom';
import ChatBox from '../../components/chat/ChatBox.jsx';
import { MessageSquare, ShieldAlert } from 'lucide-react';

export default function StudentChatPage() {
  const { studentData } = useOutletContext();

  const team = studentData?.team;
  const proposal = studentData?.proposal;

  const isProposalApproved =
    proposal &&
    ['SUPERVISOR_APPROVED', 'COORDINATOR_REVIEW', 'APPROVED'].includes(proposal.status);

  if (!isProposalApproved) {
    return (
      <div className="max-w-2xl mx-auto py-12 text-center bg-white border border-gray-200 rounded-xl p-8 shadow-xs">
        <ShieldAlert className="w-12 h-12 text-amber-500 mx-auto mb-3" />
        <h3 className="text-base font-bold text-gray-900">Communication Room Locked</h3>
        <p className="text-xs text-gray-600 max-w-md mx-auto mt-1">
          In accordance with academic protocol, the private project chat room between team members and the faculty
          supervisor unlocks only after the formal project proposal has been evaluated and approved.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-2 space-y-4">
      <div>
        <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-blue-700" />
          Direct Team-Supervisor Consultation Room
        </h2>
        <p className="text-xs text-gray-500">
          Official academic consultation channel for {team?.teamCode} with {team?.supervisorName}.
        </p>
      </div>

      <ChatBox teamId={team?._id || team?.id} teamCode={team?.teamCode} />
    </div>
  );
}
