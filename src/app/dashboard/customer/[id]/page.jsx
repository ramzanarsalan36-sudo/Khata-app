'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useShop } from '@/lib/context/ShopContext';
import {
  subscribeCustomer,
  subscribeCustomerTransactions,
  softDeleteTransaction,
} from '@/lib/firebase/db';
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

export default function CustomerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const customerId = params.id;

  const { currentShop } = useShop();
  const [customer, setCustomer] = useState(null);
  const [rawTransactions, setRawTransactions] = useState([]);
  const [filterType, setFilterType] = useState('ALL'); // 'ALL', 'GAVE', 'GOT'
  const [dateFilter, setDateFilter] = useState('ALL'); // 'ALL', 'TODAY', 'THIS_WEEK', 'THIS_MONTH'
  const [loading, setLoading] = useState(true);

  // Modals state
  const [showTxModal, setShowTxModal] = useState(false);
  const [txType, setTxType] = useState('GAVE');
  const [savedTxResult, setSavedTxResult] = useState(null);
  const [showWhatsAppReceiptModal, setShowWhatsAppReceiptModal] = useState(false);
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [activeReceiptPath, setActiveReceiptPath] = useState(null);
  const [deleteConfirmTx, setDeleteConfirmTx] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Real-time listener for customer details
  useEffect(() => {
    if (!currentShop?.id || !customerId) return;

    const unsubscribeCust = subscribeCustomer(currentShop.id, customerId, (cust) => {
      if (!cust) {
        // If customer was deleted or doesn't exist
        router.push('/dashboard');
      } else {
        setCustomer(cust);
      }
    });

    const unsubscribeTx = subscribeCustomerTransactions(
      currentShop.id,
      customerId,
      (txList) => {
        setRawTransactions(txList || []);
        setLoading(false);
      }
    );

    return () => {
      if (unsubscribeCust) unsubscribeCust();
      if (unsubscribeTx) unsubscribeTx();
    };
  }, [currentShop?.id, customerId, router]);

  // Client-side date and type filtering
  const filteredTransactions = useMemo(() => {
    let result = [...rawTransactions];
    const now = new Date();

    if (dateFilter === 'TODAY') {
      const todayStart = startOfDay(now).getTime();
      result = result.filter((tx) => new Date(tx.created_at).getTime() >= todayStart);
    } else if (dateFilter === 'THIS_WEEK') {
      const weekStart = startOfWeek(now, { weekStartsOn: 1 }).getTime();
      result = result.filter((tx) => new Date(tx.created_at).getTime() >= weekStart);
    } else if (dateFilter === 'THIS_MONTH') {
      const monthStart = startOfMonth(now).getTime();
      result = result.filter((tx) => new Date(tx.created_at).getTime() >= monthStart);
    }

    if (filterType !== 'ALL') {
      result = result.filter((tx) => tx.type === filterType);
    }

    return result;
  }, [rawTransactions, dateFilter, filterType]);

  const handleOpenTx = (type) => {
    setTxType(type);
    setShowTxModal(true);
  };

  const handleTransactionSuccess = (result) => {
    setSavedTxResult(result);
    setShowWhatsAppReceiptModal(true);
  };

  const handleDeleteTransaction = async () => {
    if (!deleteConfirmTx || !currentShop?.id || !customerId) return;

    setDeleting(true);
    try {
      await softDeleteTransaction({
        shopId: currentShop.id,
        customerId,
        transactionId: deleteConfirmTx.id,
        amount: deleteConfirmTx.amount,
        type: deleteConfirmTx.type,
      });
      setDeleteConfirmTx(null);
    } catch (err) {
      console.error('Failed to delete transaction:', err);
      alert('Transaction delete karne mein samasya aayi: ' + err.message);
    } finally {
      setDeleting(false);
    }
  };

  const handleDownloadStatement = () => {
    if (!customer || !currentShop) return;
    try {
      const csvContent = generateCustomerStatementCSV(
        currentShop,
        customer,
        filteredTransactions
      );
      const fileName = `${customer.name.replace(/\s+/g, '_')}_Statement_${format(
        new Date(),
        'yyyyMMdd'
      )}.csv`;
      downloadCSV(fileName, csvContent);
    } catch (err) {
      console.error('Error generating CSV statement:', err);
    }
  };

  if (loading || !customer) {
    return (
      <div className="flex-1 flex items-center justify-center p-12">
        <LoadingSpinner size="lg" text="Loading customer ledger..." />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col relative max-w-4xl mx-auto w-full px-3 sm:px-6 py-4">
      {/* Customer Header Component */}
      <CustomerHeader
        customer={customer}
        onCustomerUpdated={(updated) => setCustomer(updated)}
        onReminderClick={() => setShowReminderModal(true)}
        onDownloadStatement={handleDownloadStatement}
        onOpenGave={() => handleOpenTx('GAVE')}
        onOpenGot={() => handleOpenTx('GOT')}
      />

      {/* Ledger Timeline */}
      <div className="mt-4">
        <LedgerTimeline
          transactions={filteredTransactions}
          filterType={filterType}
          dateFilter={dateFilter}
          onFilterTypeChange={setFilterType}
          onDateFilterChange={setDateFilter}
          hasMore={false}
          totalCount={filteredTransactions.length}
          loading={false}
          loadingMore={false}
          onLoadMore={() => {}}
          onViewReceipt={(receiptPath) => setActiveReceiptPath(receiptPath)}
          onDeleteTransaction={(tx) => setDeleteConfirmTx(tx)}
        />
      </div>

      {/* Floating Action Buttons for Gave / Got on Mobile */}
      <div className="fixed bottom-0 left-0 right-0 p-3 bg-white/95 backdrop-blur-md border-t border-slate-200 z-30 lg:hidden shadow-lg">
        <div className="grid grid-cols-2 gap-2 max-w-md mx-auto">
          <button
            onClick={() => handleOpenTx('GAVE')}
            className="flex items-center justify-center gap-1.5 py-3 px-4 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-sm rounded-xl shadow-md transition active:scale-98"
          >
            <ArrowUpRight className="w-4 h-4" />
            <span>Maine Diye (₹)</span>
          </button>
          <button
            onClick={() => handleOpenTx('GOT')}
            className="flex items-center justify-center gap-1.5 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm rounded-xl shadow-md transition active:scale-98"
          >
            <ArrowDownLeft className="w-4 h-4" />
            <span>Mujhe Mile (₹)</span>
          </button>
        </div>
      </div>

      {/* Transaction Modal (GAVE / GOT) */}
      {showTxModal && (
        <TransactionModal
          customer={customer}
          initialType={txType}
          onClose={() => setShowTxModal(false)}
          onTransactionSuccess={handleTransactionSuccess}
        />
      )}

      {/* WhatsApp Receipt Modal */}
      {showWhatsAppReceiptModal && savedTxResult && (
        <WhatsAppReceiptModal
          customer={customer}
          transaction={savedTxResult.transaction}
          newBalance={savedTxResult.customerBalance}
          onClose={() => setShowWhatsAppReceiptModal(false)}
        />
      )}

      {/* WhatsApp Payment Reminder Modal */}
      {showReminderModal && (
        <ReminderModal
          customer={customer}
          onClose={() => setShowReminderModal(false)}
        />
      )}

      {/* Receipt Image Viewer Modal */}
      {activeReceiptPath && (
        <ReceiptViewerModal
          billPath={activeReceiptPath}
          onClose={() => setActiveReceiptPath(null)}
        />
      )}

      {/* Delete Transaction Confirmation Modal */}
      {deleteConfirmTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-rose-600 mb-3">
              <div className="p-2.5 bg-rose-50 rounded-xl">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-extrabold text-base text-slate-900">
                  Transaction Delete Karein?
                </h3>
                <p className="text-xs text-slate-500">
                  Yeh entry ledger se hat jayegi aur balance adjust ho jayega.
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl mb-4 font-medium">
              Raqam: <strong>₹{deleteConfirmTx.amount}</strong> ({deleteConfirmTx.type === 'GAVE' ? 'Diye' : 'Mile'})
            </p>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmTx(null)}
                disabled={deleting}
                className="py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition"
              >
                Nahi (Cancel)
              </button>
              <button
                type="button"
                onClick={handleDeleteTransaction}
                disabled={deleting}
                className="py-2.5 px-3 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center justify-center gap-1.5"
              >
                {deleting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <span>Haan, Delete Karein</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
