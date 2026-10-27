'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import AppLayout from '../../components/layout/AppLayout';
import DataTable from '../../components/ui/DataTable';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Modal from '../../components/ui/Modal';
import { api, formatDate } from '../../lib/utils';
import { Users, UserPlus, Shield, CheckCircle2, XCircle, Search, Filter } from 'lucide-react';
import toast from 'react-hot-toast';

const ROLES = [
  { value: '', label: 'All Roles' },
  { value: 'SUPER_ADMIN', label: 'Super Admin' },
  { value: 'FINANCE_OFFICER', label: 'Finance Officer (Maker)' },
  { value: 'VERIFIER', label: 'Verifier (Checker)' },
  { value: 'APPROVING_AUTHORITY', label: 'Approving Authority' },
  { value: 'INSTITUTION_USER', label: 'Institution User' },
  { value: 'AUDITOR', label: 'Auditor (Read-Only)' },
];

export default function UsersPage() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [institutions, setInstitutions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [pagination, setPagination] = useState({ page: 1, pageSize: 20, total: 0 });

  // Create User Modal State
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'FINANCE_OFFICER',
    phone: '',
    institutionId: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const isSuperAdmin = currentUser?.role === 'SUPER_ADMIN';

  useEffect(() => {
    if (!isSuperAdmin) {
      setLoading(false);
      return;
    }
    fetchUsers();
    fetchInstitutions();
  }, [isSuperAdmin, pagination.page, roleFilter, statusFilter]);

  async function fetchUsers() {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        pageSize: pagination.pageSize.toString(),
      });
      if (search) params.append('search', search);
      if (roleFilter) params.append('role', roleFilter);
      if (statusFilter) params.append('isActive', statusFilter);

      const res = await api.get(`/users?${params.toString()}`);
      if (res.data?.success) {
        setUsers(res.data.data);
        if (res.data.meta) {
          setPagination(prev => ({ ...prev, total: res.data.meta.total }));
        }
      }
    } catch (err) {
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  }

  async function fetchInstitutions() {
    try {
      const res = await api.get('/institutions?pageSize=100');
      if (res.data?.success) {
        setInstitutions(res.data.data);
      }
    } catch {
      // ignore
    }
  }

  async function handleCreateUser(e) {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.password || !formData.role) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (formData.role === 'INSTITUTION_USER' && !formData.institutionId) {
      toast.error('Please select an institution for this user');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        name: formData.name,
        email: formData.email,
        password: formData.password,
        role: formData.role,
        phone: formData.phone || undefined,
        institutionId: formData.role === 'INSTITUTION_USER' ? formData.institutionId : undefined,
      };

      const res = await api.post('/users', payload);
      if (res.data?.success) {
        toast.success('User created successfully');
        setCreateModalOpen(false);
        setFormData({
          name: '',
          email: '',
          password: '',
          role: 'FINANCE_OFFICER',
          phone: '',
          institutionId: '',
        });
        fetchUsers();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create user');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleToggleStatus(userId, currentStatus) {
    try {
      const res = await api.put(`/users/${userId}`, { isActive: !currentStatus });
      if (res.data?.success) {
        toast.success(`User ${!currentStatus ? 'activated' : 'deactivated'}`);
        setUsers(prev =>
          prev.map(u => (u.id === userId ? { ...u, isActive: !currentStatus } : u))
        );
      }
    } catch (err) {
      toast.error('Failed to update user status');
    }
  }

  const columns = [
    {
      key: 'name',
      label: 'User',
      render: (_, row) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-[#0B1F4B] text-white flex items-center justify-center font-bold text-xs uppercase">
            {row.name?.[0] || 'U'}
          </div>
          <div>
            <div className="font-semibold text-slate-900 dark:text-white">{row.name}</div>
            <div className="text-xs text-slate-500">{row.email}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'role',
      label: 'Role',
      render: role => {
        const roleColors = {
          SUPER_ADMIN: 'bg-purple-100 text-purple-800 dark:bg-purple-950/50 dark:text-purple-300',
          FINANCE_OFFICER: 'bg-blue-100 text-blue-800 dark:bg-blue-950/50 dark:text-blue-300',
          VERIFIER: 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300',
          APPROVING_AUTHORITY: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300',
          INSTITUTION_USER: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300',
          AUDITOR: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-950/50 dark:text-cyan-300',
        };
        return (
          <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold ${roleColors[role] || 'bg-slate-100 text-slate-700'}`}>
            {role.replace(/_/g, ' ')}
          </span>
        );
      },
    },
    {
      key: 'institution',
      label: 'Institution',
      render: (_, row) => (
        <span className="text-xs text-slate-600 dark:text-slate-300">
          {row.institution?.name || row.institution?.aicteId || '—'}
        </span>
      ),
    },
    {
      key: 'phone',
      label: 'Phone',
      render: phone => <span className="text-xs text-slate-500">{phone || '—'}</span>,
    },
    {
      key: 'isActive',
      label: 'Status',
      render: (active, row) => (
        <button
          onClick={() => handleToggleStatus(row.id, active)}
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
            active
              ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-400'
              : 'bg-rose-50 text-rose-700 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-400'
          }`}
          title="Click to toggle active status"
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
      label: 'Created',
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
            User management is reserved exclusively for AICTE Super Administrators. If you require access, please contact your portal administrator.
          </p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Users className="w-7 h-7 text-[#0B1F4B] dark:text-blue-400" />
              Users & Roles
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Manage portal user accounts, role-based access, and institution bindings
            </p>
          </div>
          <Button onClick={() => setCreateModalOpen(true)} className="flex items-center gap-2">
            <UserPlus className="w-4 h-4" />
            <span>Create User</span>
          </Button>
        </div>

        {/* Filter Bar */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs flex flex-col md:flex-row items-center gap-4">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by name, email..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && fetchUsers()}
              className="w-full pl-10 pr-4 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-[#0B1F4B]/30"
            />
          </div>
          <div className="flex items-center gap-3 w-full md:w-auto">
            <select
              value={roleFilter}
              onChange={e => setRoleFilter(e.target.value)}
              className="px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-200 focus:outline-none"
            >
              {ROLES.map(r => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-200 focus:outline-none"
            >
              <option value="">All Statuses</option>
              <option value="true">Active Only</option>
              <option value="false">Inactive Only</option>
            </select>

            <Button variant="secondary" onClick={fetchUsers} className="text-xs">
              Filter
            </Button>
          </div>
        </div>

        {/* Table */}
        <DataTable
          columns={columns}
          data={users}
          loading={loading}
          pagination={pagination}
          onPageChange={page => setPagination(prev => ({ ...prev, page }))}
          emptyMessage="No users found matching your filters."
        />

        {/* Create User Modal */}
        <Modal
          isOpen={createModalOpen}
          onClose={() => setCreateModalOpen(false)}
          title="Create New User Account"
        >
          <form onSubmit={handleCreateUser} className="space-y-4">
            <Input
              label="Full Name"
              required
              placeholder="e.g. Ramesh Kumar"
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
            />

            <Input
              label="Email Address"
              type="email"
              required
              placeholder="e.g. ramesh@aicte.gov.in"
              value={formData.email}
              onChange={e => setFormData({ ...formData, email: e.target.value })}
            />

            <Input
              label="Password (min 8 characters)"
              type="password"
              required
              placeholder="••••••••"
              value={formData.password}
              onChange={e => setFormData({ ...formData, password: e.target.value })}
            />

            <Select
              label="Assigned Role"
              required
              value={formData.role}
              onChange={e => setFormData({ ...formData, role: e.target.value })}
              options={ROLES.filter(r => r.value !== '').map(r => ({ value: r.value, label: r.label }))}
            />

            {formData.role === 'INSTITUTION_USER' && (
              <Select
                label="Bind to Institution"
                required
                value={formData.institutionId}
                onChange={e => setFormData({ ...formData, institutionId: e.target.value })}
                options={[
                  { value: '', label: 'Select an Institution' },
                  ...institutions.map(inst => ({
                    value: inst.id,
                    label: `${inst.aicteId} - ${inst.name}`,
                  })),
                ]}
              />
            )}

            <Input
              label="Phone Number (Optional)"
              type="tel"
              placeholder="+91 98765 43210"
              value={formData.phone}
              onChange={e => setFormData({ ...formData, phone: e.target.value })}
            />

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
              <Button type="button" variant="secondary" onClick={() => setCreateModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" loading={submitting}>
                Create User
              </Button>
            </div>
          </form>
        </Modal>
      </div>
    </AppLayout>
  );
}
