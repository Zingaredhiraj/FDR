'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import AppLayout from '../../../components/layout/AppLayout';
import Button from '../../../components/ui/Button';
import StatusChip from '../../../components/ui/StatusChip';
import Modal from '../../../components/ui/Modal';
import { formatINR, formatDate, api } from '../../../lib/utils';
import { useAuth } from '../../../context/AuthContext';
import toast from 'react-hot-toast';
import {
  ArrowLeft,
  Building,
  Mail,
  Phone,
  MapPin,
  AlertCircle,
  CheckCircle2,
  FileSpreadsheet,
  Edit,
  ArrowUpRight,
} from 'lucide-react';

export default function InstitutionDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();

  const [institution, setInstitution] = useState(null);
  const [fdrs, setFdrs] = useState([]);
  const [loading, setLoading] = useState(true);

  // Pending dues modal
  const [duesOpen, setDuesOpen] = useState(false);
  const [hasDues, setHasDues] = useState(false);
  const [duesNote, setDuesNote] = useState('');
  const [duesLoading, setDuesLoading] = useState(false);

  const canManageDues = user?.role === 'SUPER_ADMIN' || user?.role === 'FINANCE_OFFICER';

  async function loadInstitution() {
    setLoading(true);
    try {
      const [instRes, fdrRes] = await Promise.all([
        api.get(`/institutions/${id}`),
        api.get(`/fdrs?institutionId=${id}&pageSize=50`),
      ]);

      if (instRes.data?.success) {
        const inst = instRes.data.data;
        setInstitution(inst);
        setHasDues(inst.hasPendingDues);
        setDuesNote(inst.pendingDuesNote || '');
      }
      if (fdrRes.data?.success) {
        setFdrs(fdrRes.data.data);
      }
    } catch (err) {
      console.error('Failed to load institution:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (id) loadInstitution();
  }, [id]);

  const handleDuesSubmit = async (e) => {
    e.preventDefault();
    setDuesLoading(true);
    try {
      const res = await api.patch(`/institutions/${id}/pending-dues`, {
        hasPendingDues: hasDues,
        pendingDuesNote: hasDues ? duesNote : undefined,
      });
      if (res.data?.success) {
        toast.success('Pending dues status updated');
        setDuesOpen(false);
        loadInstitution();
      }
    } catch {
      // Handled
    } finally {
      setDuesLoading(false);
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="w-8 h-8 border-4 border-[#0B1F4B] border-t-transparent rounded-full animate-spin" />
        </div>
      </AppLayout>
    );
  }

  if (!institution) {
    return (
      <AppLayout>
        <div className="text-center py-16 space-y-4">
          <p className="text-base font-bold text-slate-700">Institution Not Found</p>
          <a href="/institutions">
            <Button variant="secondary">Back to Institutions</Button>
          </a>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6 max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <a
              href="/institutions"
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </a>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                  {institution.name}
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 font-mono">
                  {institution.aicteId}
                </span>
              </div>
              <p className="text-xs text-slate-500">
                {institution.type} • {institution.city}, {institution.state}
              </p>
            </div>
          </div>

          {canManageDues && (
            <Button variant="secondary" icon={Edit} onClick={() => setDuesOpen(true)}>
              Update Dues Status
            </Button>
          )}
        </div>

        {/* Dues Status Alert */}
        {institution.hasPendingDues ? (
          <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 flex items-start gap-3 text-xs text-red-900 dark:text-red-200 shadow-xs">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Pending AICTE Dues Flagged — Release Orders Blocked</p>
              <p className="mt-0.5">{institution.pendingDuesNote || 'Institution has unpaid regulatory dues.'}</p>
            </div>
          </div>
        ) : (
          <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center gap-2 text-xs text-emerald-800 dark:text-emerald-300">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>Zero Outstanding Dues. Eligible for security deposit release orders.</span>
          </div>
        )}

        {/* Profile Card */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="space-y-1">
            <p className="text-xs text-slate-400 font-medium">Head of Institution</p>
            <p className="font-bold text-sm text-slate-900 dark:text-white">{institution.headName}</p>
            <p className="text-xs text-slate-500 flex items-center gap-1.5 pt-1">
              <Mail className="w-3.5 h-3.5" /> {institution.headEmail}
            </p>
            <p className="text-xs text-slate-500 flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5" /> {institution.phone}
            </p>
          </div>

          <div className="space-y-1">
            <p className="text-xs text-slate-400 font-medium">Approval Status</p>
            <p className="font-bold text-sm text-slate-900 dark:text-white">
              {institution.approvalStatus}
            </p>
            <p className="text-xs text-slate-500 flex items-center gap-1.5 pt-1">
              <MapPin className="w-3.5 h-3.5" /> {institution.city}, {institution.state}
            </p>
          </div>

          <div className="space-y-1">
            <p className="text-xs text-slate-400 font-medium">Security Deposit Holdings</p>
            <p className="font-extrabold text-lg text-emerald-600 dark:text-emerald-400 font-mono">
              {fdrs.length} Active FDRs
            </p>
            <p className="text-xs text-slate-500">
              Total Value: {formatINR(fdrs.reduce((acc, f) => acc + BigInt(f.principal || 0), BigInt(0)))}
            </p>
          </div>
        </div>

        {/* Associated FDR Records */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
          <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-[#0B1F4B] dark:text-blue-400" />
              <span>Institutional Fixed Deposit Records ({fdrs.length})</span>
            </h3>
            <a href="/fdrs/new">
              <Button variant="secondary" size="sm">
                Add FDR
              </Button>
            </a>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-semibold uppercase">
                <tr>
                  <th className="px-4 py-3">FDR Number</th>
                  <th className="px-4 py-3">Bank</th>
                  <th className="px-4 py-3">Principal</th>
                  <th className="px-4 py-3">Maturity Date</th>
                  <th className="px-4 py-3">Maturity Amount</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {fdrs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                      No FDR records registered under this institution.
                    </td>
                  </tr>
                ) : (
                  fdrs.map(fdr => (
                    <tr key={fdr.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                      <td className="px-4 py-3 font-mono font-bold text-blue-600 dark:text-blue-400">
                        {fdr.fdrNumber}
                      </td>
                      <td className="px-4 py-3 font-medium">{fdr.bank?.name}</td>
                      <td className="px-4 py-3 font-mono">{formatINR(fdr.principal)}</td>
                      <td className="px-4 py-3 font-mono">{formatDate(fdr.maturityDate)}</td>
                      <td className="px-4 py-3 font-mono font-bold text-emerald-600">
                        {formatINR(fdr.maturityAmount)}
                      </td>
                      <td className="px-4 py-3">
                        <StatusChip status={fdr.status} />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <a
                          href={`/fdrs/${fdr.id}`}
                          className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 font-semibold inline-flex items-center gap-1"
                        >
                          View <ArrowUpRight className="w-3 h-3" />
                        </a>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Dues Management Modal */}
      <Modal
        isOpen={duesOpen}
        onClose={() => setDuesOpen(false)}
        title="Manage Institutional Dues Status"
        description="Release requests are blocked by Gate 4 if pending dues are marked as active."
      >
        <form onSubmit={handleDuesSubmit} className="space-y-4">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="hasPendingDuesCheck"
              checked={hasDues}
              onChange={e => setHasDues(e.target.checked)}
              className="w-4 h-4 text-red-600 rounded border-slate-300 focus:ring-red-500"
            />
            <label htmlFor="hasPendingDuesCheck" className="text-xs font-bold text-slate-800 dark:text-slate-200">
              Institution has outstanding pending dues
            </label>
          </div>

          {hasDues && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Pending Dues Note / Reason <span className="text-red-500">*</span>
              </label>
              <textarea
                required
                rows={3}
                value={duesNote}
                onChange={e => setDuesNote(e.target.value)}
                placeholder="e.g. Unpaid inspection fee for academic year 2024-25; outstanding library dues..."
                className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-[#0B1F4B]"
              />
            </div>
          )}

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
            <Button type="button" variant="secondary" size="sm" onClick={() => setDuesOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" loading={duesLoading}>
              Save Dues Status
            </Button>
          </div>
        </form>
      </Modal>
    </AppLayout>
  );
}
