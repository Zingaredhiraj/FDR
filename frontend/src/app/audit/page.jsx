'use client';

import React, { useState, useEffect } from 'react';
import AppLayout from '../../components/layout/AppLayout';
import DataTable from '../../components/ui/DataTable';
import Modal from '../../components/ui/Modal';
import { formatDateTime, api } from '../../lib/utils';
import { useAuth } from '../../context/AuthContext';
import { History, Eye, Search, Filter } from 'lucide-react';

export default function AuditPage() {
  const { user } = useAuth();
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [loading, setLoading] = useState(true);

  // Filter state
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [entityFilter, setEntityFilter] = useState('');

  // JSON Diff Modal
  const [selectedLog, setSelectedLog] = useState(null);
  const [diffOpen, setDiffOpen] = useState(false);

  useEffect(() => {
    async function loadAudit() {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          page: String(page),
          pageSize: String(pageSize),
        });
        if (search) params.append('search', search);
        if (actionFilter) params.append('action', actionFilter);
        if (entityFilter) params.append('entity', entityFilter);

        const res = await api.get(`/audit?${params.toString()}`);
        if (res.data?.success) {
          setLogs(res.data.data);
          setTotal(res.data.meta?.total || 0);
        }
      } catch (err) {
        console.error('Failed to load audit logs:', err);
      } finally {
        setLoading(false);
      }
    }
    loadAudit();
  }, [page, pageSize, search, actionFilter, entityFilter]);

  const viewDiff = log => {
    setSelectedLog(log);
    setDiffOpen(true);
  };

  const columns = [
    {
      header: 'Timestamp',
      render: row => (
        <span className="font-mono text-xs">{formatDateTime(row.createdAt)}</span>
      ),
    },
    {
      header: 'Actor',
      render: row => (
        <div className="text-xs">
          <p className="font-bold text-slate-800 dark:text-slate-200">
            {row.user?.name || 'System Actor'}
          </p>
          <p className="text-[10px] text-slate-400 font-mono">
            {row.user?.role?.replace(/_/g, ' ') || 'SYSTEM'}
          </p>
        </div>
      ),
    },
    {
      header: 'Action',
      render: row => (
        <span
          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
            ['CREATE', 'RELEASE'].includes(row.action)
              ? 'bg-emerald-100 text-emerald-800'
              : ['VERIFY', 'APPROVE'].includes(row.action)
              ? 'bg-blue-100 text-blue-800'
              : ['DELETE', 'REJECT', 'LOGIN_FAILED'].includes(row.action)
              ? 'bg-red-100 text-red-800'
              : 'bg-slate-100 text-slate-700'
          }`}
        >
          {row.action}
        </span>
      ),
    },
    {
      header: 'Entity / Target',
      render: row => (
        <div className="text-xs">
          <span className="font-semibold text-slate-900 dark:text-white">
            {row.entity}
          </span>
          {row.entityId && (
            <p className="font-mono text-[10px] text-slate-400 truncate max-w-[120px]">
              ID: {row.entityId}
            </p>
          )}
        </div>
      ),
    },
    {
      header: 'IP / Terminal',
      render: row => (
        <span className="font-mono text-[11px] text-slate-500">
          {row.ipAddress || '127.0.0.1'}
        </span>
      ),
    },
    {
      header: 'Payload Details',
      render: row => (
        (row.oldValue || row.newValue) ? (
          <button
            onClick={() => viewDiff(row)}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold text-blue-600 dark:text-blue-400"
          >
            <Eye className="w-3.5 h-3.5" /> View Diff
          </button>
        ) : (
          <span className="text-xs text-slate-400">—</span>
        )
      ),
    },
  ];

  return (
    <AppLayout>
      <div className="space-y-6 max-w-6xl mx-auto">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white">
            Immutable Audit Trail
          </h1>
          <p className="text-xs text-slate-500">
            Append-only security log of logins, FDR creations, verifications, release approvals, and parameter changes.
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row items-center gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search audit trail by actor, action, or entity..."
              value={search}
              onChange={e => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-[#0B1F4B]"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select
              value={actionFilter}
              onChange={e => {
                setActionFilter(e.target.value);
                setPage(1);
              }}
              className="w-full sm:w-40 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
            >
              <option value="">All Actions</option>
              <option value="CREATE">CREATE</option>
              <option value="UPDATE">UPDATE</option>
              <option value="DELETE">DELETE</option>
              <option value="VERIFY">VERIFY</option>
              <option value="APPROVE">APPROVE</option>
              <option value="REJECT">REJECT</option>
              <option value="RELEASE">RELEASE</option>
              <option value="LOGIN">LOGIN</option>
              <option value="LOGIN_FAILED">LOGIN_FAILED</option>
            </select>
          </div>
        </div>

        <DataTable
          columns={columns}
          data={logs}
          loading={loading}
          page={page}
          pageSize={pageSize}
          total={total}
          onPageChange={setPage}
          emptyMessage="No audit log entries match your filter."
        />
      </div>

      {/* JSON Diff Modal */}
      <Modal
        isOpen={diffOpen}
        onClose={() => setDiffOpen(false)}
        title={`Audit Entry: ${selectedLog?.action} on ${selectedLog?.entity}`}
        description={`Recorded at ${selectedLog ? formatDateTime(selectedLog.createdAt) : ''} by ${selectedLog?.user?.name || 'System'}`}
        maxWidth="max-w-2xl"
      >
        <div className="space-y-4">
          {selectedLog?.oldValue && (
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                Previous State (Old Value)
              </p>
              <pre className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-mono overflow-x-auto text-slate-700 dark:text-slate-300">
                {JSON.stringify(JSON.parse(selectedLog.oldValue), null, 2)}
              </pre>
            </div>
          )}

          {selectedLog?.newValue && (
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                Updated State (New Value)
              </p>
              <pre className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-mono overflow-x-auto text-emerald-800 dark:text-emerald-300">
                {JSON.stringify(JSON.parse(selectedLog.newValue), null, 2)}
              </pre>
            </div>
          )}
        </div>
      </Modal>
    </AppLayout>
  );
}
