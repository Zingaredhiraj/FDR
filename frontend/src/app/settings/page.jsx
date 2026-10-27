'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import AppLayout from '../../components/layout/AppLayout';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import DataTable from '../../components/ui/DataTable';
import { api, formatDate } from '../../lib/utils';
import {
  Settings,
  Building,
  Play,
  CheckCircle2,
  XCircle,
  Plus,
  Clock,
  Bell,
  Sliders,
  Shield,
  RefreshCw,
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function SettingsPage() {
  const { user: currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState('settings'); // settings, banks, jobs
  const [settings, setSettings] = useState([]);
  const [banks, setBanks] = useState([]);
  const [loading, setLoading] = useState(true);

  // Near maturity days state
  const [nearMaturityDays, setNearMaturityDays] = useState('90');
  const [savingSetting, setSavingSetting] = useState(false);

  // Bank Master modal state
  const [bankModalOpen, setBankModalOpen] = useState(false);
  const [bankFormData, setBankFormData] = useState({ name: '', shortCode: '' });
  const [savingBank, setSavingBank] = useState(false);

  // Job Run States
  const [runningStatusJob, setRunningStatusJob] = useState(false);
  const [runningAlertJob, setRunningAlertJob] = useState(false);
  const [lastJobResult, setLastJobResult] = useState(null);

  const isSuperAdmin = currentUser?.role === 'SUPER_ADMIN';

  useEffect(() => {
    if (!isSuperAdmin) {
      setLoading(false);
      return;
    }
    loadData();
  }, [isSuperAdmin]);

  async function loadData() {
    setLoading(true);
    try {
      const [settingsRes, banksRes] = await Promise.all([
        api.get('/settings'),
        api.get('/banks'),
      ]);

      if (settingsRes.data?.success) {
        setSettings(settingsRes.data.data);
        const nearMat = settingsRes.data.data.find(s => s.key === 'nearMaturityDays');
        if (nearMat) setNearMaturityDays(nearMat.value);
      }

      if (banksRes.data?.success) {
        setBanks(banksRes.data.data);
      }
    } catch {
      toast.error('Failed to load system configuration');
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveNearMaturity(e) {
    e.preventDefault();
    const days = parseInt(nearMaturityDays, 10);
    if (isNaN(days) || days < 1 || days > 365) {
      toast.error('Please enter a valid number of days between 1 and 365');
      return;
    }

    setSavingSetting(true);
    try {
      const res = await api.put('/settings/nearMaturityDays', { value: days.toString() });
      if (res.data?.success) {
        toast.success('Near maturity threshold updated successfully');
        loadData();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update threshold');
    } finally {
      setSavingSetting(false);
    }
  }

  async function handleAddBank(e) {
    e.preventDefault();
    if (!bankFormData.name || !bankFormData.shortCode) {
      toast.error('Please provide bank name and short code');
      return;
    }

    setSavingBank(true);
    try {
      const res = await api.post('/banks', {
        name: bankFormData.name.trim(),
        shortCode: bankFormData.shortCode.trim().toUpperCase(),
      });
      if (res.data?.success) {
        toast.success('Bank added to master list');
        setBankModalOpen(false);
        setBankFormData({ name: '', shortCode: '' });
        loadData();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add bank');
    } finally {
      setSavingBank(false);
    }
  }

  async function handleToggleBank(bankId, currentStatus) {
    try {
      const res = await api.put(`/banks/${bankId}`, { isActive: !currentStatus });
      if (res.data?.success) {
        toast.success(`Bank ${!currentStatus ? 'activated' : 'deactivated'}`);
        setBanks(prev => prev.map(b => (b.id === bankId ? { ...b, isActive: !currentStatus } : b)));
      }
    } catch (err) {
      toast.error('Failed to update bank status');
    }
  }

  async function triggerStatusJob() {
    setRunningStatusJob(true);
    try {
      const res = await api.post('/jobs/status');
      if (res.data?.success) {
        toast.success(res.data.message || 'Status job completed');
        setLastJobResult({
          type: 'Status Evaluation Job',
          timestamp: new Date().toISOString(),
          message: res.data.message,
          data: res.data.data,
        });
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Status job failed');
    } finally {
      setRunningStatusJob(false);
    }
  }

  async function triggerAlertJob() {
    setRunningAlertJob(true);
    try {
      const res = await api.post('/jobs/alerts');
      if (res.data?.success) {
        toast.success(res.data.message || 'Alert job completed');
        setLastJobResult({
          type: 'Alert Dispatch Job',
          timestamp: new Date().toISOString(),
          message: res.data.message,
          data: res.data.data,
        });
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Alert job failed');
    } finally {
      setRunningAlertJob(false);
    }
  }

  const bankColumns = [
    {
      key: 'name',
      label: 'Bank Name',
      render: (name, row) => (
        <div>
          <div className="font-semibold text-slate-900 dark:text-white">{name}</div>
          <div className="text-xs text-slate-400">ID: {row.id}</div>
        </div>
      ),
    },
    {
      key: 'shortCode',
      label: 'Short Code',
      render: code => (
        <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold">
          {code}
        </span>
      ),
    },
    {
      key: 'isActive',
      label: 'Status',
      render: (active, row) => (
        <button
          onClick={() => handleToggleBank(row.id, active)}
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
            active
              ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-400'
              : 'bg-rose-50 text-rose-700 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-400'
          }`}
        >
          {active ? (
            <>
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Active</span>
            </>
          ) : (
            <>
              <XCircle className="w-3.5 h-3.5" />
              <span>Inactive</span>
            </>
          )}
        </button>
      ),
    },
    {
      key: 'createdAt',
      label: 'Registered On',
      render: d => <span className="text-xs text-slate-500">{formatDate(d)}</span>,
    },
  ];

  if (!isSuperAdmin) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6">
          <Shield className="w-16 h-16 text-rose-500 mb-4" />
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Access Restricted</h2>
          <p className="text-sm text-slate-500 max-w-md">
            System settings and background job operations are reserved exclusively for AICTE Super Administrators.
          </p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Settings className="w-7 h-7 text-[#0B1F4B] dark:text-blue-400" />
            System Settings & Operations
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Configure system-wide parameters, manage bank master directories, and trigger background worker jobs
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 gap-6">
          <button
            onClick={() => setActiveTab('settings')}
            className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors ${
              activeTab === 'settings'
                ? 'border-[#0B1F4B] text-[#0B1F4B] dark:border-blue-400 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span>Maturity Parameters</span>
          </button>

          <button
            onClick={() => setActiveTab('banks')}
            className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors ${
              activeTab === 'banks'
                ? 'border-[#0B1F4B] text-[#0B1F4B] dark:border-blue-400 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <Building className="w-4 h-4" />
            <span>Bank Master ({banks.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('jobs')}
            className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors ${
              activeTab === 'jobs'
                ? 'border-[#0B1F4B] text-[#0B1F4B] dark:border-blue-400 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Background Job Triggers</span>
          </button>
        </div>

        {/* Tab 1: System Settings */}
        {activeTab === 'settings' && (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs max-w-2xl">
            <h2 className="text-base font-bold text-slate-900 dark:text-white mb-2">
              Near Maturity Horizon
            </h2>
            <p className="text-xs text-slate-500 mb-6 leading-relaxed">
              When an FDR’s maturity date falls within this window (in days) from today (Asia/Kolkata),
              the automated daily status job transitions its status from <span className="font-semibold text-blue-600">ACTIVE</span> to <span className="font-semibold text-amber-600">NEAR_MATURITY</span> and initiates the alert schedule sequence.
            </p>

            <form onSubmit={handleSaveNearMaturity} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Near Maturity Threshold (in Days)
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min="1"
                    max="365"
                    value={nearMaturityDays}
                    onChange={e => setNearMaturityDays(e.target.value)}
                    className="w-36 px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-bold focus:outline-none focus:ring-2 focus:ring-[#0B1F4B]/30"
                  />
                  <span className="text-xs text-slate-500">Days prior to maturity</span>
                </div>
              </div>

              <div className="pt-2">
                <Button type="submit" loading={savingSetting}>
                  Save Setting
                </Button>
              </div>
            </form>
          </div>
        )}

        {/* Tab 2: Bank Master */}
        {activeTab === 'banks' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-xs text-slate-500">
                Banks available for selection when institutions register new FDR instruments.
              </p>
              <Button onClick={() => setBankModalOpen(true)} className="flex items-center gap-2">
                <Plus className="w-4 h-4" />
                <span>Add New Bank</span>
              </Button>
            </div>

            <DataTable
              columns={bankColumns}
              data={banks}
              loading={loading}
              emptyMessage="No banks found."
            />

            {/* Add Bank Modal */}
            <Modal
              isOpen={bankModalOpen}
              onClose={() => setBankModalOpen(false)}
              title="Add Bank to Master Directory"
            >
              <form onSubmit={handleAddBank} className="space-y-4">
                <Input
                  label="Bank Full Name"
                  required
                  placeholder="e.g. Punjab National Bank"
                  value={bankFormData.name}
                  onChange={e => setBankFormData({ ...bankFormData, name: e.target.value })}
                />

                <Input
                  label="Short Code (2–10 uppercase letters)"
                  required
                  placeholder="e.g. PNB"
                  value={bankFormData.shortCode}
                  onChange={e => setBankFormData({ ...bankFormData, shortCode: e.target.value })}
                />

                <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <Button type="button" variant="secondary" onClick={() => setBankModalOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" loading={savingBank}>
                    Save Bank
                  </Button>
                </div>
              </form>
            </Modal>
          </div>
        )}

        {/* Tab 3: Background Jobs */}
        {activeTab === 'jobs' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Card 1: Status Job */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <RefreshCw className="w-5 h-5 text-blue-600" />
                    <h3 className="font-bold text-slate-900 dark:text-white">FDR Status Evaluation Job</h3>
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed mb-4">
                    Evaluates all ACTIVE and NEAR_MATURITY FDRs against today’s date in Asia/Kolkata timezone:
                  </p>
                  <ul className="text-xs text-slate-600 dark:text-slate-300 space-y-1.5 list-disc pl-5 mb-6">
                    <li>Within {nearMaturityDays} days → Transitions to <strong>NEAR_MATURITY</strong></li>
                    <li>Maturity date &lt; today → Transitions to <strong>MATURED</strong></li>
                    <li>Standard schedule: Runs daily at <strong>06:00 IST</strong></li>
                  </ul>
                </div>
                <Button
                  onClick={triggerStatusJob}
                  loading={runningStatusJob}
                  className="w-full flex items-center justify-center gap-2"
                >
                  <Play className="w-4 h-4" />
                  <span>Execute Status Job Now</span>
                </Button>
              </div>

              {/* Card 2: Alert Job */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Bell className="w-5 h-5 text-amber-500" />
                    <h3 className="font-bold text-slate-900 dark:text-white">Alert Dispatch & Reminder Job</h3>
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed mb-4">
                    Scans maturity horizons and overdue FDRs to dispatch notification alerts:
                  </p>
                  <ul className="text-xs text-slate-600 dark:text-slate-300 space-y-1.5 list-disc pl-5 mb-6">
                    <li>Maturity sequence: <strong>90, 60, 30, 15, 7, 1 days</strong> before & on maturity</li>
                    <li>Overdue cadence: <strong>Every 7 days</strong> while overdue</li>
                    <li>Guaranteed Idempotence: Deduplicated via AlertLog table</li>
                  </ul>
                </div>
                <Button
                  onClick={triggerAlertJob}
                  loading={runningAlertJob}
                  variant="secondary"
                  className="w-full flex items-center justify-center gap-2 border border-slate-300 dark:border-slate-700"
                >
                  <Play className="w-4 h-4" />
                  <span>Execute Alert Job Now</span>
                </Button>
              </div>
            </div>

            {/* Last Execution Result Banner */}
            {lastJobResult && (
              <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-2xl p-5">
                <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-bold text-sm mb-1">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{lastJobResult.type} Finished Successfully</span>
                </div>
                <p className="text-xs text-emerald-700 dark:text-emerald-400 mb-2">
                  {lastJobResult.message}
                </p>
                <div className="text-[11px] font-mono text-emerald-600 dark:text-emerald-500">
                  Executed at: {new Date(lastJobResult.timestamp).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
