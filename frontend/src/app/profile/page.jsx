'use client';

import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import AppLayout from '../../components/layout/AppLayout';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { api, formatDate } from '../../lib/utils';
import { User, Lock, Shield, Building2, Bell, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ProfilePage() {
  const { user } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleChangePassword(e) {
    e.preventDefault();
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error('Please fill in all password fields');
      return;
    }
    if (newPassword.length < 8) {
      toast.error('New password must be at least 8 characters long');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('New password and confirm password do not match');
      return;
    }

    setLoading(true);
    try {
      const res = await api.post('/auth/change-password', {
        currentPassword,
        newPassword,
      });

      if (res.data?.success) {
        toast.success(res.data.message || 'Password changed successfully');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update password');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AppLayout>
      <div className="max-w-4xl space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <User className="w-7 h-7 text-[#0B1F4B] dark:text-blue-400" />
            Profile & Security Settings
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage your personal profile information, security credentials, and preferences
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Profile Overview */}
          <div className="md:col-span-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs flex flex-col items-center text-center">
            <div className="w-20 h-20 rounded-full bg-[#0B1F4B] text-white flex items-center justify-center font-bold text-2xl uppercase shadow-md mb-4">
              {user?.name?.[0] || 'U'}
            </div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">{user?.name}</h2>
            <p className="text-xs text-slate-500 mb-3">{user?.email}</p>

            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 mb-4">
              <Shield className="w-3.5 h-3.5" />
              {user?.role?.replace(/_/g, ' ')}
            </span>

            {user?.institution && (
              <div className="w-full pt-4 border-t border-slate-100 dark:border-slate-800 text-left">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  <Building2 className="w-4 h-4 text-slate-400" />
                  <span>Bound Institution</span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                  {user.institution.name}
                </p>
                <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                  AICTE ID: {user.institution.aicteId}
                </p>
              </div>
            )}

            <div className="w-full pt-4 mt-4 border-t border-slate-100 dark:border-slate-800 text-left space-y-2">
              <div className="flex justify-between text-xs text-slate-500">
                <span>Account Status</span>
                <span className="font-semibold text-emerald-600 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Active
                </span>
              </div>
              <div className="flex justify-between text-xs text-slate-500">
                <span>Member Since</span>
                <span className="font-medium text-slate-700 dark:text-slate-300">
                  {user?.createdAt ? formatDate(user.createdAt) : '—'}
                </span>
              </div>
            </div>
          </div>

          {/* Security & Password */}
          <div className="md:col-span-2 space-y-6">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs">
              <div className="flex items-center gap-2.5 mb-4">
                <Lock className="w-5 h-5 text-[#0B1F4B] dark:text-blue-400" />
                <h3 className="font-bold text-slate-900 dark:text-white">Change Password</h3>
              </div>
              <p className="text-xs text-slate-500 mb-6 leading-relaxed">
                Ensure your account is protected with a strong, distinct password containing at least 8 characters.
              </p>

              <form onSubmit={handleChangePassword} className="space-y-4">
                <Input
                  label="Current Password"
                  type="password"
                  required
                  placeholder="Enter your current password"
                  value={currentPassword}
                  onChange={e => setCurrentPassword(e.target.value)}
                />

                <Input
                  label="New Password"
                  type="password"
                  required
                  placeholder="Enter new password (min. 8 characters)"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                />

                <Input
                  label="Confirm New Password"
                  type="password"
                  required
                  placeholder="Re-enter new password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                />

                <div className="pt-2">
                  <Button type="submit" loading={loading}>
                    Update Password
                  </Button>
                </div>
              </form>
            </div>

            {/* Quick Link to Notifications */}
            <div className="bg-gradient-to-r from-slate-50 to-blue-50/30 dark:from-slate-900 dark:to-blue-950/20 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs">
                  <Bell className="w-5 h-5 text-amber-500" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                    Notification Preferences
                  </h4>
                  <p className="text-xs text-slate-500">
                    Configure your email and in-app alert delivery channels
                  </p>
                </div>
              </div>
              <a
                href="/notifications"
                className="text-xs font-semibold px-4 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/60 shadow-xs transition-colors"
              >
                Configure
              </a>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
