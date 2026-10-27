'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import axios from 'axios';
import { formatINR, formatDate } from '../../../lib/utils';
import {
  ShieldCheck,
  ShieldAlert,
  Building2,
  Landmark,
  FileCheck,
  Calendar,
  IndianRupee,
  Lock,
  ExternalLink,
} from 'lucide-react';

export default function VerifyReleasePage() {
  const params = useParams();
  const refParam = params?.ref ? decodeURIComponent(params.ref) : '';

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!refParam) return;

    async function verify() {
      setLoading(true);
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
        const res = await axios.get(`${apiUrl}/public/verify-release/${encodeURIComponent(refParam)}`);
        if (res.data?.success && res.data.data) {
          setData(res.data.data);
          setError(null);
        } else {
          setError('Release record could not be verified.');
        }
      } catch (err) {
        setError(err.response?.data?.message || 'Release record not found or invalid.');
      } finally {
        setLoading(false);
      }
    }

    verify();
  }, [refParam]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 py-12 px-4 sm:px-6 lg:px-8 flex flex-col items-center justify-center font-sans">
      <div className="max-w-xl w-full bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
        {/* Top Official Banner */}
        <div className="bg-[#0B1F4B] p-6 text-center text-white relative">
          <div className="flex items-center justify-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/20">
              <ShieldCheck className="w-6 h-6 text-[#FF9933]" />
            </div>
            <div className="text-left">
              <h1 className="text-base font-bold tracking-tight">AICTE FDR VAULT</h1>
              <p className="text-[11px] text-slate-300">
                All India Council for Technical Education, New Delhi
              </p>
            </div>
          </div>
          <div className="mt-3 text-xs tracking-wider uppercase font-semibold text-white/80">
            Public Document Verification Portal
          </div>
        </div>

        {/* Content */}
        <div className="p-6 sm:p-8">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center">
              <div className="w-10 h-10 border-4 border-[#0B1F4B] border-t-transparent rounded-full animate-spin mb-4" />
              <p className="text-sm font-medium text-slate-500">
                Verifying release certificate against AICTE repository...
              </p>
            </div>
          ) : error ? (
            <div className="py-8 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-rose-100 dark:bg-rose-950/50 text-rose-600 flex items-center justify-center mx-auto">
                <ShieldAlert className="w-8 h-8" />
              </div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                Verification Failed
              </h2>
              <p className="text-sm text-slate-500 max-w-sm mx-auto">
                {error}
              </p>
              <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl font-mono text-xs text-slate-600 dark:text-slate-400">
                Queried Reference: {refParam}
              </div>
              <p className="text-xs text-slate-400">
                If you believe this is in error, please contact AICTE Finance Bureau at fdr-support@aicte-india.org.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Verified Badge */}
              <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-emerald-900 dark:text-emerald-300">
                    Officially Verified Release Order
                  </h3>
                  <p className="text-xs text-emerald-700 dark:text-emerald-400">
                    This security deposit / FDR release order is authentic and logged on AICTE records.
                  </p>
                </div>
              </div>

              {/* Order Reference */}
              <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  Release Order Reference
                </div>
                <div className="text-base font-bold font-mono text-[#0B1F4B] dark:text-blue-400">
                  {data.orderReference || refParam}
                </div>
              </div>

              {/* Detailed Breakdown */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                  <div className="flex items-center gap-1.5 text-slate-400 font-semibold mb-1">
                    <Building2 className="w-3.5 h-3.5" />
                    <span>Institution</span>
                  </div>
                  <div className="font-bold text-slate-900 dark:text-white truncate">
                    {data.institution?.name || '—'}
                  </div>
                  <div className="text-[11px] text-slate-500 font-mono">
                    AICTE ID: {data.institution?.aicteId || '—'}
                  </div>
                </div>

                <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                  <div className="flex items-center gap-1.5 text-slate-400 font-semibold mb-1">
                    <Landmark className="w-3.5 h-3.5" />
                    <span>Bank & Branch</span>
                  </div>
                  <div className="font-bold text-slate-900 dark:text-white truncate">
                    {data.bank?.name || '—'}
                  </div>
                  <div className="text-[11px] text-slate-500 truncate">
                    {data.branch || '—'}
                  </div>
                </div>

                <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                  <div className="flex items-center gap-1.5 text-slate-400 font-semibold mb-1">
                    <FileCheck className="w-3.5 h-3.5" />
                    <span>FDR Number</span>
                  </div>
                  <div className="font-bold font-mono text-slate-900 dark:text-white">
                    {data.fdrNumber || '—'}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Status: <span className="font-semibold text-emerald-600">RELEASED</span>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                  <div className="flex items-center gap-1.5 text-slate-400 font-semibold mb-1">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Release Date</span>
                  </div>
                  <div className="font-bold text-slate-900 dark:text-white">
                    {data.releaseDate ? formatDate(data.releaseDate) : '—'}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    UTR: <span className="font-mono">{data.utrNumber || 'CONFIRMED'}</span>
                  </div>
                </div>
              </div>

              {/* Released Amount Banner */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-800/80 border border-blue-100 dark:border-slate-700 flex items-center justify-between">
                <div>
                  <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    Total Released Deposit Amount
                  </div>
                  <div className="text-xl font-extrabold text-[#0B1F4B] dark:text-blue-300">
                    {formatINR(data.releasedAmount || data.principal || 0)}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-white dark:bg-slate-700 shadow-xs text-emerald-600">
                  <IndianRupee className="w-6 h-6" />
                </div>
              </div>

              {/* Verification Seal Footer */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 text-center">
                <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-500 mb-1">
                  <Lock className="w-3.5 h-3.5 text-slate-400" />
                  <span>Digitally verified via AICTE cryptographic ledger</span>
                </div>
                <p className="text-[10px] text-slate-400">
                  AICTE House, Nelson Mandela Marg, Vasant Kunj, New Delhi - 110070
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
