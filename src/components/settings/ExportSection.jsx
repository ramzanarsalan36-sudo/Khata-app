'use client';

import React, { useState } from 'react';
import { useShop } from '@/lib/context/ShopContext';
import { createClient } from '@/lib/supabase/client';
import { downloadCSV, generateCustomersSummaryCSV } from '@/lib/utils/csv';
import { FileSpreadsheet, Loader2, Download, Calendar } from 'lucide-react';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';

export default function ExportSection() {
  const { currentShop } = useShop();
  const [loadingType, setLoadingType] = useState(null);
  const [txExportRange, setTxExportRange] = useState('ALL'); // 'ALL', 'THIS_MONTH', 'LAST_MONTH'
  const [error, setError] = useState(null);

  const supabase = createClient();

  const handleExportCustomers = async () => {
    if (!currentShop?.id) return;
    try {
      setLoadingType('customers');
      setError(null);

      const { data: customers, error: fetchErr } = await supabase
        .from('customers')
        .select('id, name, phone, balance, notes, created_at')
        .eq('shop_id', currentShop.id)
        .is('deleted_at', null)
        .order('name');

      if (fetchErr) throw fetchErr;

      const csvContent = generateCustomersSummaryCSV(currentShop, customers || []);
      const fileName = `${currentShop.shop_name.replace(/\s+/g, '_')}_Customers_${format(new Date(), 'yyyyMMdd')}.csv`;
      downloadCSV(fileName, csvContent);
    } catch (err) {
      console.error('Customer export error:', err);
      setError('Failed to export customers list.');
    } finally {
      setLoadingType(null);
    }
  };

  const handleExportTransactions = async () => {
    if (!currentShop?.id) return;
    try {
      setLoadingType('transactions');
      setError(null);

      let query = supabase
        .from('transactions')
        .select(`
          id,
          amount,
          type,
          note,
          created_at,
          customer:customers (
            name,
            phone
          )
        `)
        .eq('shop_id', currentShop.id)
        .is('deleted_at', null);

      const now = new Date();
      let rangeLabel = 'All_Transactions';

      if (txExportRange === 'THIS_MONTH') {
        const start = startOfMonth(now).toISOString();
        query = query.gte('created_at', start);
        rangeLabel = `${format(now, 'MMM_yyyy')}_Transactions`;
      } else if (txExportRange === 'LAST_MONTH') {
        const prevMonth = subMonths(now, 1);
        const start = startOfMonth(prevMonth).toISOString();
        const end = endOfMonth(prevMonth).toISOString();
        query = query.gte('created_at', start).lte('created_at', end);
        rangeLabel = `${format(prevMonth, 'MMM_yyyy')}_Transactions`;
      }

      query = query.order('created_at', { ascending: false });

      const { data: transactions, error: fetchErr } = await query;

      if (fetchErr) throw fetchErr;

      let csv = [];
      csv.push([`"SHOP: ${currentShop.shop_name}"`, `"EXPORT RANGE: ${txExportRange}"`, `"EXPORTED: ${format(new Date(), 'dd-MMM-yyyy')}"`].join(','));
      csv.push('');
      csv.push(['"Date & Time"', '"Customer Name"', '"Phone"', '"Type"', '"Amount (₹)"', '"Note"'].join(','));

      (transactions || []).forEach((tx) => {
        const date = format(new Date(tx.created_at), 'dd-MMM-yyyy hh:mm a');
        const cName = tx.customer?.name || 'Unknown';
        const cPhone = tx.customer?.phone || '';
        const txType = tx.type === 'GAVE' ? 'GAVE (Udhaar)' : 'GOT (Jama)';
        const amount = Number(tx.amount).toFixed(2);
        const note = (tx.note || '').replace(/"/g, '""');

        csv.push([
          `"${date}"`,
          `"${cName}"`,
          `"${cPhone}"`,
          `"${txType}"`,
          `"${amount}"`,
          `"${note}"`,
        ].join(','));
      });

      const fileName = `${currentShop.shop_name.replace(/\s+/g, '_')}_${rangeLabel}_${format(new Date(), 'yyyyMMdd')}.csv`;
      downloadCSV(fileName, csv.join('\n'));
    } catch (err) {
      console.error('Transaction export error:', err);
      setError('Failed to export transactions.');
    } finally {
      setLoadingType(null);
    }
  };

  return (
    <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
      <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100">
        <div className="p-2 bg-blue-50 text-blue-700 rounded-lg">
          <FileSpreadsheet className="w-5 h-5" />
        </div>
        <div>
          <h2 className="font-bold text-slate-800 text-sm">Export & Backup</h2>
          <p className="text-xs text-slate-400">Excel / CSV format mein server-filtered data download karein</p>
        </div>
      </div>

      {error && (
        <div className="mb-3 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl font-medium">
          {error}
        </div>
      )}

      <div className="space-y-3">
        <button
          onClick={handleExportCustomers}
          disabled={loadingType !== null}
          className="w-full p-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl flex items-center justify-between transition text-left group disabled:opacity-60"
        >
          <div>
            <p className="text-xs font-bold text-slate-800">Export Customers List</p>
            <p className="text-[11px] text-slate-400">Grahakon ki list aur unka baki balance</p>
          </div>
          {loadingType === 'customers' ? (
            <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
          ) : (
            <Download className="w-4 h-4 text-slate-400 group-hover:text-slate-700 transition" />
          )}
        </button>

        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-800">Export Ledger Transactions</p>
              <p className="text-[11px] text-slate-400">Len-den history (Date-filtered CSV export)</p>
            </div>
            <button
              onClick={handleExportTransactions}
              disabled={loadingType !== null}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg flex items-center gap-1.5 shadow-2xs transition active:scale-95 disabled:opacity-60"
            >
              {loadingType === 'transactions' ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Download className="w-3.5 h-3.5" />
              )}
              <span>Download</span>
            </button>
          </div>

          <div className="flex items-center gap-1.5 pt-1 text-xs">
            <Calendar className="w-3.5 h-3.5 text-slate-400 mr-1" />
            <button
              type="button"
              onClick={() => setTxExportRange('ALL')}
              className={`px-2 py-1 rounded-md text-[11px] font-semibold transition ${
                txExportRange === 'ALL'
                  ? 'bg-slate-800 text-white'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              All Time
            </button>
            <button
              type="button"
              onClick={() => setTxExportRange('THIS_MONTH')}
              className={`px-2 py-1 rounded-md text-[11px] font-semibold transition ${
                txExportRange === 'THIS_MONTH'
                  ? 'bg-slate-800 text-white'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              This Month
            </button>
            <button
              type="button"
              onClick={() => setTxExportRange('LAST_MONTH')}
              className={`px-2 py-1 rounded-md text-[11px] font-semibold transition ${
                txExportRange === 'LAST_MONTH'
                  ? 'bg-slate-800 text-white'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              Last Month
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
