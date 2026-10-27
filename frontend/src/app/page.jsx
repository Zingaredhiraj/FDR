'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import AppLayout from '../components/layout/AppLayout';
import KpiCard from '../components/ui/KpiCard';
import StatusChip from '../components/ui/StatusChip';
import { formatINR, formatDate, api } from '../lib/utils';
import {
  Vault,
  FileCheck2,
  CalendarClock,
  AlertTriangle,
  FileClock,
  Send,
  IndianRupee,
  TrendingUp,
  Activity,
  ArrowUpRight,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  CartesianGrid,
  Legend,
} from 'recharts';

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [kpis, setKpis] = useState(null);
  const [forecast, setForecast] = useState([]);
  const [statusDist, setStatusDist] = useState([]);
  const [bankWise, setBankWise] = useState([]);
  const [depositTrend, setDepositTrend] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    async function loadDashboardData() {
      if (!user) return;
      setLoading(true);
      try {
        const [
          kpisRes,
          forecastRes,
          statusRes,
          bankRes,
          trendRes,
          activityRes,
        ] = await Promise.all([
          api.get('/dashboard/kpis'),
          api.get('/dashboard/maturity-forecast'),
          api.get('/dashboard/status-distribution'),
          api.get('/dashboard/bank-wise'),
          api.get('/dashboard/deposit-trend'),
          api.get('/dashboard/recent-activity'),
        ]);

        if (kpisRes.data?.success) setKpis(kpisRes.data.data);
        if (forecastRes.data?.success) setForecast(forecastRes.data.data);
        if (statusRes.data?.success) setStatusDist(statusRes.data.data);
        if (bankRes.data?.success) setBankWise(bankRes.data.data);
        if (trendRes.data?.success) setDepositTrend(trendRes.data.data);
        if (activityRes.data?.success) setRecentActivity(activityRes.data.data);
      } catch (err) {
        console.error('Failed to load dashboard data:', err);
      } finally {
        setLoading(false);
      }
    }

    if (user) {
      loadDashboardData();
    }
  }, [user]);

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="w-8 h-8 border-4 border-[#0B1F4B] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const COLORS = ['#10B981', '#F59E0B', '#EF4444', '#3B82F6', '#8B5CF6', '#14B8A6', '#64748B'];

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Welcome Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-[#FF9933] uppercase tracking-wider">
                {user.role?.replace(/_/g, ' ')}
              </span>
              <span className="text-slate-300 dark:text-slate-700">•</span>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                AICTE Vault Monitor
              </span>
            </div>
            <h2 className="text-2xl font-black text-slate-900 dark:text-white mt-1">
              Welcome back, {user.name}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {user.role === 'INSTITUTION_USER'
                ? 'Managing security deposits and FDR records for your institution.'
                : 'National overview of security deposit FDRs, document queues, and release gates.'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <a
              href="/fdrs"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0B1F4B] text-white text-xs font-semibold hover:bg-[#1a3577] transition-all shadow-sm"
            >
              View FDR Records <ArrowUpRight className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>

        {/* Top 7 KPIs from LOCKED SPEC */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            title="Total Deposit Value"
            value={kpis ? formatINR(kpis.totalDepositValue, true) : '₹0'}
            subtitle={kpis ? formatINR(kpis.totalDepositValue) : '₹0.00'}
            icon={Vault}
            variant="navy"
          />

          <KpiCard
            title="Active FDRs"
            value={kpis?.activeFdrs || 0}
            subtitle="Valid and earning interest"
            icon={FileCheck2}
            variant="green"
          />

          <KpiCard
            title="Maturing in 30 Days"
            value={kpis?.maturingIn30 || 0}
            subtitle="Immediate action recommended"
            icon={CalendarClock}
            variant="saffron"
          />

          <KpiCard
            title="Overdue FDRs"
            value={kpis?.overdueCount || 0}
            subtitle="Matured with no open release/renewal"
            icon={AlertTriangle}
            variant="red"
          />
        </div>

        {/* Secondary KPI Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 font-medium">Pending Verifications</p>
              <h4 className="text-xl font-bold text-slate-900 dark:text-white mt-0.5">
                {kpis?.pendingVerifications || 0} Documents
              </h4>
            </div>
            <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600">
              <FileClock className="w-5 h-5" />
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 font-medium">Pending Release Orders</p>
              <h4 className="text-xl font-bold text-slate-900 dark:text-white mt-0.5">
                {kpis?.pendingReleases || 0} Requests
              </h4>
            </div>
            <div className="p-2.5 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600">
              <Send className="w-5 h-5" />
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 font-medium">Released This FY (Apr–Mar)</p>
              <h4 className="text-xl font-bold text-slate-900 dark:text-white mt-0.5">
                {kpis ? formatINR(kpis.releasedThisFinancialYear, true) : '₹0'}
              </h4>
            </div>
            <div className="p-2.5 rounded-xl bg-teal-50 dark:bg-teal-950/40 text-teal-600">
              <IndianRupee className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 12-Month Maturity Forecast */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  12-Month Maturity Forecast
                </h3>
                <p className="text-xs text-slate-500">Upcoming maturing FDR count by month</p>
              </div>
              <CalendarClock className="w-5 h-5 text-slate-400" />
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={forecast}>
                  <XAxis dataKey="month" fontSize={11} stroke="#94a3b8" />
                  <YAxis fontSize={11} stroke="#94a3b8" allowDecimals={false} />
                  <Tooltip
                    formatter={(val, name) => [val, 'FDRs Maturing']}
                    contentStyle={{ borderRadius: '12px', background: '#1e293b', color: '#fff', fontSize: '12px' }}
                  />
                  <Bar dataKey="count" fill="#0B1F4B" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Status Distribution */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  FDR Status Distribution
                </h3>
                <p className="text-xs text-slate-500">Breakdown of portfolio by current state</p>
              </div>
              <TrendingUp className="w-5 h-5 text-slate-400" />
            </div>

            <div className="h-64 w-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusDist}
                    dataKey="count"
                    nameKey="status"
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={4}
                  >
                    {statusDist.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val, name) => [val, name.replace(/_/g, ' ')]}
                    contentStyle={{ borderRadius: '12px', background: '#1e293b', color: '#fff', fontSize: '12px' }}
                  />
                  <Legend
                    formatter={val => <span className="text-xs text-slate-600 dark:text-slate-300">{val.replace(/_/g, ' ')}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Deposit Trend & Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Deposit Trend Line Chart */}
          <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  12-Month Deposit vs Release Trend
                </h3>
                <p className="text-xs text-slate-500">Total new deposits vs released volume</p>
              </div>
              <Activity className="w-5 h-5 text-slate-400" />
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={depositTrend}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                  <XAxis dataKey="month" fontSize={11} stroke="#94a3b8" />
                  <YAxis
                    fontSize={11}
                    stroke="#94a3b8"
                    tickFormatter={val => formatINR(val, true)}
                  />
                  <Tooltip
                    formatter={val => [formatINR(val), 'Volume']}
                    contentStyle={{ borderRadius: '12px', background: '#1e293b', color: '#fff', fontSize: '12px' }}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="deposited" name="Deposited" stroke="#0B1F4B" strokeWidth={2.5} dot={false} />
                  <Line type="monotone" dataKey="released" name="Released" stroke="#138808" strokeWidth={2.5} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Recent Audit & Activity Feed */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Recent Activity
              </h3>
              <a href="/audit" className="text-xs text-blue-600 dark:text-blue-400 font-semibold hover:underline">
                View all
              </a>
            </div>

            <div className="space-y-3 max-h-64 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
              {recentActivity.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-8">No recent actions logged.</p>
              ) : (
                recentActivity.slice(0, 7).map(item => (
                  <div key={item.id} className="pt-2.5 first:pt-0 flex items-start gap-2.5">
                    <span className="w-2 h-2 rounded-full bg-blue-600 mt-1.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                        {item.user?.name || 'System'}{' '}
                        <span className="font-normal text-slate-500">
                          {item.action?.toLowerCase()} on {item.entity}
                        </span>
                      </p>
                      <p className="text-[10px] text-slate-400">{formatDate(item.createdAt)}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
