'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import AppLayout from '../../../components/layout/AppLayout';
import Button from '../../../components/ui/Button';
import StatusChip from '../../../components/ui/StatusChip';
import Modal from '../../../components/ui/Modal';
import Input from '../../../components/ui/Input';
import { formatINR, formatDate, formatDateTime, api, API_BASE_URL, rupeesToPaise } from '../../../lib/utils';
import { useAuth } from '../../../context/AuthContext';
import toast from 'react-hot-toast';
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Download,
  QrCode,
  Send,
  Building,
  Landmark,
  ShieldCheck,
  UserCheck,
  Calendar,
} from 'lucide-react';

export default function ReleaseDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { user } = useAuth();

  const [release, setRelease] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Remarks modal for verify/reject/approve
  const [actionModal, setActionModal] = useState({ open: false, type: '', title: '' });
  const [remarks, setRemarks] = useState('');

  // Mark Released modal
  const [releaseModalOpen, setReleaseModalOpen] = useState(false);
  const [releaseForm, setReleaseForm] = useState({
    utr: '',
    releaseDate: new Date().toISOString().split('T')[0],
    releasedAmountRupees: '',
    deductionsRupees: '0',
    deductionReason: '',
  });

  async function loadRelease() {
    setLoading(true);
    try {
      const res = await api.get(`/releases/${id}`);
      if (res.data?.success) {
        const data = res.data.data;
        setRelease(data);
        setReleaseForm(prev => ({
          ...prev,
          releasedAmountRupees: String(Number(data.fdr?.maturityAmount || 0) / 100),
        }));
      }
    } catch (err) {
      console.error('Failed to load release:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (id) loadRelease();
  }, [id]);

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="w-8 h-8 border-4 border-[#0B1F4B] border-t-transparent rounded-full animate-spin" />
        </div>
      </AppLayout>
    );
  }

  if (!release) {
    return (
      <AppLayout>
        <div className="text-center py-16 space-y-4">
          <p className="text-base font-bold text-slate-700">Release Request Not Found</p>
          <a href="/releases">
            <Button variant="secondary">Back to Releases</Button>
          </a>
        </div>
      </AppLayout>
    );
  }

  // Maker-checker check: verifier cannot approve
  const verifierStep = release.steps?.find(s => s.action === 'VERIFIED');
  const isVerifierSameAsApprover = verifierStep && verifierStep.actorId === user?.sub;

  // Handlers
  const handleSubmitDraft = async () => {
    setActionLoading(true);
    try {
      const res = await api.patch(`/releases/${id}/submit`);
      if (res.data?.success) {
        toast.success('Release request submitted for verification');
        loadRelease();
      }
    } catch {
      // Error handled
    } finally {
      setActionLoading(false);
    }
  };

  const handleActionConfirm = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      let res;
      if (actionModal.type === 'VERIFY') {
        res = await api.patch(`/releases/${id}/verify`, { remarks });
      } else if (actionModal.type === 'APPROVE') {
        res = await api.patch(`/releases/${id}/approve`, { remarks });
      } else if (actionModal.type === 'REJECT') {
        if (!remarks.trim()) {
          toast.error('Rejection remarks are mandatory');
          setActionLoading(false);
          return;
        }
        res = await api.patch(`/releases/${id}/reject`, { remarks });
      }

      if (res?.data?.success) {
        toast.success(`Release request ${actionModal.type.toLowerCase()}d successfully`);
        setActionModal({ open: false, type: '', title: '' });
        setRemarks('');
        loadRelease();
      }
    } catch {
      // Handled
    } finally {
      setActionLoading(false);
    }
  };

  const handleMarkReleasedSubmit = async (e) => {
    e.preventDefault();
    if (!releaseForm.utr.trim()) {
      toast.error('Bank UTR number is required');
      return;
    }

    setActionLoading(true);
    try {
      const payload = {
        releaseDate: releaseForm.releaseDate,
        utr: releaseForm.utr,
        releasedAmount: rupeesToPaise(releaseForm.releasedAmountRupees),
        deductions: rupeesToPaise(releaseForm.deductionsRupees),
        deductionReason: releaseForm.deductionReason || undefined,
      };

      const res = await api.patch(`/releases/${id}/mark-released`, payload);
      if (res.data?.success) {
        toast.success('FDR marked as RELEASED! Release Order PDF generated.');
        setReleaseModalOpen(false);
        loadRelease();
      }
    } catch {
      // Handled
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6 max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <a
              href="/releases"
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </a>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                  {release.referenceNumber}
                </span>
                <StatusChip status={release.status} />
              </div>
              <p className="text-xs text-slate-500">
                Created on {formatDate(release.createdAt)} by {release.createdBy?.name}
              </p>
            </div>
          </div>

          {/* Download PDF button if released */}
          {release.status === 'RELEASED' && (
            <div className="flex items-center gap-2">
              <a
                href={`${API_BASE_URL}/releases/${id}/pdf`}
                target="_blank"
                rel="noreferrer"
              >
                <Button variant="primary" icon={Download}>
                  Download Release Order PDF
                </Button>
              </a>
              <a
                href={`/verify-release/${encodeURIComponent(release.referenceNumber)}`}
                target="_blank"
                rel="noreferrer"
              >
                <Button variant="secondary" icon={QrCode}>
                  Verify Public QR
                </Button>
              </a>
            </div>
          )}
        </div>

        {/* Premature Release Warning Banner */}
        {release.prematureRelease && (
          <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-300 dark:border-red-800 text-red-900 dark:text-red-200 space-y-1.5 shadow-xs">
            <div className="flex items-center gap-2 font-bold text-xs text-red-700 dark:text-red-300">
              <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
              <span>PREMATURE RELEASE REQUEST — SPECIAL SCRUTINY REQUIRED</span>
            </div>
            <p className="text-xs pl-6">
              <strong>Mandatory Justification:</strong> {release.prematureReason || 'No reason specified'}
            </p>
          </div>
        )}

        {/* Process Action Bar based on Role & State */}
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h4 className="text-sm font-bold text-slate-900 dark:text-white">
              Workflow Status: {release.status}
            </h4>
            <p className="text-xs text-slate-500">
              {release.status === 'DRAFT' && 'Pending maker submission by Finance Officer.'}
              {release.status === 'SUBMITTED' && 'Awaiting document & dues verification by Verifier.'}
              {release.status === 'VERIFIED' && 'Awaiting final release authorization by Approving Authority.'}
              {release.status === 'APPROVED' && 'Approved! Ready for banking disbursement and UTR capture by Finance Officer.'}
              {release.status === 'RELEASED' && `Disbursed on ${formatDate(release.releaseDate)} with UTR: ${release.utr}`}
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* DRAFT -> SUBMIT */}
            {release.status === 'DRAFT' && (user?.role === 'SUPER_ADMIN' || user?.role === 'FINANCE_OFFICER') && (
              <Button
                variant="primary"
                icon={Send}
                loading={actionLoading}
                onClick={handleSubmitDraft}
              >
                Submit for Verification
              </Button>
            )}

            {/* SUBMITTED -> VERIFY or REJECT */}
            {release.status === 'SUBMITTED' && (user?.role === 'SUPER_ADMIN' || user?.role === 'VERIFIER') && (
              <>
                <Button
                  variant="success"
                  icon={CheckCircle2}
                  onClick={() => setActionModal({ open: true, type: 'VERIFY', title: 'Verify Release Request' })}
                >
                  Verify Request
                </Button>
                <Button
                  variant="danger"
                  icon={XCircle}
                  onClick={() => setActionModal({ open: true, type: 'REJECT', title: 'Reject Release Request' })}
                >
                  Reject to Draft
                </Button>
              </>
            )}

            {/* VERIFIED -> APPROVE or REJECT */}
            {release.status === 'VERIFIED' && (user?.role === 'SUPER_ADMIN' || user?.role === 'APPROVING_AUTHORITY') && (
              <>
                <Button
                  variant="primary"
                  icon={ShieldCheck}
                  disabled={isVerifierSameAsApprover}
                  onClick={() => setActionModal({ open: true, type: 'APPROVE', title: 'Approve Release Authorization' })}
                >
                  {isVerifierSameAsApprover ? 'Maker-Checker Blocked' : 'Approve Release'}
                </Button>
                <Button
                  variant="danger"
                  icon={XCircle}
                  onClick={() => setActionModal({ open: true, type: 'REJECT', title: 'Reject Release Request' })}
                >
                  Reject to Draft
                </Button>
              </>
            )}

            {/* APPROVED -> MARK RELEASED */}
            {release.status === 'APPROVED' && (user?.role === 'SUPER_ADMIN' || user?.role === 'FINANCE_OFFICER') && (
              <Button
                variant="success"
                icon={CheckCircle2}
                onClick={() => setReleaseModalOpen(true)}
              >
                Capture UTR & Mark Released
              </Button>
            )}
          </div>
        </div>

        {/* Release Summary & FDR Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 dark:border-slate-800 pb-2">
              Security Deposit Details
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <p className="text-slate-400 font-medium">Institution</p>
                <p className="font-bold text-slate-900 dark:text-white text-sm">
                  {release.fdr?.institution?.name}
                </p>
                <p className="text-slate-400 font-mono text-[11px]">
                  AICTE ID: {release.fdr?.institution?.aicteId}
                </p>
              </div>

              <div>
                <p className="text-slate-400 font-medium">FDR Number</p>
                <a
                  href={`/fdrs/${release.fdr?.id}`}
                  className="font-mono font-bold text-blue-600 dark:text-blue-400 hover:underline"
                >
                  {release.fdr?.fdrNumber} &rarr;
                </a>
              </div>

              <div>
                <p className="text-slate-400 font-medium">Principal & Maturity</p>
                <p className="font-semibold text-slate-800 dark:text-slate-200">
                  Principal: {formatINR(release.fdr?.principal)} • Maturity:{' '}
                  <span className="font-bold text-emerald-600">{formatINR(release.fdr?.maturityAmount)}</span>
                </p>
              </div>

              <div>
                <p className="text-slate-400 font-medium">Bank & Branch</p>
                <p className="font-semibold">{release.fdr?.bank?.name}</p>
                <p className="text-slate-500">{release.fdr?.branch} (IFSC: {release.fdr?.ifsc})</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 dark:border-slate-800 pb-2">
              Disbursement Details
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <p className="text-slate-400 font-medium">Released Amount</p>
                <p className="text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400">
                  {release.releasedAmount ? formatINR(release.releasedAmount) : '—'}
                </p>
              </div>

              <div>
                <p className="text-slate-400 font-medium">Deductions</p>
                <p className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                  {formatINR(release.deductions || 0)}
                  {release.deductionReason && (
                    <span className="text-slate-500 font-normal ml-1">({release.deductionReason})</span>
                  )}
                </p>
              </div>

              <div>
                <p className="text-slate-400 font-medium">UTR Reference</p>
                <p className="font-mono font-bold text-slate-900 dark:text-white">
                  {release.utr || 'Pending disbursement'}
                </p>
              </div>

              <div>
                <p className="text-slate-400 font-medium">Release Date</p>
                <p className="font-semibold">{release.releaseDate ? formatDate(release.releaseDate) : '—'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* 4-Tier Timeline of Release Steps */}
        <div className="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-6">
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            Workflow Audit Timeline
          </h3>

          <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
            {release.steps?.map((step, idx) => (
              <div key={step.id || idx} className="relative flex items-start gap-4">
                <span className="absolute -left-6 top-1 w-3 h-3 rounded-full bg-[#0B1F4B] ring-4 ring-white dark:ring-slate-900" />
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-slate-900 dark:text-white">
                      {step.action}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 font-semibold">
                      {step.actorRole}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {formatDateTime(step.createdAt)}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300">
                    By <strong>{step.actor?.name || 'User'}</strong>
                  </p>
                  {step.remarks && (
                    <p className="text-xs text-slate-500 italic bg-slate-50 dark:bg-slate-800/60 p-2 rounded-xl mt-1">
                      &ldquo;{step.remarks}&rdquo;
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Verify / Approve / Reject Remarks Modal */}
      <Modal
        isOpen={actionModal.open}
        onClose={() => setActionModal({ open: false, type: '', title: '' })}
        title={actionModal.title}
        description="Recorded permanently in the immutable release workflow audit step."
      >
        <form onSubmit={handleActionConfirm} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Remarks {actionModal.type === 'REJECT' && <span className="text-red-500">*</span>}
            </label>
            <textarea
              required={actionModal.type === 'REJECT'}
              rows={3}
              value={remarks}
              onChange={e => setRemarks(e.target.value)}
              placeholder="Provide comments or audit justification..."
              className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-[#0B1F4B]"
            />
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setActionModal({ open: false, type: '', title: '' })}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant={actionModal.type === 'REJECT' ? 'danger' : 'primary'}
              size="sm"
              loading={actionLoading}
            >
              Confirm {actionModal.type}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Capture UTR & Mark Released Modal */}
      <Modal
        isOpen={releaseModalOpen}
        onClose={() => setReleaseModalOpen(false)}
        title="Disburse Deposit & Generate Release Order"
        description="Records banking settlement and creates official digitally verified PDF release order."
      >
        <form onSubmit={handleMarkReleasedSubmit} className="space-y-4">
          <Input
            label="Bank UTR Number"
            name="utr"
            required
            placeholder="e.g. UTR2026102600123"
            value={releaseForm.utr}
            onChange={e => setReleaseForm({ ...releaseForm, utr: e.target.value })}
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Release Date"
              name="releaseDate"
              type="date"
              required
              value={releaseForm.releaseDate}
              onChange={e => setReleaseForm({ ...releaseForm, releaseDate: e.target.value })}
            />
            <Input
              label="Net Released Amount (₹)"
              name="releasedAmountRupees"
              type="number"
              required
              value={releaseForm.releasedAmountRupees}
              onChange={e => setReleaseForm({ ...releaseForm, releasedAmountRupees: e.target.value })}
              helperText={formatINR(rupeesToPaise(releaseForm.releasedAmountRupees))}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Deductions (₹)"
              name="deductionsRupees"
              type="number"
              value={releaseForm.deductionsRupees}
              onChange={e => setReleaseForm({ ...releaseForm, deductionsRupees: e.target.value })}
            />
            <Input
              label="Deduction Reason (if any)"
              name="deductionReason"
              placeholder="e.g. Penalty, processing fee"
              value={releaseForm.deductionReason}
              onChange={e => setReleaseForm({ ...releaseForm, deductionReason: e.target.value })}
            />
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
            <Button type="button" variant="secondary" size="sm" onClick={() => setReleaseModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="success" size="sm" loading={actionLoading}>
              Confirm Release & Issue PDF
            </Button>
          </div>
        </form>
      </Modal>
    </AppLayout>
  );
}
