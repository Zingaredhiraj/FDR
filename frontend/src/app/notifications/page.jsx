'use client';

import React, { useState, useEffect } from 'react';
import AppLayout from '../../components/layout/AppLayout';
import Button from '../../components/ui/Button';
import { formatDate, formatDateTime, api } from '../../lib/utils';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import {
  Bell,
  CheckCheck,
  Calendar,
  FileClock,
  ShieldCheck,
  Settings2,
} from 'lucide-react';

export default function NotificationsPage() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [preferences, setPreferences] = useState([]);
  const [prefLoading, setPrefLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('notifications'); // 'notifications' | 'preferences'

  async function loadNotifications() {
    setLoading(true);
    try {
      const [notifRes, prefRes] = await Promise.all([
        api.get('/notifications?pageSize=50'),
        api.get('/notifications/preferences'),
      ]);

      if (notifRes.data?.success) setNotifications(notifRes.data.data);
      if (prefRes.data?.success) setPreferences(prefRes.data.data);
    } catch (err) {
      console.error('Failed to load notifications:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadNotifications();
  }, []);

  const handleMarkAllRead = async () => {
    try {
      const res = await api.patch('/notifications/read-all');
      if (res.data?.success) {
        toast.success('All notifications marked as read');
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      }
    } catch {
      // Handled
    }
  };

  const handleMarkRead = async (id) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      setNotifications(prev =>
        prev.map(n => (n.id === id ? { ...n, isRead: true } : n))
      );
    } catch {
      // Handled
    }
  };

  const handlePrefChange = (type, field, val) => {
    setPreferences(prev =>
      prev.map(p => (p.notificationType === type ? { ...p, [field]: val } : p))
    );
  };

  const savePreferences = async () => {
    setPrefLoading(true);
    try {
      const res = await api.put('/notifications/preferences', { preferences });
      if (res.data?.success) {
        toast.success('Notification preferences saved');
      }
    } catch {
      // Handled
    } finally {
      setPrefLoading(false);
    }
  };

  const getNotifIcon = (type) => {
    switch (type) {
      case 'MATURITY_ALERT':
        return <Calendar className="w-5 h-5 text-amber-500" />;
      case 'DOCUMENT_PENDING':
        return <FileClock className="w-5 h-5 text-blue-500" />;
      case 'RELEASE_STATUS':
        return <ShieldCheck className="w-5 h-5 text-emerald-500" />;
      default:
        return <Bell className="w-5 h-5 text-slate-400" />;
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6 max-w-4xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white">
              Notification Center
            </h1>
            <p className="text-xs text-slate-500">
              Automated maturity countdown alerts, verification notices, and dispatch updates.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('notifications')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'notifications'
                  ? 'bg-[#0B1F4B] text-white shadow-sm'
                  : 'bg-white dark:bg-slate-900 border text-slate-600'
              }`}
            >
              Alerts
            </button>
            <button
              onClick={() => setActiveTab('preferences')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'preferences'
                  ? 'bg-[#0B1F4B] text-white shadow-sm'
                  : 'bg-white dark:bg-slate-900 border text-slate-600'
              }`}
            >
              Preferences
            </button>
            {activeTab === 'notifications' && (
              <Button
                variant="secondary"
                size="sm"
                icon={CheckCheck}
                onClick={handleMarkAllRead}
              >
                Mark All Read
              </Button>
            )}
          </div>
        </div>

        {activeTab === 'notifications' ? (
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs divide-y divide-slate-100 dark:divide-slate-800 overflow-hidden">
            {loading ? (
              <div className="p-8 text-center text-xs text-slate-400">Loading alerts...</div>
            ) : notifications.length === 0 ? (
              <div className="p-12 text-center text-slate-400 text-xs">
                No notifications logged for your account.
              </div>
            ) : (
              notifications.map(notif => (
                <div
                  key={notif.id}
                  onClick={() => !notif.isRead && handleMarkRead(notif.id)}
                  className={`p-4 sm:p-5 flex items-start gap-4 transition-colors cursor-pointer ${
                    !notif.isRead
                      ? 'bg-blue-50/50 dark:bg-blue-950/20'
                      : 'hover:bg-slate-50/50 dark:hover:bg-slate-800/40'
                  }`}
                >
                  <div className="p-2.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs">
                    {getNotifIcon(notif.type)}
                  </div>

                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                        {notif.title}
                      </h4>
                      <span className="text-[10px] text-slate-400 whitespace-nowrap">
                        {formatDateTime(notif.createdAt)}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                      {notif.body}
                    </p>
                  </div>

                  {!notif.isRead && (
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-600 flex-shrink-0 mt-2" />
                  )}
                </div>
              ))
            )}
          </div>
        ) : (
          /* Preferences Panel */
          <div className="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Dispatch Preferences
                </h3>
                <p className="text-xs text-slate-500">
                  Configure whether you receive in-app alerts and official emails for each event.
                </p>
              </div>
              <Button
                variant="primary"
                size="sm"
                loading={prefLoading}
                onClick={savePreferences}
              >
                Save Preferences
              </Button>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {preferences.map(pref => (
                <div key={pref.notificationType} className="py-4 flex items-center justify-between">
                  <div>
                    <p className="font-bold text-xs text-slate-900 dark:text-white">
                      {pref.notificationType?.replace(/_/g, ' ')}
                    </p>
                    <p className="text-[11px] text-slate-400">
                      Triggered automatically during status runs and approval state transitions.
                    </p>
                  </div>

                  <div className="flex items-center gap-6">
                    <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
                      <input
                        type="checkbox"
                        checked={pref.inApp}
                        onChange={e => handlePrefChange(pref.notificationType, 'inApp', e.target.checked)}
                        className="w-4 h-4 text-[#0B1F4B] rounded"
                      />
                      <span>In-App</span>
                    </label>

                    <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
                      <input
                        type="checkbox"
                        checked={pref.email}
                        onChange={e => handlePrefChange(pref.notificationType, 'email', e.target.checked)}
                        className="w-4 h-4 text-[#0B1F4B] rounded"
                      />
                      <span>Email</span>
                    </label>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
