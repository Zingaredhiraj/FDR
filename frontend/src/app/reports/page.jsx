'use client';

import React, { useState, useEffect } from 'react';
import AppLayout from '../../components/layout/AppLayout';
import Button from '../../components/ui/Button';
import { formatINR, formatDate, api, API_BASE_URL } from '../../lib/utils';
import { useAuth } from '../../context/AuthContext';
import {
  BarChart3,
  Download,
  FileSpreadsheet,
  FileText,
  Building,
  Landmark,
  ShieldCheck,
  History,
} from 'lucide-react';

export default function ReportsPage() {
  const { user } = useAuth();
  const [reportType, setReportType] = useState('maturity'); // maturity, bank-wise, institution-ledger, release-register, audit
  const [reportData, setReportData] = useState([]);
  const [loading, setLoading] = useState(true);

  const reportTabs = [
    { id: 'maturity', label: 'Maturity Report', icon: FileSpreadsheet },
    { id: 'bank-wise', label: 'Bank-Wise Deposits', icon: Landmark },
    { id: 'institution-ledger', label: 'Institution Ledger', icon: Building },
    { id: 'release-register', label: 'Release Register', icon: ShieldCheck },
    { id: 'audit', label: 'Audit Log Report', icon: History },
  ];

  async function loadReport() {
    setLoading(true);
    try {
      const res = await api.get(`/reports/${reportType}?pageSize=50`);
      if (res.data?.success) {
        setReportData(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load report:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadReport();
  }, [reportType]);

  const handleExport = (format) => {
    const url = `${API_BASE_URL}/reports/${reportType}/export?format=${format}`;
    window.open(url, '_blank');
  };

  return (
    <AppLayout>
      <div className="space-y-6 max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white">
              Institutional Reports & Exports
            </h1>
            <p className="text-xs text-slate-500">
              Download official fixed deposit registers, statutory compliance summaries, and release audits.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              icon={Download}
              onClick={() => handleExport('xlsx')}
            >
              Export Excel (.xlsx)
            </Button>
            <Button
              variant="secondary"
              size="sm"
              icon={Download}
              onClick={() => handleExport('csv')}
            >
              Export CSV
            </Button>
            <Button
              variant="primary"
              size="sm"
              icon={Download}
              onClick={() => handleExport('pdf')}
            >
              Export PDF
            </Button>
          </div>
        </div>

        {/* Report Switcher Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {reportTabs.map(tab => {
            const Icon = tab.icon;
            const active = reportType === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setReportType(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  active
                    ? 'bg-[#0B1F4B] text-white shadow-md'
                    : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Report Preview Table */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Live Data Preview ({reportData.length} records)
            </span>
          </div>

          <div className="overflow-x-auto">
            {reportType === 'maturity' && (
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-semibold uppercase">
                  <tr>
                    <th className="px-4 py-3">FDR Number</th>
                    <th className="px-4 py-3">Institution</th>
                    <th className="px-4 py-3">Bank</th>
                    <th className="px-4 py-3">Principal</th>
                    <th className="px-4 py-3">Maturity Amount</th>
                    <th className="px-4 py-3">Maturity Date</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {loading ? (
                    <tr><td colSpan={7} className="p-8 text-center text-slate-400">Loading report...</td></tr>
                  ) : reportData.map(f => (
                    <tr key={f.id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-3 font-mono font-bold text-blue-600">{f.fdrNumber}</td>
                      <td className="px-4 py-3 font-medium">{f.institution?.name}</td>
                      <td className="px-4 py-3">{f.bank?.name}</td>
                      <td className="px-4 py-3 font-mono">{formatINR(f.principal)}</td>
                      <td className="px-4 py-3 font-mono font-bold text-emerald-600">{formatINR(f.maturityAmount)}</td>
                      <td className="px-4 py-3 font-mono">{formatDate(f.maturityDate)}</td>
                      <td className="px-4 py-3"><span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">{f.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {reportType === 'bank-wise' && (
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-semibold uppercase">
                  <tr>
                    <th className="px-4 py-3">Bank Name</th>
                    <th className="px-4 py-3">Short Code</th>
                    <th className="px-4 py-3">Active FDRs Count</th>
                    <th className="px-4 py-3">Total Principal Value</th>
                    <th className="px-4 py-3">Total Maturity Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {loading ? (
                    <tr><td colSpan={5} className="p-8 text-center text-slate-400">Loading report...</td></tr>
                  ) : reportData.map((d, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50">
                      <td className="px-4 py-3 font-bold text-slate-900 dark:text-white">{d.bank?.name}</td>
                      <td className="px-4 py-3 font-mono">{d.bank?.shortCode}</td>
                      <td className="px-4 py-3 font-semibold">{d.count} FDRs</td>
                      <td className="px-4 py-3 font-mono font-bold">{formatINR(d.totalPrincipal)}</td>
                      <td className="px-4 py-3 font-mono font-bold text-emerald-600">{formatINR(d.totalMaturityAmount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {reportType === 'institution-ledger' && (
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-semibold uppercase">
                  <tr>
                    <th className="px-4 py-3">AICTE ID</th>
                    <th className="px-4 py-3">Institution Name</th>
                    <th className="px-4 py-3">State</th>
                    <th className="px-4 py-3">Total FDRs</th>
                    <th className="px-4 py-3">Total Principal</th>
                    <th className="px-4 py-3">Total Maturity Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {loading ? (
                    <tr><td colSpan={6} className="p-8 text-center text-slate-400">Loading report...</td></tr>
                  ) : reportData.map(inst => (
                    <tr key={inst.id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-3 font-mono font-bold text-blue-600">{inst.aicteId}</td>
                      <td className="px-4 py-3 font-medium">{inst.name}</td>
                      <td className="px-4 py-3">{inst.state}</td>
                      <td className="px-4 py-3 font-semibold">{inst.totalFdrs}</td>
                      <td className="px-4 py-3 font-mono font-bold">{formatINR(inst.totalPrincipal)}</td>
                      <td className="px-4 py-3 font-mono font-bold text-emerald-600">{formatINR(inst.totalMaturityAmount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {reportType === 'release-register' && (
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-semibold uppercase">
                  <tr>
                    <th className="px-4 py-3">Release Reference</th>
                    <th className="px-4 py-3">FDR Number</th>
                    <th className="px-4 py-3">Institution</th>
                    <th className="px-4 py-3">Disbursed Amount</th>
                    <th className="px-4 py-3">Release Date</th>
                    <th className="px-4 py-3">Bank UTR</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {loading ? (
                    <tr><td colSpan={6} className="p-8 text-center text-slate-400">Loading report...</td></tr>
                  ) : reportData.map(r => (
                    <tr key={r.id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-3 font-mono font-bold text-blue-600">{r.referenceNumber}</td>
                      <td className="px-4 py-3 font-mono">{r.fdr?.fdrNumber}</td>
                      <td className="px-4 py-3 font-medium">{r.fdr?.institution?.name}</td>
                      <td className="px-4 py-3 font-mono font-bold text-emerald-600">{formatINR(r.releasedAmount)}</td>
                      <td className="px-4 py-3 font-mono">{formatDate(r.releaseDate)}</td>
                      <td className="px-4 py-3 font-mono text-slate-600">{r.utr}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {reportType === 'audit' && (
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-semibold uppercase">
                  <tr>
                    <th className="px-4 py-3">Timestamp</th>
                    <th className="px-4 py-3">User</th>
                    <th className="px-4 py-3">Action</th>
                    <th className="px-4 py-3">Entity</th>
                    <th className="px-4 py-3">IP Address</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {loading ? (
                    <tr><td colSpan={5} className="p-8 text-center text-slate-400">Loading report...</td></tr>
                  ) : reportData.map(a => (
                    <tr key={a.id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-3 font-mono">{formatDate(a.createdAt)}</td>
                      <td className="px-4 py-3 font-medium">{a.user?.name || 'System'}</td>
                      <td className="px-4 py-3 font-bold text-blue-600">{a.action}</td>
                      <td className="px-4 py-3">{a.entity}</td>
                      <td className="px-4 py-3 font-mono text-slate-400">{a.ipAddress || '127.0.0.1'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
