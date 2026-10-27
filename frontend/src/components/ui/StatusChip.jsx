'use client';

import React from 'react';

const STATUS_CONFIG = {
  ACTIVE: { label: 'Active', bg: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800' },
  NEAR_MATURITY: { label: 'Near Maturity', bg: 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-300 dark:border-amber-800' },
  MATURED: { label: 'Matured', bg: 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border-rose-300 dark:border-rose-800' },
  RENEWED: { label: 'Renewed', bg: 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border-blue-300 dark:border-blue-800' },
  RELEASE_REQUESTED: { label: 'Release Requested', bg: 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border-purple-300 dark:border-purple-800' },
  RELEASED: { label: 'Released', bg: 'bg-teal-100 text-teal-800 dark:bg-teal-950/60 dark:text-teal-300 border-teal-300 dark:border-teal-800' },
  CLOSED: { label: 'Closed', bg: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300 border-slate-300 dark:border-slate-700' },
  ENCASHED: { label: 'Encashed', bg: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300 border-indigo-300 dark:border-indigo-800' },

  // Document verification statuses
  PENDING: { label: 'Pending Verification', bg: 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-300 dark:border-amber-800' },
  VERIFIED: { label: 'Verified', bg: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800' },
  REJECTED: { label: 'Rejected', bg: 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border-rose-300 dark:border-rose-800' },

  // Release Request statuses
  DRAFT: { label: 'Draft', bg: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-300 dark:border-slate-700' },
  SUBMITTED: { label: 'Submitted', bg: 'bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300 border-sky-300 dark:border-sky-800' },
  APPROVED: { label: 'Approved', bg: 'bg-teal-100 text-teal-800 dark:bg-teal-950/60 dark:text-teal-300 border-teal-300 dark:border-teal-800' },
};

export default function StatusChip({ status, isOverdue = false, overdueDays = 0, className = '' }) {
  if (!status) return null;

  const config = STATUS_CONFIG[status] || {
    label: status.replace(/_/g, ' '),
    bg: 'bg-slate-100 text-slate-700 border-slate-300',
  };

  return (
    <div className="inline-flex items-center gap-1.5 flex-wrap">
      <span
        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${config.bg} ${className}`}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
        {config.label}
      </span>
      {isOverdue && (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-red-600 text-white animate-pulse">
          OVERDUE {overdueDays ? `(${overdueDays}d)` : ''}
        </span>
      )}
    </div>
  );
}
