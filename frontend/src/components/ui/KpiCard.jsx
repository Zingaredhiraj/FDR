'use client';

import React from 'react';

export default function KpiCard({
  title,
  value,
  subtitle,
  icon: Icon,
  variant = 'navy',
  trend,
  className = '',
}) {
  const gradients = {
    navy: 'from-[#0B1F4B] to-[#1a3577] text-white',
    saffron: 'from-[#FF9933] to-[#e67e00] text-white',
    green: 'from-[#138808] to-[#0d6606] text-white',
    red: 'from-rose-600 to-red-700 text-white',
    purple: 'from-purple-700 to-indigo-800 text-white',
    slate: 'from-slate-800 to-slate-900 text-white',
  };

  return (
    <div
      className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${
        gradients[variant] || gradients.navy
      } p-5 shadow-lg shadow-black/5 hover:shadow-xl transition-all duration-300 ${className}`}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs font-medium uppercase tracking-wider text-white/80">
            {title}
          </p>
          <h4 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
            {value}
          </h4>
        </div>
        {Icon && (
          <div className="p-2.5 rounded-xl bg-white/10 backdrop-blur-md text-white shadow-inner">
            <Icon className="w-6 h-6" />
          </div>
        )}
      </div>

      {(subtitle || trend) && (
        <div className="mt-3 flex items-center justify-between text-xs text-white/75 pt-2 border-t border-white/10">
          <span>{subtitle}</span>
          {trend && <span className="font-semibold text-white">{trend}</span>}
        </div>
      )}

      {/* Decorative background shape */}
      <div className="absolute -right-6 -bottom-6 w-24 h-24 rounded-full bg-white/5 pointer-events-none blur-xl" />
    </div>
  );
}
