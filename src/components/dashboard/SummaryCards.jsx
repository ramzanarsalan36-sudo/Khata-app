'use client';

import React from 'react';
import { formatINR } from '@/lib/utils/currency';
import { ArrowUpRight, ArrowDownLeft, Users, RefreshCw, Scale } from 'lucide-react';

export default function SummaryCards({
  totalUdhaar = 0,
  totalAdvance = 0,
  customerCount = 0,
  onRefresh,
  refreshing,
}) {
  const netBalance = totalUdhaar - totalAdvance;

  return (
    <div className="mb-4 sm:mb-6">
      {/* Mobile Top Green Banner (< 640px) */}
      <div className="sm:hidden p-4 bg-gradient-to-b from-emerald-700 to-emerald-800 text-white rounded-2xl shadow-md">
        <div className="flex items-center justify-between text-xs text-emerald-100 mb-3 px-0.5">
          <div className="flex items-center gap-1.5 font-medium">
            <Users className="w-3.5 h-3.5" />
            <span>{customerCount} {customerCount === 1 ? 'Customer' : 'Customers'}</span>
          </div>
          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={refreshing}
              className="flex items-center gap-1 hover:text-white transition disabled:opacity-50 p-1"
              title="Refresh balance"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              <span className="text-[11px]">Sync</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          {/* Total Udhaar */}
          <div className="bg-white rounded-xl p-3 text-slate-800 shadow-sm border border-rose-100 flex flex-col justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-rose-700 flex items-center gap-1">
              <ArrowUpRight className="w-3 h-3 text-rose-600" />
              You Will Get
            </span>
            <div className="mt-1">
              <div className="text-lg font-extrabold text-rose-600 tracking-tight">
                {formatINR(totalUdhaar)}
              </div>
              <p className="text-[10px] text-slate-500 font-medium">Kul Udhaar (Diya)</p>
            </div>
          </div>

          {/* Total Advance */}
          <div className="bg-white rounded-xl p-3 text-slate-800 shadow-sm border border-emerald-100 flex flex-col justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 flex items-center gap-1">
              <ArrowDownLeft className="w-3 h-3 text-emerald-600" />
              You Will Give
            </span>
            <div className="mt-1">
              <div className="text-lg font-extrabold text-emerald-600 tracking-tight">
                {formatINR(totalAdvance)}
              </div>
              <p className="text-[10px] text-slate-500 font-medium">Kul Advance (Jama)</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tablet & Desktop Layout (>= 640px) */}
      <div className="hidden sm:grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Udhaar */}
        <div className="bg-white rounded-2xl p-5 border border-rose-100 shadow-xs hover:shadow-md transition flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-rose-700">
              You Will Get (Udhaar)
            </span>
            <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <ArrowUpRight className="w-4 h-4 stroke-[2.5]" />
            </div>
          </div>
          <div>
            <div className="text-2xl xl:text-3xl font-black text-rose-600 tracking-tight">
              {formatINR(totalUdhaar)}
            </div>
            <p className="text-xs text-slate-400 mt-1 font-medium">Total customer debt</p>
          </div>
        </div>

        {/* Card 2: Total Advance */}
        <div className="bg-white rounded-2xl p-5 border border-emerald-100 shadow-xs hover:shadow-md transition flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">
              You Will Give (Advance)
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <ArrowDownLeft className="w-4 h-4 stroke-[2.5]" />
            </div>
          </div>
          <div>
            <div className="text-2xl xl:text-3xl font-black text-emerald-600 tracking-tight">
              {formatINR(totalAdvance)}
            </div>
            <p className="text-xs text-slate-400 mt-1 font-medium">Total advance deposits</p>
          </div>
        </div>

        {/* Card 3: Net Khata Balance */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs hover:shadow-md transition flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
              Net Khata Status
            </span>
            <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center">
              <Scale className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div
              className={`text-2xl xl:text-3xl font-black tracking-tight ${
                netBalance > 0
                  ? 'text-rose-600'
                  : netBalance < 0
                  ? 'text-emerald-600'
                  : 'text-slate-700'
              }`}
            >
              {formatINR(Math.abs(netBalance))}
            </div>
            <p className="text-xs text-slate-400 mt-1 font-medium">
              {netBalance > 0
                ? 'Net Receivable (Market Udhaar)'
                : netBalance < 0
                ? 'Net Payable (Advance)'
                : 'Balanced (Hisab Barabar)'}
            </p>
          </div>
        </div>

        {/* Card 4: Total Customers & Sync */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs hover:shadow-md transition flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
              Total Customers
            </span>
            {onRefresh && (
              <button
                onClick={onRefresh}
                disabled={refreshing}
                className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition disabled:opacity-50"
                title="Sync database balances"
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              </button>
            )}
          </div>
          <div>
            <div className="text-2xl xl:text-3xl font-black text-slate-900 tracking-tight">
              {customerCount}
            </div>
            <p className="text-xs text-slate-400 mt-1 font-medium">Active khata accounts</p>
          </div>
        </div>
      </div>
    </div>
  );
}
