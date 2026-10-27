'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AppLayout from '../../../components/layout/AppLayout';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import Select from '../../../components/ui/Select';
import { api, formatINR, formatDate, rupeesToPaise } from '../../../lib/utils';
import toast from 'react-hot-toast';
import { Calculator, ArrowLeft, ShieldCheck, CheckCircle2 } from 'lucide-react';

export default function FdrCreatePage() {
  const router = useRouter();

  const [institutions, setInstitutions] = useState([]);
  const [banks, setBanks] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    fdrNumber: '',
    institutionId: '',
    bankId: '',
    branch: '',
    ifsc: '',
    principalRupees: '1000000', // Default ₹10 Lakh
    interestRate: 7.0,
    interestType: 'CUMULATIVE',
    issueDate: new Date().toISOString().split('T')[0],
    tenureMonths: 12,
    lienMarked: true,
    purpose: 'SECURITY_DEPOSIT',
    academicYear: '2025-26',
    remarks: '',
  });

  // Live calculation preview state
  const [preview, setPreview] = useState(null);
  const [calcLoading, setCalcLoading] = useState(false);

  useEffect(() => {
    async function loadMasters() {
      try {
        const [instRes, bankRes] = await Promise.all([
          api.get('/institutions?pageSize=100'),
          api.get('/banks'),
        ]);
        if (instRes.data?.success) setInstitutions(instRes.data.data);
        if (bankRes.data?.success) setBanks(bankRes.data.data);

        if (instRes.data?.data?.length > 0) {
          setFormData(prev => ({ ...prev, institutionId: instRes.data.data[0].id }));
        }
        if (bankRes.data?.data?.length > 0) {
          setFormData(prev => ({ ...prev, bankId: bankRes.data.data[0].id }));
        }
      } catch (err) {
        console.error('Failed to load masters:', err);
      }
    }
    loadMasters();
  }, []);

  // Live calculate preview whenever inputs change
  useEffect(() => {
    if (!formData.principalRupees || !formData.interestRate || !formData.tenureMonths || !formData.issueDate) {
      return;
    }

    const timer = setTimeout(async () => {
      setCalcLoading(true);
      try {
        const payload = {
          principal: rupeesToPaise(formData.principalRupees),
          interestRate: Number(formData.interestRate),
          interestType: formData.interestType,
          issueDate: formData.issueDate,
          tenureMonths: Number(formData.tenureMonths),
        };
        const res = await api.post('/fdrs/calculate', payload);
        if (res.data?.success) {
          setPreview(res.data.data);
        }
      } catch (err) {
        console.error('Calculation preview failed:', err);
      } finally {
        setCalcLoading(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [
    formData.principalRupees,
    formData.interestRate,
    formData.interestType,
    formData.issueDate,
    formData.tenureMonths,
  ]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const payload = {
        fdrNumber: formData.fdrNumber,
        institutionId: formData.institutionId,
        bankId: formData.bankId,
        branch: formData.branch,
        ifsc: formData.ifsc.toUpperCase(),
        principal: rupeesToPaise(formData.principalRupees),
        interestRate: Number(formData.interestRate),
        interestType: formData.interestType,
        issueDate: formData.issueDate,
        tenureMonths: Number(formData.tenureMonths),
        lienMarked: formData.lienMarked,
        purpose: formData.purpose,
        academicYear: formData.academicYear,
        remarks: formData.remarks,
      };

      const res = await api.post('/fdrs', payload);
      if (res.data?.success) {
        toast.success('FDR Record created successfully!');
        router.push(`/fdrs/${res.data.data.id}`);
      }
    } catch (err) {
      // Error handled by interceptor
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6 max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <a
              href="/fdrs"
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <ArrowLeft className="w-4 h-4 text-slate-600 dark:text-slate-300" />
            </a>
            <div>
              <h1 className="text-2xl font-black text-slate-900 dark:text-white">
                New Fixed Deposit Record
              </h1>
              <p className="text-xs text-slate-500">
                Register a new institutional security deposit FDR into the vault.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Form */}
          <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-6">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="FDR Number"
                  name="fdrNumber"
                  required
                  placeholder="e.g. FDR-2026-98124"
                  value={formData.fdrNumber}
                  onChange={handleChange}
                />

                <Select
                  label="Institution"
                  name="institutionId"
                  required
                  value={formData.institutionId}
                  onChange={handleChange}
                >
                  {institutions.map(inst => (
                    <option key={inst.id} value={inst.id}>
                      {inst.name} ({inst.aicteId})
                    </option>
                  ))}
                </Select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Select
                  label="Bank"
                  name="bankId"
                  required
                  value={formData.bankId}
                  onChange={handleChange}
                >
                  {banks.map(bank => (
                    <option key={bank.id} value={bank.id}>
                      {bank.name} ({bank.shortCode})
                    </option>
                  ))}
                </Select>

                <Input
                  label="Branch"
                  name="branch"
                  required
                  placeholder="e.g. Connaught Place Branch"
                  value={formData.branch}
                  onChange={handleChange}
                />

                <Input
                  label="IFSC Code"
                  name="ifsc"
                  required
                  placeholder="e.g. SBIN0001234"
                  value={formData.ifsc}
                  onChange={handleChange}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Principal Amount (₹)"
                  name="principalRupees"
                  type="number"
                  required
                  min="1"
                  step="1"
                  placeholder="1000000"
                  value={formData.principalRupees}
                  onChange={handleChange}
                  helperText={formatINR(rupeesToPaise(formData.principalRupees))}
                />

                <Input
                  label="Interest Rate (% p.a.)"
                  name="interestRate"
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  required
                  value={formData.interestRate}
                  onChange={handleChange}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Select
                  label="Interest Type"
                  name="interestType"
                  value={formData.interestType}
                  onChange={handleChange}
                >
                  <option value="CUMULATIVE">CUMULATIVE (Quarterly Compounding)</option>
                  <option value="QUARTERLY_PAYOUT">QUARTERLY PAYOUT</option>
                </Select>

                <Input
                  label="Issue Date"
                  name="issueDate"
                  type="date"
                  required
                  value={formData.issueDate}
                  onChange={handleChange}
                />

                <Input
                  label="Tenure (Months)"
                  name="tenureMonths"
                  type="number"
                  required
                  min="1"
                  max="360"
                  value={formData.tenureMonths}
                  onChange={handleChange}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Select
                  label="Deposit Purpose"
                  name="purpose"
                  value={formData.purpose}
                  onChange={handleChange}
                >
                  <option value="SECURITY_DEPOSIT">SECURITY DEPOSIT</option>
                  <option value="APPROVAL_PROCESS_FEE">APPROVAL PROCESS FEE</option>
                  <option value="PERFORMANCE_GUARANTEE">PERFORMANCE GUARANTEE</option>
                  <option value="OTHER">OTHER</option>
                </Select>

                <Input
                  label="Academic Year"
                  name="academicYear"
                  required
                  placeholder="2025-26"
                  value={formData.academicYear}
                  onChange={handleChange}
                />
              </div>

              <div className="space-y-1.5">
                <Input
                  label="Remarks (Optional)"
                  name="remarks"
                  placeholder="Any special lien conditions or notes..."
                  value={formData.remarks}
                  onChange={handleChange}
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="lienMarked"
                  name="lienMarked"
                  checked={formData.lienMarked}
                  onChange={handleChange}
                  className="w-4 h-4 text-[#0B1F4B] rounded border-slate-300 focus:ring-[#0B1F4B]"
                />
                <label htmlFor="lienMarked" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Lien Marked in Favor of AICTE (Mandatory for security deposit approval)
                </label>
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
                <a href="/fdrs">
                  <Button type="button" variant="secondary">
                    Cancel
                  </Button>
                </a>
                <Button type="submit" variant="primary" loading={submitting}>
                  Save & Register FDR
                </Button>
              </div>
            </form>
          </div>

          {/* Right Column: Live Calculation Preview Card */}
          <div className="space-y-4">
            <div className="bg-gradient-to-br from-[#0B1F4B] to-[#1a3577] text-white p-6 rounded-3xl shadow-lg shadow-black/5 space-y-5">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <Calculator className="w-5 h-5 text-[#FF9933]" />
                  <h3 className="font-bold text-sm text-white">Live Maturity Preview</h3>
                </div>
                {calcLoading && (
                  <span className="text-[10px] text-white/70 animate-pulse">Calculating...</span>
                )}
              </div>

              <div className="space-y-4">
                <div>
                  <p className="text-xs text-white/70 font-medium">Principal Amount</p>
                  <p className="text-xl font-bold font-mono">
                    {formatINR(rupeesToPaise(formData.principalRupees))}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-white/70 font-medium">Estimated Maturity Amount</p>
                  <p className="text-2xl sm:text-3xl font-black text-[#FF9933] font-mono">
                    {preview ? formatINR(preview.maturityAmount) : '—'}
                  </p>
                  <p className="text-[10px] text-white/60 mt-0.5">
                    {formData.interestType === 'CUMULATIVE'
                      ? 'Compounded Quarterly: P × (1 + r/400)^(4n)'
                      : 'Quarterly Payout Mode'}
                  </p>
                </div>

                {formData.interestType === 'QUARTERLY_PAYOUT' && preview && (
                  <div className="p-3 rounded-xl bg-white/10">
                    <p className="text-xs text-white/70 font-medium">Quarterly Payout</p>
                    <p className="text-base font-bold font-mono text-emerald-300">
                      {formatINR(preview.quarterlyPayout)} / quarter
                    </p>
                  </div>
                )}

                <div className="pt-3 border-t border-white/10 flex items-center justify-between text-xs">
                  <span className="text-white/70">Calculated Maturity Date:</span>
                  <span className="font-bold font-mono text-white">
                    {preview ? formatDate(preview.maturityDate) : '—'}
                  </span>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-500 space-y-2">
              <div className="flex items-center gap-2 font-semibold text-slate-700 dark:text-slate-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span>Automated Clamping Logic</span>
              </div>
              <p>
                Month-end clamping guarantees accurate maturity dates (e.g., 31 Jan + 1 month clamps to
                Feb 28 / Feb 29 in leap years).
              </p>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
