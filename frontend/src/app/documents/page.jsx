'use client';

import React, { useState, useEffect } from 'react';
import AppLayout from '../../components/layout/AppLayout';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import { formatDate, api, API_BASE_URL } from '../../lib/utils';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import {
  FileCheck,
  CheckCircle2,
  XCircle,
  Download,
  Eye,
  Building,
  ShieldAlert,
} from 'lucide-react';

export default function DocumentQueuePage() {
  const { user } = useAuth();
  const [queue, setQueue] = useState([]);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [loading, setLoading] = useState(true);

  // Reject modal
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectRemarks, setRejectRemarks] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  async function loadQueue() {
    setLoading(true);
    try {
      const res = await api.get('/documents/verification-queue?pageSize=50');
      if (res.data?.success) {
        setQueue(res.data.data);
        if (res.data.data?.length > 0 && !selectedDoc) {
          setSelectedDoc(res.data.data[0]);
        }
      }
    } catch (err) {
      console.error('Failed to load queue:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadQueue();
  }, []);

  // Keyboard shortcuts (V=Verify, R=Reject, J=Next, K=Prev)
  useEffect(() => {
    function handleKeyDown(e) {
      if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;

      if (e.key === 'v' || e.key === 'V') {
        if (selectedDoc) handleVerify(selectedDoc.id);
      } else if (e.key === 'r' || e.key === 'R') {
        if (selectedDoc) setRejectOpen(true);
      } else if (e.key === 'j' || e.key === 'J') {
        // Next
        const idx = queue.findIndex(d => d.id === selectedDoc?.id);
        if (idx !== -1 && idx < queue.length - 1) {
          setSelectedDoc(queue[idx + 1]);
        }
      } else if (e.key === 'k' || e.key === 'K') {
        // Prev
        const idx = queue.findIndex(d => d.id === selectedDoc?.id);
        if (idx > 0) {
          setSelectedDoc(queue[idx - 1]);
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedDoc, queue]);

  const handleVerify = async (docId) => {
    setActionLoading(true);
    try {
      const res = await api.patch(`/documents/${docId}/verify`);
      if (res.data?.success) {
        toast.success('Document marked VERIFIED');
        setQueue(prev => prev.filter(d => d.id !== docId));
        setSelectedDoc(queue.find(d => d.id !== docId) || null);
      }
    } catch {
      // Error handled by interceptor
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (e) => {
    e.preventDefault();
    if (!rejectRemarks.trim() || !selectedDoc) return;

    setActionLoading(true);
    try {
      const res = await api.patch(`/documents/${selectedDoc.id}/reject`, {
        remarks: rejectRemarks,
      });
      if (res.data?.success) {
        toast.success('Document REJECTED with remarks');
        setRejectOpen(false);
        setRejectRemarks('');
        setQueue(prev => prev.filter(d => d.id !== selectedDoc.id));
        setSelectedDoc(queue.find(d => d.id !== selectedDoc.id) || null);
      }
    } catch {
      // Handled by interceptor
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white">
              Document Verification Queue
            </h1>
            <p className="text-xs text-slate-500">
              Checker queue for verifying institution FDR scans, bank letters, and lien documents.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
            <span className="hidden sm:inline">Shortcuts:</span>
            <kbd className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border font-mono">V</kbd> Verify
            <kbd className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border font-mono">R</kbd> Reject
            <kbd className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border font-mono">J / K</kbd> Navigate
          </div>
        </div>

        {/* Split Pane: Queue List (Left) & Preview Panel (Right) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left: Queue Items */}
          <div className="lg:col-span-5 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Pending Verification ({queue.length})
              </span>
              <button
                onClick={loadQueue}
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium"
              >
                Refresh
              </button>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-[600px] overflow-y-auto">
              {loading ? (
                <div className="p-8 text-center text-xs text-slate-400">Loading queue...</div>
              ) : queue.length === 0 ? (
                <div className="p-12 text-center text-xs text-slate-400 space-y-2">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
                  <p className="font-semibold text-slate-700 dark:text-slate-300">All Caught Up!</p>
                  <p>No documents currently awaiting verification.</p>
                </div>
              ) : (
                queue.map(doc => {
                  const isSelected = selectedDoc?.id === doc.id;
                  return (
                    <div
                      key={doc.id}
                      onClick={() => setSelectedDoc(doc)}
                      className={`p-4 cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-blue-50/70 dark:bg-blue-950/40 border-l-4 border-[#0B1F4B]'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-bold text-xs text-slate-900 dark:text-slate-100 truncate">
                            {doc.documentType?.replace(/_/g, ' ')}
                          </p>
                          <p className="text-[11px] text-slate-500 truncate mt-0.5">
                            {doc.fdr?.institution?.name}
                          </p>
                          <p className="font-mono text-[10px] text-slate-400 mt-0.5">
                            FDR: {doc.fdr?.fdrNumber}
                          </p>
                        </div>
                        <span className="text-[10px] font-semibold text-slate-400 whitespace-nowrap">
                          {formatDate(doc.createdAt)}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Right: Preview & Review Panel */}
          <div className="lg:col-span-7 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs p-6 space-y-5">
            {selectedDoc ? (
              <>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      {selectedDoc.documentType?.replace(/_/g, ' ')}
                    </h3>
                    <p className="text-xs text-slate-500 font-mono">
                      {selectedDoc.originalName} (v{selectedDoc.version})
                    </p>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2">
                    <Button
                      variant="success"
                      size="sm"
                      icon={CheckCircle2}
                      loading={actionLoading}
                      onClick={() => handleVerify(selectedDoc.id)}
                    >
                      Verify (V)
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      icon={XCircle}
                      loading={actionLoading}
                      onClick={() => setRejectOpen(true)}
                    >
                      Reject (R)
                    </Button>
                  </div>
                </div>

                {/* Metadata Details */}
                <div className="grid grid-cols-2 gap-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800 text-xs">
                  <div>
                    <span className="text-slate-400 font-medium">Institution:</span>
                    <p className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                      {selectedDoc.fdr?.institution?.name}
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-400 font-medium">FDR Number:</span>
                    <p className="font-mono font-bold text-blue-600 dark:text-blue-400">
                      {selectedDoc.fdr?.fdrNumber}
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-400 font-medium">Uploaded By:</span>
                    <p className="font-semibold">{selectedDoc.uploadedBy?.name}</p>
                  </div>
                  <div>
                    <span className="text-slate-400 font-medium">Uploaded Date:</span>
                    <p className="font-semibold">{formatDate(selectedDoc.createdAt)}</p>
                  </div>
                </div>

                {/* Document Preview Box */}
                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-8 flex flex-col items-center justify-center text-center space-y-4 min-h-[320px]">
                  <div className="p-4 rounded-full bg-white dark:bg-slate-800 shadow-sm">
                    <FileCheck className="w-10 h-10 text-[#0B1F4B] dark:text-blue-400" />
                  </div>
                  <div className="space-y-1">
                    <p className="font-bold text-sm text-slate-800 dark:text-slate-200">
                      {selectedDoc.originalName}
                    </p>
                    <p className="text-xs text-slate-400 font-mono">
                      MIME: {selectedDoc.mimeType} • Size: {(selectedDoc.fileSize / 1024).toFixed(1)} KB
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <a
                      href={`${API_BASE_URL}/documents/${selectedDoc.id}/download`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <Button variant="primary" size="sm" icon={Download}>
                        Download Document
                      </Button>
                    </a>
                  </div>
                </div>
              </>
            ) : (
              <div className="p-16 text-center text-slate-400 text-xs">
                Select a document from the queue on the left to review.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Reject Modal with Mandatory Remarks */}
      <Modal
        isOpen={rejectOpen}
        onClose={() => setRejectOpen(false)}
        title="Reject Document"
        description="Provide clear, mandatory rejection remarks explaining the deficiency to the institution."
      >
        <form onSubmit={handleReject} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Deficiency Remarks <span className="text-red-500">*</span>
            </label>
            <textarea
              required
              rows={3}
              value={rejectRemarks}
              onChange={e => setRejectRemarks(e.target.value)}
              placeholder="e.g. Bank seal illegible; maturity amount mismatch with deposit certificate..."
              className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
            <Button type="button" variant="secondary" size="sm" onClick={() => setRejectOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="danger" size="sm" loading={actionLoading}>
              Confirm Rejection
            </Button>
          </div>
        </form>
      </Modal>
    </AppLayout>
  );
}
