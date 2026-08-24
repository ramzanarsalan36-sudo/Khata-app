'use client';

import React, { useState } from 'react';
import { buildPaymentReminderWhatsAppMessage, generateWhatsAppUrl } from '@/lib/utils/whatsapp';
import { normalizeIndianPhoneNumber } from '@/lib/utils/phone';
import { formatINR } from '@/lib/utils/currency';
import { BellRing, X, AlertCircle, CheckCircle2 } from 'lucide-react';
import { FaWhatsapp } from 'react-icons/fa';
import { useShop } from '@/lib/context/ShopContext';

export default function ReminderModal({
  customer,
  onClose,
}) {
  const { currentShop } = useShop();
  const [errorMessage, setErrorMessage] = useState(null);

  const isDue = Number(customer?.balance) > 0;
  const message = isDue
    ? buildPaymentReminderWhatsAppMessage({
        balance: customer.balance,
        shopName: currentShop?.shop_name || '',
      })
    : null;

  const normalizedPhone = normalizeIndianPhoneNumber(customer?.phone);
  const waUrl = normalizedPhone && message
    ? generateWhatsAppUrl({ phone: customer.phone, message })
    : null;

  const handleSendClick = (e) => {
    if (!isDue) {
      e.preventDefault();
      setErrorMessage('Is customer ka koi baki hisaab nahi hai.');
      return;
    }
    if (!normalizedPhone) {
      e.preventDefault();
      setErrorMessage('Customer ka valid WhatsApp number available nahi hai.');
      return;
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-3xl max-w-sm w-full p-5 shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
              <BellRing className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-sm">Send Payment Reminder</h3>
              <p className="text-[11px] text-slate-400">Udhaar payment yaad-dihani</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
            aria-label="Close"
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

        {/* Outstanding Info */}
        <div className="bg-rose-50 rounded-2xl p-3.5 border border-rose-200/80 mb-3.5 flex items-center justify-between text-xs">
          <div>
            <p className="text-rose-900 font-bold">{customer.name}</p>
            <p className="text-rose-600 text-[11px] font-medium">Current Outstanding Due</p>
          </div>
          <div className="text-base font-black text-rose-600">
            {formatINR(customer.balance)}
          </div>
        </div>

        {/* Live Message Preview Bubble */}
        <div className="mb-4">
          <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
            <span>WhatsApp Message Preview</span>
            <span className="text-[10px] text-emerald-600 font-semibold bg-emerald-50 px-2 py-0.5 rounded-md">
              Official Template
            </span>
          </label>
          <div className="p-3 bg-[#EFEAE2] rounded-2xl border border-slate-200 text-slate-900 shadow-inner">
            <div className="bg-white p-3 rounded-xl shadow-xs text-xs leading-relaxed whitespace-pre-line text-slate-800 border border-[#e1ded7]">
              {message || 'No pending balance to remind.'}
            </div>
          </div>
        </div>

        {/* Send Button */}
        <div className="space-y-2">
          {waUrl ? (
            <a
              href={waUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={handleSendClick}
              className="w-full py-3.5 bg-[#25D366] hover:bg-[#20ba5c] text-white font-extrabold text-sm rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 transition active:scale-98"
              aria-label="Send WhatsApp reminder to customer"
            >
              <FaWhatsapp className="w-5 h-5" />
              <span>Send on WhatsApp</span>
            </a>
          ) : (
            <button
              type="button"
              disabled={!isDue}
              onClick={handleSendClick}
              className="w-full py-3.5 bg-[#25D366] hover:bg-[#20ba5c] text-white font-extrabold text-sm rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 transition active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Send WhatsApp reminder to customer"
            >
              <FaWhatsapp className="w-5 h-5" />
              <span>Send on WhatsApp</span>
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 text-slate-500 hover:text-slate-700 text-xs font-bold text-center transition"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

