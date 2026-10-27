'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  Building2,
  FileSpreadsheet,
  Calendar,
  RefreshCw,
  FileCheck,
  Send,
  BarChart3,
  Bell,
  History,
  Users,
  Settings,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  LogOut,
} from 'lucide-react';

export default function Sidebar({ collapsed, setCollapsed }) {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const navItems = [
    {
      label: 'Dashboard',
      href: '/',
      icon: LayoutDashboard,
      roles: ['SUPER_ADMIN', 'FINANCE_OFFICER', 'VERIFIER', 'APPROVING_AUTHORITY', 'INSTITUTION_USER', 'AUDITOR'],
    },
    {
      label: 'Institutions',
      href: '/institutions',
      icon: Building2,
      roles: ['SUPER_ADMIN', 'FINANCE_OFFICER', 'VERIFIER', 'APPROVING_AUTHORITY', 'AUDITOR'],
    },
    {
      label: 'FDR Records',
      href: '/fdrs',
      icon: FileSpreadsheet,
      roles: ['SUPER_ADMIN', 'FINANCE_OFFICER', 'VERIFIER', 'APPROVING_AUTHORITY', 'INSTITUTION_USER', 'AUDITOR'],
    },
    {
      label: 'Maturity Calendar',
      href: '/calendar',
      icon: Calendar,
      roles: ['SUPER_ADMIN', 'FINANCE_OFFICER', 'VERIFIER', 'APPROVING_AUTHORITY', 'INSTITUTION_USER', 'AUDITOR'],
    },
    {
      label: 'Renewals',
      href: '/renewals',
      icon: RefreshCw,
      roles: ['SUPER_ADMIN', 'FINANCE_OFFICER', 'VERIFIER', 'APPROVING_AUTHORITY', 'INSTITUTION_USER', 'AUDITOR'],
    },
    {
      label: 'Verification Queue',
      href: '/documents',
      icon: FileCheck,
      roles: ['SUPER_ADMIN', 'VERIFIER'],
    },
    {
      label: 'Release Requests',
      href: '/releases',
      icon: Send,
      roles: ['SUPER_ADMIN', 'FINANCE_OFFICER', 'VERIFIER', 'APPROVING_AUTHORITY', 'INSTITUTION_USER', 'AUDITOR'],
    },
    {
      label: 'Reports & Export',
      href: '/reports',
      icon: BarChart3,
      roles: ['SUPER_ADMIN', 'FINANCE_OFFICER', 'VERIFIER', 'APPROVING_AUTHORITY', 'AUDITOR'],
    },
    {
      label: 'Notifications',
      href: '/notifications',
      icon: Bell,
      roles: ['SUPER_ADMIN', 'FINANCE_OFFICER', 'VERIFIER', 'APPROVING_AUTHORITY', 'INSTITUTION_USER', 'AUDITOR'],
    },
    {
      label: 'Audit Trail',
      href: '/audit',
      icon: History,
      roles: ['SUPER_ADMIN', 'AUDITOR'],
    },
    {
      label: 'Users & Roles',
      href: '/users',
      icon: Users,
      roles: ['SUPER_ADMIN'],
    },
    {
      label: 'System Settings',
      href: '/settings',
      icon: Settings,
      roles: ['SUPER_ADMIN'],
    },
  ];

  const allowedItems = navItems.filter(item =>
    user?.role ? item.roles.includes(user.role) : false
  );

  return (
    <aside
      className={`fixed top-0 left-0 z-40 h-screen transition-all duration-300 bg-[#0B1F4B] text-white flex flex-col justify-between shadow-xl ${
        collapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Top Branding */}
      <div>
        <div className="h-16 flex items-center justify-between px-4 border-b border-blue-900/50">
          <a href="/" className="flex items-center gap-3 overflow-hidden">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#FF9933] to-[#ffaa4d] flex items-center justify-center flex-shrink-0 shadow-md">
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            {!collapsed && (
              <div className="flex flex-col whitespace-nowrap">
                <span className="font-extrabold text-base tracking-wide text-white">
                  AICTE FDR
                </span>
                <span className="text-[10px] text-[#FF9933] font-semibold tracking-wider uppercase">
                  Vault Portal
                </span>
              </div>
            )}
          </a>

          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-blue-900/60 transition-colors hidden sm:block"
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Navigation List */}
        <nav className="p-3 space-y-1 overflow-y-auto max-h-[calc(100vh-140px)]">
          {allowedItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || (item.href !== '/' && pathname?.startsWith(item.href));

            return (
              <a
                key={item.href}
                href={item.href}
                title={collapsed ? item.label : undefined}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-blue-600/30 text-white border-l-4 border-[#FF9933] shadow-sm'
                    : 'text-slate-300 hover:bg-blue-950/60 hover:text-white'
                }`}
              >
                <Icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-[#FF9933]' : 'text-slate-400'}`} />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </a>
            );
          })}
        </nav>
      </div>

      {/* Bottom User Role & Logout */}
      <div className="p-3 border-t border-blue-900/50 bg-[#07132e]/50">
        {!collapsed ? (
          <div className="flex items-center justify-between gap-2">
            <div className="flex flex-col truncate">
              <span className="text-xs font-bold text-white truncate">{user?.name}</span>
              <span className="text-[10px] text-[#FF9933] font-semibold uppercase tracking-wider truncate">
                {user?.role?.replace(/_/g, ' ')}
              </span>
            </div>
            <button
              onClick={logout}
              title="Logout"
              className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-950/30 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="flex justify-center">
            <button
              onClick={logout}
              title="Logout"
              className="p-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-950/30 transition-colors"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
