import React from 'react';

export default function StatusBadge({ status, label }) {
  if (!status) return null;

  const displayLabel = label || status.replace(/_/g, ' ');

  const getStyle = () => {
    switch (status) {
      case 'APPROVED':
      case 'PASS':
      case 'PORTAL_CREATED':
      case 'PORTAL_ACTIVE':
      case 'ACTIVE':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';

      case 'SUPERVISOR_APPROVED':
      case 'SUPERVISOR_SIGNED':
      case 'COORDINATOR_SIGNED':
      case 'AI_REVIEWED':
        return 'bg-blue-50 text-blue-700 border-blue-200';

      case 'SUBMITTED_TO_SUPERVISOR':
      case 'COORDINATOR_REVIEW':
      case 'PENDING':
      case 'UNDER_REVIEW':
      case 'PENDING_REGISTRATION':
        return 'bg-amber-50 text-amber-700 border-amber-200';

      case 'CHANGES_REQUIRED':
      case 'SUPERVISOR_CHANGES_REQUESTED':
        return 'bg-orange-50 text-orange-700 border-orange-200';

      case 'REJECTED':
      case 'FAIL_IDEA':
      case 'REVOKED':
      case 'INACTIVE':
        return 'bg-rose-50 text-rose-700 border-rose-200';

      case 'LOCKED':
      case 'COMPLETED':
        return 'bg-slate-100 text-slate-700 border-slate-300';

      case 'DRAFT':
      case 'UPCOMING':
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border uppercase tracking-wider ${getStyle()}`}
    >
      {displayLabel}
    </span>
  );
}
