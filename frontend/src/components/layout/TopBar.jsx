'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { api } from '../../lib/utils';
import {
  Search,
  Bell,
  Sun,
  Moon,
  User as UserIcon,
  Menu,
  Shield,
  FileText,
  Building,
} from 'lucide-react';
import Modal from '../ui/Modal';

export default function TopBar({ onToggleSidebar }) {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const [unreadCount, setUnreadCount] = useState(0);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState({ institutions: [], fdrs: [], documents: [] });
  const [searching, setSearching] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  // Poll notifications every 60s
  useEffect(() => {
    async function fetchNotifications() {
      try {
        const res = await api.get('/notifications?pageSize=1');
        if (res.data?.meta?.unreadCount !== undefined) {
          setUnreadCount(res.data.meta.unreadCount);
        }
      } catch {
        // Silently ignore
      }
    }

    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, []);

  // Ctrl+K shortcut
  useEffect(() => {
    function handleKeyDown(e) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(prev => !prev);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Global search query
  useEffect(() => {
    if (!searchQuery || searchQuery.trim().length < 2) {
      setSearchResults({ institutions: [], fdrs: [], documents: [] });
      return;
    }

    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await api.get(`/search?q=${encodeURIComponent(searchQuery)}`);
        if (res.data?.success) {
          setSearchResults(res.data.data);
        }
      } catch {
        // Ignore search error
      } finally {
        setSearching(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  return (
    <>
      <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30 shadow-xs">
        {/* Left: Mobile Toggle & Quick Search Trigger */}
        <div className="flex items-center gap-3">
          <button
            onClick={onToggleSidebar}
            className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 focus:outline-none lg:hidden"
          >
            <Menu className="w-5 h-5" />
          </button>

          <button
            onClick={() => setSearchOpen(true)}
            className="hidden sm:flex items-center gap-2.5 px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs transition-colors"
          >
            <Search className="w-4 h-4 text-slate-400" />
            <span>Search FDRs, institutions, docs...</span>
            <kbd className="ml-4 px-1.5 py-0.5 text-[10px] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-slate-500 font-mono">
              Ctrl+K
            </kbd>
          </button>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Mobile search icon */}
          <button
            onClick={() => setSearchOpen(true)}
            className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 sm:hidden"
          >
            <Search className="w-5 h-5" />
          </button>

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
            className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            {theme === 'dark' ? (
              <Sun className="w-5 h-5 text-amber-400" />
            ) : (
              <Moon className="w-5 h-5 text-slate-600" />
            )}
          </button>

          {/* Notifications Bell */}
          <a
            href="/notifications"
            className="relative p-2 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Notifications"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-600 text-[10px] font-bold text-white shadow-xs">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </a>

          {/* User Profile Dropdown */}
          <div className="relative">
            <button
              onClick={() => setProfileOpen(!profileOpen)}
              className="flex items-center gap-2 p-1.5 pl-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors"
            >
              <div className="w-7 h-7 rounded-lg bg-[#0B1F4B] text-white flex items-center justify-center font-bold text-xs">
                {user?.name?.[0]?.toUpperCase() || 'U'}
              </div>
              <div className="hidden md:flex flex-col text-left">
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 max-w-[120px] truncate">
                  {user?.name}
                </span>
                <span className="text-[10px] text-slate-400 truncate">
                  {user?.role?.replace(/_/g, ' ')}
                </span>
              </div>
            </button>

            {profileOpen && (
              <div
                className="absolute right-0 mt-2 w-56 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl p-2 z-50 text-xs"
                onClick={() => setProfileOpen(false)}
              >
                <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800">
                  <p className="font-bold text-slate-900 dark:text-white truncate">{user?.name}</p>
                  <p className="text-slate-500 text-[11px] truncate">{user?.email}</p>
                </div>
                <div className="py-1">
                  <a
                    href="/profile"
                    className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium"
                  >
                    <UserIcon className="w-4 h-4 text-slate-400" />
                    Profile & Security
                  </a>
                </div>
                <div className="pt-1 border-t border-slate-100 dark:border-slate-800">
                  <button
                    onClick={logout}
                    className="w-full text-left flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-red-50 dark:hover:bg-red-950/30 text-red-600 font-medium"
                  >
                    Logout
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Global Search Modal (Ctrl+K) */}
      <Modal
        isOpen={searchOpen}
        onClose={() => setSearchOpen(false)}
        title="Global Vault Search"
        maxWidth="max-w-2xl"
      >
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
            <input
              type="text"
              autoFocus
              placeholder="Search by FDR number, institution name, AICTE ID, or document..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-[#0B1F4B]"
            />
          </div>

          <div className="max-h-80 overflow-y-auto space-y-3 divide-y divide-slate-100 dark:divide-slate-800">
            {searching && (
              <p className="text-xs text-slate-400 text-center py-4">Searching database...</p>
            )}

            {!searching && searchQuery.length >= 2 && (
              <>
                {/* Institutions */}
                {searchResults.institutions?.length > 0 && (
                  <div className="pt-2">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-2 mb-1">
                      Institutions
                    </p>
                    {searchResults.institutions.map(inst => (
                      <a
                        key={inst.id}
                        href={`/institutions/${inst.id}`}
                        onClick={() => setSearchOpen(false)}
                        className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-sm font-medium"
                      >
                        <Building className="w-4 h-4 text-blue-500" />
                        <span className="truncate">{inst.name}</span>
                        <span className="text-xs text-slate-400 ml-auto">{inst.aicteId}</span>
                      </a>
                    ))}
                  </div>
                )}

                {/* FDRs */}
                {searchResults.fdrs?.length > 0 && (
                  <div className="pt-2">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-2 mb-1">
                      FDR Records
                    </p>
                    {searchResults.fdrs.map(fdr => (
                      <a
                        key={fdr.id}
                        href={`/fdrs/${fdr.id}`}
                        onClick={() => setSearchOpen(false)}
                        className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-sm font-medium"
                      >
                        <Shield className="w-4 h-4 text-emerald-500" />
                        <span className="font-mono text-xs">{fdr.fdrNumber}</span>
                        <span className="text-xs text-slate-400 truncate">
                          {fdr.institution?.name}
                        </span>
                        <span className="text-[10px] ml-auto px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 font-semibold">
                          {fdr.status}
                        </span>
                      </a>
                    ))}
                  </div>
                )}

                {/* Documents */}
                {searchResults.documents?.length > 0 && (
                  <div className="pt-2">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-2 mb-1">
                      Documents
                    </p>
                    {searchResults.documents.map(doc => (
                      <a
                        key={doc.id}
                        href={`/fdrs/${doc.fdr?.id}`}
                        onClick={() => setSearchOpen(false)}
                        className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-sm font-medium"
                      >
                        <FileText className="w-4 h-4 text-amber-500" />
                        <span className="truncate">{doc.originalName}</span>
                        <span className="text-xs text-slate-400 ml-auto font-mono">
                          {doc.fdr?.fdrNumber}
                        </span>
                      </a>
                    ))}
                  </div>
                )}

                {searchResults.institutions?.length === 0 &&
                  searchResults.fdrs?.length === 0 &&
                  searchResults.documents?.length === 0 && (
                    <p className="text-xs text-slate-400 text-center py-6">
                      No matching records found for &ldquo;{searchQuery}&rdquo;.
                    </p>
                  )}
              </>
            )}
          </div>
        </div>
      </Modal>
    </>
  );
}
