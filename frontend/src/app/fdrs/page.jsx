'use client';

import React, { useState, useEffect } from 'react';
import AppLayout from '../../components/layout/AppLayout';
import DataTable from '../../components/ui/DataTable';
import StatusChip from '../../components/ui/StatusChip';
import Button from '../../components/ui/Button';
import { formatINR, formatDate, api } from '../../lib/utils';
import { useAuth } from '../../context/AuthContext';
import { Plus, Search, Filter, ArrowUpRight } from 'lucide-react';

export default function FdrListPage() {
  const { user } = useAuth();
  const [fdrs, setFdrs] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(15);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const canCreate = user?.role === 'SUPER_ADMIN' || user?.role === 'FINANCE_OFFICER';

  useEffect(() => {
    async function loadFdrs() {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          page: String(page),
          pageSize: String(pageSize),
        });
        if (search) params.append('search', search);
        if (statusFilter) params.append('status', statusFilter);

        const res = await api.get(`/fdrs?${params.toString()}`);
        if (res.data?.success) {
          setFdrs(res.data.data);
          setTotal(res.data.meta?.total || 0);
        }
      } catch (err) {
        console.error('Failed to load FDRs:', err);
      } finally {
        setLoading(false);
      }
    }

    loadFdrs();
  }, [page, pageSize, search, statusFilter]);

  const columns = [
    {
      header: 'FDR Number',
      render: row => (
        <a
          href={`/fdrs/${row.id}`}
          className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
        >
          {row.fdrNumber} <ArrowUpRight className="w-3 h-3" />
        </a>
      ),
    },
    {
      header: 'Institution',
      render: row => (
        <div className="max-w-[200px] truncate">
          <p className="font-semibold text-xs truncate">{row.institution?.name}</p>
          <p className="text-[10px] text-slate-400 font-mono">{row.institution?.aicteId}</p>
        </div>
      ),
    },
    {
      header: 'Bank & Branch',
      render: row => (
        <div className="text-xs">
          <p className="font-medium text-slate-800 dark:text-slate-200">{row.bank?.name}</p>
          <p className="text-[10px] text-slate-400 truncate max-w-[150px]">{row.branch}</p>
        </div>
      ),
    },
    {
      header: 'Principal',
      render: row => (
        <span className="font-bold text-xs font-mono">{formatINR(row.principal)}</span>
      ),
    },
    {
      header: 'Rate / Tenure',
      render: row => (
        <div className="text-xs">
          <p className="font-semibold">{row.interestRate}% p.a.</p>
          <p className="text-[10px] text-slate-400">{row.tenureMonths} Months</p>
        </div>
      ),
    },
    {
      header: 'Maturity Amount',
      render: row => (
        <span className="font-bold text-xs font-mono text-emerald-700 dark:text-emerald-400">
          {formatINR(row.maturityAmount)}
        </span>
      ),
    },
    {
      header: 'Maturity Date',
      render: row => (
        <div className="text-xs">
          <p className="font-medium">{formatDate(row.maturityDate)}</p>
        </div>
      ),
    },
    {
      header: 'Status',
      render: row => (
        <StatusChip
          status={row.status}
          isOverdue={row.isOverdue}
          overdueDays={row.overdueDays}
        />
      ),
    },
    {
      header: 'Actions',
      render: row => (
        <a
          href={`/fdrs/${row.id}`}
          className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
        >
          View
        </a>
      ),
    },
  ];

  const statuses = [
    { label: 'All Statuses', value: '' },
    { label: 'ACTIVE', value: 'ACTIVE' },
    { label: 'NEAR MATURITY', value: 'NEAR_MATURITY' },
    { label: 'MATURED', value: 'MATURED' },
    { label: 'RENEWED', value: 'RENEWED' },
    { label: 'RELEASE REQUESTED', value: 'RELEASE_REQUESTED' },
    { label: 'RELEASED', value: 'RELEASED' },
    { label: 'CLOSED', value: 'CLOSED' },
  ];

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white">
              Fixed Deposit Records (FDRs)
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Institution-wise security deposits, lien records, and maturity monitoring.
            </p>
          </div>

          {canCreate && (
            <a href="/fdrs/new">
              <Button variant="primary" icon={Plus}>
                New FDR Entry
              </Button>
            </a>
          )}
        </div>

        {/* Filters Bar */}
        <div className="flex flex-col sm:flex-row items-center gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by FDR number, institution name, or bank..."
              value={search}
              onChange={e => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-[#0B1F4B]"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Filter className="w-4 h-4 text-slate-400 hidden sm:block" />
            <select
              value={statusFilter}
              onChange={e => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="w-full sm:w-48 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-[#0B1F4B]"
            >
              {statuses.map(s => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Table */}
        <DataTable
          columns={columns}
          data={fdrs}
          loading={loading}
          page={page}
          pageSize={pageSize}
          total={total}
          onPageChange={setPage}
          emptyMessage="No fixed deposit records match your criteria."
        />
      </div>
    </AppLayout>
  );
}
