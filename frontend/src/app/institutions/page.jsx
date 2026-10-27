'use client';

import React, { useState, useEffect } from 'react';
import AppLayout from '../../components/layout/AppLayout';
import DataTable from '../../components/ui/DataTable';
import Button from '../../components/ui/Button';
import { api } from '../../lib/utils';
import { useAuth } from '../../context/AuthContext';
import { Building, Search, ArrowUpRight, AlertCircle, CheckCircle } from 'lucide-react';

export default function InstitutionListPage() {
  const { user } = useAuth();
  const [institutions, setInstitutions] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(15);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    async function loadInstitutions() {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          page: String(page),
          pageSize: String(pageSize),
        });
        if (search) params.append('search', search);

        const res = await api.get(`/institutions?${params.toString()}`);
        if (res.data?.success) {
          setInstitutions(res.data.data);
          setTotal(res.data.meta?.total || 0);
        }
      } catch (err) {
        console.error('Failed to load institutions:', err);
      } finally {
        setLoading(false);
      }
    }
    loadInstitutions();
  }, [page, pageSize, search]);

  const columns = [
    {
      header: 'AICTE ID',
      render: row => (
        <a
          href={`/institutions/${row.id}`}
          className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
        >
          {row.aicteId} <ArrowUpRight className="w-3 h-3" />
        </a>
      ),
    },
    {
      header: 'Institution Name',
      render: row => (
        <div className="max-w-[240px]">
          <p className="font-semibold text-xs text-slate-900 dark:text-white truncate">
            {row.name}
          </p>
          <p className="text-[10px] text-slate-400">{row.type}</p>
        </div>
      ),
    },
    {
      header: 'Location',
      render: row => (
        <span className="text-xs">
          {row.city}, {row.state}
        </span>
      ),
    },
    {
      header: 'Head of Institution',
      render: row => (
        <div className="text-xs">
          <p className="font-medium text-slate-800 dark:text-slate-200">{row.headName}</p>
          <p className="text-[10px] text-slate-400">{row.headEmail}</p>
        </div>
      ),
    },
    {
      header: 'Status',
      render: row => (
        <span
          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
            row.approvalStatus === 'APPROVED'
              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
              : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
          }`}
        >
          {row.approvalStatus}
        </span>
      ),
    },
    {
      header: 'Dues Status',
      render: row => (
        row.hasPendingDues ? (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-red-600">
            <AlertCircle className="w-3.5 h-3.5" /> Pending Dues
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600">
            <CheckCircle className="w-3.5 h-3.5" /> No Dues
          </span>
        )
      ),
    },
    {
      header: 'Actions',
      render: row => (
        <a
          href={`/institutions/${row.id}`}
          className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800"
        >
          View Profile
        </a>
      ),
    },
  ];

  return (
    <AppLayout>
      <div className="space-y-6 max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white">
              Approved Institutions
            </h1>
            <p className="text-xs text-slate-500">
              Institution registry, contact profiles, and AICTE dues status tracking.
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="flex items-center gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name, AICTE ID, state, or city..."
              value={search}
              onChange={e => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-[#0B1F4B]"
            />
          </div>
        </div>

        <DataTable
          columns={columns}
          data={institutions}
          loading={loading}
          page={page}
          pageSize={pageSize}
          total={total}
          onPageChange={setPage}
          emptyMessage="No institutions match your search."
        />
      </div>
    </AppLayout>
  );
}
