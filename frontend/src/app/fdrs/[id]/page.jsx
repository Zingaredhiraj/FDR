'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import AppLayout from '../../../components/layout/AppLayout';
import Button from '../../../components/ui/Button';
import StatusChip from '../../../components/ui/StatusChip';
import Modal from '../../../components/ui/Modal';
import { formatINR, formatDate, formatDateTime, api, API_BASE_URL } from '../../../lib/utils';
import { useAuth } from '../../../context/AuthContext';
import toast from 'react-hot-toast';
import {
  ArrowLeft,
  ShieldCheck,
  Building,
  Landmark,
  FileText,
  Upload,
  CheckCircle,
  XCircle,
  AlertOctagon,
  Download,
  Send,
  RefreshCw,
  Info,
} from 'lucide-react';

export default function FdrDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { user } = useAuth();

  const [fdr, setFdr] = useState(null);
  const [loading, setLoading] = useState(true);

  // Upload modal state
  const [uploadOpen, setUploadOpen] = useState(false);
  const [docType, setDocType] = useState('FDR_SCAN');
  const [uploadFile, setUploadFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  // Reject modal state
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectDocId, setRejectDocId] = useState(null);
  const [rejectRemarks, setRejectRemarks] = useState('');
  const [rejecting, setRejecting] = useState(false);

  // Release initiate modal state
  const [releaseOpen, setReleaseOpen] = useState(false);
  const [premature, setPremature] = useState(false);
  const [prematureReason, setPrematureReason] = useState('');
  const [releasing, setReleasing] = useState(false);

  const canVerify = user?.role === 'SUPER_ADMIN' || user?.role === 'VERIFIER';
  const canInitiateRelease = user?.role === 'SUPER_ADMIN' || user?.role === 'FINANCE_OFFICER';

  async function loadFdr() {
    setLoading(true);
    try {
      const res = await api.get(`/fdrs/${id}`);
      if (res.data?.success) {
        setFdr(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load FDR:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (id) {
      loadFdr();
    }
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

  if (!fdr) {
    return (
      <AppLayout>
        <div className="text-center py-16 space-y-4">
          <p className="text-lg font-bold text-slate-700">FDR Record Not Found</p>
          <a href="/fdrs">
            <Button variant="secondary">Back to FDRs</Button>
          </a>
        </div>
      </AppLayout>
    );
  }

  // Check 4 release gates
  const requiredDocs = ['FDR_SCAN', 'BANK_CONFIRMATION', 'LIEN_LETTER'];
  const verifiedDocTypes = fdr.documents
    ?.filter(d => d.verificationStatus === 'VERIFIED')
    ?.map(d => d.documentType) || [];
  const isDocComplete = requiredDocs.every(t => verifiedDocTypes.includes(t));
  const missingDocs = requiredDocs.filter(t => !verifiedDocTypes.includes(t));

  const hasPendingDues = fdr.institution?.hasPendingDues;
  const hasOpenRelease = fdr.releaseRequests?.some(r => r.status !== 'RELEASED');
  const isMatured = fdr.status === 'MATURED';

  // Blocking reasons
  const blockReasons = [];
  if (!isDocComplete) {
    blockReasons.push(`Missing verified documents: ${missingDocs.join(', ')}`);
  }
  if (!isMatured && !premature) {
    blockReasons.push(`FDR status is ${fdr.status} (must be MATURED or flagged as premature)`);
  }
  if (hasOpenRelease) {
    blockReasons.push('Another open release request already exists for this FDR');
  }
  if (hasPendingDues) {
    blockReasons.push(`Institution has pending dues: ${fdr.institution?.pendingDuesNote || 'Clear dues first'}`);
  }

  const isReleaseBlocked = blockReasons.length > 0;

  // Document upload handler
  const handleUpload = async (e) => {
    e.preventDefault();
    if (!uploadFile) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('file', uploadFile);
    formData.append('documentType', docType);

    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch(`${API_BASE_URL}/fdrs/${id}/documents`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Document uploaded successfully!');
        setUploadOpen(false);
        setUploadFile(null);
        loadFdr();
      } else {
        toast.error(data.message || 'Upload failed');
      }
    } catch (err) {
      toast.error('Network error uploading document');
    } finally {
      setUploading(false);
    }
  };

  // Document verify handler
  const handleVerify = async (docId) => {
    try {
      const res = await api.patch(`/documents/${docId}/verify`);
      if (res.data?.success) {
        toast.success('Document verified successfully');
        loadFdr();
      }
    } catch {
      // Error handled by interceptor
    }
  };

  // Document reject handler
  const handleReject = async (e) => {
    e.preventDefault();
    if (!rejectRemarks.trim()) return;

    setRejecting(true);
    try {
      const res = await api.patch(`/documents/${rejectDocId}/reject`, {
        remarks: rejectRemarks,
      });
      if (res.data?.success) {
        toast.success('Document rejected with remarks');
        setRejectOpen(false);
        setRejectRemarks('');
        loadFdr();
      }
    } catch {
      // Handled by interceptor
    } finally {
      setRejecting(false);
    }
  };

  // Initiate Release Request handler
  const handleInitiateRelease = async (e) => {
    e.preventDefault();
    setReleasing(true);
    try {
      const res = await api.post('/releases', {
        fdrId: fdr.id,
        prematureRelease: premature,
        prematureReason: premature ? prematureReason : undefined,
      });
      if (res.data?.success) {
        toast.success('Release request created successfully!');
        setReleaseOpen(false);
        router.push(`/releases/${res.data.data.id}`);
      }
    } catch {
      // Handled by interceptor
    } finally {
      setReleasing(false);
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6 max-w-6xl mx-auto">
        {/* Navigation & Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <a
              href="/fdrs"
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </a>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                  {fdr.fdrNumber}
                </span>
                <StatusChip
                  status={fdr.status}
                  isOverdue={fdr.isOverdue}
                  overdueDays={fdr.overdueDays}
                />
              </div>
              <p className="text-xs text-slate-500">
                Created on {formatDate(fdr.createdAt)} by {fdr.createdBy?.name || 'System'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Upload Document Button */}
            <Button
              variant="secondary"
              icon={Upload}
              onClick={() => setUploadOpen(true)}
            >
              Upload Document
            </Button>

            {/* Initiate Release Request Button */}
            {canInitiateRelease && (
              <Button
                variant={isReleaseBlocked ? 'secondary' : 'primary'}
                icon={Send}
                onClick={() => setReleaseOpen(true)}
              >
                Initiate Release
              </Button>
            )}
          </div>
        </div>

        {/* Release Gate Alert Banner if blocked */}
        {isReleaseBlocked && (
          <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200 space-y-1.5">
            <div className="flex items-center gap-2 font-bold">
              <AlertOctagon className="w-4 h-4 text-amber-600 flex-shrink-0" />
              <span>Release Processing Blocked by Policy Gates:</span>
            </div>
            <ul className="list-disc list-inside space-y-0.5 pl-6 text-amber-800 dark:text-amber-300">
              {blockReasons.map((reason, idx) => (
                <li key={idx}>{reason}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Renewal Chain Banner */}
        {fdr.parentFdr && (
          <div className="p-3.5 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-blue-900 dark:text-blue-200">
              <RefreshCw className="w-4 h-4 text-blue-600" />
              <span>Renewed from Parent FDR: <strong>{fdr.parentFdr.fdrNumber}</strong></span>
            </div>
            <a href={`/fdrs/${fdr.parentFdr.id}`} className="font-semibold text-blue-600 dark:text-blue-400 hover:underline">
              View Parent FDR &rarr;
            </a>
          </div>
        )}

        {/* Metadata Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Column 1: Financial Details */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 dark:border-slate-800 pb-2">
              Financial Terms
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <p className="text-slate-400 font-medium">Principal Deposit</p>
                <p className="text-lg font-bold font-mono text-slate-900 dark:text-white">
                  {formatINR(fdr.principal)}
                </p>
              </div>

              <div>
                <p className="text-slate-400 font-medium">Interest Rate & Type</p>
                <p className="font-semibold text-slate-800 dark:text-slate-200">
                  {fdr.interestRate}% p.a. ({fdr.interestType})
                </p>
              </div>

              <div>
                <p className="text-slate-400 font-medium">Maturity Amount</p>
                <p className="text-xl font-black font-mono text-emerald-600 dark:text-emerald-400">
                  {formatINR(fdr.maturityAmount)}
                </p>
              </div>

              {fdr.interestType === 'QUARTERLY_PAYOUT' && (
                <div>
                  <p className="text-slate-400 font-medium">Quarterly Payout</p>
                  <p className="font-bold font-mono text-blue-600 dark:text-blue-400">
                    {formatINR(fdr.quarterlyPayout)} / quarter
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Column 2: Dates & Tenures */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 dark:border-slate-800 pb-2">
              Timeline & Purpose
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <p className="text-slate-400 font-medium">Issue Date</p>
                <p className="font-semibold text-slate-800 dark:text-slate-200">
                  {formatDate(fdr.issueDate)}
                </p>
              </div>

              <div>
                <p className="text-slate-400 font-medium">Tenure</p>
                <p className="font-semibold text-slate-800 dark:text-slate-200">
                  {fdr.tenureMonths} Months
                </p>
              </div>

              <div>
                <p className="text-slate-400 font-medium">Maturity Date</p>
                <p className="font-bold text-slate-900 dark:text-white font-mono">
                  {formatDate(fdr.maturityDate)}
                </p>
              </div>

              <div>
                <p className="text-slate-400 font-medium">Deposit Purpose</p>
                <p className="font-semibold text-slate-800 dark:text-slate-200">
                  {fdr.purpose?.replace(/_/g, ' ')} ({fdr.academicYear})
                </p>
              </div>

              <div>
                <p className="text-slate-400 font-medium">Lien Status</p>
                <p className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                  {fdr.lienMarked ? (
                    <>
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                      <span>Lien Marked to AICTE</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="w-3.5 h-3.5 text-slate-400" />
                      <span>Not Lien Marked</span>
                    </>
                  )}
                </p>
              </div>
            </div>
          </div>

          {/* Column 3: Institution & Bank */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 dark:border-slate-800 pb-2">
              Institution & Bank
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <p className="text-slate-400 font-medium">Institution</p>
                <a
                  href={`/institutions/${fdr.institution?.id}`}
                  className="font-bold text-blue-600 dark:text-blue-400 hover:underline"
                >
                  {fdr.institution?.name}
                </a>
                <p className="text-[10px] text-slate-400 font-mono">
                  AICTE ID: {fdr.institution?.aicteId}
                </p>
              </div>

              <div>
                <p className="text-slate-400 font-medium">Pending Dues</p>
                <p className="font-semibold">
                  {fdr.institution?.hasPendingDues ? (
                    <span className="text-red-500 font-bold">Has Pending Dues</span>
                  ) : (
                    <span className="text-emerald-600">No Dues Outstanding</span>
                  )}
                </p>
              </div>

              <div>
                <p className="text-slate-400 font-medium">Bank & Branch</p>
                <p className="font-semibold text-slate-800 dark:text-slate-200">
                  {fdr.bank?.name}
                </p>
                <p className="text-slate-500 text-[11px]">{fdr.branch}</p>
                <p className="text-slate-400 font-mono text-[10px]">IFSC: {fdr.ifsc}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Documents Section */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Attached Documents & Verification
                </h3>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    isDocComplete
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                      : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                  }`}
                >
                  {isDocComplete ? '✓ Document Complete' : '⚠ Incomplete Documents'}
                </span>
              </div>
              <p className="text-xs text-slate-500">
                FDR_SCAN, BANK_CONFIRMATION, and LIEN_LETTER must be verified to complete release gates.
              </p>
            </div>

            <Button
              variant="secondary"
              size="sm"
              icon={Upload}
              onClick={() => setUploadOpen(true)}
            >
              Upload Version
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-semibold uppercase">
                <tr>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">File Name</th>
                  <th className="px-4 py-3">Version</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Uploaded By</th>
                  <th className="px-4 py-3">Verification Remarks</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {fdr.documents?.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                      No documents uploaded yet. Upload the FDR Scan, Bank Confirmation, and Lien Letter.
                    </td>
                  </tr>
                ) : (
                  fdr.documents?.map(doc => (
                    <tr key={doc.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                      <td className="px-4 py-3 font-semibold text-slate-900 dark:text-slate-100">
                        {doc.documentType?.replace(/_/g, ' ')}
                      </td>
                      <td className="px-4 py-3 truncate max-w-[180px] font-mono text-[11px]">
                        {doc.originalName}
                      </td>
                      <td className="px-4 py-3 font-semibold">v{doc.version}</td>
                      <td className="px-4 py-3">
                        <StatusChip status={doc.verificationStatus} />
                      </td>
                      <td className="px-4 py-3 text-slate-500">
                        {doc.uploadedBy?.name || 'User'}
                      </td>
                      <td className="px-4 py-3 text-slate-500 max-w-[200px] truncate">
                        {doc.verificationRemarks || '—'}
                      </td>
                      <td className="px-4 py-3 text-right space-x-1.5 whitespace-nowrap">
                        <a
                          href={`${API_BASE_URL}/documents/${doc.id}/download`}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 inline-flex items-center text-slate-600 dark:text-slate-300"
                          title="Download Document"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </a>

                        {canVerify && doc.verificationStatus === 'PENDING' && (
                          <>
                            <button
                              onClick={() => handleVerify(doc.id)}
                              className="px-2 py-1 rounded-lg bg-emerald-600 text-white font-semibold hover:bg-emerald-700 transition-colors"
                            >
                              Verify
                            </button>
                            <button
                              onClick={() => {
                                setRejectDocId(doc.id);
                                setRejectOpen(true);
                              }}
                              className="px-2 py-1 rounded-lg bg-red-600 text-white font-semibold hover:bg-red-700 transition-colors"
                            >
                              Reject
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Upload Document Modal */}
      <Modal
        isOpen={uploadOpen}
        onClose={() => setUploadOpen(false)}
        title="Upload FDR Document"
        description="Accepted formats: PDF, JPG, PNG (Max 5 MB). File type verified by magic bytes."
      >
        <form onSubmit={handleUpload} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Document Type
            </label>
            <select
              value={docType}
              onChange={e => setDocType(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-[#0B1F4B]"
            >
              <option value="FDR_SCAN">FDR SCAN (Mandatory)</option>
              <option value="BANK_CONFIRMATION">BANK CONFIRMATION (Mandatory)</option>
              <option value="LIEN_LETTER">LIEN LETTER (Mandatory)</option>
              <option value="UNDERTAKING">UNDERTAKING</option>
              <option value="NOC">NOC</option>
              <option value="ID_PROOF">ID PROOF</option>
              <option value="OTHER">OTHER</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Select File
            </label>
            <input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              required
              onChange={e => setUploadFile(e.target.files?.[0] || null)}
              className="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-[#0B1F4B] file:text-white hover:file:bg-[#1a3577]"
            />
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
            <Button type="button" variant="secondary" size="sm" onClick={() => setUploadOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" loading={uploading}>
              Upload File
            </Button>
          </div>
        </form>
      </Modal>

      {/* Reject Document Modal */}
      <Modal
        isOpen={rejectOpen}
        onClose={() => setRejectOpen(false)}
        title="Reject Document"
        description="Provide mandatory remarks explaining why this document cannot be verified."
      >
        <form onSubmit={handleReject} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Rejection Remarks <span className="text-red-500">*</span>
            </label>
            <textarea
              required
              rows={3}
              value={rejectRemarks}
              onChange={e => setRejectRemarks(e.target.value)}
              placeholder="e.g. Bank seal not visible; FDR amount does not match..."
              className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
            <Button type="button" variant="secondary" size="sm" onClick={() => setRejectOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="danger" size="sm" loading={rejecting}>
              Confirm Rejection
            </Button>
          </div>
        </form>
      </Modal>

      {/* Initiate Release Modal */}
      <Modal
        isOpen={releaseOpen}
        onClose={() => setReleaseOpen(false)}
        title="Initiate Security Deposit Release Request"
        description="This will create a release request and submit it through the 4-tier verification and approval workflow."
      >
        <form onSubmit={handleInitiateRelease} className="space-y-4">
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 space-y-1 text-xs">
            <p><strong>FDR Number:</strong> {fdr.fdrNumber}</p>
            <p><strong>Institution:</strong> {fdr.institution?.name}</p>
            <p><strong>Maturity Amount:</strong> {formatINR(fdr.maturityAmount)}</p>
          </div>

          {!isMatured && (
            <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-red-700 dark:text-red-300">
                <AlertOctagon className="w-4 h-4" />
                <span>Premature Release Required</span>
              </div>
              <p className="text-[11px] text-red-600 dark:text-red-400">
                This FDR has not reached maturity date yet ({formatDate(fdr.maturityDate)}). Early release requires a mandatory reason shown in red to the Approving Authority.
              </p>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="prematureRelease"
                  checked={premature}
                  onChange={e => setPremature(e.target.checked)}
                  className="w-4 h-4 text-red-600 rounded border-slate-300 focus:ring-red-500"
                />
                <label htmlFor="prematureRelease" className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  I confirm this is an authorized premature release request
                </label>
              </div>

              {premature && (
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Premature Release Reason <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    required
                    rows={2}
                    value={prematureReason}
                    onChange={e => setPrematureReason(e.target.value)}
                    placeholder="Provide justification for early encashment/release..."
                    className="w-full p-2.5 rounded-xl border border-red-300 dark:border-red-700 bg-white dark:bg-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>
              )}
            </div>
          )}

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
            <Button type="button" variant="secondary" size="sm" onClick={() => setReleaseOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              loading={releasing}
              disabled={!isMatured && (!premature || !prematureReason.trim())}
            >
              Submit Release Request
            </Button>
          </div>
        </form>
      </Modal>
    </AppLayout>
  );
}
