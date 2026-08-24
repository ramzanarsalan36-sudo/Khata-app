'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useShop } from '@/lib/context/ShopContext';
import { createClient } from '@/lib/supabase/client';
import CustomerHeader from '@/components/customer/CustomerHeader';
import LedgerTimeline from '@/components/customer/LedgerTimeline';
import TransactionModal from '@/components/customer/TransactionModal';
import WhatsAppReceiptModal from '@/components/customer/WhatsAppReceiptModal';
import ReminderModal from '@/components/customer/ReminderModal';
import ReceiptViewerModal from '@/components/customer/ReceiptViewerModal';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { generateCustomerStatementCSV, downloadCSV } from '@/lib/utils/csv';
import { ArrowUpRight, ArrowDownLeft, AlertTriangle, Loader2 } from 'lucide-react';
import { format, startOfDay, startOfWeek, startOfMonth } from 'date-fns';

const TX_PAGE_SIZE = 20;

export default function CustomerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const customerId = params.id;

  const { currentShop } = useShop();
  const [customer, setCustomer] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [txPage, setTxPage] = useState(1);
  const [hasMoreTx, setHasMoreTx] = useState(false);
  const [totalTxCount, setTotalTxCount] = useState(0);
  const [filterType, setFilterType] = useState('ALL'); // 'ALL', 'GAVE', 'GOT'
  const [dateFilter, setDateFilter] = useState('ALL'); // 'ALL', 'TODAY', 'THIS_WEEK', 'THIS_MONTH'
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  // Modals state
  const [showTxModal, setShowTxModal] = useState(false);
  const [txType, setTxType] = useState('GAVE');
  const [savedTxResult, setSavedTxResult] = useState(null);
  const [showWhatsAppReceiptModal, setShowWhatsAppReceiptModal] = useState(false);
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [activeReceiptPath, setActiveReceiptPath] = useState(null);
  const [deleteConfirmTx, setDeleteConfirmTx] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const supabase = createClient();

  // 1. Fetch customer profile details
  const loadCustomer = useCallback(async () => {
    if (!currentShop?.id || !customerId) return;
    try {
      const { data: custData, error: custError } = await supabase
        .from('customers')
        .select('id, shop_id, name, phone, photo_url, notes, balance, created_at, updated_at')
        .eq('id', customerId)
        .eq('shop_id', currentShop.id)
        .is('deleted_at', null)
        .single();

      if (custError || !custData) {
        console.error('Customer not found:', custError);
        router.push('/dashboard');
        return;
      }

      setCustomer(custData);
    } catch (err) {
      console.error('Error fetching customer:', err);
    }
  }, [currentShop?.id, customerId, supabase, router]);

  // 2. Fetch paginated transactions with server-side filtering
  const loadTransactions = useCallback(async (targetPage = 1, isLoadMore = false) => {
    if (!currentShop?.id || !customerId) return;

    if (isLoadMore) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }

    try {
      // Calculate start_date based on dateFilter
      let startDateIso = null;
      const now = new Date();
      if (dateFilter === 'TODAY') {
        startDateIso = startOfDay(now).toISOString();
      } else if (dateFilter === 'THIS_WEEK') {
        startDateIso = startOfWeek(now, { weekStartsOn: 1 }).toISOString();
      } else if (dateFilter === 'THIS_MONTH') {
        startDateIso = startOfMonth(now).toISOString();
      }

      // Try RPC first
      let rpcResult = null;
      try {
        const { data, error } = await supabase.rpc('get_customer_ledger_paginated', {
          p_shop_id: currentShop.id,
          p_customer_id: customerId,
          p_page: targetPage,
          p_page_size: TX_PAGE_SIZE,
          p_type: filterType,
          p_start_date: startDateIso,
          p_end_date: null,
        });

        if (!error && data) {
          rpcResult = data;
        }
      } catch (rpcErr) {
        console.warn('RPC get_customer_ledger_paginated fallback:', rpcErr);
      }

      if (rpcResult) {
        const list = rpcResult.data || [];
        setTotalTxCount(rpcResult.filtered_count ?? 0);
        setHasMoreTx(rpcResult.has_more ?? false);
        setTransactions((prev) => (isLoadMore ? [...prev, ...list] : list));
      } else {
        // Fallback: Direct paginated query
        const from = (targetPage - 1) * TX_PAGE_SIZE;
        const to = from + TX_PAGE_SIZE - 1;

        let query = supabase
          .from('transactions')
          .select('id, shop_id, customer_id, amount, type, note, bill_path, created_at, client_transaction_id', { count: 'exact' })
          .eq('shop_id', currentShop.id)
          .eq('customer_id', customerId)
          .is('deleted_at', null);

        if (filterType !== 'ALL') {
          query = query.eq('type', filterType);
        }

        if (startDateIso) {
          query = query.gte('created_at', startDateIso);
        }

        query = query.order('created_at', { ascending: false }).range(from, to);

        const { data, error, count } = await query;
        if (error) throw error;

        const list = data || [];
        setTotalTxCount(count || 0);
        setHasMoreTx(list.length === TX_PAGE_SIZE && from + list.length < (count || 0));
        setTransactions((prev) => (isLoadMore ? [...prev, ...list] : list));
      }
    } catch (err) {
      console.error('Error loading transactions:', err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [currentShop?.id, customerId, filterType, dateFilter, supabase]);

  useEffect(() => {
    loadCustomer();
  }, [loadCustomer]);

  useEffect(() => {
    setTxPage(1);
    loadTransactions(1, false);
  }, [loadTransactions]);

  const handleLoadMoreTransactions = () => {
    if (loadingMore || !hasMoreTx) return;
    const nextPage = txPage + 1;
    setTxPage(nextPage);
    loadTransactions(nextPage, true);
  };

  const handleOpenTx = (type) => {
    setTxType(type);
    setShowTxModal(true);
  };

  const handleTransactionSuccess = (result) => {
    if (customer && result.customerBalance !== undefined) {
      setCustomer((prev) => ({
        ...prev,
        balance: result.customerBalance,
      }));
    }

    setSavedTxResult(result);
    setShowWhatsAppReceiptModal(true);
    setTxPage(1);
    loadTransactions(1, false);
  };

  const handleDeleteTransaction = async () => {
    if (!deleteConfirmTx) return;

    setDeleting(true);
    try {
      const { data, error } = await supabase.rpc('soft_delete_transaction', {
        p_transaction_id: deleteConfirmTx.id,
      });

      if (error) throw error;

      if (customer && data?.customer_balance !== undefined) {
        setCustomer((prev) => ({
          ...prev,
          balance: data.customer_balance,
        }));
      }

      setDeleteConfirmTx(null);
      setTxPage(1);
      await loadTransactions(1, false);
    } catch (err) {
      console.error('Delete transaction failed:', err);
      alert(`Delete failed: ${err.message}`);
    } finally {
      setDeleting(false);
    }
  };

  const handleDownloadStatement = async () => {
    if (!customer || !currentShop) return;
    
    // Fetch all transactions for this customer directly for statement export
    try {
      const { data: allTx, error: txErr } = await supabase
        .from('transactions')
        .select('id, amount, type, note, created_at')
        .eq('shop_id', currentShop.id)
        .eq('customer_id', customerId)
        .is('deleted_at', null)
        .order('created_at', { ascending: true });

      if (txErr) throw txErr;

      const csvContent = generateCustomerStatementCSV({
        shop: currentShop,
        customer,
        transactions: allTx || [],
      });
      const fileName = `${currentShop.shop_name.replace(/\s+/g, '_')}_${customer.name.replace(/\s+/g, '_')}_Statement_${format(new Date(), 'yyyyMMdd')}.csv`;
      downloadCSV(fileName, csvContent);
    } catch (err) {
      console.error('Statement download error:', err);
      alert('Statement download failed: ' + err.message);
    }
  };

  if (!customer && loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-12">
        <LoadingSpinner size="lg" text="Loading customer ledger..." />
      </div>
    );
  }

  if (!customer) return null;

  return (
    <div className="w-full">
      {/* Responsive Grid: 2 Columns on Desktop (>= 1024px) / 1 Column on Mobile */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Customer Header & Profile Card (5 Cols on Desktop) */}
        <div className="lg:col-span-5 xl:col-span-4">
          <CustomerHeader
            customer={customer}
            onCustomerUpdated={(updated) => setCustomer(updated)}
            onReminderClick={() => setShowReminderModal(true)}
            onDownloadStatement={handleDownloadStatement}
            onOpenGave={() => handleOpenTx('GAVE')}
            onOpenGot={() => handleOpenTx('GOT')}
          />
        </div>

        {/* Right Column: Ledger Timeline History (7 Cols on Desktop) */}
        <div className="lg:col-span-7 xl:col-span-8">
          <LedgerTimeline
            transactions={transactions}
            filterType={filterType}
            dateFilter={dateFilter}
            onFilterTypeChange={(type) => setFilterType(type)}
            onDateFilterChange={(df) => setDateFilter(df)}
            hasMore={hasMoreTx}
            totalCount={totalTxCount}
            loading={loading}
            loadingMore={loadingMore}
            onLoadMore={handleLoadMoreTransactions}
            onViewReceipt={(path) => setActiveReceiptPath(path)}
            onDeleteTransaction={(tx) => setDeleteConfirmTx(tx)}
          />
        </div>
      </div>

      {/* Sticky Bottom Action Bar (Mobile only < 1024px) */}
      <div className="lg:hidden fixed bottom-14 left-0 right-0 w-full bg-white/95 backdrop-blur-md border-t border-slate-200 p-2.5 z-20 shadow-xl pb-[calc(0.625rem+env(safe-area-inset-bottom))]">
        <div className="max-w-md mx-auto grid grid-cols-2 gap-2.5">
          {/* BAKI (Diya) Button */}
          <button
            onClick={() => handleOpenTx('GAVE')}
            className="py-3 px-4 bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white font-black text-xs sm:text-sm rounded-xl flex items-center justify-center gap-2 shadow-md shadow-rose-600/20 transition active:scale-98"
          >
            <ArrowUpRight className="w-5 h-5 stroke-[2.5]" />
            <span>BAKI ₹ (DIYA)</span>
          </button>

          {/* JAMA (Liya) Button */}
          <button
            onClick={() => handleOpenTx('GOT')}
            className="py-3 px-4 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-black text-xs sm:text-sm rounded-xl flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20 transition active:scale-98"
          >
            <ArrowDownLeft className="w-5 h-5 stroke-[2.5]" />
            <span>JAMA ₹ (LIYA)</span>
          </button>
        </div>
      </div>

      {/* Transaction Entry Modal */}
      {showTxModal && (
        <TransactionModal
          customer={customer}
          initialType={txType}
          onClose={() => setShowTxModal(false)}
          onTransactionSuccess={handleTransactionSuccess}
        />
      )}

      {/* WhatsApp Receipt Popup */}
      {showWhatsAppReceiptModal && savedTxResult && (
        <WhatsAppReceiptModal
          shop={currentShop}
          customer={customer}
          transactionData={savedTxResult}
          onClose={() => {
            setShowWhatsAppReceiptModal(false);
            setSavedTxResult(null);
          }}
        />
      )}

      {/* Payment Reminder Modal */}
      {showReminderModal && (
        <ReminderModal
          shop={currentShop}
          customer={customer}
          onClose={() => setShowReminderModal(false)}
        />
      )}

      {/* Receipt Photo Full Viewer Modal */}
      {activeReceiptPath && (
        <ReceiptViewerModal
          billPath={activeReceiptPath}
          onClose={() => setActiveReceiptPath(null)}
        />
      )}

      {/* Delete Confirmation Dialog */}
      {deleteConfirmTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-xs w-full p-5 shadow-2xl animate-in zoom-in-95 duration-150 text-slate-800">
            <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-3">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-center font-bold text-base mb-1">Delete Transaction?</h3>
            <p className="text-center text-xs text-slate-500 mb-4 leading-relaxed">
              This will remove the entry and automatically recalculate {customer.name}&apos;s balance.
            </p>
            <div className="space-y-2">
              <button
                onClick={handleDeleteTransaction}
                disabled={deleting}
                className="w-full py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition active:scale-98 disabled:opacity-50"
              >
                {deleting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <span>Yes, Delete Entry</span>
                )}
              </button>
              <button
                onClick={() => setDeleteConfirmTx(null)}
                disabled={deleting}
                className="w-full py-2 text-slate-500 hover:text-slate-700 text-xs font-semibold text-center"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
