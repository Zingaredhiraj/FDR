'use client';

import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { ShieldCheck, Eye, EyeOff, Lock, Mail, ArrowRight } from 'lucide-react';
import Button from '../../components/ui/Button';

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const demoAccounts = [
    { role: 'SUPER_ADMIN', label: 'Super Admin', email: 'admin@aicte.demo' },
    { role: 'FINANCE_OFFICER', label: 'Finance Officer', email: 'finance@aicte.demo' },
    { role: 'VERIFIER', label: 'Verifier (Checker)', email: 'verifier@aicte.demo' },
    { role: 'APPROVING_AUTHORITY', label: 'Approving Authority', email: 'authority@aicte.demo' },
    { role: 'INSTITUTION_USER', label: 'Institution #1', email: 'institution@aicte.demo' },
    { role: 'AUDITOR', label: 'Auditor (Read-Only)', email: 'auditor@aicte.demo' },
  ];

  const handleDemoFill = (accEmail) => {
    setEmail(accEmail);
    setPassword('Demo@1234');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) return;
    setLoading(true);
    await login(email, password);
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-slate-50 dark:bg-slate-950">
      {/* Left Column: Brand Hero with Gradient */}
      <div className="md:w-1/2 bg-gradient-to-br from-[#0B1F4B] via-[#102a6b] to-[#07132e] text-white p-8 sm:p-12 lg:p-16 flex flex-col justify-between relative overflow-hidden">
        {/* Decorative background blurs */}
        <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-[#FF9933]/15 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-96 h-96 rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />

        {/* Top Header */}
        <div className="flex items-center gap-3 relative z-10">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-[#FF9933] to-[#ffaa4d] flex items-center justify-center shadow-lg">
            <ShieldCheck className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold tracking-wide">AICTE FDR Vault</h1>
            <p className="text-xs text-[#FF9933] font-semibold tracking-wider uppercase">
              SIH 2026 • SIH26265
            </p>
          </div>
        </div>

        {/* Middle Value Proposition */}
        <div className="my-12 relative z-10 space-y-5">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-xs font-semibold text-[#FF9933] border border-white/10">
            <span>Official Portal</span>
            <span>•</span>
            <span>Security Deposit Streamline</span>
          </div>

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-tight">
            Transparent.
            <br />
            <span className="text-[#FF9933]">Tracked.</span> Timely.
          </h2>

          <p className="text-slate-300 text-sm sm:text-base max-w-md leading-relaxed">
            Centralized institutional fixed deposit records, automated maturity alerts, maker-checker
            document verification, and digital release order processing for AICTE.
          </p>

          <div className="grid grid-cols-2 gap-4 pt-4 max-w-sm">
            <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm">
              <p className="text-2xl font-bold text-white">100%</p>
              <p className="text-xs text-slate-300">Auditable Trail</p>
            </div>
            <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm">
              <p className="text-2xl font-bold text-white">4-Gate</p>
              <p className="text-xs text-slate-300">Release Security</p>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="text-xs text-slate-400 relative z-10">
          All India Council for Technical Education • New Delhi
        </div>
      </div>

      {/* Right Column: Login Card & Demo Chips */}
      <div className="md:w-1/2 flex items-center justify-center p-6 sm:p-10 lg:p-16">
        <div className="w-full max-w-md space-y-8 bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-none">
          <div className="space-y-2">
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white">
              Sign In to Vault
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Access FDR monitoring, document verification, and release workflows.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Official Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                <input
                  type="email"
                  required
                  placeholder="name@aicte.demo"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-[#0B1F4B]"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Password
                </label>
                <span className="text-xs text-slate-400">Demo: Demo@1234</span>
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-[#0B1F4B]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              loading={loading}
              className="w-full font-semibold shadow-md"
            >
              Sign In to Portal <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </form>

          {/* Demo Login Chips */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Demo Accounts (Click to Fill)
              </span>
              <span className="text-[11px] text-[#FF9933] font-semibold">Password: Demo@1234</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {demoAccounts.map(acc => (
                <button
                  key={acc.role}
                  type="button"
                  onClick={() => handleDemoFill(acc.email)}
                  className={`text-left p-2.5 rounded-xl border text-xs transition-all ${
                    email === acc.email
                      ? 'border-[#0B1F4B] bg-[#0B1F4B]/5 dark:border-blue-400 dark:bg-blue-950/30 font-bold'
                      : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                  }`}
                >
                  <p className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                    {acc.label}
                  </p>
                  <p className="text-[10px] text-slate-400 font-mono truncate">{acc.email}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
