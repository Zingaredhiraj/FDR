'use client';

import React, { useState, useEffect } from 'react';
import AppLayout from '../../components/layout/AppLayout';
import StatusChip from '../../components/ui/StatusChip';
import Button from '../../components/ui/Button';
import { formatINR, formatDate, api, getDaysDiff } from '../../lib/utils';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  AlertTriangle,
  ArrowUpRight,
} from 'lucide-react';

export default function MaturityCalendarPage() {
  const [calendarData, setCalendarData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('7'); // 7, 15, 30, 60, 90, overdue
  const [selectedDayFdrs, setSelectedDayFdrs] = useState(null);

  useEffect(() => {
    async function loadCalendar() {
      setLoading(true);
      try {
        const res = await api.get('/dashboard/calendar');
        if (res.data?.success) {
          setCalendarData(res.data.data);
        }
      } catch (err) {
        console.error('Failed to load calendar data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadCalendar();
  }, []);

  // Filter FDRs according to active tab
  const filteredList = calendarData.filter(item => {
    const days = item.daysToMaturity;
    if (activeTab === 'overdue') {
      return item.status === 'MATURED' && days < 0;
    }
    const maxDays = parseInt(activeTab, 10);
    return days >= 0 && days <= maxDays;
  });

  const getDotColor = (days) => {
    if (days < 0) return 'bg-red-600';
    if (days <= 7) return 'bg-red-500';
    if (days <= 30) return 'bg-amber-500';
    if (days <= 90) return 'bg-yellow-400';
    return 'bg-emerald-500';
  };

  const tabs = [
    { id: '7', label: 'Within 7 Days', count: calendarData.filter(i => i.daysToMaturity >= 0 && i.daysToMaturity <= 7).length },
    { id: '15', label: 'Within 15 Days', count: calendarData.filter(i => i.daysToMaturity >= 0 && i.daysToMaturity <= 15).length },
    { id: '30', label: 'Within 30 Days', count: calendarData.filter(i => i.daysToMaturity >= 0 && i.daysToMaturity <= 30).length },
    { id: '60', label: 'Within 60 Days', count: calendarData.filter(i => i.daysToMaturity >= 0 && i.daysToMaturity <= 60).length },
    { id: '90', label: 'Within 90 Days', count: calendarData.filter(i => i.daysToMaturity >= 0 && i.daysToMaturity <= 90).length },
    { id: 'overdue', label: 'Overdue Portfolio', count: calendarData.filter(i => i.status === 'MATURED' && i.daysToMaturity < 0).length },
  ];

  return (
    <AppLayout>
      <div className="space-y-6 max-w-6xl mx-auto">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white">
            Maturity Monitoring Calendar
          </h1>
          <p className="text-xs text-slate-500">
            Track upcoming FDR maturities, schedule renewals, and monitor overdue institutional deposits.
          </p>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 flex-wrap">
          <span className="font-semibold text-slate-700 dark:text-slate-200">Alert Horizons:</span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
            &le; 7 Days (Critical)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            &le; 30 Days (Warning)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
            &le; 90 Days (Notice)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            &gt; 90 Days (Safe)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-red-700 animate-pulse" />
            Overdue (Expired)
          </span>
        </div>

        {/* Filter Chips / Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                activeTab === tab.id
                  ? 'bg-[#0B1F4B] text-white shadow-md'
                  : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50'
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                  activeTab === tab.id
                    ? 'bg-white/20 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                }`}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* List of Filtered FDRs */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs divide-y divide-slate-100 dark:divide-slate-800 overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-xs text-slate-400">Loading calendar events...</div>
          ) : filteredList.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-xs">
              No FDR records found in this horizon.
            </div>
          ) : (
            filteredList.map(item => (
              <div
                key={item.id}
                className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors"
              >
                <div className="flex items-start gap-3.5">
                  <span className={`w-3 h-3 rounded-full mt-1 flex-shrink-0 ${getDotColor(item.daysToMaturity)}`} />
                  <div>
                    <div className="flex items-center gap-2">
                      <a
                        href={`/fdrs/${item.id}`}
                        className="font-mono text-sm font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                      >
                        {item.fdrNumber} <ArrowUpRight className="w-3.5 h-3.5" />
                      </a>
                      <StatusChip status={item.status} />
                    </div>
                    <p className="text-xs font-medium text-slate-700 dark:text-slate-300 mt-0.5">
                      {item.institution?.name}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-6 text-right sm:text-right">
                  <div>
                    <p className="text-xs text-slate-400 font-medium">Principal</p>
                    <p className="text-xs font-bold font-mono">{formatINR(item.principal)}</p>
                  </div>

                  <div>
                    <p className="text-xs text-slate-400 font-medium">Maturity Date</p>
                    <p className="text-xs font-bold font-mono text-slate-900 dark:text-white">
                      {formatDate(item.maturityDate)}
                    </p>
                  </div>

                  <div className="min-w-[80px]">
                    <span
                      className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                        item.daysToMaturity < 0
                          ? 'bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300'
                          : item.daysToMaturity <= 7
                          ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                          : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                      }`}
                    >
                      {item.daysToMaturity < 0
                        ? `${Math.abs(item.daysToMaturity)}d overdue`
                        : `${item.daysToMaturity}d left`}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </AppLayout>
  );
}
