'use client';

import React, { useState } from 'react';
import { useShop } from '@/lib/context/ShopContext';
import { db } from '@/lib/firebase/config';
import { ref, get } from 'firebase/database';
import { downloadCSV, generateCustomersSummaryCSV } from '@/lib/utils/csv';
import { FileSpreadsheet, Loader2, Download, Calendar } from 'lucide-react';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';

export default function ExportSection() {
  const { currentShop } = useShop();
  const [loadingType, setLoadingType] = useState(null);
  const [txExportRange, setTxExportRange] = useState('ALL'); // 'ALL', 'THIS_MONTH', 'LAST_MONTH'
  const [error, setError] = useState(null);

  const handleExportCustomers = async () => {
    if (!currentShop?.id || !db) return;
    try {
      setLoadingType('customers');
      setError(null);

      const custSnap = await get(ref(db, `customers/${currentShop.id}`));
      const custData = custSnap.val() || {};
      const customers = Object.keys(custData)
        .map((k) => ({ id: k, ...custData[k] }))
        .filter((c) => !c.deleted_at)
        .sort((a, b) => (a.name || '').localeCompare(b.name || ''));

      const csvContent = generateCustomersSummaryCSV(currentShop, customers);
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
    if (!currentShop?.id || !db) return;
    try {
      setLoadingType('transactions');
      setError(null);

      // Fetch customers map to resolve customer names
      const custSnap = await get(ref(db, `customers/${currentShop.id}`));
      const custMap = custSnap.val() || {};

      // Fetch shop_transactions or collect from transactions/shopId
      const txSnap = await get(ref(db, `shop_transactions/${currentShop.id}`));
      let transactions = [];

      if (txSnap.exists()) {
        const val = txSnap.val() || {};
        transactions = Object.keys(val)
          .map((k) => ({ id: k, ...val[k] }))
          .filter((t) => !t.deleted_at);
      } else {
        // Fallback: collect across all customers under this shop
        const allTxSnap = await get(ref(db, `transactions/${currentShop.id}`));
        const allTxVal = allTxSnap.val() || {};
        Object.keys(allTxVal).forEach((cid) => {
          const custTxObj = allTxVal[cid] || {};
          Object.keys(custTxObj).forEach((tid) => {
            const tx = custTxObj[tid];
            if (tx && !tx.deleted_at) {
              transactions.push({ id: tid, ...tx });
            }
          });
        });
      }

      const now = new Date();
      let rangeLabel = 'All_Transactions';

      if (txExportRange === 'THIS_MONTH') {
        const start = startOfMonth(now).getTime();
        transactions = transactions.filter((t) => new Date(t.created_at).getTime() >= start);
        rangeLabel = `${format(now, 'MMM_yyyy')}_Transactions`;
      } else if (txExportRange === 'LAST_MONTH') {
        const prevMonth = subMonths(now, 1);
        const start = startOfMonth(prevMonth).getTime();
        const end = endOfMonth(prevMonth).getTime();
        transactions = transactions.filter((t) => {
          const time = new Date(t.created_at).getTime();
          return time >= start && time <= end;
        });
        rangeLabel = `${format(prevMonth, 'MMM_yyyy')}_Transactions`;
      }

      transactions.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));

      let csv = [];
      csv.push([`"SHOP: ${currentShop.shop_name}"`, `"EXPORT RANGE: ${txExportRange}"`, `"EXPORTED: ${format(new Date(), 'dd-MMM-yyyy')}"`].join(','));
      csv.push('');
      csv.push(['"Date & Time"', '"Customer Name"', '"Phone"', '"Type"', '"Amount (₹)"', '"Note"'].join(','));

      transactions.forEach((tx) => {
        const date = format(new Date(tx.created_at || Date.now()), 'dd-MMM-yyyy hh:mm a');
        const cust = custMap[tx.customer_id] || {};
        const cName = cust.name || tx.customer_name || 'Customer';
        const cPhone = cust.phone || '';
        const txType = tx.type === 'GAVE' ? 'GAVE (Udhaar)' : 'GOT (Jama)';
        const amount = Number(tx.amount || 0).toFixed(2);
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

      const csvContent = csv.join('\r\n');
      const fileName = `${currentShop.shop_name.replace(/\s+/g, '_')}_${rangeLabel}_${format(new Date(), 'yyyyMMdd')}.csv`;
      downloadCSV(fileName, csvContent);
    } catch (err) {
      console.error('Transactions export error:', err);
      setError('Failed to export transactions statement.');
    } finally {
      setLoadingType(null);
    }
  };

  return (
    <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-xs space-y-5">
      <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
        <div className="p-2 bg-blue-50 text-blue-700 rounded-xl">
          <FileSpreadsheet className="w-5 h-5" />
        </div>
        <div>
          <h2 className="font-extrabold text-slate-800 text-base">Export Statements & Reports</h2>
          <p className="text-xs text-slate-400">Download Excel / CSV statements for offline records</p>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold rounded-2xl">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Export Customers Summary Card */}
        <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 flex flex-col justify-between space-y-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-bold text-sm text-slate-800">Customers Summary CSV</span>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              Sabhi customers ki current balance summary, contact details, aur pending dues ek spreadsheet mein download karein.
            </p>
          </div>

          <button
            onClick={handleExportCustomers}
            disabled={loadingType !== null}
            className="w-full py-2.5 px-4 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 font-bold text-xs rounded-xl shadow-2xs transition active:scale-98 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loadingType === 'customers' ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Generating CSV...</span>
              </>
            ) : (
              <>
                <Download className="w-3.5 h-3.5 text-slate-500" />
                <span>Download Customers List CSV</span>
              </>
            )}
          </button>
        </div>

        {/* Export Transactions History Card */}
        <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 flex flex-col justify-between space-y-3">
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="font-bold text-sm text-slate-800">Full Transactions Ledger</span>
              <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-500">
                <Calendar className="w-3 h-3 text-slate-400" />
                <select
                  value={txExportRange}
                  onChange={(e) => setTxExportRange(e.target.value)}
                  className="bg-transparent text-slate-700 font-bold focus:outline-none cursor-pointer"
                >
                  <option value="ALL">All Time</option>
                  <option value="THIS_MONTH">This Month</option>
                  <option value="LAST_MONTH">Last Month</option>
                </select>
              </div>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              Dukan ke transactions (gave, got, notes, date) ka full audit ledger download karein.
            </p>
          </div>

          <button
            onClick={handleExportTransactions}
            disabled={loadingType !== null}
            className="w-full py-2.5 px-4 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 font-bold text-xs rounded-xl shadow-2xs transition active:scale-98 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loadingType === 'transactions' ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Generating CSV...</span>
              </>
            ) : (
              <>
                <Download className="w-3.5 h-3.5 text-slate-500" />
                <span>Download Ledger CSV</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
