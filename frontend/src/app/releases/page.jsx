'use client';

import React, { useState, useEffect } from 'react';
import AppLayout from '../../components/layout/AppLayout';
import DataTable from '../../components/ui/DataTable';
import StatusChip from '../../components/ui/StatusChip';
import Button from '../../components/ui/Button';
import { formatINR, formatDate, api } from '../../lib/utils';
import { useAuth } from '../../context/AuthContext';
import { ArrowUpRight, Send, AlertTriangle } from 'lucide-react';

export default function ReleaseListPage() {
  const { user } = useAuth();
  const [releases, setReleases] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(15);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    async function loadReleases() {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          page: String(page),
          pageSize: String(pageSize),
        });
        if (statusFilter) params.append('status', statusFilter);

        const res = await api.get(`/releases?${params.toString()}`);
        if (res.data?.success) {
          setReleases(res.data.data);
          setTotal(res.data.meta?.total || 0);
        }
      } catch (err) {
        console.error('Failed to load release requests:', err);
      } finally {
        setLoading(false);
      }
    }
    loadReleases();
  }, [page, pageSize, statusFilter]);

  const columns = [
    {
      header: 'Reference Number',
      render: row => (
        <a
          href={`/releases/${row.id}`}
          className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
        >
          {row.referenceNumber} <ArrowUpRight className="w-3 h-3" />
        </a>
      ),
    },
    {
      header: 'FDR Number',
      render: row => (
        <span className="font-mono text-xs">{row.fdr?.fdrNumber}</span>
      ),
    },
    {
      header: 'Institution',
      render: row => (
        <div className="max-w-[200px] truncate text-xs">
          <p className="font-semibold truncate">{row.fdr?.institution?.name}</p>
        </div>
      ),
    },
    {
      header: 'Maturity Value',
      render: row => (
        <span className="font-mono font-bold text-xs">
          {formatINR(row.fdr?.maturityAmount)}
        </span>
      ),
    },
    {
      header: 'Premature?',
      render: row => (
        row.prematureRelease ? (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300">
            <AlertTriangle className="w-3 h-3" /> Premature
          </span>
        ) : (
          <span className="text-[10px] text-slate-400 font-medium">Regular</span>
        )
      ),
    },
    {
      header: 'Status',
      render: row => <StatusChip status={row.status} />,
    },
    {
      header: 'Created On',
      render: row => <span className="text-xs">{formatDate(row.createdAt)}</span>,
    },
    {
      header: 'Actions',
      render: row => (
        <a
          href={`/releases/${row.id}`}
          className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800"
        >
          View Process
        </a>
      ),
    },
  ];

  const statuses = [
    { label: 'All Workflows', value: '' },
    { label: 'DRAFT', value: 'DRAFT' },
    { label: 'SUBMITTED', value: 'SUBMITTED' },
    { label: 'VERIFIED', value: 'VERIFIED' },
    { label: 'APPROVED', value: 'APPROVED' },
    { label: 'RELEASED', value: 'RELEASED' },
  ];

  return (
    <AppLayout>
      <div className="space-y-6 max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white">
              FDR Release Requests
            </h1>
            <p className="text-xs text-slate-500">
              End-to-end 4-stage release order verification, statutory approvals, and banking UTR tracking.
            </p>
          </div>
        </div>

        {/* Status Filters */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {statuses.map(s => (
            <button
              key={s.value}
              onClick={() => {
                setStatusFilter(s.value);
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                statusFilter === s.value
                  ? 'bg-[#0B1F4B] text-white shadow-sm'
                  : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        <DataTable
          columns={columns}
          data={releases}
          loading={loading}
          page={page}
          pageSize={pageSize}
          total={total}
          onPageChange={setPage}
          emptyMessage="No release requests match the selected workflow state."
        />
      </div>
    </AppLayout>
  );
}
