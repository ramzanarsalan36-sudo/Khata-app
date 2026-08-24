'use client';

import React from 'react';
import { formatINR } from '@/lib/utils/currency';
import { format, isToday, isYesterday } from 'date-fns';
import { ArrowUpRight, ArrowDownLeft, Receipt, Trash2, Loader2, Calendar } from 'lucide-react';
import { useShop } from '@/lib/context/ShopContext';

export default function LedgerTimeline({
  transactions = [],
  filterType = 'ALL',
  dateFilter = 'ALL',
  onFilterTypeChange,
  onDateFilterChange,
  hasMore = false,
  totalCount = 0,
  loading = false,
  loadingMore = false,
  onLoadMore,
  onViewReceipt,
  onDeleteTransaction,
}) {
  const { currentRole } = useShop();
  const canDelete = currentRole === 'owner' || currentRole === 'manager';

  // Format date headers
  const formatDateHeader = (dateStr) => {
    try {
      const date = new Date(dateStr);
      if (isToday(date)) return 'Today';
      if (isYesterday(date)) return 'Yesterday';
      return format(date, 'EEEE, dd MMMM yyyy');
    } catch {
      return dateStr;
    }
  };

  // Group transactions by date
  const grouped = transactions.reduce((acc, tx) => {
    const dateKey = format(new Date(tx.created_at), 'yyyy-MM-dd');
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(tx);
    return acc;
  }, {});

  return (
    <div className="space-y-4 pb-24 lg:pb-8">
      {/* Top Filter & Date Range Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          {/* Type Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto text-xs font-semibold">
            <button
              onClick={() => onFilterTypeChange && onFilterTypeChange('ALL')}
              className={`px-3 py-1.5 rounded-xl transition ${
                filterType === 'ALL'
                  ? 'bg-slate-900 text-white shadow-xs font-bold'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              All Entries
            </button>
            <button
              onClick={() => onFilterTypeChange && onFilterTypeChange('GAVE')}
              className={`px-3 py-1.5 rounded-xl transition ${
                filterType === 'GAVE'
                  ? 'bg-rose-600 text-white shadow-xs font-bold'
                  : 'bg-rose-50 text-rose-700 border border-rose-200/60 hover:bg-rose-100'
              }`}
            >
              Baki (Diya)
            </button>
            <button
              onClick={() => onFilterTypeChange && onFilterTypeChange('GOT')}
              className={`px-3 py-1.5 rounded-xl transition ${
                filterType === 'GOT'
                  ? 'bg-emerald-600 text-white shadow-xs font-bold'
                  : 'bg-emerald-50 text-emerald-700 border border-emerald-200/60 hover:bg-emerald-100'
              }`}
            >
              Jama (Liya)
            </button>
          </div>

          {/* Date Filter Pills */}
          <div className="flex items-center gap-1 overflow-x-auto text-xs">
            <Calendar className="w-3.5 h-3.5 text-slate-400 mr-1" />
            <button
              onClick={() => onDateFilterChange && onDateFilterChange('ALL')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition ${
                dateFilter === 'ALL'
                  ? 'bg-slate-700 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              All Time
            </button>
            <button
              onClick={() => onDateFilterChange && onDateFilterChange('TODAY')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition ${
                dateFilter === 'TODAY'
                  ? 'bg-slate-700 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Today
            </button>
            <button
              onClick={() => onDateFilterChange && onDateFilterChange('THIS_WEEK')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition ${
                dateFilter === 'THIS_WEEK'
                  ? 'bg-slate-700 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              This Week
            </button>
            <button
              onClick={() => onDateFilterChange && onDateFilterChange('THIS_MONTH')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition ${
                dateFilter === 'THIS_MONTH'
                  ? 'bg-slate-700 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              This Month
            </button>
          </div>
        </div>
      </div>

      {/* Loading state */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-12 text-center flex flex-col items-center justify-center text-slate-400 space-y-2">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
          <p className="text-xs font-medium">Loading ledger entries...</p>
        </div>
      ) : transactions.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-12 text-center flex flex-col items-center justify-center text-slate-500">
          <Receipt className="w-14 h-14 text-slate-300 mb-3 stroke-1" />
          <h3 className="font-extrabold text-slate-900 text-base">
            {filterType !== 'ALL' || dateFilter !== 'ALL'
              ? 'No Entries Matched Filter'
              : 'No Transactions Recorded Yet'}
          </h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm leading-relaxed">
            {filterType !== 'ALL' || dateFilter !== 'ALL'
              ? 'Try switching date range or transaction type filter tab above.'
              : 'Record credit or payment entries using the red BAKI ₹ or green JAMA ₹ button.'}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([dateKey, txList]) => (
            <div key={dateKey} className="space-y-3">
              {/* Date Header Pill */}
              <div className="flex items-center gap-3">
                <span className="bg-slate-200 text-slate-700 text-xs font-extrabold uppercase tracking-wider px-3.5 py-1 rounded-full shadow-2xs">
                  {formatDateHeader(txList[0].created_at)}
                </span>
                <div className="flex-1 h-px bg-slate-200/80" />
              </div>

              <div className="space-y-2.5">
                {txList.map((tx) => {
                  const isGave = tx.type === 'GAVE';
                  const time = format(new Date(tx.created_at), 'hh:mm a');

                  return (
                    <div
                      key={tx.id}
                      className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs hover:shadow-sm transition"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3.5">
                          <div
                            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                              isGave ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'
                            }`}
                          >
                            {isGave ? (
                              <ArrowUpRight className="w-5 h-5 stroke-[2.5]" />
                            ) : (
                              <ArrowDownLeft className="w-5 h-5 stroke-[2.5]" />
                            )}
                          </div>

                          <div>
                            <div className="flex items-center gap-2.5">
                              <span
                                className={`text-xs font-black uppercase px-2 py-0.5 rounded-lg ${
                                  isGave
                                    ? 'bg-rose-100 text-rose-800'
                                    : 'bg-emerald-100 text-emerald-800'
                                }`}
                              >
                                {isGave ? 'BAKI' : 'JAMA'}
                              </span>
                              <span className="text-xs text-slate-400 font-semibold">{time}</span>
                            </div>

                            {tx.note && (
                              <p className="text-xs sm:text-sm text-slate-800 font-medium mt-1.5 leading-snug">
                                {tx.note}
                              </p>
                            )}

                            {/* Bill receipt badge */}
                            {tx.bill_path && (
                              <button
                                onClick={() => onViewReceipt(tx.bill_path)}
                                className="mt-2.5 inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-3 py-1 rounded-lg border border-emerald-200 transition"
                              >
                                <Receipt className="w-3.5 h-3.5" />
                                <span>View Bill / Receipt</span>
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Amount & Delete */}
                        <div className="text-right flex flex-col items-end shrink-0">
                          <span
                            className={`text-base sm:text-lg font-black tracking-tight ${
                              isGave ? 'text-rose-600' : 'text-emerald-600'
                            }`}
                          >
                            {isGave ? `+${formatINR(tx.amount)}` : `-${formatINR(tx.amount)}`}
                          </span>

                          {canDelete && (
                            <button
                              onClick={() => onDeleteTransaction(tx)}
                              className="text-slate-300 hover:text-rose-600 p-1.5 mt-1 rounded-lg hover:bg-rose-50 transition"
                              title="Delete entry (Owner/Manager only)"
                              aria-label="Delete transaction"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Load More Pagination Bar */}
          <div className="p-3.5 bg-white rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between text-xs text-slate-500">
            <span>
              Showing <strong className="text-slate-700">{transactions.length}</strong> of{' '}
              <strong className="text-slate-700">{totalCount}</strong> entries
            </span>

            {hasMore && (
              <button
                onClick={onLoadMore}
                disabled={loadingMore}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl transition active:scale-98 flex items-center gap-1.5 disabled:opacity-60"
              >
                {loadingMore ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Loading more entries...</span>
                  </>
                ) : (
                  <span>Load Next 20 Entries</span>
                )}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
