'use client';

import React, { useState, useEffect } from 'react';
import AppLayout from '../../components/layout/AppLayout';
import DataTable from '../../components/ui/DataTable';
import StatusChip from '../../components/ui/StatusChip';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import { formatINR, formatDate, api, rupeesToPaise } from '../../lib/utils';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import { RefreshCw, ArrowUpRight, GitFork, Plus } from 'lucide-react';

export default function RenewalsPage() {
  const { user } = useAuth();
  const [renewalDue, setRenewalDue] = useState([]);
  const [loading, setLoading] = useState(true);

  // Renewal Wizard Modal
  const [wizardOpen, setWizardOpen] = useState(false);
  const [selectedParentFdr, setSelectedParentFdr] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Chain view modal
  const [chainOpen, setChainOpen] = useState(false);
  const [chainData, setChainData] = useState(null);
  const [chainLoading, setChainLoading] = useState(false);

  // Renewal Form
  const [formData, setFormData] = useState({
    fdrNumber: '',
    branch: '',
    ifsc: '',
    principalRupees: '',
    interestRate: 7.25,
    interestType: 'CUMULATIVE',
    issueDate: new Date().toISOString().split('T')[0],
    tenureMonths: 24,
    academicYear: '2025-26',
    remarks: '',
  });

  const canRenew = user?.role === 'SUPER_ADMIN' || user?.role === 'FINANCE_OFFICER';

  async function loadRenewalDue() {
    setLoading(true);
    try {
      const res = await api.get('/fdrs/renewal-due');
      if (res.data?.success) {
        setRenewalDue(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load renewal due:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadRenewalDue();
  }, []);

  const openWizard = (parent) => {
    setSelectedParentFdr(parent);
    setFormData({
      fdrNumber: `RNW-${parent.fdrNumber}`,
      branch: parent.branch || '',
      ifsc: parent.ifsc || '',
      principalRupees: String(Number(parent.maturityAmount) / 100),
      interestRate: parent.interestRate || 7.0,
      interestType: parent.interestType || 'CUMULATIVE',
      issueDate: new Date().toISOString().split('T')[0],
      tenureMonths: parent.tenureMonths || 12,
      academicYear: '2025-26',
      remarks: `Renewal of FDR ${parent.fdrNumber}`,
    });
    setWizardOpen(true);
  };

  const openChain = async (fdrId) => {
    setChainLoading(true);
    setChainOpen(true);
    try {
      const res = await api.get(`/fdrs/${fdrId}/chain`);
      if (res.data?.success) {
        setChainData(res.data.data);
      }
    } catch {
      toast.error('Failed to load renewal chain');
    } finally {
      setChainLoading(false);
    }
  };

  const handleRenewSubmit = async (e) => {
    e.preventDefault();
    if (!selectedParentFdr) return;

    setSubmitting(true);
    try {
      const payload = {
        fdrNumber: formData.fdrNumber,
        bankId: selectedParentFdr.bankId,
        branch: formData.branch,
        ifsc: formData.ifsc.toUpperCase(),
        principal: rupeesToPaise(formData.principalRupees),
        interestRate: Number(formData.interestRate),
        interestType: formData.interestType,
        issueDate: formData.issueDate,
        tenureMonths: Number(formData.tenureMonths),
        academicYear: formData.academicYear,
        remarks: formData.remarks,
      };

      const res = await api.post(`/fdrs/${selectedParentFdr.id}/renew`, payload);
      if (res.data?.success) {
        toast.success('FDR renewed successfully! New record created.');
        setWizardOpen(false);
        loadRenewalDue();
      }
    } catch {
      // Handled by interceptor
    } finally {
      setSubmitting(false);
    }
  };

  const columns = [
    {
      header: 'FDR Number',
      render: row => (
        <a
          href={`/fdrs/${row.id}`}
          className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
        >
          {row.fdrNumber} <ArrowUpRight className="w-3 h-3" />
        </a>
      ),
    },
    {
      header: 'Institution',
      render: row => (
        <div className="max-w-[200px] truncate text-xs">
          <p className="font-semibold truncate">{row.institution?.name}</p>
        </div>
      ),
    },
    {
      header: 'Bank',
      render: row => <span className="text-xs">{row.bank?.name}</span>,
    },
    {
      header: 'Maturity Amount',
      render: row => (
        <span className="font-mono font-bold text-xs text-emerald-600 dark:text-emerald-400">
          {formatINR(row.maturityAmount)}
        </span>
      ),
    },
    {
      header: 'Maturity Date',
      render: row => <span className="text-xs font-mono">{formatDate(row.maturityDate)}</span>,
    },
    {
      header: 'Status',
      render: row => <StatusChip status={row.status} />,
    },
    {
      header: 'Actions',
      render: row => (
        <div className="flex items-center gap-2">
          {canRenew && (
            <Button
              variant="primary"
              size="sm"
              icon={RefreshCw}
              onClick={() => openWizard(row)}
            >
              Renew Now
            </Button>
          )}
          <Button
            variant="secondary"
            size="sm"
            icon={GitFork}
            onClick={() => openChain(row.id)}
          >
            Chain
          </Button>
        </div>
      ),
    },
  ];

  // Recursive tree renderer for chain
  const renderChainNode = (node) => {
    if (!node) return null;
    return (
      <div className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 space-y-2">
        <div className="flex items-center justify-between">
          <span className="font-mono font-bold text-xs text-blue-600 dark:text-blue-400">
            {node.fdrNumber}
          </span>
          <StatusChip status={node.status} />
        </div>
        <div className="text-xs text-slate-500">
          <p>Principal: <strong>{formatINR(node.principal)}</strong> • Maturity: {formatDate(node.maturityDate)}</p>
          <p>Bank: {node.bank?.name}</p>
        </div>

        {node.children && node.children.length > 0 && (
          <div className="pl-4 border-l-2 border-blue-500 space-y-2 mt-3 pt-2">
            <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">
              Renewed Into:
            </span>
            {node.children.map(child => renderChainNode(child))}
          </div>
        )}
      </div>
    );
  };

  return (
    <AppLayout>
      <div className="space-y-6 max-w-6xl mx-auto">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white">
            Renewal Monitoring & Chains
          </h1>
          <p className="text-xs text-slate-500">
            FDRs near maturity or matured without renewal children. Reinvest deposits while preserving complete audit provenance.
          </p>
        </div>

        <DataTable
          columns={columns}
          data={renewalDue}
          loading={loading}
          total={renewalDue.length}
          pageSize={renewalDue.length}
          emptyMessage="No FDRs currently due for renewal."
        />
      </div>

      {/* Renewal Wizard Modal */}
      <Modal
        isOpen={wizardOpen}
        onClose={() => setWizardOpen(false)}
        title={`Renew FDR: ${selectedParentFdr?.fdrNumber}`}
        description="Creates a new linked FDR child record. The parent FDR status will transition to RENEWED."
      >
        <form onSubmit={handleRenewSubmit} className="space-y-4">
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 text-xs space-y-1">
            <p><strong>Institution:</strong> {selectedParentFdr?.institution?.name}</p>
            <p><strong>Bank:</strong> {selectedParentFdr?.bank?.name}</p>
            <p><strong>Current Maturity Payout:</strong> {formatINR(selectedParentFdr?.maturityAmount)}</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="New FDR Number"
              name="fdrNumber"
              required
              value={formData.fdrNumber}
              onChange={e => setFormData({ ...formData, fdrNumber: e.target.value })}
            />
            <Input
              label="Reinvestment Principal (₹)"
              name="principalRupees"
              type="number"
              required
              value={formData.principalRupees}
              onChange={e => setFormData({ ...formData, principalRupees: e.target.value })}
              helperText={formatINR(rupeesToPaise(formData.principalRupees))}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Branch"
              name="branch"
              required
              value={formData.branch}
              onChange={e => setFormData({ ...formData, branch: e.target.value })}
            />
            <Input
              label="IFSC Code"
              name="ifsc"
              required
              value={formData.ifsc}
              onChange={e => setFormData({ ...formData, ifsc: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <Input
              label="Interest Rate (%)"
              name="interestRate"
              type="number"
              step="0.01"
              required
              value={formData.interestRate}
              onChange={e => setFormData({ ...formData, interestRate: e.target.value })}
            />
            <Input
              label="Issue Date"
              name="issueDate"
              type="date"
              required
              value={formData.issueDate}
              onChange={e => setFormData({ ...formData, issueDate: e.target.value })}
            />
            <Input
              label="Tenure (Months)"
              name="tenureMonths"
              type="number"
              required
              value={formData.tenureMonths}
              onChange={e => setFormData({ ...formData, tenureMonths: e.target.value })}
            />
          </div>

          <Input
            label="Renewal Remarks"
            name="remarks"
            value={formData.remarks}
            onChange={e => setFormData({ ...formData, remarks: e.target.value })}
          />

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
            <Button type="button" variant="secondary" size="sm" onClick={() => setWizardOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" loading={submitting}>
              Execute Renewal
            </Button>
          </div>
        </form>
      </Modal>

      {/* Chain View Modal */}
      <Modal
        isOpen={chainOpen}
        onClose={() => setChainOpen(false)}
        title="FDR Renewal Chain History"
        description="End-to-end lineage of re-invested security deposits."
      >
        {chainLoading ? (
          <div className="p-8 text-center text-xs text-slate-400">Loading chain...</div>
        ) : (
          <div className="space-y-3">{renderChainNode(chainData)}</div>
        )}
      </Modal>
    </AppLayout>
  );
}
