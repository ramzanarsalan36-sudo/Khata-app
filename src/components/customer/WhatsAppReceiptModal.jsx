'use client';

import React, { useState } from 'react';
import { buildTransactionWhatsAppMessage, generateWhatsAppUrl } from '@/lib/utils/whatsapp';
import { normalizeIndianPhoneNumber } from '@/lib/utils/phone';
import { formatINR } from '@/lib/utils/currency';
import { CheckCircle2, X, AlertCircle } from 'lucide-react';
import { FaWhatsapp } from 'react-icons/fa';

export default function WhatsAppReceiptModal({
  shop,
  customer,
  transactionData,
  onClose,
}) {
  const [errorMessage, setErrorMessage] = useState(null);

  if (!transactionData) return null;

  const { amount, type, customerBalance, note } = transactionData;
  const isGave = type === 'GAVE';

  const message = buildTransactionWhatsAppMessage({
    shopName: shop?.shop_name || 'Apki Dukan',
    transactionAmount: amount,
    type,
    newBalance: customerBalance,
    note,
  });

  const normalizedPhone = normalizeIndianPhoneNumber(customer.phone);
  const waUrl = normalizedPhone
    ? generateWhatsAppUrl({ phone: customer.phone, message })
    : null;

  const handleSendClick = (e) => {
    if (!normalizedPhone) {
      e.preventDefault();
      setErrorMessage('Customer ka valid WhatsApp number available nahi hai.');
      return;
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-emerald-100 text-emerald-700 rounded-full">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-sm">Transaction Saved!</h3>
              <p className="text-[11px] text-slate-400">Khate mein entry darj ho gayi</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMessage && (
          <div className="mb-3 p-2.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Receipt Card */}
        <div className="bg-slate-50 rounded-xl p-4 border border-slate-200/80 mb-4 space-y-2 text-xs text-slate-600">
          <div className="flex justify-between">
            <span className="text-slate-400">Customer:</span>
            <span className="font-bold text-slate-800">{customer.name}</span>
          </div>

          <div className="flex justify-between">
            <span className="text-slate-400">Amount:</span>
            <span
              className={`font-black text-sm ${
                isGave ? 'text-rose-600' : 'text-emerald-600'
              }`}
            >
              {isGave ? `+${formatINR(amount)} (Diya)` : `-${formatINR(amount)} (Liya)`}
            </span>
          </div>

          {note && (
            <div className="flex justify-between">
              <span className="text-slate-400">Note:</span>
              <span className="font-medium text-slate-700">{note}</span>
            </div>
          )}

          <div className="border-t border-slate-200 pt-2 flex justify-between items-center font-bold text-slate-800">
            <span>New Net Balance:</span>
            <span
              className={`text-sm font-extrabold ${
                customerBalance > 0
                  ? 'text-rose-600'
                  : customerBalance < 0
                  ? 'text-emerald-600'
                  : 'text-slate-600'
              }`}
            >
              {formatINR(Math.abs(customerBalance))}{' '}
              {customerBalance > 0 ? 'Udhaar' : customerBalance < 0 ? 'Advance' : 'Settled'}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2">
          {waUrl ? (
            <a
              href={waUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={handleSendClick}
              className="w-full py-3 bg-[#25D366] hover:bg-[#20ba5c] text-white font-bold text-sm rounded-xl flex items-center justify-center gap-2 shadow-md transition active:scale-98"
              aria-label="Send WhatsApp message to customer"
            >
              <FaWhatsapp className="w-5 h-5" />
              <span>Send Receipt on WhatsApp</span>
            </a>
          ) : (
            <button
              type="button"
              onClick={handleSendClick}
              className="w-full py-3 bg-[#25D366] hover:bg-[#20ba5c] text-white font-bold text-sm rounded-xl flex items-center justify-center gap-2 shadow-md transition active:scale-98"
              aria-label="Send WhatsApp message to customer"
            >
              <FaWhatsapp className="w-5 h-5" />
              <span>Send Receipt on WhatsApp</span>
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            className="w-full py-2 text-slate-500 hover:text-slate-700 text-xs font-semibold text-center transition"
          >
            Skip & Close
          </button>
        </div>
      </div>
    </div>
  );
}
