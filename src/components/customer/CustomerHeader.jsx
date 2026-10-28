'use client';

import React, { useState, useRef } from 'react';
import Link from 'next/link';
import { ArrowLeft, Phone, BellRing, FileDown, AlertCircle, ArrowUpRight, ArrowDownLeft, Camera, Loader2, User, UserCog } from 'lucide-react';
import { FaWhatsapp } from 'react-icons/fa';
import { getBalanceInfo } from '@/lib/utils/currency';
import { formatIndianPhoneNumber, normalizeIndianPhoneNumber } from '@/lib/utils/phone';
import { buildCustomerBalanceWhatsAppMessage, generateWhatsAppUrl } from '@/lib/utils/whatsapp';
import { useShop } from '@/lib/context/ShopContext';
import { uploadReceipt, updateCustomer } from '@/lib/firebase/db';
import { compressProfileImage } from '@/lib/utils/imageCompression';
import EditCustomerModal from '@/components/customer/EditCustomerModal';

export default function CustomerHeader({
  customer,
  onCustomerUpdated,
  onReminderClick,
  onDownloadStatement,
  onOpenGave,
  onOpenGot,
}) {
  const { currentShop } = useShop();
  const [photoUrl, setPhotoUrl] = useState(customer.photo_url || null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const photoInputRef = useRef(null);

  const balanceInfo = getBalanceInfo(customer.balance);
  const normalizedPhone = normalizeIndianPhoneNumber(customer.phone);

  const handlePhotoUpload = async (e) => {
    e.stopPropagation();
    const file = e.target.files?.[0];
    if (e.target) e.target.value = '';

    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMessage('Kripya valid image (photo) file select karein.');
      setTimeout(() => setErrorMessage(null), 4000);
      return;
    }

    setUploadingPhoto(true);
    try {
      // 1. Compress image client-side (~80KB target)
      const compressedFile = await compressProfileImage(file);

      // 2. Upload to Firebase Storage or Base64 fallback
      const uploadRes = await uploadReceipt({
        shopId: currentShop.id,
        customerId: `profiles/${customer.id}`,
        file: compressedFile,
      });

      const newPhotoUrl = uploadRes?.billUrl;

      // 3. Update customer record in Firebase Realtime Database
      await updateCustomer(currentShop.id, customer.id, {
        photo_url: newPhotoUrl,
      });

      setPhotoUrl(newPhotoUrl);
      if (onCustomerUpdated) {
        onCustomerUpdated({
          ...customer,
          photo_url: newPhotoUrl,
        });
      }
    } catch (err) {
      console.error('Error updating customer photo:', err);
      setErrorMessage('Photo upload karne me truti hui: ' + (err.message || 'Please try again.'));
      setTimeout(() => setErrorMessage(null), 4000);
    } finally {
      setUploadingPhoto(false);
    }
  };

  // Generate pre-filled message with latest balance
  const message = buildCustomerBalanceWhatsAppMessage({
    shopName: currentShop?.shop_name || 'Apki Dukan',
    balance: customer.balance,
  });

  const waUrl = normalizedPhone
    ? generateWhatsAppUrl({ phone: customer.phone, message })
    : null;

  const handleWhatsAppClick = (e) => {
    if (!normalizedPhone) {
      e.preventDefault();
      setErrorMessage('Customer ka valid WhatsApp number available nahi hai.');
      setTimeout(() => setErrorMessage(null), 4000);
      return;
    }
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-4 sm:p-6 shadow-xs">
      {errorMessage && (
        <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold rounded-2xl flex items-center gap-2 shadow-xs animate-in fade-in duration-200">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Top Bar with Back, Title & Edit Button */}
      <div className="flex items-center justify-between mb-4">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 transition py-1 px-2 -ml-2 rounded-xl hover:bg-slate-100"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Dashboard</span>
        </Link>

        <button
          onClick={() => setShowEditModal(true)}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-emerald-700 transition py-1.5 px-3 rounded-xl bg-slate-100 hover:bg-emerald-50 border border-slate-200/60"
        >
          <UserCog className="w-3.5 h-3.5" />
          <span>Edit Grahak</span>
        </button>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        {/* Customer Profile & Info */}
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="relative group shrink-0">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-700 text-xl overflow-hidden shadow-inner">
              {photoUrl ? (
                <img
                  src={photoUrl}
                  alt={customer.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span>{customer.name?.charAt(0)?.toUpperCase() || '?'}</span>
              )}
            </div>

            {/* Photo Upload Camera Badge */}
            <input
              ref={photoInputRef}
              type="file"
              accept="image/*"
              onChange={handlePhotoUpload}
              onClick={(e) => e.stopPropagation()}
              className="hidden"
            />
            <button
              onClick={() => photoInputRef.current?.click()}
              disabled={uploadingPhoto}
              className="absolute -bottom-1 -right-1 p-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full shadow-md transition disabled:opacity-50 cursor-pointer"
              title="Change Customer Photo"
              aria-label="Upload photo"
            >
              {uploadingPhoto ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <Camera className="w-3 h-3" />
              )}
            </button>
          </div>

          <div className="min-w-0">
            <h1 className="font-extrabold text-lg sm:text-xl text-slate-900 truncate">
              {customer.name}
            </h1>
            <div className="flex flex-wrap items-center gap-2 mt-0.5 text-xs text-slate-500">
              {customer.phone ? (
                <a
                  href={`tel:${customer.phone}`}
                  className="inline-flex items-center gap-1 font-semibold text-slate-700 hover:text-emerald-700"
                >
                  <Phone className="w-3 h-3 text-slate-400" />
                  <span>{formatIndianPhoneNumber(customer.phone)}</span>
                </a>
              ) : (
                <span className="text-slate-400">No phone added</span>
              )}

              {customer.notes && (
                <span className="text-slate-400 truncate max-w-[200px]">
                  • {customer.notes}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Current Balance Card */}
        <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center p-3 sm:p-0 bg-slate-50 sm:bg-transparent rounded-2xl border sm:border-0 border-slate-200/60">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Current Balance
          </span>
          <div className="flex items-baseline gap-2">
            <span
              className={`text-xl sm:text-2xl font-black ${
                balanceInfo.badgeColor === 'red'
                  ? 'text-rose-600'
                  : balanceInfo.badgeColor === 'green'
                  ? 'text-emerald-600'
                  : 'text-slate-600'
              }`}
            >
              ₹{balanceInfo.formattedAbsolute}
            </span>
            <span
              className={`text-[10px] uppercase font-extrabold px-2 py-0.5 rounded-full ${
                balanceInfo.badgeColor === 'red'
                  ? 'bg-rose-100 text-rose-700'
                  : balanceInfo.badgeColor === 'green'
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-slate-200 text-slate-700'
              }`}
            >
              {balanceInfo.statusLabel}
            </span>
          </div>
        </div>
      </div>

      {/* Action Bar (WhatsApp, Call, Reminder, Statement CSV) */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-3">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
          {/* WhatsApp Direct Message */}
          {waUrl ? (
            <a
              href={waUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={handleWhatsAppClick}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs rounded-xl border border-emerald-200 transition active:scale-95 shadow-2xs"
            >
              <FaWhatsapp className="w-4 h-4 text-emerald-600" />
              <span>WhatsApp Hisab</span>
            </a>
          ) : null}

          {/* Direct Phone Call */}
          {customer.phone && (
            <a
              href={`tel:${customer.phone}`}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition"
            >
              <Phone className="w-3.5 h-3.5" />
              <span>Call</span>
            </a>
          )}

          {/* Payment Reminder Generator */}
          {Number(customer.balance) > 0 && (
            <button
              onClick={onReminderClick}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-amber-50 hover:bg-amber-100 text-amber-900 font-bold text-xs rounded-xl border border-amber-200 transition"
            >
              <BellRing className="w-3.5 h-3.5 text-amber-600" />
              <span>Send Reminder</span>
            </button>
          )}

          {/* Download CSV Statement */}
          <button
            onClick={onDownloadStatement}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition"
            title="Download Customer Statement (Excel/CSV)"
          >
            <FileDown className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Statement CSV</span>
          </button>
        </div>

        {/* Desktop Quick Gave / Got Buttons */}
        <div className="hidden lg:flex items-center gap-2">
          <button
            onClick={onOpenGave}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs rounded-xl shadow-xs transition active:scale-95"
          >
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>Maine Diye (₹)</span>
          </button>

          <button
            onClick={onOpenGot}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-xs transition active:scale-95"
          >
            <ArrowDownLeft className="w-3.5 h-3.5" />
            <span>Mujhe Mile (₹)</span>
          </button>
        </div>
      </div>

      {/* Edit Customer Profile Modal */}
      {showEditModal && (
        <EditCustomerModal
          customer={customer}
          onClose={() => setShowEditModal(false)}
          onCustomerUpdated={(updated) => {
            if (onCustomerUpdated) onCustomerUpdated(updated);
            setShowEditModal(false);
          }}
        />
      )}
    </div>
  );
}
