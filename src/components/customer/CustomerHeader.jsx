'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Phone, BellRing, FileDown, AlertCircle, ArrowUpRight, ArrowDownLeft, Camera, Loader2, User } from 'lucide-react';
import { FaWhatsapp } from 'react-icons/fa';
import { getBalanceInfo } from '@/lib/utils/currency';
import { formatIndianPhoneNumber, normalizeIndianPhoneNumber } from '@/lib/utils/phone';
import { buildCustomerBalanceWhatsAppMessage, generateWhatsAppUrl } from '@/lib/utils/whatsapp';
import { useShop } from '@/lib/context/ShopContext';
import { createClient } from '@/lib/supabase/client';
import { compressProfileImage } from '@/lib/utils/imageCompression';

export default function CustomerHeader({
  customer,
  onReminderClick,
  onDownloadStatement,
  onOpenGave,
  onOpenGot,
}) {
  const { currentShop } = useShop();
  const [photoUrl, setPhotoUrl] = useState(customer.photo_url || null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  const supabase = createClient();
  const balanceInfo = getBalanceInfo(customer.balance);
  const normalizedPhone = normalizeIndianPhoneNumber(customer.phone);

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
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

      // 2. Upload to customer-photos bucket
      const fileExt = compressedFile.name ? compressedFile.name.split('.').pop() : 'jpg';
      const fileName = `${currentShop.id}/${customer.id}_${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('customer-photos')
        .upload(fileName, compressedFile, {
          contentType: 'image/jpeg',
          upsert: true,
        });

      if (uploadError) throw uploadError;

      // 3. Get Public URL
      const { data: publicUrlData } = supabase.storage
        .from('customer-photos')
        .getPublicUrl(fileName);

      const newPhotoUrl = publicUrlData?.publicUrl;

      // 4. Update customer record in database
      const { error: updateError } = await supabase
        .from('customers')
        .update({ photo_url: newPhotoUrl, updated_at: new Date().toISOString() })
        .eq('id', customer.id);

      if (updateError) throw updateError;

      setPhotoUrl(newPhotoUrl);
      customer.photo_url = newPhotoUrl;
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
    <div className="w-full">
      {/* Phone validation alert if any */}
      {errorMessage && (
        <div className="mb-3 p-3 bg-rose-600 text-white text-xs font-semibold rounded-2xl flex items-center gap-2 animate-in fade-in duration-200">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Mobile Top Header (< 1024px) */}
      <div className="lg:hidden bg-emerald-700 text-white p-4 rounded-2xl shadow-md mb-4 sticky top-0 z-30">
        <div className="flex items-center justify-between mb-3">
          <Link
            href="/dashboard"
            className="flex items-center gap-1.5 text-xs font-semibold text-emerald-100 hover:text-white transition p-1 -ml-1 rounded-lg"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Khata</span>
          </Link>

          <div className="flex items-center gap-2">
            {onDownloadStatement && (
              <button
                onClick={onDownloadStatement}
                title="Download Statement CSV"
                className="p-2 bg-emerald-800/80 hover:bg-emerald-800 text-emerald-100 hover:text-white rounded-lg border border-emerald-600/60 transition min-w-[36px] min-h-[36px] flex items-center justify-center"
              >
                <FileDown className="w-4 h-4" />
              </button>
            )}

            {customer.balance > 0 && onReminderClick && (
              <button
                onClick={onReminderClick}
                title="Send Payment Reminder"
                className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-lg shadow-xs transition active:scale-95 min-h-[36px]"
              >
                <BellRing className="w-3.5 h-3.5" />
                <span>Reminder</span>
              </button>
            )}
          </div>
        </div>

        {/* Customer Info and Quick Contact */}
        <div className="flex items-center justify-between mb-3.5">
          <div className="flex items-center gap-3 min-w-0 pr-2">
            {photoUrl ? (
              <img
                src={photoUrl}
                alt={customer.name}
                className="w-12 h-12 rounded-xl object-cover border-2 border-emerald-300 shadow-xs shrink-0"
              />
            ) : (
              <div className="w-12 h-12 rounded-xl bg-emerald-800 text-emerald-100 font-extrabold text-base flex items-center justify-center border border-emerald-600 shrink-0 uppercase">
                {customer.name.charAt(0)}
              </div>
            )}
            <div className="min-w-0">
              <h1 className="text-lg font-bold text-white leading-tight truncate">
                {customer.name}
              </h1>
              <p className="text-xs text-emerald-100 mt-0.5 font-medium">
                {customer.phone ? formatIndianPhoneNumber(customer.phone) : 'No phone number'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {customer.phone && (
              <a
                href={`tel:${customer.phone}`}
                className="w-11 h-11 rounded-full bg-emerald-800 hover:bg-emerald-900 border border-emerald-600 flex items-center justify-center text-white transition shadow-sm active:scale-95"
                title="Call Customer"
                aria-label={`Call ${customer.name}`}
              >
                <Phone className="w-4 h-4" />
              </a>
            )}

            {waUrl ? (
              <a
                href={waUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={handleWhatsAppClick}
                className="w-11 h-11 rounded-full bg-[#25D366] hover:bg-[#20ba5c] text-white flex items-center justify-center transition shadow-md active:scale-95 border border-emerald-400"
                title="Send WhatsApp Message"
                aria-label="Send WhatsApp message to customer"
              >
                <FaWhatsapp className="w-6 h-6" />
              </a>
            ) : (
              <button
                type="button"
                onClick={handleWhatsAppClick}
                className="w-11 h-11 rounded-full bg-[#25D366]/60 hover:bg-[#25D366] text-white flex items-center justify-center transition shadow-md active:scale-95 border border-emerald-400"
                title="Send WhatsApp Message"
                aria-label="Send WhatsApp message to customer"
              >
                <FaWhatsapp className="w-6 h-6" />
              </button>
            )}
          </div>
        </div>

        {/* Prominent Balance Banner */}
        <div className="bg-white rounded-xl p-3.5 text-slate-800 shadow-sm border border-emerald-100 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Current Net Balance
            </span>
            <div className={`text-2xl font-extrabold tracking-tight mt-0.5 ${balanceInfo.colorClass}`}>
              {balanceInfo.formattedAmount}
            </div>
          </div>

          <div className={`px-3 py-1 rounded-full text-xs font-bold border ${balanceInfo.badgeClass}`}>
            {balanceInfo.label}
          </div>
        </div>
      </div>

      {/* Desktop Left Profile & Action Card (>= 1024px) */}
      <div className="hidden lg:block bg-white rounded-2xl border border-slate-200 shadow-xs p-6 sticky top-20">
        {/* Back Link */}
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-emerald-700 transition mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Customers List</span>
        </Link>

        {/* Customer Info Header */}
        <div className="flex items-center gap-3.5 mb-5 pb-5 border-b border-slate-100">
          {/* Avatar with Camera upload button */}
          <div className="relative group shrink-0">
            {photoUrl ? (
              <img
                src={photoUrl}
                alt={customer.name}
                className="w-16 h-16 rounded-2xl object-cover border border-slate-200 shadow-xs"
              />
            ) : (
              <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-800 font-black text-2xl flex items-center justify-center border border-emerald-200 uppercase">
                {customer.name.charAt(0)}
              </div>
            )}

            <label
              className="absolute -bottom-1.5 -right-1.5 p-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-full shadow-md cursor-pointer transition"
              title="Customer Photo Badlein ya Jodein"
            >
              {uploadingPhoto ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Camera className="w-3.5 h-3.5" />
              )}
              <input
                type="file"
                accept="image/*"
                disabled={uploadingPhoto}
                onChange={handlePhotoUpload}
                className="hidden"
              />
            </label>
          </div>

          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-extrabold text-slate-900 leading-tight truncate">
              {customer.name}
            </h1>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              {customer.phone ? formatIndianPhoneNumber(customer.phone) : 'No phone number added'}
            </p>
            {customer.notes && (
              <p className="text-xs text-slate-400 mt-1 truncate">{customer.notes}</p>
            )}
          </div>
        </div>

        {/* Balance Showcase Box */}
        <div className={`p-5 rounded-2xl border mb-5 ${balanceInfo.bgClass}`}>
          <span className="text-xs font-bold uppercase tracking-wider text-slate-600 block">
            Current Net Balance
          </span>
          <div className={`text-3xl font-black tracking-tight mt-1 ${balanceInfo.colorClass}`}>
            {balanceInfo.formattedAmount}
          </div>
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-200/60">
            <span className="text-xs font-semibold text-slate-600">{balanceInfo.subLabel}</span>
            <span className={`px-3 py-1 rounded-full text-xs font-extrabold border ${balanceInfo.badgeClass}`}>
              {balanceInfo.label}
            </span>
          </div>
        </div>

        {/* Primary Desktop BAKI & JAMA Action Buttons */}
        <div className="grid grid-cols-2 gap-3 mb-5">
          <button
            onClick={onOpenGave}
            className="py-3 px-4 bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white font-extrabold text-xs rounded-xl flex items-center justify-center gap-2 shadow-md shadow-rose-600/20 transition active:scale-98"
          >
            <ArrowUpRight className="w-4 h-4 stroke-[2.5]" />
            <span>BAKI ₹ (DIYA)</span>
          </button>

          <button
            onClick={onOpenGot}
            className="py-3 px-4 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-extrabold text-xs rounded-xl flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20 transition active:scale-98"
          >
            <ArrowDownLeft className="w-4 h-4 stroke-[2.5]" />
            <span>JAMA ₹ (LIYA)</span>
          </button>
        </div>

        {/* Customer Contact & Statement Actions */}
        <div className="space-y-2.5">
          {waUrl ? (
            <a
              href={waUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={handleWhatsAppClick}
              className="w-full py-2.5 px-4 bg-[#25D366] hover:bg-[#20ba5c] text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-xs transition active:scale-98"
            >
              <FaWhatsapp className="w-4 h-4" />
              <span>Send WhatsApp Balance</span>
            </a>
          ) : (
            <button
              type="button"
              onClick={handleWhatsAppClick}
              className="w-full py-2.5 px-4 bg-[#25D366] hover:bg-[#20ba5c] text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-xs transition active:scale-98"
            >
              <FaWhatsapp className="w-4 h-4" />
              <span>Send WhatsApp Balance</span>
            </button>
          )}

          {customer.phone && (
            <a
              href={`tel:${customer.phone}`}
              className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition"
            >
              <Phone className="w-3.5 h-3.5 text-slate-500" />
              <span>Call Customer</span>
            </a>
          )}

          {customer.balance > 0 && onReminderClick && (
            <button
              onClick={onReminderClick}
              className="w-full py-2.5 px-4 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-800 font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition"
            >
              <BellRing className="w-3.5 h-3.5" />
              <span>Send Payment Reminder</span>
            </button>
          )}

          {onDownloadStatement && (
            <button
              onClick={onDownloadStatement}
              className="w-full py-2.5 px-4 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-800 font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition"
            >
              <FileDown className="w-3.5 h-3.5" />
              <span>Download Statement (CSV)</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
